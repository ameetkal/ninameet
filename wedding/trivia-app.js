const STORAGE_KEY = 'weddingTriviaProgress';
const TOTAL = 9;

const QUESTIONS = [
  {
    id: 'nina-birth-city',
    prompt: 'In which French city was Nina born?',
    isCorrect: (raw) => matchesWord(raw, 'marseille'),
  },
  {
    id: 'ameet-birth-state',
    prompt: 'In which U.S. state was Ameet born?',
    isCorrect: (raw) => {
      const n = normalize(raw);
      return n === 'alabama' || n === 'al' || n.includes('alabama');
    },
  },
  {
    id: 'meet-city',
    prompt: 'In which city did Nina and Ameet meet?',
    isCorrect: (raw) => matchesWord(raw, 'cambridge'),
  },
  {
    id: 'first-dance',
    prompt: 'What style of dance did Nina and Ameet first learn together?',
    isCorrect: (raw) => matchesWord(raw, 'salsa'),
  },
  {
    id: 'first-love',
    prompt: 'In what month and year did Nina and Ameet first say &ldquo;I love you&rdquo;?',
    isCorrect: (raw) => matchesJanuary2024(raw),
  },
  {
    id: 'proposal-city',
    prompt: 'In which city did Ameet propose to Nina?',
    isCorrect: (raw) => matchesWord(raw, 'paris'),
  },
  {
    id: 'house-street',
    prompt: 'What is the street name of the house they bought with friends last year?',
    isCorrect: (raw) => {
      const n = stripAddressNoise(raw);
      return n === 'calvin' || n.startsWith('calvin ');
    },
  },
  {
    id: 'nina-economics',
    prompt: 'Which branch of economics does Nina study?',
    isCorrect: (raw) => {
      const n = normalize(raw);
      return /\blabou?r\b/.test(n) || n.includes('labor economics') || n.includes('labour economics');
    },
  },
  {
    id: 'ameet-publication',
    prompt: 'What is the title of Ameet&rsquo;s recent publication about randomness?',
    isCorrect: (raw) => {
      const n = normalize(raw);
      return n === 'dice theory' || (n.includes('dice') && n.includes('theory'));
    },
  },
];

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[''"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAddressNoise(s) {
  return normalize(s)
    .replace(/[.,#]/g, ' ')
    .replace(/\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|court|ct)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesWord(raw, word) {
  const n = normalize(raw);
  if (!n) return false;
  return n === word || n.includes(word);
}

function matchesJanuary2024(raw) {
  const n = normalize(raw);
  if (!n) return false;

  const patterns = [
    /^jan(uary)?[\s/.-]*2024$/,
    /^2024[\s/.-]*jan(uary)?$/,
    /^jan(uary)?[\s/.-]*24$/,
    /^1[\s/.-]*2024$/,
    /^01[\s/.-]*2024$/,
    /^jan(uary)?\s+of\s+2024$/,
  ];

  return patterns.some((re) => re.test(n)) || (n.includes('jan') && (n.includes('2024') || /\b24\b/.test(n)));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { answers: {}, correct: {} };
    const parsed = JSON.parse(raw);
    return {
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      correct: parsed.correct && typeof parsed.correct === 'object' ? parsed.correct : {},
    };
  } catch {
    return { answers: {}, correct: {} };
  }
}

function saveProgress(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      answers: state.answers,
      correct: state.correct,
    }),
  );
}

const state = loadProgress();

function countCorrect() {
  return QUESTIONS.filter((q) => state.correct[q.id]).length;
}

function updateProgressUi() {
  const n = countCorrect();
  const text = document.getElementById('triviaProgressText');
  const fill = document.getElementById('triviaProgressFill');
  const bar = document.getElementById('triviaProgressBar');

  if (text) text.textContent = `${n} / ${TOTAL} correct`;
  if (fill) fill.style.width = `${(n / TOTAL) * 100}%`;
  if (bar) {
    bar.setAttribute('aria-valuenow', String(n));
    bar.setAttribute('aria-valuetext', `${n} of ${TOTAL} questions correct`);
  }
}

function setQuestionFeedback(row, status, message) {
  const feedback = row.querySelector('.trivia-feedback');
  const input = row.querySelector('.trivia-input');
  if (!feedback || !input) return;

  row.classList.remove('trivia-q--correct', 'trivia-q--wrong');
  feedback.classList.remove('trivia-feedback--correct', 'trivia-feedback--wrong');

  if (status === 'correct') {
    row.classList.add('trivia-q--correct');
    feedback.classList.add('trivia-feedback--correct');
    feedback.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Correct!</span>';
    input.setAttribute('aria-invalid', 'false');
  } else if (status === 'wrong') {
    row.classList.add('trivia-q--wrong');
    feedback.classList.add('trivia-feedback--wrong');
    feedback.innerHTML = `<i class="fas fa-times-circle" aria-hidden="true"></i><span>${message}</span>`;
    input.setAttribute('aria-invalid', 'true');
  } else {
    feedback.innerHTML = '';
    input.removeAttribute('aria-invalid');
  }
}

function showCompleteModal() {
  const modal = document.getElementById('triviaCompleteModal');
  if (!modal) return;
  modal.hidden = false;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideCompleteModal() {
  const modal = document.getElementById('triviaCompleteModal');
  if (!modal) return;
  modal.hidden = true;
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function maybeComplete() {
  if (countCorrect() === TOTAL) {
    showCompleteModal();
  }
}

function checkQuestion(q, row) {
  const input = row.querySelector('.trivia-input');
  const value = input?.value ?? '';

  state.answers[q.id] = value;
  saveProgress(state);

  if (!value.trim()) {
    setQuestionFeedback(row, 'wrong', 'Enter an answer first.');
    delete state.correct[q.id];
    saveProgress(state);
    updateProgressUi();
    return;
  }

  if (q.isCorrect(value)) {
    state.correct[q.id] = true;
    saveProgress(state);
    setQuestionFeedback(row, 'correct');
    input.disabled = true;
    row.querySelector('.trivia-check-btn')?.setAttribute('disabled', 'true');
    updateProgressUi();
    maybeComplete();
  } else {
    delete state.correct[q.id];
    saveProgress(state);
    setQuestionFeedback(row, 'wrong', 'Not quite — try again!');
    updateProgressUi();
  }
}

function renderQuestions() {
  const host = document.getElementById('triviaQuestionsHost');
  if (!host) return;

  host.innerHTML = QUESTIONS.map((q, i) => {
    const saved = state.answers[q.id] ?? '';
    const isDone = !!state.correct[q.id];
    return `
      <div class="trivia-q${isDone ? ' trivia-q--correct' : ''}" data-id="${q.id}">
        <p class="trivia-q-prompt"><span class="trivia-q-num">${i + 1}.</span> ${q.prompt}</p>
        <div class="trivia-q-row">
          <input
            type="text"
            class="trivia-input"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="Your answer"
            value="${escapeAttr(saved)}"
            ${isDone ? 'disabled' : ''}
            aria-label="Answer for question ${i + 1}">
          <button type="button" class="btn btn-primary trivia-check-btn" ${isDone ? 'disabled' : ''}>Check</button>
        </div>
        <div class="trivia-feedback${isDone ? ' trivia-feedback--correct' : ''}" aria-live="polite">
          ${isDone ? '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Correct!</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  host.querySelectorAll('.trivia-q').forEach((row) => {
    const id = row.dataset.id;
    const q = QUESTIONS.find((item) => item.id === id);
    if (!q) return;

    const input = row.querySelector('.trivia-input');
    const btn = row.querySelector('.trivia-check-btn');

    input?.addEventListener('input', () => {
      state.answers[q.id] = input.value;
      saveProgress(state);
      if (state.correct[q.id]) {
        delete state.correct[q.id];
        saveProgress(state);
        setQuestionFeedback(row, 'idle');
        input.disabled = false;
        btn?.removeAttribute('disabled');
        updateProgressUi();
      }
    });

    btn?.addEventListener('click', () => checkQuestion(q, row));

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!input.disabled) checkQuestion(q, row);
      }
    });
  });
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function init() {
  renderQuestions();
  updateProgressUi();

  if (countCorrect() === TOTAL) {
    showCompleteModal();
  }

  document.getElementById('triviaCompleteClose')?.addEventListener('click', hideCompleteModal);
  document.getElementById('triviaCompleteOk')?.addEventListener('click', hideCompleteModal);
  document.getElementById('triviaCompleteModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'triviaCompleteModal') hideCompleteModal();
  });
}

init();
