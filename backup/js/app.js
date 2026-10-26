// app.js — routing (URL params) + rendering for PathFinder ICT.
import {
  FROM_BDQF, QUALS, BDQF_LABEL, STUDY_TITLE, SKILL_LEVEL_NAMES,
  buildRoadmap, findPaths,
} from './path.js';
import { renderQuiz } from './quiz.js';
import { openShareSheet, setupShareSheet, toast, copyText, confettiOnce } from './share.js';

const STAGES = { entry: 'Entry', mid: 'Mid-career', senior: 'Senior', top: 'Top' };
const STAGE_ORDER = { entry: 0, mid: 1, senior: 2, top: 3 };
const TRENDING = ['data-scientist', 'ciso', 'applications-developer', 'ai-engineer', 'network-engineer', 'digital-marketing-executive'];
const PLACEHOLDERS = ['Data Scientist…', 'Ethical Hacker…', 'App Developer…', 'CISO…', 'Network Engineer…'];
const SITE = 'PathFinder ICT';

let roles = [], sectors = [], byId = {}, sectorById = {};
let currentView = null;
let lastFrom = null;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "Chief Information Security Officer (CISO)" → "CISO"; other titles unchanged. */
export function shortTitle(role) {
  const m = role.title.match(/\(([A-Z]{2,5})\)$/);
  return m ? m[1] : role.title;
}
const years = n => `${n} ${n === 1 ? 'year' : 'years'}`;

/* =========================================================================
   URL state
   ========================================================================= */
function params() { return new URLSearchParams(location.search); }

function buildQuery(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v);
  return p;
}

/** Navigate inside the app. Keeps teacher mode (?mode=present) sticky. */
function go(obj, { replace = false, scroll = true, animate = true } = {}) {
  const p = buildQuery(obj);
  if (params().get('mode') === 'present' && !p.has('mode')) p.set('mode', 'present');
  const qs = p.toString();
  const url = location.pathname + (qs ? '?' + qs : '');
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  render({ animate });
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}

/** Absolute link for sharing. Roadmaps go through r/<sector>/ so link previews get the sector image. */
function siteUrl(obj, sectorId) {
  const base = new URL('.', location.href);
  const target = sectorId ? new URL(`r/${sectorId}/`, base) : base;
  const qs = buildQuery(obj).toString();
  return target.href + (qs ? '?' + qs : '');
}

/* =========================================================================
   Boot
   ========================================================================= */
async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

async function init() {
  try {
    [roles, sectors] = await Promise.all([loadJSON('data/roles.json'), loadJSON('data/sectors.json')]);
  } catch (e) {
    showView('error');
    $('#error-msg').textContent = location.protocol === 'file:'
      ? 'Open this site through a web server (for example: npx serve .) — browsers block data files on file:// pages.'
      : 'The career data could not be loaded. Check your connection and try again.';
    return;
  }
  byId = Object.fromEntries(roles.map(r => [r.id, r]));
  sectorById = Object.fromEntries(sectors.map(s => [s.id, s]));

  setupGlobal();
  setupLanding();
  setupWhere();
  setupRoadmap();
  setupExplore();
  setupShareSheet();
  render({ animate: true });
  addEventListener('popstate', () => render({ animate: false }));
}

function setupGlobal() {
  // SPA links: any same-page "?..." link or the home brand link.
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (a.dataset.nav === 'home' || href === './') { e.preventDefault(); closeDialogs(); go({}); return; }
    if (href.startsWith('?')) { e.preventDefault(); closeDialogs(); go(Object.fromEntries(new URLSearchParams(href))); }
  });
  $$('[data-nav-home]').forEach(b => b.addEventListener('click', () => { go({}); setTimeout(() => $('#search-input').focus(), 50); }));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => {
    const p = params();
    if (currentView === 'roadmap') go({ goal: p.get('goal') });
    else go({});
  }));
  // dialogs: close button + backdrop click
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
  });
}
function closeDialogs() { $$('dialog[open]').forEach(d => d.close()); }

/* =========================================================================
   Router
   ========================================================================= */
function showView(name) {
  $$('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  currentView = name;
  document.body.classList.toggle('has-sticky', name === 'roadmap' && params().get('mode') !== 'present');
  $$('.topnav a').forEach(a => { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}

function render({ animate = true } = {}) {
  const p = params();
  document.body.classList.toggle('present', p.get('mode') === 'present');
  const goal = p.get('goal');
  const from = p.get('from');
  let view = 'landing';
  if (p.get('view') === 'quiz') view = 'quiz';
  else if (p.get('view') === 'explore' || p.get('compare')) view = 'explore';
  else if (goal && byId[goal]) view = from && (from in FROM_BDQF || from === 'working') ? 'roadmap' : 'where';
  else if (goal) toast('That career link looks broken. Pick a job below.');

  const prev = currentView;
  showView(view);
  if (view === 'landing') renderLanding();
  if (view === 'where') renderWhere(p);
  if (view === 'roadmap') renderRoadmap(p, { animate: animate || prev !== 'roadmap' });
  if (view === 'quiz') renderQuizView(p);
  if (view === 'explore') { if (prev !== 'explore') exploreCompare = !!p.get('compare'); renderExplore(p); }

  if (prev && prev !== view) {
    const h = $(`#view-${view} h1`);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

/* =========================================================================
   Shared bits
   ========================================================================= */
function sectorDot(s) { return `<span class="s-dot" style="--c:${s.color}" aria-hidden="true"></span>`; }

function roleCardHTML(role, { asButton = false, selected = false } = {}) {
  const s = sectorById[role.sector];
  const inner = `
    <span class="rc-top">${sectorDot(s)}<span>${esc(s.short)}</span><span class="stage-tag">${STAGES[role.stage]}</span></span>
    <span class="rc-title">${esc(role.title)}</span>
    <span class="rc-sum">${esc(role.summary)}</span>
    <span class="rc-foot">${asButton ? (selected ? 'Selected for compare' : 'Tap to compare') : 'See the road →'}</span>`;
  if (asButton) {
    return `<button type="button" class="role-card${selected ? ' selected' : ''}" style="--c:${s.color}" data-id="${role.id}" aria-pressed="${selected}">
      <span class="pick-mark" aria-hidden="true">${selected ? '✓' : ''}</span>${inner}</button>`;
  }
  return `<a class="role-card" style="--c:${s.color}" href="?goal=${role.id}">${inner}</a>`;
}

/** Roles of a sector in road order (entry first), by shortest distance from the entry role. */
function sectorRolesInOrder(sectorId) {
  const list = roles.filter(r => r.sector === sectorId);
  const depth = id => findPaths(roles, id)[0]?.length ?? 99;
  return list.map((r, i) => ({ r, d: depth(r.id), i })).sort((a, b) => a.d - b.d || a.i - b.i).map(x => x.r);
}

/* =========================================================================
   3.1 Landing + search
   ========================================================================= */
let phTimer = null;
let searchIndex = [];

function norm(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ').trim();
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[a.length][b.length];
}
function tokenHits(tok, words) {
  for (const w of words) {
    if (w.startsWith(tok)) return 1;
    if (tok.length >= 4) {
      const tol = tok.length >= 7 ? 2 : 1;
      if (lev(tok, w) <= tol || (w.length > tok.length && lev(tok, w.slice(0, tok.length)) <= 1)) return 0.7;
    }
  }
  return 0;
}
function scoreText(q, qTokens, text) {
  const t = norm(text);
  if (!t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const words = t.split(' ');
  if (words.some(w => w.startsWith(q))) return 80;
  if (q.length >= 4 && t.includes(q)) return 70;
  let sum = 0;
  for (const tok of qTokens) { const h = tokenHits(tok, words); if (!h) return 0; sum += h; }
  return 55 * (sum / qTokens.length);
}

function buildSearchIndex() {
  searchIndex = roles.map(r => {
    const s = sectorById[r.sector];
    return {
      role: r,
      fields: [
        { text: r.title, w: 1 },
        ...r.aka.map(a => ({ text: a, w: 0.92, aka: a })),
        { text: s.name, w: 0.45 }, { text: s.short, w: 0.45 },
      ],
    };
  });
}

export function search(query) {
  const q = norm(query);
  if (!q) return [];
  const qTokens = q.split(' ');
  const out = [];
  for (const item of searchIndex) {
    let best = 0, via = null;
    for (const f of item.fields) {
      const sc = scoreText(q, qTokens, f.text) * f.w;
      if (sc > best) { best = sc; via = f.aka || null; }
    }
    if (best > 0) out.push({ role: item.role, score: best, via });
  }
  out.sort((a, b) => b.score - a.score || STAGE_ORDER[a.role.stage] - STAGE_ORDER[b.role.stage]);
  return out.slice(0, 6);
}

function setupLanding() {
  buildSearchIndex();
  $('#sector-chips').innerHTML = sectors.map(s =>
    `<button type="button" class="chip" data-sector="${s.id}">${sectorDot(s)}<span>${s.emoji} ${esc(s.short)}</span></button>`).join('');
  $$('#sector-chips .chip').forEach(b => b.addEventListener('click', () => openSectorSheet(b.dataset.sector)));
  $('#trending').innerHTML = TRENDING.map(id => roleCardHTML(byId[id])).join('');
  $('#quiz-cta').addEventListener('click', () => go({ view: 'quiz' }));

  const input = $('#search-input');
  const list = $('#search-list');
  const status = $('#search-status');
  let results = [], active = -1;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  const setActive = i => {
    active = i;
    $$('li', list).forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
    if (i >= 0) { input.setAttribute('aria-activedescendant', `opt-${i}`); $(`#opt-${i}`)?.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  };
  const highlight = (text, q) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase().trim());
    if (!q.trim() || i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.trim().length)) + '</mark>' + esc(text.slice(i + q.trim().length));
  };
  const update = () => {
    const q = input.value;
    if (!q.trim()) { close(); status.textContent = ''; return; }
    results = search(q);
    if (!results.length) {
      list.innerHTML = `<li class="empty" role="option" aria-disabled="true" id="opt-none">No match yet — try 'developer', 'security' or 'data'.</li>`;
      status.textContent = 'No match yet. Try developer, security or data.';
    } else {
      list.innerHTML = results.map((r, i) => {
        const s = sectorById[r.role.sector];
        return `<li role="option" id="opt-${i}" data-id="${r.role.id}" aria-selected="false">
          ${sectorDot(s)}
          <span class="opt-main"><span class="opt-title">${highlight(r.role.title, q)}</span>
          ${r.via ? `<span class="opt-aka">aka ${highlight(r.via, q)}</span>` : `<span class="opt-aka">${esc(s.short)}</span>`}</span>
          <span class="opt-stage">${STAGES[r.role.stage]}</span></li>`;
      }).join('');
      status.textContent = `${results.length} ${results.length === 1 ? 'career' : 'careers'} found. Use up and down arrows to choose.`;
    }
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); setActive(-1);
  };
  const choose = id => { close(); input.value = ''; go({ goal: id }); };

  input.addEventListener('input', update);
  input.addEventListener('focus', () => { stopPlaceholder(); if (input.value.trim()) update(); });
  input.addEventListener('blur', () => setTimeout(() => { close(); startPlaceholder(); }, 150));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); if (list.hidden) update(); setActive((active + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(active <= 0 ? results.length - 1 : active - 1); }
    else if (e.key === 'Enter') {
      if (!input.value.trim()) return;
      e.preventDefault();
      const r = results[Math.max(active, 0)];
      if (r) choose(r.role.id);
    } else if (e.key === 'Escape') { close(); }
  });
  list.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
  list.addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) choose(li.dataset.id); });
}

function startPlaceholder() {
  const input = $('#search-input');
  stopPlaceholder();
  if (currentView !== 'landing' || document.activeElement === input) return;
  let i = PLACEHOLDERS.indexOf(input.placeholder);
  phTimer = setInterval(() => {
    i = (i + 1) % PLACEHOLDERS.length;
    input.placeholder = PLACEHOLDERS[i];
  }, reducedMotion() ? 4000 : 2200);
}
function stopPlaceholder() { clearInterval(phTimer); phTimer = null; }

function renderLanding() {
  document.title = `${SITE} · Find your road to an ICT career in Brunei`;
  startPlaceholder();
}

function openSectorSheet(sectorId) {
  const s = sectorById[sectorId];
  $('#sector-sheet-title').textContent = `${s.emoji} ${s.short}`;
  $('#sector-sheet-list').innerHTML = sectorRolesInOrder(sectorId).map(r =>
    `<li><a href="?goal=${r.id}">${sectorDot(s)}<span class="t">${esc(r.title)}</span><span class="st">${STAGES[r.stage]}</span></a></li>`).join('');
  $('#sector-sheet').showModal();
}

/* =========================================================================
   3.2 Where are you now?
   ========================================================================= */
let workingQual = 'hnd';

function setupWhere() {
  const grid = $('#where-choices');
  grid.innerHTML = QUALS.map(q => `
    <button type="button" class="choice" data-from="${q.id}" aria-pressed="false">
      <span class="emoji" aria-hidden="true">${q.emoji}</span>
      <span><span class="c-title">${q.label}</span><span class="c-sub">${q.sub}</span></span>
      <span class="chev" aria-hidden="true">›</span>
    </button>`).join('') + `
    <button type="button" class="choice" id="working-choice" aria-expanded="false" aria-controls="working-panel">
      <span class="emoji" aria-hidden="true">💼</span>
      <span><span class="c-title">Already working</span><span class="c-sub">pick your qualification next</span></span>
      <span class="chev" aria-hidden="true">›</span>
    </button>`;
  $$('[data-from]', grid).forEach(b => b.addEventListener('click', () => {
    lastFrom = { from: b.dataset.from, exp: 0, w: false };
    go({ goal: params().get('goal'), from: b.dataset.from });
  }));
  const wc = $('#working-choice'), panel = $('#working-panel');
  wc.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    wc.setAttribute('aria-expanded', String(open));
    if (open) panel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  });

  const seg = $('#working-quals');
  seg.innerHTML = QUALS.map(q => `<button type="button" role="radio" data-q="${q.id}" aria-checked="false">${q.label}<br><small>${q.sub}</small></button>`).join('');
  const setQ = id => { workingQual = id; $$('button', seg).forEach(b => { const on = b.dataset.q === id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); };
  $$('button', seg).forEach(b => b.addEventListener('click', () => setQ(b.dataset.q)));
  seg.addEventListener('keydown', e => {
    const ids = QUALS.map(q => q.id); let i = ids.indexOf(workingQual);
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) i = (i + 1) % ids.length;
    else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) i = (i - 1 + ids.length) % ids.length;
    else return;
    e.preventDefault(); setQ(ids[i]); $(`[data-q="${ids[i]}"]`, seg).focus();
  });
  setQ(workingQual);

  const slider = $('#exp-slider'), out = $('#exp-out');
  const sync = () => { out.textContent = slider.value === '15' ? '15+' : slider.value; slider.setAttribute('aria-valuetext', `${slider.value} years`); };
  slider.addEventListener('input', sync); sync();
  $('#working-go').addEventListener('click', () => {
    lastFrom = { from: workingQual, exp: +slider.value, w: true };
    go({ goal: params().get('goal'), from: workingQual, exp: +slider.value || undefined, w: 1 });
  });
}

function renderWhere(p) {
  const role = byId[p.get('goal')];
  const s = sectorById[role.sector];
  $('#where-goal').innerHTML = `${sectorDot(s)}<span>🎯 ${esc(role.title)}</span>`;
  document.title = `Road to ${shortTitle(role)} · ${SITE}`;
  $$('#where-choices [data-from]').forEach(b => b.setAttribute('aria-pressed', String(!!lastFrom && !lastFrom.w && lastFrom.from === b.dataset.from)));
  const working = !!lastFrom?.w;
  if (working && lastFrom.from in FROM_BDQF) {
    $(`#working-quals [data-q="${lastFrom.from}"]`)?.click();
    $('#exp-slider').value = String(Math.min(15, lastFrom.exp));
    $('#exp-slider').dispatchEvent(new Event('input'));
  }
  $('#working-panel').hidden = !working;
  $('#working-choice').setAttribute('aria-expanded', String(working));
}

/* =========================================================================
   3.3 Roadmap
   ========================================================================= */
function setupRoadmap() {
  $$('[data-share]').forEach(b => b.addEventListener('click', openShare));
  const list = $('#road-list');
  list.addEventListener('click', e => {
    const btn = e.target.closest('.rnode-btn');
    if (btn) {
      const card = btn.closest('.rnode');
      const open = !card.classList.contains('open');
      const more = $('.rnode-more', card);
      const detail = $('.rnode-detail', card);
      if (open && !detail.childElementCount) {
        detail.innerHTML = detailCache.get(detail.dataset.role) || '';
        void detail.offsetHeight; // let the 0fr → 1fr expand animate from closed
      }
      card.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      more.inert = !open;
      return;
    }
    const br = e.target.closest('[data-route]');
    if (br) {
      const p = Object.fromEntries(params());
      const r = +br.dataset.route;
      if (r) p.r = 1; else delete p.r;
      const y = window.scrollY;
      go(p, { replace: true, scroll: false, animate: false });
      window.scrollTo(0, y);
      $(`[data-route="${r}"]`)?.focus({ preventScroll: true });
    }
  });
}

function userFrom(p) {
  const from = p.get('from');
  const bdqf = from === 'working' ? 5 : FROM_BDQF[from];
  const exp = Math.max(0, Math.min(50, parseInt(p.get('exp') || '0', 10) || 0));
  const working = from === 'working' || p.get('w') === '1' || exp > 0;
  const qual = QUALS.find(q => q.id === from) || QUALS.find(q => q.bdqf === bdqf);
  return { from, bdqf, exp, working, qual };
}

function routeYearsText(r) {
  if (r.years === null || r.years === undefined) return 'some experience or a portfolio';
  if (r.years === 0) return 'no experience needed';
  return `${years(r.years)} experience`;
}

function skillBar([name, level]) {
  const nums = String(level).match(/\d/g)?.map(Number) || [0];
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const label = lo === hi ? `Level ${lo} · ${SKILL_LEVEL_NAMES[lo]}` : `Level ${lo}→${hi} · ${SKILL_LEVEL_NAMES[lo]} → ${SKILL_LEVEL_NAMES[hi]}`;
  const cells = [1, 2, 3, 4, 5].map(i => `<i class="${i <= lo ? 'on' : i <= hi ? 'grow' : ''}"></i>`).join('');
  return `<div><div class="skill-name"><span>${esc(name)}</span><span>${label}</span></div>
    <div class="skill-bar" role="img" aria-label="${esc(name)}: ${label} out of 5">${cells}</div></div>`;
}

function statusBadge(st) {
  switch (st.type) {
    case 'ok': return `<span class="badge ok">✅ ${st.soft ? 'You qualify (with a portfolio)' : 'You qualify now'}</span>`;
    case 'experience': return `<span class="badge experience">⏳ Needs ${years(st.years)} experience</span>`;
    case 'study': return `<span class="badge study">🎓 Needs BDQF ${st.needBdqf}</span>`;
    default: return `<span class="badge info">ℹ️ Details coming soon</span>`;
  }
}

function experienceLine(role, st, user) {
  if (role.unavailable) return '';
  const r = st.route || [...role.routes].sort((a, b) => a.bdqf - b.bdqf)[0];
  const base = r.years === null ? 'Some industry experience, or a relevant portfolio'
    : r.years === 0 ? 'None — you can start here once you meet the qualification'
    : `${years(r.years)} of relevant experience`;
  const routeNote = st.route ? ' on your route' : ` on the BDQF ${r.bdqf} route`;
  let extra = '';
  if (st.type === 'experience') extra = ` You have ${years(user.exp)}, so about ${years(st.years)} to go.`;
  if (st.type === 'ok' && r.years) extra = ' ✔ You have this already.';
  return `<p>${base}${r.years ? routeNote : ''}.${extra}</p>`;
}

function nodeHTML(step, i, n, rm, user) {
  const { role, status: st } = step;
  const s = sectorById[role.sector];
  const isGoal = i === n - 1;
  const yours = st.route;
  let detail;
  if (role.unavailable) {
    detail = `<p>The official BIICF page for this role isn't available yet, so we can't show its requirements.</p>
      <a class="src-link" href="${role.url}" target="_blank" rel="noopener">Check biicf.bn for updates ↗</a>`;
  } else {
    detail = `
      <div><p class="d-label">Qualification</p><ul class="routes">
        ${[...role.routes].sort((a, b) => b.bdqf - a.bdqf).map(r => `<li class="${r === yours ? 'yours' : ''}">${esc(r.note)}
          <span class="yrs">· ${routeYearsText(r)}</span>${r === yours ? '<span class="yours-tag">Your route</span>' : ''}</li>`).join('')}
      </ul></div>
      <div><p class="d-label">Experience needed</p>${experienceLine(role, st, user)}</div>
      <div><p class="d-label">Skills to build</p><div class="skills">${role.skills.map(skillBar).join('')}</div></div>
      <div><p class="d-label">Certifications</p><div class="certs">${role.certs.map(c =>
        `<a class="cert" href="https://www.google.com/search?q=${encodeURIComponent(c + ' certification')}" target="_blank" rel="noopener" aria-label="Search the web for ${esc(c)}">${esc(c)}</a>`).join('')}</div></div>
      <div><p class="d-label">Soft skills</p><p>${esc(role.soft)}</p></div>
      <a class="src-link" href="${role.url}" target="_blank" rel="noopener">Full details on biicf.bn ↗</a>`;
  }
  detailCache.set(role.id, detail); // rendered on first expand (keeps first paint light)
  const corner = st.type === 'experience' ? `<span class="badge experience" aria-hidden="true">⏳ ${st.years} yrs</span>` : '';
  let branch = '';
  if (rm.hasAlt && i === rm.split) {
    const a = byId[rm.mainIds[rm.split + 1]], b = byId[rm.altIds[rm.split + 1]];
    branch = `<div class="branch" role="group" aria-label="The road splits here. Choose a route.">
      <span class="branch-label">🔀 The road splits here</span>
      <div class="branch-seg">
        <button type="button" data-route="0" aria-pressed="${rm.routeIndex === 0}">Route A<small>via ${esc(a.title)}</small></button>
        <button type="button" data-route="1" aria-pressed="${rm.routeIndex === 1}">Route B<small>via ${esc(b.title)}</small></button>
      </div></div>`;
  }
  return `<li class="node${isGoal ? ' goal' : ''}" style="--i:${i + 1 + (rm.study ? 1 : 0)};--c:${s.color}">
    <span class="node-dot" aria-hidden="true">${isGoal ? '★' : i + 1}</span>
    <article class="rnode" style="--c:${s.color}">
      <button type="button" class="rnode-btn" aria-expanded="false" aria-controls="more-${role.id}">
        <span class="rnode-meta"><span>Step ${i + 1} · ${STAGES[role.stage]}${isGoal ? ' · Your goal' : ''}</span>${corner}</span>
        <span class="rnode-title">${esc(role.title)}</span>
        <span class="rnode-sum">${esc(role.summary)}</span>
        <span class="rnode-hint">${statusBadge(st)}</span>
        <span class="rnode-hint"><span class="chev" aria-hidden="true">▸</span> Tap to see how to get here</span>
      </button>
      ${branch ? `<div style="padding:0 16px 14px">${branch}</div>` : ''}
      <div class="rnode-more" id="more-${role.id}" inert><div><div class="rnode-detail" data-role="${role.id}"></div></div></div>
    </article>
  </li>`;
}

function renderSectorMap(rm) {
  const list = roles.filter(r => r.sector === rm.goal.sector);
  const ids = new Set(list.map(r => r.id));
  // longest-path depth from entry roles → columns
  const depth = {};
  const visit = (id, d) => { if ((depth[id] ?? -1) >= d) return; depth[id] = d; byId[id].next.filter(n => ids.has(n)).forEach(n => visit(n, d + 1)); };
  const hasParent = new Set(list.flatMap(r => r.next));
  list.filter(r => !hasParent.has(r.id)).forEach(r => visit(r.id, 0));
  const cols = [];
  list.forEach(r => { (cols[depth[r.id]] ||= []).push(r.id); });
  const colW = 176, boxW = 152, boxH = 34, rowH = 50, padY = 8;
  const maxRows = Math.max(...cols.map(c => c.length));
  const H = maxRows * rowH + padY * 2, W = cols.length * colW;
  const pos = {};
  cols.forEach((c, ci) => c.forEach((id, ri) => {
    const offset = (maxRows - c.length) * rowH / 2;
    pos[id] = { x: ci * colW + 4, y: padY + offset + ri * rowH };
  }));
  const onPath = new Set(rm.ids);
  const onEdge = new Set(rm.ids.slice(1).map((id, i) => rm.ids[i] + '>' + id));
  const label = r => { const t = shortTitle(r) === r.title ? r.title : shortTitle(r); return t.length > 23 ? t.slice(0, 22) + '…' : t; };
  let edges = '', nodes = '';
  list.forEach(r => r.next.filter(n => ids.has(n)).forEach(n => {
    const a = pos[r.id], b = pos[n];
    const x1 = a.x + boxW, y1 = a.y + boxH / 2, x2 = b.x, y2 = b.y + boxH / 2, mx = (x1 + x2) / 2;
    edges += `<path class="sm-edge${onEdge.has(r.id + '>' + n) ? ' on' : ''}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
  }));
  list.forEach(r => {
    const { x, y } = pos[r.id];
    const cls = r.id === rm.goal.id ? ' on goal' : onPath.has(r.id) ? ' on' : '';
    nodes += `<g class="sm-node${cls}"><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="10"/><text x="${x + boxW / 2}" y="${y + boxH / 2 + 4}" text-anchor="middle">${esc(label(r))}</text></g>`;
  });
  const s = sectorById[rm.goal.sector];
  $('#rm-map').innerHTML = `<p class="sm-caption">${esc(s.name)} career map · your road is highlighted</p>
    <svg viewBox="0 0 ${W} ${H}" role="presentation">${edges}${nodes}</svg>`;
}

let drawTimer;
const detailCache = new Map();
function renderRoadmap(p, { animate }) {
  const goal = byId[p.get('goal')];
  const user = userFrom(p);
  const rIdx = p.get('r') === '1' ? 1 : 0;
  const rm = buildRoadmap(roles, goal.id, user.bdqf, user.exp, rIdx);
  const s = sectorById[goal.sector];
  const short = shortTitle(goal);
  document.title = `Road to ${short} · ${SITE}`;

  $('#rm-title').innerHTML = `Your road to <em>${esc(goal.title)}</em>`;
  const fromLabel = user.from === 'working' ? 'Working professional' : user.qual.label;
  lastFrom = { from: user.from, exp: user.exp, w: user.working };
  $('#rm-from').innerHTML = `${user.working ? '💼' : user.qual?.emoji || '🎓'} <span>${esc(fromLabel)}${user.working ? ` · ${user.exp}${user.exp >= 15 ? '+' : ''} yrs experience` : ''}</span>`;

  const y = rm.header.years;
  const yearsText = goal.unavailable ? 'Details coming soon for the top step'
    : y === null ? 'Some experience needed at the top step'
    : y === 0 ? 'No experience needed at the top step'
    : `~${y} ${y === 1 ? "year's" : "years'"} experience needed at the top step`;
  $('#rm-stats').innerHTML = `
    <span class="stat">🪜 <b>${rm.header.steps} ${rm.header.steps === 1 ? 'step' : 'steps'}</b></span>
    <span class="stat">⏱️ <b>${yearsText}</b></span>
    <span class="stat sector" style="--c:${s.color}">${sectorDot(s)}🧭 ${esc(s.short)}</span>`;

  const fast = $('#rm-fast');
  if (rm.furthestOk >= 1) {
    const r = rm.steps[rm.furthestOk].role;
    fast.innerHTML = rm.furthestOk === rm.steps.length - 1
      ? `🎉 Good news: you already meet the requirements for <b>${esc(r.title)}</b>.`
      : `⚡ Fast track: you already meet the requirements up to <b>${esc(r.title)}</b> (step ${rm.furthestOk + 1}).`;
    fast.hidden = false;
  } else fast.hidden = true;

  const n = rm.steps.length;
  let html = `<li class="node here" style="--i:0">
    <span class="node-dot" aria-hidden="true">📍</span>
    <div class="here-card"><span class="label">You are here</span>
      <b>${esc(BDQF_LABEL[user.bdqf])}</b>
      ${user.working ? `${years(user.exp)}${user.exp >= 15 ? '+' : ''} of work experience` : 'Starting out'}</div></li>`;
  if (rm.study) {
    html += `<li class="node study" style="--i:1">
      <span class="node-dot" aria-hidden="true">🎓</span>
      <div class="study-card"><span class="label">🎓 Study step</span>
        <b>${esc(STUDY_TITLE[rm.study.needBdqf] || `Reach BDQF ${rm.study.needBdqf}`)}</b>
        First, level up your qualification to ${esc(BDQF_LABEL[rm.study.needBdqf] || 'BDQF ' + rm.study.needBdqf)}.</div></li>`;
  }
  html += rm.steps.map((st, i) => nodeHTML(st, i, n, rm, user)).join('');
  const listEl = $('#road-list');
  listEl.innerHTML = html;
  renderSectorMap(rm);

  $('#rm-challenge').textContent = `Tag a friend who'd make a great ${short} 👇`;
  $('#rm-compare').setAttribute('href', `?view=explore&compare=${goal.id}`);

  // path draw + node pop-in
  const roadmap = $('#roadmap');
  setTimeout(() => { $('#scroll-hint').hidden = roadmap.scrollWidth <= roadmap.clientWidth + 4; }, 1500);
  clearTimeout(drawTimer);
  roadmap.classList.remove('drawn');
  if (!animate || reducedMotion()) {
    roadmap.classList.add('instant');
    roadmap.classList.add('drawn');
    requestAnimationFrame(() => requestAnimationFrame(() => roadmap.classList.remove('instant')));
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => roadmap.classList.add('drawn')));
    drawTimer = setTimeout(() => confettiOnce(), 1300 + n * 80);
  }

  // stash share data for the share sheet
  const steps = [...(rm.study ? [STUDY_TITLE[rm.study.needBdqf]] : []), ...rm.steps.map(x => x.role.title)];
  const shareParams = { goal: goal.id, from: user.from, exp: user.exp || undefined, w: user.working && user.from !== 'working' ? 1 : undefined, r: rm.routeIndex || undefined };
  currentShare = {
    title: short, slug: goal.id, steps,
    url: siteUrl(shareParams, goal.sector),
    sectorName: s.short, sectorColor: s.color,
    fromLabel: user.qual ? user.qual.label : 'work',
    text: `My road to ${short} 🚀 ${rm.header.steps} steps. What's yours?`,
  };
}
let currentShare = null;
function openShare() { if (currentShare) openShareSheet(currentShare); }

/* =========================================================================
   3.5 Quiz
   ========================================================================= */
function renderQuizView(p) {
  document.title = `30-second career quiz · ${SITE}`;
  renderQuiz($('#quiz-root'), {
    sectors,
    result: p.get('result'),
    starterRoles: id => sectorRolesInOrder(id).slice(0, 3),
    roleCard: r => roleCardHTML(r),
    siteUrl: obj => siteUrl(obj),
    onExit: () => go({}),
    onResult: id => history.replaceState(null, '', `?${buildQuery({ view: 'quiz', result: id, mode: params().get('mode') })}`),
  });
}

/* =========================================================================
   3.6 Explore + Compare
   ========================================================================= */
function setupExplore() {
  $('#explore-sectors').innerHTML = `<button type="button" class="chip light" data-sector="">All</button>` +
    sectors.map(s => `<button type="button" class="chip light" data-sector="${s.id}">${sectorDot(s)}${esc(s.short)}</button>`).join('');
  $('#explore-stages').innerHTML = `<button type="button" class="chip light" data-stage="">All stages</button>` +
    Object.entries(STAGES).map(([k, v]) => `<button type="button" class="chip light" data-stage="${k}">${v}</button>`).join('');

  const update = patch => {
    const p = Object.fromEntries(params());
    Object.assign(p, patch);
    if (!p.compare && p.compare !== '') delete p.compare;
    p.view = 'explore';
    go(p, { replace: true, scroll: false, animate: false });
  };
  $('#explore-sectors').addEventListener('click', e => { const b = e.target.closest('[data-sector]'); if (b) update({ sector: b.dataset.sector }); });
  $('#explore-stages').addEventListener('click', e => { const b = e.target.closest('[data-stage]'); if (b) update({ stage: b.dataset.stage }); });
  $('#compare-toggle').addEventListener('change', e => {
    exploreCompare = e.target.checked;
    if (!exploreCompare) update({ compare: '' });
    else render({ animate: false });
  });
  $('#explore-grid').addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    let sel = (params().get('compare') || '').split(',').filter(id => byId[id]);
    if (sel.includes(b.dataset.id)) sel = sel.filter(x => x !== b.dataset.id);
    else { sel.push(b.dataset.id); if (sel.length > 2) sel = sel.slice(-2); }
    update({ compare: sel.join(',') });
    if (sel.length === 2) setTimeout(() => $('#compare-wrap').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }), 30);
    else $(`#explore-grid [data-id="${b.dataset.id}"]`)?.focus({ preventScroll: true });
  });
}
let exploreCompare = false;

function renderExplore(p) {
  document.title = `Explore all ICT careers · ${SITE}`;
  const sector = p.get('sector') || '';
  const stage = p.get('stage') || '';
  const sel = (p.get('compare') || '').split(',').filter(id => byId[id]).slice(0, 2);
  if (sel.length) exploreCompare = true;
  $('#compare-toggle').checked = exploreCompare;

  $$('#explore-sectors [data-sector]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sector === sector)));
  $$('#explore-stages [data-stage]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stage === stage)));

  const order = sectors.map(s => s.id);
  const list = roles
    .filter(r => (!sector || r.sector === sector) && (!stage || r.stage === stage))
    .sort((a, b) => order.indexOf(a.sector) - order.indexOf(b.sector) || STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
  $('#explore-grid').innerHTML = list.map(r => roleCardHTML(r, { asButton: exploreCompare, selected: sel.includes(r.id) })).join('');
  $('#explore-count').textContent = `${list.length} careers shown`;

  const wrap = $('#compare-wrap');
  wrap.hidden = !exploreCompare;
  if (!exploreCompare) return;
  if (sel.length < 2) {
    wrap.innerHTML = `<p class="compare-hint">${sel.length ? `✓ ${esc(byId[sel[0]].title)} picked. Now pick 1 more career to compare.` : 'Pick 2 careers below to see them side by side.'}</p>`;
    return;
  }
  wrap.innerHTML = compareHTML(byId[sel[0]], byId[sel[1]]);
  $('#compare-copy', wrap).addEventListener('click', async () => {
    if (await copyText(siteUrl({ view: 'explore', compare: sel.join(',') }))) toast('Link copied — send it to a friend 👀');
  });
}

function compareHTML(a, b) {
  const len = r => findPaths(roles, r.id)[0].length;
  const la = len(a), lb = len(b);
  const sa = shortTitle(a), sb = shortTitle(b);
  const verdict = la === lb ? `Both roads are ${la} steps long.`
    : `The road to ${la > lb ? sa : sb} is longer: ${Math.max(la, lb)} steps vs ${Math.min(la, lb)}.`;
  const expText = r => r.unavailable ? 'Details coming soon' :
    [...r.routes].sort((x, y) => y.bdqf - x.bdqf).map(rt => `${rt.bdqf ? 'BDQF ' + rt.bdqf : 'Any qualification'}: ${routeYearsText(rt)}`).join('<br>');
  const minExp = r => r.unavailable ? Infinity : Math.min(...r.routes.map(rt => rt.years ?? 0));
  const ea = minExp(a), eb = minExp(b);
  const col = (r, win) => `<td${win ? ' class="win"' : ''}>`;
  const qual = r => r.unavailable ? 'Details coming soon' :
    `<ul>${[...r.routes].sort((x, y) => y.bdqf - x.bdqf).map(rt => `<li>${esc(rt.note)}</li>`).join('')}</ul>`;
  const skills = r => r.skills.length ? `<ul>${r.skills.slice(0, 3).map(([n, l]) => `<li>${esc(n)} (L${esc(l)})</li>`).join('')}</ul>` : '—';
  const certs = r => r.certs.length ? `<ul>${r.certs.slice(0, 4).map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '—';
  const head = r => `<th scope="col">${sectorDot(sectorById[r.sector])}${esc(r.title)}</th>`;
  return `<div class="compare-card">
    <div class="compare-head"><h2>${esc(sa)} vs ${esc(sb)} — which road is longer?</h2></div>
    <table class="compare-table">
      <caption class="sr-only">${esc(a.title)} compared with ${esc(b.title)}</caption>
      <colgroup><col class="c-label"><col><col></colgroup>
      <thead><tr><td></td>${head(a)}${head(b)}</tr></thead>
      <tbody>
        <tr><th scope="row">Road</th>${col(a, la < lb)}${la} steps from ${esc(byId[findPaths(roles, a.id)[0][0]].title)}</td>${col(b, lb < la)}${lb} steps from ${esc(byId[findPaths(roles, b.id)[0][0]].title)}</td></tr>
        <tr><th scope="row">Sector</th><td>${esc(sectorById[a.sector].short)} · ${STAGES[a.stage]}</td><td>${esc(sectorById[b.sector].short)} · ${STAGES[b.stage]}</td></tr>
        <tr><th scope="row">Qualifi&shy;cation</th><td>${qual(a)}</td><td>${qual(b)}</td></tr>
        <tr><th scope="row">Experience</th>${col(a, ea < eb)}${expText(a)}</td>${col(b, eb < ea)}${expText(b)}</td></tr>
        <tr><th scope="row">Top skills</th><td>${skills(a)}</td><td>${skills(b)}</td></tr>
        <tr><th scope="row">Certifi&shy;cations</th><td>${certs(a)}</td><td>${certs(b)}</td></tr>
      </tbody>
    </table>
    <p style="padding:12px 16px 0;font-weight:600">${esc(verdict)}</p>
    <div class="compare-actions">
      <a class="btn btn-primary" href="?goal=${a.id}">Road to ${esc(sa)}</a>
      <a class="btn btn-primary" href="?goal=${b.id}">Road to ${esc(sb)}</a>
      <button type="button" class="btn btn-outline" id="compare-copy">Copy compare link</button>
    </div>
  </div>`;
}

init();
