import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB108IDQksvWLhANDsTm04lVl3fvjlULWY',
  authDomain: 'ninameet-1eb2e.firebaseapp.com',
  projectId: 'ninameet-1eb2e',
  storageBucket: 'ninameet-1eb2e.firebasestorage.app',
  messagingSenderId: '819954601528',
  appId: '1:819954601528:web:bcfdfba23fb7fa119020cd',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cachedGuests = null;

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadAllGuests() {
  if (cachedGuests) return cachedGuests;
  const snap = await getDocs(collection(db, 'wedding-guests'));
  cachedGuests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cachedGuests;
}

function invalidateGuestCache() {
  cachedGuests = null;
}

async function loadGroupDoc(groupId) {
  const ref = doc(db, 'wedding-groups', String(groupId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function searchGuests(rawQuery) {
  const q = norm(rawQuery);
  if (!q) return { matches: [] };
  if (!q.includes('@') && q.length < 2) return { matches: [] };

  const guests = await loadAllGuests();

  if (q.includes('@')) {
    const eq = query(collection(db, 'wedding-guests'), where('emailLower', '==', q));
    const snap = await getDocs(eq);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { matches: rows };
  }

  const tokenMatches = guests.filter((g) => {
    const sn = norm(g.searchName || g.canonicalName || '');
    const cn = norm(g.canonicalName || '');
    const parts = q.split(' ').filter((t) => t.length >= 2);
    const tokensOk =
      parts.length === 0 || parts.every((t) => sn.includes(t) || cn.includes(t));
    return tokensOk && (sn.includes(q) || cn.includes(q) || parts.length > 0);
  });

  return { matches: tokenMatches };
}

async function loadParty(groupId) {
  const gid = String(groupId);
  const guests = await loadAllGuests();
  const party = guests.filter((g) => String(g.groupId) === gid).sort((a, b) => a.id.localeCompare(b.id));
  const groupRow = await loadGroupDoc(gid);
  return { guests: party, group: groupRow };
}

function rowForGuest(hostEl, guestId) {
  const rows = hostEl.querySelectorAll('tbody tr[data-guest-id]');
  for (const row of rows) {
    if (row.getAttribute('data-guest-id') === guestId) return row;
  }
  return null;
}

function collectPayloadFromDom(hostEl, partyGuests, sharedEmail, sharedPhone, sharedQuestion) {
  const rows = partyGuests.map((g) => {
    const row = rowForGuest(hostEl, g.id);
    if (!row) return null;

    const q = (sel) => row.querySelector(sel);

    return {
      ref: doc(db, 'wedding-guests', g.id),
      data: {
        attendingFriday: !!q('[data-field="fri"]')?.checked,
        attendingSaturday: !!q('[data-field="sat"]')?.checked,
        attendingSunday: !!q('[data-field="sun"]')?.checked,
        dietaryVegan: !!q('[data-field="vegan"]')?.checked,
        dietaryVegetarian: !!q('[data-field="veg"]')?.checked,
        dietaryOther: !!q('[data-field="other"]')?.checked,
        dietaryNotes: q('[data-field="notes"]')?.value?.trim() || '',
        cabaretInterested: !!q('[data-field="cab"]')?.checked,
        email: sharedEmail.trim(),
        phone: sharedPhone.trim(),
        emailLower: sharedEmail.trim().toLowerCase(),
        question: sharedQuestion.trim(),
        updatedAt: serverTimestamp(),
      },
    };
  }).filter(Boolean);

  return rows;
}

async function saveParty(hostEl, partyGuests, groupChildrenInput, sharedEmail, sharedPhone, sharedQuestion) {
  if (!partyGuests.length) return;

  const rows = collectPayloadFromDom(hostEl, partyGuests, sharedEmail, sharedPhone, sharedQuestion);

  const childrenCount = Math.max(0, Number.parseInt(groupChildrenInput.value, 10) || 0);

  const groupRef = doc(db, 'wedding-groups', String(partyGuests[0]?.groupId || ''));

  const batch = writeBatch(db);
  rows.forEach(({ ref, data }) => batch.update(ref, data));
  batch.set(
    groupRef,
    {
      groupNumber: Number(partyGuests[0].groupId),
      childrenCount,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  invalidateGuestCache();
}

function renderParty(container, partyResult, sharedContactEl, sharedQuestionEl, childrenEl, saveStatusEl) {
  const { guests, group } = partyResult;
  container.innerHTML = '';

  if (!guests.length) {
    container.innerHTML = '<p class="rsvp-muted">No guests found for this group.</p>';
    return;
  }

  childrenEl.value = group?.childrenCount != null ? String(group.childrenCount) : '0';

  const primaryEmail =
    guests.map((g) => g.email).find((e) => String(e || '').trim()) || '';
  const primaryPhone =
    guests.map((g) => g.phone).find((p) => String(p || '').trim()) || '';
  sharedContactEl.email.value = primaryEmail;
  sharedContactEl.phone.value = primaryPhone;

  const primaryQ =
    guests.map((g) => g.question).find((q) => String(q || '').trim()) || '';
  sharedQuestionEl.value = primaryQ;

  const table = document.createElement('table');
  table.className = 'rsvp-party-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Guest</th>
        <th>Fri</th>
        <th>Sat</th>
        <th>Sun</th>
        <th>Diet & notes</th>
        <th>Cabaret</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  guests.forEach((g) => {
    const tr = document.createElement('tr');
    tr.dataset.guestId = g.id;

    tr.innerHTML = `
      <td class="rsvp-name-cell">${escapeHtml(g.canonicalName)}</td>
      <td><input type="checkbox" data-field="fri" ${g.attendingFriday ? 'checked' : ''} aria-label="Friday"></td>
      <td><input type="checkbox" data-field="sat" ${g.attendingSaturday ? 'checked' : ''} aria-label="Saturday"></td>
      <td><input type="checkbox" data-field="sun" ${g.attendingSunday ? 'checked' : ''} aria-label="Sunday"></td>
      <td class="rsvp-diet-cell">
        <label class="rsvp-inline"><input type="checkbox" data-field="vegan" ${g.dietaryVegan ? 'checked' : ''}> Vegan</label>
        <label class="rsvp-inline"><input type="checkbox" data-field="veg" ${g.dietaryVegetarian ? 'checked' : ''}> Vegetarian</label>
        <label class="rsvp-inline"><input type="checkbox" data-field="other" ${g.dietaryOther ? 'checked' : ''}> Other</label>
        <input type="text" class="rsvp-notes-input" data-field="notes" placeholder="Notes (allergies, kids meals, …)"
          value="${escapeAttr(g.dietaryNotes || '')}">
      </td>
      <td><label class="rsvp-inline"><input type="checkbox" data-field="cab" ${g.cabaretInterested ? 'checked' : ''}> Interested</label></td>
    `;

    tbody.appendChild(tr);
  });

  container.appendChild(table);

  saveStatusEl.textContent = '';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('rsvpSearchInput');
  const searchBtn = document.getElementById('rsvpSearchBtn');
  const searchStatus = document.getElementById('rsvpSearchStatus');
  const pickWrap = document.getElementById('rsvpPickGroup');
  const editorWrap = document.getElementById('rsvpEditor');
  const partyArea = document.getElementById('rsvpPartyTableHost');
  const childrenEl = document.getElementById('rsvpChildrenCount');
  const sharedEmail = document.getElementById('rsvpSharedEmail');
  const sharedPhone = document.getElementById('rsvpSharedPhone');
  const sharedQuestion = document.getElementById('rsvpSharedQuestion');
  const saveBtn = document.getElementById('rsvpSaveBtn');
  const saveStatus = document.getElementById('rsvpSaveStatus');

  let activeGuests = [];

  async function runSearch() {
    pickWrap.innerHTML = '';
    editorWrap.hidden = true;
    activeGuests = [];
    searchStatus.textContent = 'Searching…';

    try {
      const { matches } = await searchGuests(searchInput.value);

      if (!matches.length) {
        searchStatus.textContent = 'No matching guest found. Try another spelling or your email.';
        return;
      }

      const distinctGroups = [...new Set(matches.map((m) => String(m.groupId)))];

      if (distinctGroups.length === 1) {
        await openGroup(distinctGroups[0]);
        searchStatus.textContent = '';
        return;
      }

      searchStatus.textContent = 'Multiple households match — pick yours:';
      distinctGroups.forEach((gid) => {
        const names = matches
          .filter((m) => String(m.groupId) === gid)
          .map((m) => m.canonicalName)
          .join(', ');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary rsvp-pick-btn';
        btn.textContent = `${names}`;
        btn.addEventListener('click', async () => {
          pickWrap.innerHTML = '';
          await openGroup(gid);
          searchStatus.textContent = '';
        });
        pickWrap.appendChild(btn);
      });
    } catch (e) {
      console.error(e);
      searchStatus.textContent = 'Something went wrong. Please try again.';
    }
  }

  async function openGroup(groupId) {
    editorWrap.hidden = false;
    saveStatus.textContent = '';
    const partyResult = await loadParty(groupId);
    activeGuests = partyResult.guests;

    renderParty(
      partyArea,
      partyResult,
      { email: sharedEmail, phone: sharedPhone },
      sharedQuestion,
      childrenEl,
      saveStatus,
    );

    editorWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  searchBtn.addEventListener('click', runSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  saveBtn.addEventListener('click', async () => {
    if (!activeGuests.length) return;
    saveBtn.disabled = true;
    saveStatus.textContent = 'Saving…';

    try {
      await saveParty(
        partyArea,
        activeGuests,
        childrenEl,
        sharedEmail.value,
        sharedPhone.value,
        sharedQuestion.value,
      );
      saveStatus.textContent = 'Saved. Thank you!';
    } catch (e) {
      console.error(e);
      saveStatus.textContent = 'Could not save. Please try again.';
    } finally {
      saveBtn.disabled = false;
    }
  });
});
