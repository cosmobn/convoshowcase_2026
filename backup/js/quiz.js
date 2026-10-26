// quiz.js — "Not sure?" 5-question quiz (spec §3.5). No DB: answers add points to sectors.

import { shareLink, whatsappHref } from './share.js';

const IT = 'it-services', NET = 'telecom-network', APPS = 'apps-solutions',
  SEC = 'ict-security', DIG = 'digital-media', DATA = 'data-ai';

export const QUESTIONS = [
  {
    q: 'Which sounds most fun?',
    a: [
      ['🛠️', 'Fixing computers', [IT]],
      ['📱', 'Building an app', [APPS]],
      ['🕵️', 'Catching hackers', [SEC]],
      ['🔍', 'Finding patterns in data', [DATA]],
      ['🌐', 'Connecting cities with networks', [NET]],
      ['📈', 'Growing a brand online', [DIG]],
    ],
  },
  {
    q: 'Pick a weekend project',
    a: [
      ['🖥️', 'Build a PC', [IT, NET]],
      ['🎮', 'Make a game', [APPS]],
      ['🚩', 'Capture-the-flag challenge', [SEC]],
      ['⚽', 'Analyse football stats', [DATA]],
      ['🎬', 'Run a TikTok page', [DIG]],
    ],
  },
  {
    q: 'You prefer working with…',
    a: [
      ['⚙️', 'Machines', [IT, NET]],
      ['💻', 'Code', [APPS]],
      ['📜', 'Rules & risks', [SEC]],
      ['🔢', 'Numbers', [DATA]],
      ['🤝', 'People', [DIG]],
    ],
  },
  {
    q: 'Your strongest subject',
    a: [
      ['➗', 'Maths', [DATA]],
      ['⌨️', 'Computing', [APPS]],
      ['🧲', 'Physics', [NET]],
      ['💼', 'Business', [DIG]],
      ['🖱️', 'ICT', [IT]],
    ],
  },
  {
    q: 'Dream workplace',
    a: [
      ['🏦', 'Bank', [SEC]],
      ['📡', 'Telco', [NET]],
      ['🚀', 'Start-up', [APPS]],
      ['🎨', 'Agency', [DIG]],
      ['🏛️', 'Government', [IT]],
      ['🌍', 'Tech giant', [DATA]],
    ],
  },
];

export const SECTOR_BLURB = {
  [IT]: 'You like keeping technology running for real people. IT Services starts at the help desk and can lead all the way to CIO.',
  [NET]: 'You like the hardware and wiring that connect everything. Network careers build and run the links that keep Brunei online.',
  [APPS]: 'You like making things with code. Apps & Software careers go from Junior Programmer up to CTO.',
  [SEC]: 'You like puzzles, rules and outsmarting attackers. Cyber Security careers protect banks, government and everyone online.',
  [DIG]: 'You like people, brands and stories. Digital Media careers grow businesses online, up to CMO.',
  [DATA]: 'You like numbers and spotting patterns. Data & AI careers turn data into decisions, models and AI.',
};

/** Returns sector ids sorted by score (ties broken by the answer to question 1, then sector order). */
export function scoreQuiz(answers, sectorIds) {
  const pts = Object.fromEntries(sectorIds.map(id => [id, 0]));
  answers.forEach((ai, qi) => QUESTIONS[qi].a[ai][2].forEach(s => { pts[s] += 1; }));
  const q1 = answers[0] != null ? QUESTIONS[0].a[answers[0]][2][0] : null;
  const ranked = [...sectorIds].sort((a, b) =>
    pts[b] - pts[a] || (b === q1) - (a === q1) || sectorIds.indexOf(a) - sectorIds.indexOf(b));
  return { ranked, pts };
}

/**
 * @param {HTMLElement} root
 * @param {{sectors:object[], starterRoles:(sectorId:string)=>object[], roleCard:(role:object)=>string,
 *          siteUrl:(params:object)=>string, onExit:()=>void, result?:string|null, onResult:(id:string)=>void}} ctx
 */
export function renderQuiz(root, ctx) {
  const answers = [];
  const sectorIds = ctx.sectors.map(s => s.id);
  const sectorById = Object.fromEntries(ctx.sectors.map(s => [s.id, s]));

  function progress(i) {
    return `<div class="quiz-progress" aria-hidden="true">${QUESTIONS.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  function question(i) {
    const Q = QUESTIONS[i];
    root.innerHTML = `
      <div class="step-head">
        <button type="button" class="icon-btn back" aria-label="${i ? 'Previous question' : 'Back to start'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="goal-pill">🧭 30-second quiz</span>
      </div>
      ${progress(i)}
      <p class="quiz-count">Question ${i + 1} of ${QUESTIONS.length}</p>
      <h1 class="quiz-q" id="quiz-title" tabindex="-1">${Q.q}</h1>
      <div class="quiz-answers" role="group" aria-labelledby="quiz-title">
        ${Q.a.map(([e, t], k) => `
          <button type="button" class="choice" data-k="${k}" aria-pressed="${answers[i] === k}">
            <span class="emoji" aria-hidden="true">${e}</span>
            <span><span class="c-title">${t}</span></span>
          </button>`).join('')}
      </div>`;
    root.querySelector('.back').addEventListener('click', () => {
      if (i === 0) ctx.onExit(); else { answers.length = i - 1; question(i - 1); }
    });
    root.querySelectorAll('.quiz-answers .choice').forEach(b => b.addEventListener('click', () => {
      answers[i] = +b.dataset.k;
      if (i + 1 < QUESTIONS.length) question(i + 1);
      else {
        const { ranked } = scoreQuiz(answers, sectorIds);
        ctx.onResult(ranked[0]);
        result(ranked[0], scoreQuiz(answers, sectorIds));
      }
    }));
    root.querySelector('#quiz-title').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function result(topId, scored) {
    const s = sectorById[topId];
    const roles = ctx.starterRoles(topId);
    const shareText = `I got ${s.emoji} ${s.short} — what's yours?`;
    const quizUrl = ctx.siteUrl({ view: 'quiz' });
    const max = scored ? Math.max(1, ...Object.values(scored.pts)) : 1;
    root.innerHTML = `
      <div class="step-head">
        <button type="button" class="icon-btn back" aria-label="Retake the quiz"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="goal-pill">🧭 Your quiz result</span>
      </div>
      <div class="quiz-result">
        <div class="result-hero">
          <div class="big" aria-hidden="true">${s.emoji}</div>
          <h1 id="quiz-title" tabindex="-1">You'd suit ${s.short}</h1>
          <p>${SECTOR_BLURB[topId]}</p>
        </div>
        ${scored ? `<div class="result-bars" aria-label="Your scores">
          ${scored.ranked.map(id => `<div class="result-bar" style="--c:${sectorById[id].color}">
            <span>${sectorById[id].short}</span>
            <span class="track"><span class="fill" style="width:${(scored.pts[id] / max) * 100}%"></span></span>
            <span>${scored.pts[id]}</span></div>`).join('')}
        </div>` : ''}
        <h2 class="h2">Start here</h2>
        <div class="result-roles">${roles.map(ctx.roleCard).join('')}</div>
        <div class="rm-actions">
          <button type="button" class="btn btn-primary" id="quiz-share">Share my result</button>
          <a class="btn btn-outline" href="${whatsappHref(`${shareText} ${quizUrl}`)}" target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" class="btn btn-ghost" id="quiz-retake">Retake quiz</button>
        </div>
      </div>`;
    const retake = () => { answers.length = 0; question(0); };
    root.querySelector('.back').addEventListener('click', retake);
    root.querySelector('#quiz-retake').addEventListener('click', retake);
    root.querySelector('#quiz-share').addEventListener('click', () =>
      shareLink({ title: 'PathFinder ICT quiz', text: shareText, url: quizUrl }));
    root.querySelector('#quiz-title').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  if (ctx.result && sectorById[ctx.result]) result(ctx.result, null);
  else question(0);
}
