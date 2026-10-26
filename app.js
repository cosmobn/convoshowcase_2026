import { buildRoadmap, bestRoute } from './career-model.js';
import { initializeMotion } from './motion.js';
import { initializeCareerFlow } from './career-flow.js';
import { initializeScrollMotion } from './scroll-motion.js';
import { mountSpace } from './space3d.js';

const motion = initializeMotion();
initializeScrollMotion(motion);
mountSpace(motion);
const symbols = {
  bookmark: '<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  graduation: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v6c4 3 8 3 12 0v-6m4-2v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
  play: '<path d="m9 5 10 7-10 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  book: '<path d="M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
};
const icon = name => `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || symbols.compass}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function safeUrl(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? esc(url.href) : '#'; } catch { return '#'; } }
const link = (url, title, cls = 'text-button') => `<a class="${cls}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${title} ${icon('arrow-up-right')}</a>`;
const qualifications = {
  olevel: { label: "O'Level", bdqf: 3, from: 'olevel' },
  btec2: { label: 'BTEC Level 2', bdqf: 3, from: 'olevel', estimated: true },
  btec3: { label: 'BTEC Level 3', bdqf: 4, from: 'alevel', estimated: true },
  alevel: { label: 'A Level / HNTec', bdqf: 4, from: 'alevel' },
  hnd: { label: 'HND / Diploma', bdqf: 5, from: 'hnd' },
  degree: { label: 'Degree', bdqf: 6, from: 'degree' },
};
const sectorDisplay = {
  'apps-solutions': { name: 'Software & Applications', description: 'Build the apps, websites and systems people use every day.' },
  'ict-security': { name: 'Cyber Security', description: 'Protect the systems, information and people we rely on.' },
  'telecom-network': { name: 'Network & Infrastructure', description: 'Connect people, devices and the infrastructure behind them.' },
  'data-ai': { name: 'Data & Artificial Intelligence', description: 'Turn data into insights and explore intelligent systems.' },
  'it-services': { name: 'IT Services', description: 'Support the technology that keeps organisations working.' },
  'digital-media': { name: 'Digital Media', description: 'Bring creative ideas to life through digital content and experiences.' },
};
const stages = { entry: 'ENTRY', mid: 'MID-CAREER', senior: 'SENIOR', top: 'LEADERSHIP' };
const stageOrder = { entry: 0, mid: 1, senior: 2, top: 3 };
function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
const prior = readStorage('pathfinder-profile', {});
const saved = readStorage('pathfinder-saved', []);
const state = { sector: 'ict-security', qualification: Object.hasOwn(qualifications, prior.qualification || prior.from) ? prior.qualification || prior.from : 'olevel', years: Math.max(0, Math.min(50, Math.floor(Number(prior.years) || 0))), goal: typeof prior.goal === 'string' ? prior.goal : 'ciso', route: 0, saved: new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []), dialogMode: '', courseQuery: '' };
let roles = [], courses = [], sectors = [], roleCourses = {}, metadata = {}, toastTimer;
let journeyItems = [], journeyIndex = 0, journeySignature = '';
// The journey plays itself on a loop. It rests while the reader points at or focuses the map, and for a while after they pick a stage.
const autoplay = { visible: false, hover: false, restUntil: 0 };
const JOURNEY_STEP_MS = 1800, JOURNEY_REST_MS = 10000;
let careerFlow;
const row = document.getElementById('pathway-scroll');
const dialog = document.getElementById('detail-dialog');
const detail = document.getElementById('detail-content');
function persistProfile() { const qualification = qualifications[state.qualification]; persist('pathfinder-profile', { qualification: state.qualification, from: qualification.from, years: state.years, goal: state.goal, sector: state.sector }); }
function sectorRoles() { return roles.filter(role => role.sector === state.sector).sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4)); }
function defaultGoal(items) { return [...items].sort((a, b) => (stageOrder[b.stage] ?? 0) - (stageOrder[a.stage] ?? 0))[0]?.id; }
function readLocation() {
  const params = new URLSearchParams(location.search);
  if (params.has('q') && Object.hasOwn(qualifications, params.get('q'))) state.qualification = params.get('q');
  else if (params.has('from')) { const value = params.get('from') === 'working' ? 'hnd' : params.get('from'); if (Object.hasOwn(qualifications, value)) state.qualification = value; }
  if (params.has('exp')) state.years = /^\d+$/.test(params.get('exp')) ? Math.min(50, Number(params.get('exp'))) : 0;
  const goal = roles.find(role => role.id === params.get('goal'));
  const requestedSector = params.get('sector');
  if (requestedSector && Object.hasOwn(sectorDisplay, requestedSector)) state.sector = requestedSector;
  else if (goal) state.sector = goal.sector;
  if (goal && goal.sector === state.sector) state.goal = goal.id;
  if (!sectorRoles().some(role => role.id === state.goal)) state.goal = defaultGoal(sectorRoles());
  state.route = params.get('r') === '1' ? 1 : 0;
}
function updateLocation(push = false) {
  const url = new URL(location.href);
  // Keep the selection flow in the URL while profile and pathway choices change.
  for (const name of [...url.searchParams.keys()]) if (!['screen', 'field', 'career'].includes(name)) url.searchParams.delete(name);
  url.searchParams.set('sector', state.sector);
  url.searchParams.set('from', qualifications[state.qualification].from);
  if (qualifications[state.qualification].estimated) url.searchParams.set('q', state.qualification);
  url.searchParams.set('exp', state.years);
  if (state.goal) url.searchParams.set('goal', state.goal);
  if (url.searchParams.get('screen') === 'journey') {
    if (state.goal) url.searchParams.set('career', state.goal); else url.searchParams.delete('career');
    url.searchParams.set('field', state.sector === 'digital-media' ? 'creative' : 'it');
  }
  if (state.route) url.searchParams.set('r', '1');
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}
function notify(message) {
  const toast = document.getElementById('toast'); toast.textContent = message; toast.hidden = false;
  motion.toast(toast); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}
function fillIcons() { document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); }); }
function updateProfile() {
  document.querySelectorAll('[data-qualification]').forEach(button => { const selected = button.dataset.qualification === state.qualification; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
  document.getElementById('qualification-note').hidden = !qualifications[state.qualification].estimated;
  const slider = document.getElementById('experience-slider'); slider.value = state.years; slider.style.setProperty('--range-progress', `${state.years / 50 * 100}%`); slider.setAttribute('aria-valuetext', `${state.years} ${state.years === 1 ? 'year' : 'years'} of relevant experience`);
  document.getElementById('experience-output').value = state.years;
}
function updateSavedButtons() {
  document.getElementById('saved-count').textContent = state.saved.size;
  document.querySelectorAll('[data-save]').forEach(button => {
    const selected = state.saved.has(button.dataset.save); button.classList.toggle('saved', selected); button.setAttribute('aria-pressed', String(selected));
    const role = roles.find(item => item.id === button.dataset.save);
    button.setAttribute('aria-label', `${selected ? 'Unsave' : 'Save'} ${role?.title || 'career'}`);
    if (button.classList.contains('save-action')) button.innerHTML = `${icon('bookmark')}${selected ? 'Saved career' : 'Save career'}`;
  });
}
function referenceRoute(role) { return bestRoute(role, qualifications[state.qualification].bdqf) || [...(role.routes || [])].sort((a, b) => a.bdqf - b.bdqf || (a.years ?? 0) - (b.years ?? 0))[0]; }
function badge(status) {
  if (status.type === 'ok' && !status.soft) return `<span class="status-badge status-ready">${icon('check')}Ready now*</span>`;
  if (status.type === 'ok') return `<span class="status-badge status-experience">${icon('info')}Check experience / portfolio</span>`;
  if (status.type === 'experience') return `<span class="status-badge status-experience">${icon('info')}${status.years} more ${status.years === 1 ? 'year' : 'years'} needed</span>`;
  if (status.type === 'study') return `<span class="status-badge status-study">${icon('graduation')}Study to BDQF ${status.needBdqf}</span>`;
  return '<span class="status-badge status-info">Details coming soon</span>';
}
function skillsMarkup(skills, all = false) {
  return `<span class="skill-rows">${(all ? skills : skills.slice(0, 3)).map(([name, level]) => { const rank = Math.max(0, Math.min(5, Number(level) || 0)); return `<span class="skill-row"><span class="skill-name">${esc(name)}</span><span class="skill-track" aria-hidden="true"><span class="skill-fill" style="--skill-level:${rank / 5 * 100}%"></span></span><span class="skill-level" aria-label="Skill level ${rank}">${esc(level)}</span></span>`; }).join('')}</span>`;
}
function pathwayCard(role, status, index, nextRole) {
  const route = referenceRoute(role);
  const experience = route ? route.years === null ? 'Experience / portfolio' : route.years === 0 ? 'No experience needed' : `${route.years} years` : 'Not published';
  return `<div class="path-node"><article class="pathway-card ${role.id === state.goal ? 'is-goal' : ''}" data-role-card="${esc(role.id)}"><button class="card-open" data-detail="${esc(role.id)}" aria-label="Open ${esc(role.title)} details"><span class="card-header"><span class="card-evolution" aria-hidden="true"><span class="character-sprite" data-character-level="${characterFrame(role)}" style="--character-frame:${characterFrame(role)}"></span></span><span class="step-marker">${index + 1}</span><span class="stage-label">${esc(stages[role.stage] || role.stage)}</span><span class="card-title">${esc(role.title)}</span></span><span class="card-body">${badge(status)}<span class="requirements"><span class="requirement-row"><span>Qualification</span><b>${route ? `BDQF ${route.bdqf}` : 'Not published'}</b></span><span class="requirement-row"><span>Experience</span><b>${esc(experience)}</b></span><span class="requirement-row"><span>Certifications</span><b>${role.unavailable ? 'Not published' : `${role.certs.length} recommended`}</b></span></span>${role.skills.length ? skillsMarkup(role.skills) : '<span class="pending-skills">Skills and requirements have not been published for this role.</span>'}</span><span class="card-footer"><span>${nextRole ? 'Next up' : 'DESTINATION'}</span><strong class="next-role">${nextRole ? esc(nextRole.title) : 'Your goal'}</strong></span></button><button class="card-save ${state.saved.has(role.id) ? 'saved' : ''}" data-save="${esc(role.id)}" aria-pressed="${state.saved.has(role.id)}" aria-label="${state.saved.has(role.id) ? 'Unsave' : 'Save'} ${esc(role.title)}">${icon('bookmark')}</button></article></div>`;
}
function characterFrame(role) {
  const frames = { 'associate-security-analyst': 1, 'cyber-risk-analyst': 2, 'security-engineer': 3, 'cyber-risk-manager': 4, ciso: 5 };
  return role ? frames[role.id] ?? ({ entry: 1, mid: 2, senior: 4, top: 5 }[role.stage] ?? 1) : 0;
}
function restJourney() { autoplay.restUntil = Date.now() + JOURNEY_REST_MS; }
function journeyCanPlay() {
  const panel = document.getElementById('journey-panel');
  return motion.enabled && autoplay.visible && !autoplay.hover && !document.hidden && !dialog.open && journeyItems.length > 1 && !panel.hidden && !document.getElementById('career-experience').hidden && !panel.querySelector(':focus-visible') && Date.now() >= autoplay.restUntil;
}
function advanceJourney() {
  if (journeyCanPlay()) selectJourneyStage((journeyIndex + 1) % journeyItems.length, { scroll: true });
  setTimeout(advanceJourney, JOURNEY_STEP_MS);
}
function statusNarrative(status) {
  if (status.type === 'study') return `Your next move: study toward BDQF ${status.needBdqf}, then check the subject and experience requirements for this role.`;
  if (status.type === 'experience') return `Your qualification level matches a route. Build ${status.years} more ${status.years === 1 ? 'year' : 'years'} of relevant experience and check its other conditions.`;
  if (status.type === 'ok' && !status.soft) return 'Your level and years match an entry route. Explore the required subjects, certifications and skills before taking your next step.';
  if (status.type === 'ok') return 'Your level matches an entry route. Relevant experience or a portfolio is also required; check the complete conditions.';
  return 'This role is included in the source, but its full entry requirements have not been published yet.';
}
function selectJourneyStage(index, { scroll = false, reveal = false } = {}) {
  journeyIndex = Math.max(0, Math.min(journeyItems.length - 1, index));
  const item = journeyItems[journeyIndex]; if (!item) return;
  const track = document.getElementById('evolution-track');
  track.querySelectorAll('[data-evolution]').forEach((button, position) => { button.classList.toggle('is-current', position === journeyIndex); button.classList.toggle('is-passed', position < journeyIndex); button.setAttribute('aria-pressed', String(position === journeyIndex)); });
  document.getElementById('journey-prev').disabled = journeyIndex === 0;
  document.getElementById('journey-next').disabled = journeyIndex === journeyItems.length - 1;
  const qualification = qualifications[state.qualification];
  const title = item.role?.title || 'You, today. Your story starts here.';
  const copy = item.role ? statusNarrative(item.status) : `${qualification.label} (BDQF ${qualification.bdqf}${qualification.estimated ? ', estimated' : ''}) · ${state.years} ${state.years === 1 ? 'year' : 'years'} of relevant experience. Build on what you know and explore the steps ahead.`;
  document.getElementById('journey-insight').innerHTML = `<span class="insight-portrait" aria-hidden="true"><span class="character-sprite" data-character-level="${characterFrame(item.role)}" style="--character-frame:${characterFrame(item.role)}"></span></span><div class="insight-copy"><small>${item.role ? `STAGE ${String(journeyIndex + 1).padStart(2, '0')} · ${esc(stages[item.role.stage] || 'CAREER')}` : 'YOUR STARTING POINT'}</small><strong>${esc(title)}</strong><p>${item.role ? `${esc(item.role.summary)} ` : ''}${esc(copy)}</p></div><button class="button button-secondary" ${item.role ? `data-detail="${esc(item.role.id)}"` : 'data-courses'}>${item.role ? 'Explore this role' : 'Find a course'} ${icon('arrow-up-right')}</button>`;
  row.querySelectorAll('[data-role-card]').forEach(card => card.classList.toggle('is-highlighted', card.dataset.roleCard === item.role?.id));
  if (scroll) {
    const button = track.querySelector(`[data-evolution="${journeyIndex}"]`);
    const left = track.scrollLeft + button.getBoundingClientRect().left - track.getBoundingClientRect().left - (track.clientWidth - button.clientWidth) / 2;
    track.scrollTo({ left, behavior: motion.enabled ? 'smooth' : 'instant' });
  }
  if (reveal) {
    const card = item.role ? [...row.querySelectorAll('[data-role-card]')].find(card => card.dataset.roleCard === item.role.id) : row.firstElementChild;
    if (card) row.scrollTo({ left: row.scrollLeft + card.getBoundingClientRect().left - row.getBoundingClientRect().left - 8, behavior: motion.enabled ? 'smooth' : 'instant' });
  }
}
function renderEvolution(roadmap) {
  const panel = document.getElementById('journey-panel'); panel.hidden = !roadmap;
  const preview = document.querySelector('.future-preview'); preview.hidden = !roadmap;
  document.querySelector('.requirements-heading').hidden = !roadmap;
  if (!roadmap) { journeyItems = []; journeySignature = ''; return; }
  const goal = roadmap.steps.at(-1).role;
  document.getElementById('future-character').style.setProperty('--character-frame', characterFrame(goal));
  document.getElementById('future-character').dataset.characterLevel = characterFrame(goal);
  document.getElementById('future-title').textContent = goal.title;
  document.getElementById('future-stage').textContent = stages[goal.stage] || 'YOUR GOAL';
  const signature = roadmap.ids.join(',');
  if (signature !== journeySignature) { journeyIndex = 0; journeySignature = signature; }
  journeyItems = [{ role: null }, ...roadmap.steps];
  const track = document.getElementById('evolution-track'); const scrollLeft = track.scrollLeft;
  track.style.setProperty('--journey-count', journeyItems.length);
  // Keep stage controls stable while qualification or experience changes.
  if (track.dataset.route !== signature) {
    track.innerHTML = journeyItems.map((item, index) => `<button class="evolution-step" data-evolution="${index}" aria-pressed="false" aria-label="Explore stage ${index + 1}: ${esc(item.role?.title || 'Your starting point')}"><span class="evolution-level">${String(index + 1).padStart(2, '0')}</span><span class="evolution-portrait" aria-hidden="true"><span class="character-sprite" data-character-level="${characterFrame(item.role)}" style="--character-frame:${characterFrame(item.role)}"></span></span><span class="evolution-node" aria-hidden="true">${index === journeyItems.length - 1 ? icon('check') : ''}</span><span class="evolution-label">${item.role ? esc(stages[item.role.stage] || 'CAREER') : 'YOU ARE HERE'}</span><span class="evolution-role">${esc(item.role?.title || 'The beginning')}</span></button>`).join('');
    track.dataset.route = signature; track.scrollLeft = 0;
  } else track.scrollLeft = scrollLeft;
  document.getElementById('route-steps').textContent = roadmap.steps.length;
  document.getElementById('route-ready').textContent = roadmap.steps.filter(step => step.status.type === 'ok' && !step.status.soft).length;
  const next = roadmap.steps.find(step => step.status.type !== 'ok' || step.status.soft);
  document.getElementById('route-focus').textContent = next?.status.type === 'study' ? `BDQF ${next.status.needBdqf}` : next?.status.type === 'experience' ? `+${next.status.years} ${next.status.years === 1 ? 'year' : 'years'}` : next ? 'Explore' : 'Skills';
  document.getElementById('route-focus-label').textContent = next?.status.type === 'study' ? 'next study milestone' : next?.status.type === 'experience' ? 'next experience milestone' : next ? 'check role conditions' : 'check all role conditions';
  selectJourneyStage(journeyIndex);
}
function startingCard(roadmap) {
  const qualification = qualifications[state.qualification];
  const study = roadmap.study;
  return `<article class="${study ? 'study-card' : 'starting-card'}"><span class="study-icon">${icon(study ? 'graduation' : 'check')}</span><h3>${study ? 'Study step' : 'Your starting point'}</h3><p>From ${esc(qualification.label)} (BDQF ${qualification.bdqf}${qualification.estimated ? ', estimated' : ''})${study ? ', you need a higher qualification before this route starts.' : `, explore the steps ahead with ${state.years} ${state.years === 1 ? 'year' : 'years'} of relevant experience.`}</p><div class="study-target">${study ? `Study toward <strong>BDQF ${study.needBdqf}</strong>.<br>Check the subjects and entry conditions for your chosen role.` : `<strong>Start where you are.</strong><br>Build the skills and experience for your next step.`}</div><button class="study-courses" data-courses>Explore linked courses ${icon('arrow-right')}</button>${qualification.estimated ? '<p class="study-note">Estimated level — confirm with COSMO.</p>' : ''}</article>`;
}
function renderPathway({ keepScroll = false } = {}) {
  if (!roles.length) return;
  const scrollLeft = keepScroll ? row.scrollLeft : 0;
  updateProfile(); updateSavedButtons();
  const sector = sectorDisplay[state.sector];
  document.getElementById('pathway-title').textContent = `${sector.name} pathway`;
  document.getElementById('sector-description').textContent = sector.description;
  document.querySelectorAll('[data-sector]').forEach(button => { const active = button.dataset.sector === state.sector; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  document.getElementById('more-sectors').value = ['it-services', 'digital-media'].includes(state.sector) ? state.sector : '';
  const available = sectorRoles();
  const select = document.getElementById('goal-select');
  document.getElementById('goal-control').hidden = !available.length;
  select.disabled = !available.length;
  const optionSignature = available.map(role => role.id).join(',');
  if (select.dataset.options !== optionSignature) { select.innerHTML = available.map(role => `<option value="${esc(role.id)}">${esc(role.title)}</option>`).join(''); select.dataset.options = optionSignature; }
  if (!available.some(role => role.id === state.goal)) state.goal = defaultGoal(available);
  if (state.goal) select.value = state.goal;
  const roadmap = state.goal ? buildRoadmap(roles, state.goal, qualifications[state.qualification].bdqf, state.years, state.route) : null;
  const switcher = document.getElementById('route-switch'); switcher.hidden = !roadmap?.hasAlt;
  switcher.innerHTML = roadmap?.hasAlt ? [0, 1].map(index => `<button class="route-button ${roadmap.routeIndex === index ? 'active' : ''}" data-route="${index}" aria-pressed="${roadmap.routeIndex === index}">Route ${index ? 'B' : 'A'}</button>`).join('') : '';
  document.getElementById('share-button').disabled = !roadmap;
  row.innerHTML = roadmap ? startingCard(roadmap) + roadmap.steps.map(({ role, status }, index) => pathwayCard(role, status, index, roadmap.steps[index + 1]?.role)).join('') : `<div class="empty-state"><span class="empty-icon">${icon('compass')}</span><h3>This pathway is waiting for its data.</h3><p>The supplied specification has no complete ${esc(sector.name)} role examples. Choose Cyber Security to explore the available progression and requirements.</p><button class="button button-primary" data-sector="ict-security">Explore Cyber Security ${icon('arrow-right')}</button></div>`;
  row.scrollLeft = scrollLeft;
  renderEvolution(roadmap);
  motion.refresh(row, { animate: !keepScroll });
}
function changeSector(sector) { if (!Object.hasOwn(sectorDisplay, sector)) return; state.sector = sector; state.goal = defaultGoal(sectorRoles()); state.route = 0; persistProfile(); renderPathway(); updateLocation(true); }
function linkedCourses(id) {
  const detailed = courses.flatMap(course => (course.careerLinks || []).filter(item => item.role === id).map(item => ({ ...item, course: course.id, title: course.title, type: course.type, url: course.url, bdqfSource: course.bdqfSource })));
  const ids = new Set(detailed.map(course => course.course));
  return [...detailed, ...(roleCourses[id] || []).filter(course => !ids.has(course.course))];
}
function fitText(course) { if (course.fit === 'builds-skills') return 'Builds skills; not an entry qualification.'; if (course.fit === 'with-experience') return `Qualification route; ${course.years} years of experience also required.`; if (course.fit === 'needs-experience-or-portfolio') return 'Experience or a portfolio is also required.'; return 'Meets a qualification route; all subject and certification conditions still apply.'; }
function courseLink(course) { return `<a class="course-link" href="${safeUrl(course.url)}" target="_blank" rel="noopener noreferrer"><span class="course-link-icon">${icon('graduation')}</span><span><strong>${esc(course.title)}</strong><small>${esc(fitText(course))}</small>${course.why ? `<small>${esc(course.why)}</small>` : ''}${course.bdqfSource === 'estimated' ? '<small>Estimated BDQF — confirm with COSMO.</small>' : ''}</span>${icon('arrow-up-right')}</a>`; }
function openDialog(markup, mode) { state.dialogMode = mode; detail.innerHTML = markup; if (!dialog.open) dialog.showModal(); dialog.scrollTop = 0; document.getElementById('close-detail').focus({ preventScroll: true }); motion.refresh(dialog); }
function dialogHeader(kicker, title, description = '') { return `<header class="detail-header"><span class="detail-kicker">${kicker}</span><h2 id="detail-title">${title}</h2>${description ? `<p>${description}</p>` : ''}</header>`; }
function openRole(id) {
  const role = roles.find(item => item.id === id); if (!role) return;
  const linked = linkedCourses(id);
  openDialog(dialogHeader(`${esc(sectorDisplay[role.sector]?.name || 'ICT')} · ${esc(stages[role.stage])}`, esc(role.title), esc(role.summary)) + `<div class="detail-body"><div class="dialog-actions"><button class="button button-primary" data-goal="${esc(role.id)}">Make this my goal ${icon('arrow-right')}</button><button class="button button-secondary save-action" data-save="${esc(role.id)}" aria-pressed="${state.saved.has(id)}">${icon('bookmark')}${state.saved.has(id) ? 'Saved career' : 'Save career'}</button></div>${role.aka?.length ? `<p class="also-known">Also known as: ${esc(role.aka.join(', '))}</p>` : ''}${role.unavailable ? '<section class="detail-section"><h3>Details coming soon</h3><p>The official source has not published the entry requirements, skills or certifications for this role.</p></section>' : `<section class="detail-section"><h3>Ways into this role</h3><p>These are alternative routes. Check all the conditions in the route that applies to you.</p>${role.routes.map(route => `<div class="entry-route"><div><span class="tag">BDQF ${route.bdqf}</span><strong>${route.years === null ? 'Experience / portfolio required' : route.years === 0 ? 'No minimum years stated' : `${route.years} years of experience`}</strong></div><p>${esc(route.note)}</p></div>`).join('')}</section><section class="detail-section"><h3>Full skills profile</h3><div class="skill-list">${skillsMarkup(role.skills, true)}</div>${role.soft ? `<p>Soft skills: ${esc(role.soft)}</p>` : ''}</section><section class="detail-section"><h3>Recommended certifications</h3><div class="cert-list">${role.certs.map(cert => `<span class="tag">${esc(cert)}</span>`).join('') || '<p>No certifications published.</p>'}</div></section>`}<section class="detail-section"><h3>Connected courses</h3>${linked.length ? linked.map(courseLink).join('') : '<p>No connected courses are included in the available data.</p>'}</section><section class="detail-section source-note">${link(role.url, 'View official BIICF requirements')}<p>Level and years indicators are guidance. Relevant subjects, certifications and portfolio requirements still apply. Experience is cumulative across your career.</p></section></div>`, 'role');
  updateSavedButtons();
}
function openCourses() {
  state.courseQuery = '';
  openDialog(dialogHeader('LEARN FOR YOUR NEXT STEP', 'Explore COSMO courses', 'Connect learning with the career you want.') + `<div class="detail-body"><label class="sr-only" for="course-search">Search courses</label><input type="search" class="catalog-search" id="course-search" placeholder="Find a course or qualification…"><div class="catalog-grid" id="catalog-grid"></div><p class="source-note">Check current fees, intakes and entry requirements directly with COSMO. Short courses build skills and do not replace entry qualifications.</p></div>`, 'courses');
  renderCourses();
}
function renderCourses() {
  const matches = courses.filter(course => `${course.title} ${course.area}`.toLowerCase().includes(state.courseQuery.toLowerCase().trim()));
  document.getElementById('catalog-grid').innerHTML = matches.length ? matches.map(course => `<article class="course-card"><span class="course-type">${course.type === 'short-course' ? 'SHORT COURSE' : 'QUALIFICATION'}</span><h3>${esc(course.title)}</h3><div class="role-tags"><span class="tag">${course.bdqf ? `BDQF ${course.bdqf}${course.bdqfSource === 'estimated' ? ' · estimated' : ''}` : 'Skills development'}</span></div><p>${esc(course.note || (course.type === 'short-course' ? 'Build focused, practical skills for your next step.' : `A qualification from ${course.provider}. Check all entry requirements with the provider.`))}</p>${course.bdqfSource === 'estimated' ? '<p class="source-note">Estimated BDQF level — confirm with COSMO.</p>' : ''}${link(course.url, 'View course')}</article>`).join('') : '<div class="empty-state"><h3>No courses found.</h3><p>Try a broader search.</p></div>';
  motion.refresh(document.getElementById('catalog-grid'));
}
function openSaved() { const items = roles.filter(role => state.saved.has(role.id)); openDialog(dialogHeader('YOUR SHORTLIST', 'Saved careers', 'Keep the roles that interest you in one place.') + `<div class="detail-body">${items.length ? items.map(role => `<div class="saved-role"><button class="saved-role-open" data-detail="${esc(role.id)}"><strong>${esc(role.title)}</strong><span>${esc(sectorDisplay[role.sector]?.name || 'ICT')}</span></button><button class="icon-button" data-save="${esc(role.id)}" aria-label="Unsave ${esc(role.title)}">${icon('bookmark')}</button></div>`).join('') : '<div class="empty-state"><h3>Your next chapter is still unwritten.</h3><p>Use the bookmark on any pathway card to save a career here.</p></div>'}</div>`, 'saved'); updateSavedButtons(); }
function openAbout() { openDialog(dialogHeader('ABOUT THIS GUIDE', 'A clearer starting point.') + `<div class="detail-body"><section class="detail-section"><h3>Where the data comes from</h3><p>This unofficial student guide uses the ${link('https://ccctmacademy.edu.bn/showcase_2026/openapi.json', 'supplied OpenAPI specification')} and its BIICF-derived career information.</p><p>${metadata.mode === 'spec-examples' ? `The full data endpoints returned 404 errors when the data was retrieved. This version contains ${roles.length} complete role examples and ${courses.length} complete course examples from the specification. Empty sectors are shown without invented career requirements.` : 'The page uses a locally bundled snapshot of the public career datasets.'}</p></section><section class="detail-section"><h3>How to read the pathway</h3><p>The cards follow the source's career progression links. The qualification and experience fields describe the same entry route. Ready now checks level and years only; subject, certification, portfolio and other entry conditions still apply. Experience is cumulative and is never added across steps.</p><p>BTEC equivalences marked with an asterisk are estimated and must be confirmed with COSMO. This guide is not affiliated with AITI, MISC or BIICF.</p></section><section class="detail-section"><h3>Your choices stay in this browser</h3><p>Bookmarks, qualification choices and the animation preference are stored locally. No account is needed.</p></section><div class="dialog-actions">${link('https://www.biicf.bn', 'Official BIICF framework', 'button button-primary')}${link('https://cosmo.edu.bn', 'COSMO courses', 'button button-secondary')}</div></div>`, 'about'); }

document.addEventListener('click', async event => {
  const evolution = event.target.closest('[data-evolution]');
  if (evolution) { restJourney(); selectJourneyStage(Number(evolution.dataset.evolution), { scroll: true, reveal: true }); return; }
  const qualification = event.target.closest('[data-qualification]');
  if (qualification) { state.qualification = qualification.dataset.qualification; persistProfile(); renderPathway({ keepScroll: true }); updateLocation(); return; }
  const sector = event.target.closest('[data-sector]'); if (sector) { changeSector(sector.dataset.sector); return; }
  const save = event.target.closest('[data-save]');
  if (save) { const id = save.dataset.save; const removing = state.saved.has(id); if (removing) state.saved.delete(id); else state.saved.add(id); const stored = persist('pathfinder-saved', [...state.saved]); updateSavedButtons(); motion.saved(save); if (state.dialogMode === 'saved' && dialog.open) openSaved(); notify(`${removing ? 'Career removed from your shortlist.' : 'Career saved to your shortlist.'}${stored ? '' : ' Kept for this visit; browser storage is unavailable.'}`); return; }
  const role = event.target.closest('[data-detail]'); if (role) { openRole(role.dataset.detail); return; }
  const goal = event.target.closest('[data-goal]'); if (goal) { const selected = roles.find(item => item.id === goal.dataset.goal); if (!selected) return; state.sector = selected.sector; state.goal = selected.id; state.route = 0; dialog.close(); persistProfile(); renderPathway(); updateLocation(true); document.getElementById('goal-select').focus({ preventScroll: true }); return; }
  const route = event.target.closest('[data-route]'); if (route) { state.route = Number(route.dataset.route); renderPathway(); updateLocation(); return; }
  if (event.target.closest('[data-courses]')) openCourses();
});
document.getElementById('journey-prev').addEventListener('click', () => { restJourney(); selectJourneyStage(journeyIndex - 1, { scroll: true, reveal: true }); });
document.getElementById('journey-next').addEventListener('click', () => { restJourney(); selectJourneyStage(journeyIndex + 1, { scroll: true, reveal: true }); });
document.getElementById('evolution-track').addEventListener('keydown', event => {
  const button = event.target.closest('[data-evolution]');
  if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault(); restJourney();
  const index = Number(button.dataset.evolution);
  selectJourneyStage(event.key === 'Home' ? 0 : event.key === 'End' ? journeyItems.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1), { scroll: true, reveal: true });
  document.querySelector(`[data-evolution="${journeyIndex}"]`).focus({ preventScroll: true });
});
{
  const panel = document.getElementById('journey-panel');
  panel.addEventListener('pointerenter', () => { autoplay.hover = true; });
  panel.addEventListener('pointerleave', () => { autoplay.hover = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { autoplay.visible = entry.isIntersecting; }, { threshold: .35 }).observe(panel);
  else autoplay.visible = true;
  setTimeout(advanceJourney, JOURNEY_STEP_MS);
}
document.querySelector('.hero-cta').addEventListener('click', event => {
  event.preventDefault(); const target = document.getElementById('journey-panel').hidden ? document.getElementById('main-content') : document.getElementById('journey-panel');
  target.scrollIntoView({ behavior: motion.enabled ? 'smooth' : 'instant', block: 'start' }); target.focus({ preventScroll: true });
});
document.getElementById('experience-slider').addEventListener('input', event => { state.years = Math.max(0, Math.min(50, Math.floor(Number(event.target.value) || 0))); persistProfile(); renderPathway({ keepScroll: true }); updateLocation(); });
document.getElementById('goal-select').addEventListener('change', event => { state.goal = event.target.value; state.route = 0; persistProfile(); renderPathway(); updateLocation(true); });
document.getElementById('more-sectors').addEventListener('change', event => { if (event.target.value) changeSector(event.target.value); });
document.getElementById('sector-tabs').addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; const buttons = [...document.querySelectorAll('#sector-tabs [data-sector]')]; const current = buttons.indexOf(document.activeElement); if (current < 0) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; buttons[next].focus(); buttons[next].click(); });
row.addEventListener('keydown', event => { if (event.target !== row || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const left = event.key === 'Home' ? 0 : event.key === 'End' ? row.scrollWidth : row.scrollLeft + (event.key === 'ArrowRight' ? 248 : -248); row.scrollTo({ left, behavior: motion.enabled ? 'smooth' : 'instant' }); });
document.getElementById('courses-button').addEventListener('click', openCourses);
document.getElementById('saved-button').addEventListener('click', openSaved);
document.getElementById('about-button').addEventListener('click', openAbout);
document.getElementById('share-button').addEventListener('click', async () => { updateLocation(); try { await navigator.clipboard.writeText(location.href); notify('Pathway link copied.'); } catch { openDialog(dialogHeader('SHARE YOUR NEXT STEP', 'Share this pathway') + `<div class="detail-body"><p>Copy this link to return to these qualification, experience and goal choices.</p><input class="share-url" aria-label="Pathway link" readonly value="${esc(location.href)}"></div>`, 'share'); const input = dialog.querySelector('.share-url'); input.focus(); input.select(); } });
document.getElementById('close-detail').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
dialog.addEventListener('close', () => { state.dialogMode = ''; });
document.addEventListener('input', event => { if (event.target.id === 'course-search') { state.courseQuery = event.target.value; renderCourses(); } });
window.addEventListener('popstate', () => { readLocation(); renderPathway(); careerFlow?.syncFromLocation({ focus: true }); });
fillIcons(); updateProfile();
async function loadData() {
  const notice = document.getElementById('data-notice');
  try {
    const data = await Promise.all(['roles', 'sectors', 'courses', 'role-courses', 'metadata'].map(async name => { const response = await fetch(`./data/${name}.json`); if (!response.ok) throw new Error(`Unable to load ${name}`); return response.json(); }));
    [roles, sectors, courses, roleCourses, metadata] = data;
    if (!Array.isArray(roles) || !roles.length || !Array.isArray(courses) || !Array.isArray(sectors)) throw new Error('Invalid pathway data');
    state.saved = new Set([...state.saved].filter(id => roles.some(role => role.id === id)));
    readLocation(); renderPathway();
    careerFlow = initializeCareerFlow({
      roles, sectorDisplay, characterFrame, icon, esc, motion,
      onStart(role) {
        state.sector = role.sector; state.goal = role.id; state.route = 0;
        persistProfile(); renderPathway(); updateLocation();
      },
      onLeaveJourney() { if (dialog.open) dialog.close(); },
    });
    careerFlow.syncFromLocation();
    notice.innerHTML = `${metadata.mode === 'spec-examples' ? `<strong>Preview data:</strong> ${roles.length} role examples and ${courses.length} course examples from the specification. Full dataset links were unavailable when this snapshot was retrieved. ` : ''}<span>*Ready now checks qualification level and years only. All other route requirements still apply.</span>`;
    motion.refresh(document);
  } catch { row.innerHTML = '<div class="empty-state"><h3>The pathway data could not be loaded.</h3><p>Please refresh the page to try again.</p></div>'; notice.textContent = 'Use an HTTP server to open this page and its data files.'; document.getElementById('flow-content').innerHTML = '<section class="flow-screen flow-empty"><h1 id="flow-title" tabindex="-1">Your future is still ahead.</h1><p>The career data could not be loaded. Refresh the page to try again.</p><a class="button button-primary" href="./">Try again</a></section>'; }
}
loadData();
