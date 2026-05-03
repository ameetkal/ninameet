#!/usr/bin/env node
/**
 * Seeds Firestore wedding-groups + wedding-guests from the invite spreadsheet,
 * optionally merges legacy wedding-responses (contact fields + Fri/Sat/Sun from selections).
 *
 * Prerequisites:
 *   npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Usage:
 *   node scripts/migrate-wedding-firestore.mjs --xlsx data/wedding-invite-list.xlsx [--merge-responses] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GROUP_DAY_OVERRIDES = {
  // Esther Duflo & Abhijit Banerjee — Sat + Sun only
  '66': { attendingFriday: false, attendingSaturday: true, attendingSunday: true },
  // Claire Montialoux & Gabriel Zucman — Sat only
  '59': { attendingFriday: false, attendingSaturday: true, attendingSunday: false },
  // Jon & Andrea Gruber — Fri + Sat only
  '67': { attendingFriday: true, attendingSaturday: true, attendingSunday: false },
  // Branick Weix & Ally — Fri + Sat only
  '17': { attendingFriday: true, attendingSaturday: true, attendingSunday: false },
};

const LEGACY_LABEL_MAP = {
  'Friday Night Welcome + Cabaret': 'Friday Night Welcome Dinner + Cabaret',
  'Saturday Morning Games': 'Friday Evening Games',
};

function parseArgs(argv) {
  const out = { xlsx: null, mergeResponses: false, dryRun: false, projectId: 'ninameet-1eb2e' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--merge-responses') out.mergeResponses = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--xlsx' && argv[i + 1]) out.xlsx = argv[++i];
    else if (a === '--project' && argv[i + 1]) out.projectId = argv[++i];
  }
  return out;
}

function slugify(s) {
  const base = String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
  return base || 'guest';
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRsvpFlag(raw) {
  const v = String(raw ?? '').trim();
  if (v === '1' || v.toLowerCase() === 'yes') return true;
  if (v === '0' || v.toLowerCase() === 'no') return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n !== 0;
  return false;
}

function parseChildren(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 0;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function deriveDaysFromSpreadsheetRow(groupId, rsvpRaw) {
  if (GROUP_DAY_OVERRIDES[groupId]) {
    return { ...GROUP_DAY_OVERRIDES[groupId] };
  }
  const yes = parseRsvpFlag(rsvpRaw);
  return {
    attendingFriday: yes,
    attendingSaturday: yes,
    attendingSunday: yes,
  };
}

function migrateLegacyLabels(selections) {
  if (!Array.isArray(selections)) return [];
  return selections.map((s) => LEGACY_LABEL_MAP[s] || s);
}

/** Derive Fri/Sat/Sun booleans from legacy attendanceSelections when possible */
function deriveDaysFromLegacySelections(selections) {
  const migrated = migrateLegacyLabels(selections);
  const noneOnly =
    migrated.length === 0 ||
    migrated.every((s) => /can't make it|none/i.test(String(s)));

  if (noneOnly) {
    return { attendingFriday: false, attendingSaturday: false, attendingSunday: false };
  }

  const joined = migrated.join(' | ');
  return {
    attendingFriday: /Friday/i.test(joined),
    attendingSaturday: /Saturday/i.test(joined),
    attendingSunday: /Sunday/i.test(joined),
  };
}

function splitSubmissionNames(fullName) {
  const n = norm(fullName);
  return n
    .split(/\s+(?:and|&)\s+|,/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

function submissionMatchesGuest(submissionName, guestCanonical) {
  const a = norm(guestCanonical);
  const b = norm(submissionName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.includes(a) && a.length >= 4) return true;
  if (a.includes(b) && b.length >= 4) return true;
  return false;
}

function guestMatchesSubmissionFull(submissionFullName, guest) {
  const full = norm(submissionFullName);
  if (submissionMatchesGuest(submissionFullName, guest.canonicalName)) return true;
  const parts = splitSubmissionNames(submissionFullName);
  if (parts.length <= 1) return false;
  return parts.some((p) => submissionMatchesGuest(p, guest.canonicalName));
}

function readSpreadsheetRows(xlsxPath) {
  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

function dedupeRows(rows) {
  const seen = new Map();
  const out = [];
  for (const row of rows) {
    const name = String(row['RSVP Name'] || '').trim();
    const gid = String(row['RSVP Group #'] ?? '').trim();
    if (!name || !gid) continue;
    const key = `${gid}|${norm(name)}`;
    if (seen.has(key)) continue;
    seen.set(key, true);
    out.push(row);
  }
  return out;
}

function buildGuestsFromSheet(rows) {
  const guests = [];
  const childrenByGroup = new Map();

  for (const row of rows) {
    const gid = String(row['RSVP Group #'] ?? '').trim();
    const ch = parseChildren(row['Children Attending']);
    childrenByGroup.set(gid, Math.max(childrenByGroup.get(gid) || 0, ch));
  }

  let idxInGroup = new Map();
  for (const row of rows) {
    const gid = String(row['RSVP Group #'] ?? '').trim();
    const canonicalName = String(row['RSVP Name'] || '').trim();
    const email = String(row['Email'] || '').trim();
    const phone = String(row['Phone'] || '').trim();
    const submittedSheet = String(row['Submission Time'] || '').trim();
    const wisdomSheet = String(row['Wisdom/Question'] || '').trim();

    const days = deriveDaysFromSpreadsheetRow(gid, row['RSVP']);
    const n = (idxInGroup.get(gid) || 0) + 1;
    idxInGroup.set(gid, n);

    const slug = slugify(canonicalName);
    const guestId = `${gid}_${String(n).padStart(2, '0')}_${slug}`;

    const emailLower = email ? email.trim().toLowerCase() : '';

    guests.push({
      guestId,
      canonicalName,
      groupId: gid,
      email,
      emailLower,
      phone,
      searchName: norm(canonicalName),
      attendingFriday: days.attendingFriday,
      attendingSaturday: days.attendingSaturday,
      attendingSunday: days.attendingSunday,
      dietaryVegan: false,
      dietaryVegetarian: false,
      dietaryOther: false,
      dietaryNotes: '',
      cabaretInterested: false,
      question: wisdomSheet,
      legacySubmissionIds: [],
      spreadsheetSubmissionTime: submittedSheet || null,
      childrenCountGroup: childrenByGroup.get(gid) ?? 0,
    });
  }

  return { guests, childrenByGroup };
}

async function loadLegacyResponses(db) {
  const snap = await db.collection('wedding-responses').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function mergeLegacyResponses(guests, legacyDocs) {
  const unmatched = [];
  const matchedIds = new Set();

  for (const doc of legacyDocs) {
    const emailLower = String(doc.email || '')
      .trim()
      .toLowerCase();
    const fullName = doc.fullName || '';

    /** @type {typeof guests} */
    let matched = [];

    if (emailLower) {
      matched = guests.filter((g) => g.emailLower && g.emailLower === emailLower);
    }

    if (matched.length === 0) {
      matched = guests.filter((g) => guestMatchesSubmissionFull(fullName, g));
    }

    if (matched.length === 0) {
      matched = guests.filter((g) => submissionMatchesGuest(fullName, g.canonicalName));
    }

    if (matched.length === 0) {
      unmatched.push({ id: doc.id, fullName: doc.fullName, email: doc.email });
      continue;
    }

    const legacyDays =
      doc.attendanceSelections && doc.attendanceSelections.length
        ? deriveDaysFromLegacySelections(doc.attendanceSelections)
        : null;

    const ts =
      doc.timestamp && typeof doc.timestamp.toDate === 'function'
        ? doc.timestamp.toDate().toISOString()
        : doc.createdAt || null;

    for (const g of matched) {
      matchedIds.add(g.guestId);
      if (doc.email && String(doc.email).trim()) {
        g.email = String(doc.email).trim();
        g.emailLower = g.email.toLowerCase();
      }
      if (doc.phone && String(doc.phone).trim()) g.phone = String(doc.phone).trim();
      if (doc.question && String(doc.question).trim()) {
        const q = String(doc.question).trim();
        if (q) g.question = q;
      }
      if (!g.firebaseMergedFirstSubmittedAt && ts) {
        g.firebaseMergedFirstSubmittedAt = ts;
      }
      if (legacyDays) {
        g.attendingFriday = legacyDays.attendingFriday;
        g.attendingSaturday = legacyDays.attendingSaturday;
        g.attendingSunday = legacyDays.attendingSunday;
      }
      if (!g.legacySubmissionIds.includes(doc.id)) {
        g.legacySubmissionIds.push(doc.id);
      }
    }
  }

  return { unmatched };
}

async function main() {
  const args = parseArgs(process.argv);
  const xlsxPath = args.xlsx
    ? path.isAbsolute(args.xlsx)
      ? args.xlsx
      : path.join(__dirname, '..', args.xlsx)
    : path.join(__dirname, '..', 'data', 'wedding-invite-list.xlsx');

  if (!fs.existsSync(xlsxPath)) {
    console.error('Missing XLSX:', xlsxPath);
    process.exit(1);
  }

  const rows = dedupeRows(readSpreadsheetRows(xlsxPath));
  const { guests, childrenByGroup } = buildGuestsFromSheet(rows);

  console.log(`Parsed ${guests.length} guests across ${childrenByGroup.size} groups from spreadsheet.`);

  if (args.mergeResponses) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS is required for --merge-responses');
      process.exit(1);
    }
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: args.projectId });
    }
    const db = admin.firestore();
    const legacy = await loadLegacyResponses(db);
    console.log(`Loaded ${legacy.length} legacy wedding-responses documents.`);
    const { unmatched } = mergeLegacyResponses(guests, legacy);
    console.log(`Merge matched submissions touching ${guests.filter((g) => g.legacySubmissionIds.length).length} guest rows; ${unmatched.length} unmatched legacy docs.`);
    if (unmatched.length) {
      console.log('Unmatched legacy submissions (resolve manually in Firestore if needed):');
      unmatched.slice(0, 40).forEach((u) => console.log(`  - ${u.id}: ${u.fullName} <${u.email}>`));
      if (unmatched.length > 40) console.log(`  ... and ${unmatched.length - 40} more`);
    }
  }

  if (args.dryRun) {
    console.log('[dry-run] No writes performed.');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to run writes.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.projectId });
  }
  const db = admin.firestore();

  const batchLimit = 450;
  let batch = db.batch();
  let n = 0;

  async function commitBatch() {
    if (n === 0) return;
    await batch.commit();
    batch = db.batch();
    n = 0;
  }

  const groupIds = [...childrenByGroup.keys()].sort((a, b) => Number(a) - Number(b));
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const gid of groupIds) {
    const ref = db.collection('wedding-groups').doc(gid);
    batch.set(
      ref,
      {
        groupNumber: Number(gid),
        childrenCount: childrenByGroup.get(gid) ?? 0,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    n++;
    if (n >= batchLimit) await commitBatch();
  }

  for (const g of guests) {
    const ref = db.collection('wedding-guests').doc(g.guestId);
    const payload = {
      canonicalName: g.canonicalName,
      groupId: g.groupId,
      email: g.email || '',
      emailLower: g.emailLower || '',
      phone: g.phone || '',
      searchName: g.searchName,
      attendingFriday: g.attendingFriday,
      attendingSaturday: g.attendingSaturday,
      attendingSunday: g.attendingSunday,
      dietaryVegan: g.dietaryVegan,
      dietaryVegetarian: g.dietaryVegetarian,
      dietaryOther: g.dietaryOther,
      dietaryNotes: g.dietaryNotes,
      cabaretInterested: g.cabaretInterested,
      question: g.question || '',
      legacySubmissionIds: g.legacySubmissionIds || [],
      firstSubmittedAt: g.firebaseMergedFirstSubmittedAt || g.spreadsheetSubmissionTime || null,
      updatedAt: now,
      createdAt: now,
    };
    batch.set(ref, payload, { merge: true });
    n++;
    if (n >= batchLimit) await commitBatch();
  }

  await commitBatch();
  console.log(`Wrote ${groupIds.length} group docs and ${guests.length} guest docs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
