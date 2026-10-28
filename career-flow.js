/** The career chooser is a URL-driven introduction to the existing pathway. */
import { mountHero3d } from './hero3d.js';
import { quizFields, fieldQuiz, NONE, MISMATCH_AT, rankGroups, bestField } from './career-quiz.js';
import { pieChart, highlightPie, PIE_COLORS, PIE_NONE } from './pie-chart.js';

// OHS has no portrait yet, so it uses the illustrated character instead of field art.
export const careerFields = [
  { id: 'creative', title: 'CM', label: 'Creative Media', description: 'Bring ideas to life through design, content and digital marketing.', icon: 'bookmark', portrait: 'assets/field-creative-smiling', portraitAlt: 'Smiling Creative professional with a drawing tablet', art: 'assets/field-creative-select', artAlt: 'Smiling Creative Media student with a stylus and drawing tablet, outlined in a golden glow' },
  { id: 'it', title: 'IT', label: 'Information Technology', description: 'Build, connect and protect the digital world.', icon: 'compass', portrait: 'assets/field-it-smiling', portraitAlt: 'Smiling IT professional holding a laptop', art: 'assets/field-it-select', artAlt: 'Smiling IT student holding a laptop, surrounded by a golden energy glow' },
  { id: 'business', title: 'Business', label: 'Business & Leadership', description: 'Explore the people, decisions and ideas behind organisations.', icon: 'book', portrait: 'assets/field-business-smiling', portraitAlt: 'Smiling Business professional in a navy suit holding a portfolio', art: 'assets/field-business-select', artAlt: 'Smiling Business student in a navy suit and yellow tie holding a portfolio, outlined in a golden glow' },
  { id: 'ohs', title: 'OHS', label: 'Occupational Health & Safety', description: 'Keep people safe and healthy at work.', icon: 'info' },
];

export function initializeCareerFlow({ roles, sectorDisplay, businessGuide, courses, roleCourses, characterFrame, icon, esc, motion, onStart, onLeaveJourney }) {
  const flow = document.getElementById('career-flow');
  const content = document.getElementById('flow-content');
  const progress = document.getElementById('flow-progress');
  const progressNav = progress.closest('nav');
  const experience = document.getElementById('career-experience');
  const changeCareer = document.getElementById('change-career');
  // The quick field quiz ("discover") sits inside the Field step, so it has no progress entry of its own.
  const steps = [ ['welcome', 'Start'], ['fields', 'Field'], ['likes', 'Likes'], ['match', 'Match'], ['careers', 'Career'], ['profile', 'Your future'], ['journey', 'Journey'] ];
  const stageNames = { entry: 'Entry', mid: 'Mid-career', senior: 'Senior', top: 'Leadership' };
  const stageOrder = { entry: 0, mid: 1, senior: 2, top: 3 };
  // likes: answers to the field's "What do you like?" questions; quiz: quick field quiz answers.
  const fresh = { likes: [], quiz: null, anyway: false };
  let current = { screen: 'welcome', field: '', career: '', ...fresh };
  let wasJourney = false;
  let hero3d = null;
  const allRoles = Array.isArray(roles) ? roles : [];
  const fieldForRole = role => role?.sector === 'digital-media' ? 'creative' : role && Object.hasOwn(sectorDisplay, role.sector) ? 'it' : '';
  const fieldById = id => careerFields.find(field => field.id === id);
  const roleById = id => allRoles.find(role => role.id === id);
  const rolesInField = field => allRoles.filter(role => fieldForRole(role) === field).sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4) || a.title.localeCompare(b.title));
  const hasBusinessGuide = businessGuide?.id === 'business-leadership' && Array.isArray(businessGuide.studyPath);
  const ohsCourse = (courses || []).find(course => course.id === 'cg-l3-ohs');
  const fieldHasContent = id => rolesInField(id).length > 0 || !!guideFor(id);
  const quizFor = id => quizFields[id];
  const likesComplete = (state = current) => !!quizFor(state.field) && state.likes.length >= quizFor(state.field).questions.length;
  const noneCount = likes => likes.filter(answer => answer === NONE).length;
  // Mostly "None of these" means the field may not suit the student, unless they asked to see its jobs anyway.
  const mismatched = (state = current) => likesComplete(state) && noneCount(state.likes) >= MISMATCH_AT && !state.anyway;
  const matched = (state = current) => likesComplete(state) && !mismatched(state);
  // Jobs in the best-scoring groups, when the answers point anywhere at all.
  const bestJobs = () => {
    if (!matched()) return new Set();
    const ranked = rankGroups(current.field, current.likes);
    return new Set(ranked.filter(group => group.score && group.score === ranked[0].score).flatMap(group => group.jobs));
  };
  const sprite = frame => { const level = Math.max(0, Math.min(5, Number(frame) || 0)); return `<span class="character-sprite" data-character-level="${level}" style="--character-frame:${level}"></span>`; };
  const button = (action, label, primary = false) => `<button type="button" class="button ${primary ? 'button-primary flow-primary' : 'button-secondary flow-secondary'}" data-flow-action="${action}">${label}</button>`;
  const planet = () => '<svg class="flow-planet" viewBox="0 0 240 240" aria-hidden="true"><use href="#planet-cosmo"/></svg>';
  // Every chooser screen opens with the same space band; render() docks the progress inside its top row.
  const topRow = () => `<div class="flow-top">${fullscreenButton()}</div>`;
  const band = heading => `<header class="flow-band">${planet()}${topRow()}<div class="flow-heading">${heading}</div></header>`;
  const levelNames = ['', 'Follow', 'Assist', 'Apply', 'Ensure', 'Strategise'];
  const levelCopy = ['', 'Works with close guidance, following set procedures.', 'Supports others and handles routine work with growing independence.', 'Applies the skill independently across a range of tasks.', 'Ensures quality, advises others and is accountable for results.', 'Sets direction for how the skill is used across the organisation.'];
  // Skill tiles borrow a glyph from the skill name, like abilities on a game character card.
  const skillGlyphs = [
    [/risk|governance|compliance|audit|polic/i, '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'],
    [/analy|intelligence|forensic|detect|threat/i, '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>'],
    [/security|cyber|incident|breach|protect/i, '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'],
    [/network|infrastructure|cloud/i, '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><path d="M12 7v3m-1.4 3.4-4.2 4.2m7-4.2 4.2 4.2"/>'],
    [/data|ai\b|machine|database/i, '<path d="M4 20V10m6 10V4m6 16v-7m6 7H2"/>'],
    [/architect|design|engineer|develop/i, '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'],
    [/strateg|leader|manage|administ/i, '<path d="M5 21V4h11l-2 4 2 4H5"/>'],
    [/(?!)/, '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6"/>'],
  ];
  // Each tile on one card gets its own glyph, falling back to the next unused one.
  const skillGlyph = (name, used) => {
    const [, path] = skillGlyphs.find(([pattern, glyph]) => pattern.test(name) && !used.has(glyph)) || skillGlyphs.find(([, glyph]) => !used.has(glyph)) || skillGlyphs[0];
    used.add(path);
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  };
  const shape = '<svg class="cs-shape" viewBox="0 0 500 560" aria-hidden="true" preserveAspectRatio="xMidYMax meet"><polygon class="cs-shape-echo" points="168,58 508,58 480,168 260,168 214,448 434,448 406,558 88,558"/><polygon class="cs-shape-main" points="140,30 480,30 462,140 232,140 186,420 406,420 388,530 60,530"/><polygon class="cs-shape-cut" points="118,250 172,250 148,400 94,400"/></svg>';
  // Sectors with the most published careers come first, so the opening tile has something to show.
  const fieldSectors = id => Object.keys(sectorDisplay).filter(key => (key === 'digital-media' ? 'creative' : 'it') === id).sort((a, b) => allRoles.filter(role => role.sector === b).length - allRoles.filter(role => role.sector === a).length);
  const difficulty = { entry: 1, mid: 2, senior: 3, top: 4 };
  const pips = (level, total = 5) => `<span class="cs-pips" aria-hidden="true">${Array.from({ length: total }, (_, step) => `<i class="${step < level ? 'is-on' : ''}"></i>`).join('')}</span>`;
  // Field select uses the lettered key art; other screens keep the plain portraits.
  const fieldSprite = field => `<span class="flow-field-picture flow-field-sprite" role="img" aria-label="Illustrated ${esc(field.label)} career character">${sprite(3)}</span>`;
  const fieldArt = field => field.art ? `<picture class="flow-field-picture"><source srcset="${field.art}.webp" type="image/webp"><img class="flow-field-photo" src="${field.art}.png" alt="${esc(field.artAlt)}" width="1086" height="1448" decoding="async"></picture>` : fieldSprite(field);
  const fieldPortrait = field => field.portrait ? `<picture class="flow-field-picture"><source srcset="${field.portrait}.webp" type="image/webp"><img class="flow-field-photo" src="${field.portrait}.png" alt="${esc(field.portraitAlt)}" width="1086" height="1448" decoding="async"></picture>` : fieldSprite(field);

  // Business and OHS have no BIICF career ladder, so their Career step is a COSMO course-based guide.
  function guideFor(id) {
    if (id === 'business' && hasBusinessGuide) return {
      title: businessGuide.title, description: businessGuide.description, source: businessGuide.source, sourceLabel: 'View official COSMO Business programmes',
      studyHeading: 'Build your business foundation.', careersHeading: 'Where Business could take you.',
      studyPath: businessGuide.studyPath.map(item => ({ level: `Level ${item.level}`, title: item.title, lines: [item.duration, item.entry], url: item.url })),
      careers: businessGuide.potentialCareers, topics: businessGuide.leadershipTopics, disclaimer: businessGuide.disclaimer,
      fieldDetail: '<strong>Course-based guide</strong><span class="cs-level">Official COSMO programmes</span><p>Explore the published Business study pathway, leadership topics and potential careers without treating them as a BIICF progression.</p>',
    };
    if (id === 'ohs' && ohsCourse) return {
      title: 'Occupational Health & Safety', description: 'Learn to identify risks, put safety procedures in place and work within health and safety law.', source: 'https://cosmo.edu.bn/health-and-safety', sourceLabel: 'View official COSMO Health and Safety programmes',
      studyHeading: 'Start your safety qualification.', careersHeading: 'Where OHS could take you.',
      studyPath: [{ level: `Level ${ohsCourse.level}`, title: ohsCourse.title, lines: [`Awarded by ${ohsCourse.awardingBody}.`, `BDQF ${ohsCourse.bdqf}${ohsCourse.bdqfSource === 'estimated' ? ' (estimated)' : ''}.`], url: ohsCourse.url }],
      careers: Object.values(quizFor('ohs').groups).flatMap(group => group.jobs), topics: [],
      disclaimer: 'These are example OHS job titles. The career data has no official OHS roles or entry requirements yet. The BDQF level is estimated from the UK RQF level; confirm it with COSMO.',
      fieldDetail: '<strong>Course-based guide</strong><span class="cs-level">Official COSMO programme</span><p>Explore COSMO\'s City and Guilds safety qualification and example OHS jobs. The data has no official OHS career ladder yet.</p>',
    };
    return null;
  }

  function resolveLocation() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('screen');
    const field = fieldById(params.get('field'))?.id || '';
    const career = roleById(params.get('career'));
    const goal = roleById(params.get('goal'));
    const quiz = quizFor(field);
    const answers = new Set(quiz ? [...Object.keys(quiz.groups), NONE] : []);
    const likes = (params.get('likes') || '').split('.').filter(answer => answers.has(answer)).slice(0, quiz?.questions.length || 0);
    const base = { field, career: '', likes, quiz: null, anyway: params.get('anyway') === '1' };
    if (!requested) return goal ? { screen: 'journey', field: fieldForRole(goal), career: goal.id, ...fresh } : { screen: 'welcome', field: '', career: '', ...fresh };
    if (requested === 'discover') return { ...base, screen: 'discover', quiz: (params.get('quiz') || '').split('.').filter(id => fieldById(id)).slice(0, fieldQuiz.length) };
    if (!steps.some(([id]) => id === requested)) return { screen: 'welcome', field: '', career: '', ...fresh };
    if (requested === 'welcome' || requested === 'fields') return { ...base, screen: requested, career: career && fieldForRole(career) === field ? career.id : '' };
    if (requested === 'journey') {
      // A shared journey can use either the new career parameter or a legacy goal.
      const target = params.has('career') ? career : goal;
      if (target && (!field || fieldForRole(target) === field)) return { ...base, ...(field ? {} : fresh), screen: 'journey', field: fieldForRole(target), career: target.id };
      const sector = params.get('sector');
      if (!params.has('career') && !params.has('goal') && Object.hasOwn(sectorDisplay, sector) && !allRoles.some(role => role.sector === sector)) return { screen: 'journey', field: sector === 'digital-media' ? 'creative' : 'it', career: '', ...fresh };
      return { ...base, screen: field ? 'careers' : 'fields' };
    }
    if (!field) return { screen: 'fields', field: '', career: '', ...fresh };
    // Finished answers open the match, unless they suggest a different field.
    if (requested === 'likes' || requested === 'match') return { ...base, screen: matched(base) ? 'match' : 'likes' };
    if (requested === 'profile' && career && fieldForRole(career) === field) return { ...base, screen: 'profile', career: career.id };
    // Career select keeps its highlighted character; a shared goal in the same field preselects it.
    const pick = requested === 'careers' ? [career, goal].find(role => role && fieldForRole(role) === field) : null;
    return { ...base, screen: 'careers', career: pick?.id || '' };
  }

  function writeLocation(next, push = true) {
    const url = new URL(location.href);
    url.searchParams.set('screen', next.screen);
    if (next.field) url.searchParams.set('field', next.field); else url.searchParams.delete('field');
    if (next.career) url.searchParams.set('career', next.career); else url.searchParams.delete('career');
    if (next.likes.length) url.searchParams.set('likes', next.likes.join('.')); else url.searchParams.delete('likes');
    if (next.quiz) url.searchParams.set('quiz', next.quiz.join('.')); else url.searchParams.delete('quiz');
    if (next.anyway) url.searchParams.set('anyway', '1'); else url.searchParams.delete('anyway');
    if (next.screen === 'journey') {
      const role = roleById(next.career);
      if (role) { url.searchParams.set('goal', role.id); url.searchParams.set('sector', role.sector); }
    }
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  }

  function progressMarkup() {
    const index = steps.findIndex(([id]) => id === (current.screen === 'discover' ? 'fields' : current.screen));
    return steps.map(([screen, title], position) => {
      const available = position < index && (!['likes', 'careers'].includes(screen) || current.field) && (screen !== 'match' || matched()) && (screen !== 'profile' || current.career);
      return `<li><button type="button" data-flow-screen="${screen}" class="${position === index ? 'is-current' : position < index ? 'is-complete' : ''}" ${position === index ? 'aria-current="step"' : ''} ${available ? '' : 'disabled'}><span class="flow-progress-number" aria-hidden="true">${position < index ? icon('check') : String(position + 1).padStart(2, '0')}</span><span>${title}</span></button></li>`;
    }).join('');
  }

  function welcomeMarkup() {
    return `<div class="flow-screen flow-welcome">${planet()}${topRow()}<div class="flow-welcome-copy"><h1 class="flow-title" id="flow-title" tabindex="-1"><span class="flow-title-line">What do you</span> <span class="flow-title-line">want to be<span class="flow-title-dot">?</span></span></h1><p class="flow-intro">Find a career that feels like you. Meet your future self, then discover the steps to get there.</p><div class="flow-actions">${button('start', `Find my future ${icon('arrow-right')}`, true)}</div><p class="flow-caption">Choose a field. Tell us what you like. Follow your pathway.</p></div><div class="flow-welcome-scene flow-character-stage" role="img" aria-label="An illustrated pathway from a student today to a future career character"><div class="flow-portrait flow-portrait-start">${sprite(0)}<span class="flow-scene-label"><small>THE START</small><strong>You, today</strong></span></div><div class="flow-scene-path" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div><div class="flow-portrait flow-portrait-future">${sprite(5)}<span class="flow-scene-label"><small>THE POSSIBILITY</small><strong>Your future self</strong></span></div></div></div>`;
  }

  function fullscreenButton() { return '<button type="button" class="flow-fullscreen"></button>'; }

  function syncFullscreen() {
    const active = !!document.fullscreenElement;
    const label = active ? 'Exit full screen' : 'Enter full screen';
    for (const control of document.querySelectorAll('.flow-fullscreen')) {
      control.hidden = !document.fullscreenEnabled;
      control.setAttribute('aria-label', label);
      control.title = label;
      control.innerHTML = `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${active ? 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5' : 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'}"/></svg>`;
    }
  }

  function sectorDetail(field, key) {
    if (!key) return `<strong>Careers coming soon</strong><p>This preview uses the career examples available in the published source. ${esc(field.title)} careers will appear when their data is available.</p>`;
    const count = allRoles.filter(role => role.sector === key).length;
    return `<strong>${esc(sectorDisplay[key].name)}</strong><span class="cs-level">${count ? `${count} published ${count === 1 ? 'career' : 'careers'}` : 'No published careers yet'}</span><p>${esc(sectorDisplay[key].description)}</p>`;
  }

  function fieldStageMarkup(field) {
    const careers = rolesInField(field.id);
    const sectors = fieldSectors(field.id);
    const glyphs = new Set();
    const guide = guideFor(field.id);
    const guideStats = guide && [[guide.careers.length, 'Career ideas'], [guide.studyPath.length, guide.studyPath.length === 1 ? 'Study level' : 'Study levels'], guide.topics.length ? [guide.topics.length, 'Leadership topics'] : [Object.keys(quizFor(field.id).groups).length, 'Work areas']];
    const stats = guideStats || [[careers.length, 'Careers'], [sectors.length, 'Sectors'], [new Set(careers.map(role => role.stage)).size, 'Stages']];
    const detail = guide ? guide.fieldDetail : sectorDetail(field, sectors[0]);
    return `<div class="cs-art cs-art-xl cs-art-field">${shape}<div class="cs-figure cs-figure-field">${fieldArt(field)}</div></div><div class="cs-info"><span class="cs-class">${fieldHasContent(field.id) ? 'Open world' : 'Coming soon'}</span><div class="cs-name"><span class="cs-index" aria-hidden="true">${String(careerFields.indexOf(field) + 1).padStart(2, '0')}</span><h2>${esc(field.title)}</h2></div><p class="cs-sector cs-sector-top">${esc(field.label)}</p><dl class="cs-stats">${stats.map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="cs-summary">${esc(field.description)}</p>${sectors.length ? `<div class="cs-skills" role="group" aria-label="Sectors in ${esc(field.title)}">${sectors.map((key, index) => `<button type="button" class="cs-skill" data-cs-sector="${key}" aria-pressed="${index === 0}" aria-label="${esc(sectorDisplay[key].name)}" title="${esc(sectorDisplay[key].name)}">${skillGlyph(sectorDisplay[key].name, glyphs)}</button>`).join('')}</div>` : ''}<div class="cs-skill-detail" id="cs-skill-detail">${detail}</div><button type="button" class="cs-quiz-link" data-flow-action="discover">${icon('compass')} Not sure? Take a quick quiz to find your field</button></div>`;
  }

  const selectFooter = (back, backLabel, choose, chooseLabel, roster) => `<footer class="mission-footer select-footer"><button type="button" class="mission-back" data-flow-action="${back}">${icon('arrow-left')}<span>Back<small>${backLabel}</small></span></button><div class="select-roster">${roster}<div class="cs-roster-track" aria-hidden="true"><span></span></div></div><button type="button" class="cs-choose mission-accept" data-flow-action="${choose}">${chooseLabel} ${icon('arrow-right')}</button></footer>`;

  function fieldsMarkup() {
    const field = fieldById(current.field) || careerFields[0];
    return `<div class="flow-screen flow-select" style="--cs-count:${careerFields.length};--cs-index:${careerFields.indexOf(field)}">${topRow()}<header class="cs-header"><button type="button" class="cs-back" data-flow-action="back" aria-label="Back to start">${icon('arrow-left')}</button><h1 class="cs-title" id="flow-title" tabindex="-1">Field select</h1><span class="cs-meta">Choose your world · ${careerFields.length} fields</span>${planet()}</header><div class="cs-stage" id="cs-stage">${fieldStageMarkup(field)}</div>${selectFooter('back', 'to start', 'choose-field', 'Select field', `<div class="cs-roster" role="group" aria-label="Choose a field. Use the arrow keys to browse.">${careerFields.map(item => `<button type="button" class="cs-thumb cs-thumb-field" data-flow-field="${item.id}" aria-pressed="${item === field}" aria-label="${esc(item.title)}${fieldHasContent(item.id) ? '' : ', coming soon'}" title="${esc(item.label)}">${fieldArt(item)}</button>`).join('')}</div>`)}<p class="sr-only" id="cs-status" aria-live="polite"></p></div>`;
  }

  function selectedRole(items) { return items.find(role => role.id === current.career) || items[0]; }

  function careerStats(role) {
    const routes = role.routes || [];
    const years = routes.map(route => route.years).filter(value => Number.isFinite(value));
    return [
      [routes.length ? Math.min(...routes.map(route => route.bdqf)) : '–', 'Min BDQF'],
      [years.length ? Math.min(...years) : '–', 'Min years'],
      [(role.skills || []).length || '–', 'Skills'],
    ];
  }

  function skillDetail(role, index) {
    const skill = (role.skills || [])[index];
    if (!skill) return `<strong>Skills coming soon</strong><p>The source lists this career, but its skills and requirements have not been published yet.</p>`;
    const level = Math.max(0, Math.min(5, Number(skill[1]) || 0));
    return `<strong>${String(index + 1).padStart(2, '0')} – ${esc(skill[0])}</strong><span class="cs-level">${pips(level)}Level ${level} · ${levelNames[level]}</span><p>${levelCopy[level]}</p>`;
  }

  // The selected character's card: angular brand art on the left, its class, stats and skills on the right.
  function stageMarkup(role, items) {
    const stage = stageNames[role.stage] || 'Career';
    const skills = (role.skills || []).slice(0, 4);
    const glyphs = new Set();
    return `<div class="cs-art cs-art-xl">${shape}<div class="cs-figure" role="img" aria-label="Illustrated ${esc(stage)} character">${sprite(characterFrame(role))}</div></div><div class="cs-info"><span class="cs-class">${esc(stage)}</span>${bestJobs().has(role.id) ? ' <span class="cs-class cs-best">Best match</span>' : ''}<div class="cs-name${role.title.length > 22 ? ' is-long' : ''}"><span class="cs-index" aria-hidden="true">${String(items.indexOf(role) + 1).padStart(2, '0')}</span><h2>${esc(role.title)}</h2></div><dl class="cs-stats">${careerStats(role).map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="cs-summary">${esc(role.summary)}</p><p class="cs-sector">${esc(sectorDisplay[role.sector]?.name || role.sector)}</p>${skills.length ? `<div class="cs-skills" role="group" aria-label="Skills for ${esc(role.title)}">${skills.map(([name], index) => `<button type="button" class="cs-skill" data-cs-skill="${index}" aria-pressed="${index === 0}" aria-label="${esc(name)}" title="${esc(name)}">${skillGlyph(name, glyphs)}</button>`).join('')}</div>` : ''}<div class="cs-skill-detail" id="cs-skill-detail">${skillDetail(role, 0)}</div></div>`;
  }

  // After the quiz, the roster leads with the best-matching groups; otherwise it runs by stage.
  function orderedRoles(id) {
    const items = rolesInField(id);
    if (id !== current.field || !matched()) return items;
    const order = rankGroups(id, current.likes).flatMap(group => group.jobs);
    const rank = role => { const index = order.indexOf(role.id); return index < 0 ? order.length : index; };
    return [...items].sort((a, b) => rank(a) - rank(b));
  }

  const backToMatch = () => matched() ? ['to-match', 'to your match', 'Back to your match'] : ['fields', 'to fields', 'Back to fields'];

  function guideMarkup(field, guide) {
    const best = bestJobs();
    const source = `<a class="business-source" href="${esc(guide.source)}" target="_blank" rel="noopener noreferrer">${esc(guide.sourceLabel)} ${icon('arrow-up-right')}</a>`;
    const studyPath = guide.studyPath.map(item => `<article class="business-level"><span>${esc(item.level)}</span><h3>${esc(item.title)}</h3>${item.lines.map(line => `<p>${esc(line)}</p>`).join('')}<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Course details ${icon('arrow-up-right')}</a></article>`).join('');
    const careers = guide.careers.map(career => `<li${best.has(career) ? ' class="is-match"' : ''}>${esc(career)}${best.has(career) ? ' <small>Best match</small>' : ''}</li>`).join('');
    const topics = guide.topics.map(topic => `<li>${esc(topic)}</li>`).join('');
    const [back, , backLabel] = backToMatch();
    const heading = band(`<span class="flow-kicker flow-eyebrow">05 / HOW TO GET THERE</span><h1 class="flow-title" id="flow-title" tabindex="-1">${esc(guide.title)}</h1><p class="flow-intro">${esc(guide.description)}</p>`);
    return `<div class="flow-screen business-screen">${heading}<div class="flow-body"><div class="business-guide"><section><div class="business-section-heading"><div><span class="business-kicker">Study progression</span><h2>${esc(guide.studyHeading)}</h2></div>${source}</div><div class="business-levels${guide.studyPath.length === 1 ? ' is-single' : ''}">${studyPath}</div></section><section class="business-guide-grid${topics ? '' : ' is-single'}"><div><span class="business-kicker">Potential careers</span><h2>${esc(guide.careersHeading)}</h2><ul class="business-tags">${careers}</ul></div>${topics ? `<div><span class="business-kicker">Leadership topics</span><h2>What the HND develops.</h2><ul class="business-topics">${topics}</ul></div>` : ''}</section><aside class="business-disclaimer">${icon('info')}<p>${esc(guide.disclaimer)}</p></aside><div class="flow-actions">${button(back, `${icon('arrow-left')} ${backLabel}`)}</div></div></div></div>`;
  }

  function careersMarkup() {
    const field = fieldById(current.field);
    const items = orderedRoles(current.field);
    const guide = guideFor(field.id);
    if (guide) return guideMarkup(field, guide);
    if (!items.length) {
      const heading = band(`<span class="flow-kicker flow-eyebrow">03 / EXPLORE ${esc(field.title.toUpperCase())}</span><h1 class="flow-title" id="flow-title" tabindex="-1">Your next chapter is coming.</h1><p class="flow-intro">The source does not include ${esc(field.title.toLowerCase())} career profiles yet. You can explore the available IT pathways while more careers are added.</p>`);
      return `<div class="flow-screen">${heading}<div class="flow-body"><div class="flow-empty flow-empty-with-portrait" data-field="${field.id}"><div class="flow-empty-copy"><span class="flow-empty-icon" aria-hidden="true">${icon(field.icon)}</span><h2>No published careers here yet</h2><p>Your possibilities are bigger than this preview. Career profiles will appear here when the source provides them.</p><div class="flow-actions">${button('explore-it', `Explore IT careers ${icon('arrow-right')}`, true)}${button('fields', `${icon('arrow-left')} Back to fields`)}</div></div><div class="flow-empty-portrait">${fieldPortrait(field)}</div></div></div></div>`;
    }
    const role = selectedRole(items);
    const index = items.indexOf(role);
    const [back, backSmall, backLabel] = backToMatch();
    return `<div class="flow-screen flow-select" style="--cs-count:${items.length};--cs-index:${index}">${topRow()}<header class="cs-header"><button type="button" class="cs-back" data-flow-action="${back}" aria-label="${backLabel}">${icon('arrow-left')}</button><h1 class="cs-title" id="flow-title" tabindex="-1">Career select</h1><span class="cs-meta">${esc(field.label)} · ${items.length} careers${matched() ? ' · best match first' : ''}</span>${planet()}</header><div class="cs-stage" id="cs-stage">${stageMarkup(role, items)}</div>${selectFooter(back, backSmall, 'choose', 'Select career', `<div class="cs-roster" role="group" aria-label="Choose a career. Use the arrow keys to browse.">${items.map(item => `<button type="button" class="cs-thumb" data-flow-career="${esc(item.id)}" aria-pressed="${item === role}" aria-label="${esc(item.title)}" title="${esc(item.title)}">${sprite(characterFrame(item))}</button>`).join('')}</div>`)}<p class="sr-only" id="cs-status" aria-live="polite"></p></div>`;
  }

  function selectCareer(id, { focus = false } = {}) {
    const items = orderedRoles(current.field);
    const role = items.find(item => item.id === id);
    const screen = content.querySelector('.flow-select');
    if (!role || !screen) return;
    current = { ...current, career: role.id };
    writeLocation(current, false);
    document.getElementById('cs-stage').innerHTML = stageMarkup(role, items);
    markRoster(screen, items.indexOf(role), `${role.title}, ${stageNames[role.stage] || 'career'}`, focus);
  }

  function selectField(id, { focus = false } = {}) {
    const field = fieldById(id);
    const screen = content.querySelector('.flow-select');
    if (!field || !screen) return;
    const kept = roleById(current.career);
    current = { ...current, field: field.id, career: kept && fieldForRole(kept) === field.id ? kept.id : '', ...(field.id === current.field ? {} : { likes: [], anyway: false }) };
    writeLocation(current, false);
    document.getElementById('cs-stage').innerHTML = fieldStageMarkup(field);
    markRoster(screen, careerFields.indexOf(field), `${field.title}, ${field.label}`, focus);
  }

  function markRoster(screen, index, status, focus) {
    screen.style.setProperty('--cs-index', index);
    const thumbs = [...screen.querySelectorAll('.cs-thumb')];
    thumbs.forEach((thumb, position) => thumb.setAttribute('aria-pressed', String(position === index)));
    thumbs[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focus) thumbs[index]?.focus();
    document.getElementById('cs-status').textContent = status;
  }

  function selectSector(key) {
    for (const tile of content.querySelectorAll('.cs-skill')) tile.setAttribute('aria-pressed', String(tile.dataset.csSector === key));
    document.getElementById('cs-skill-detail').innerHTML = sectorDetail(fieldById(current.field) || careerFields[0], key);
  }

  function selectSkill(index) {
    const role = roleById(current.career) || selectedRole(orderedRoles(current.field));
    for (const tile of content.querySelectorAll('.cs-skill')) tile.setAttribute('aria-pressed', String(Number(tile.dataset.csSkill) === index));
    document.getElementById('cs-skill-detail').innerHTML = skillDetail(role, index);
  }

  const heading = (kicker, title, intro) => band(`<span class="flow-kicker flow-eyebrow">${kicker}</span><h1 class="flow-title" id="flow-title" tabindex="-1">${title}</h1><p class="flow-intro">${intro}</p>`);
  const answerButton = (kind, value, text) => `<button type="button" class="quiz-answer" data-${kind}-answer="${esc(value)}">${esc(text)}</button>`;
  const pickButton = (field, label, primary = false) => `<button type="button" class="button ${primary ? 'button-primary flow-primary' : 'button-secondary flow-secondary'}" data-flow-pick="${field.id}">${label}</button>`;

  // One question at a time, shared by "What do you like?" and the quick field quiz.
  function questionMarkup({ top, count, total, text, answers, none, back, backLabel }) {
    return `<div class="flow-screen quiz-screen">${top}<div class="flow-body"><section class="quiz-card" aria-labelledby="quiz-question"><div class="quiz-progress"><span>Question ${count} of ${total}</span><span class="quiz-track" aria-hidden="true"><i style="width:${(count - 1) / total * 100}%"></i></span></div><h2 id="quiz-question">${esc(text)}</h2><div class="quiz-answers">${answers}${none ? `<button type="button" class="quiz-answer quiz-none" data-quiz-answer="${NONE}">None of these</button>` : ''}</div></section><div class="flow-actions">${button(back, `${icon('arrow-left')} ${backLabel}`)}</div></div></div>`;
  }

  function likesMarkup() {
    const field = fieldById(current.field);
    const quiz = quizFor(field.id);
    if (likesComplete()) return mismatchMarkup(field);
    const step = current.likes.length;
    const question = quiz.questions[step];
    return questionMarkup({
      top: heading(`03 / ${esc(field.label.toUpperCase())}`, 'What do you like?', 'Pick the answer that sounds most like you. If none of them fit, choose “None of these”.'),
      count: step + 1, total: quiz.questions.length, text: question.text, none: true,
      answers: question.answers.map(([text, group]) => answerButton('quiz', group, text)).join(''),
      back: 'likes-back', backLabel: step ? 'Previous question' : 'Back to fields',
    });
  }

  function mismatchMarkup(field) {
    const top = heading('03 / CHECK YOUR FIELD', `${esc(field.title)} may not be the best fit.`, `You chose “None of these” for ${noneCount(current.likes)} of ${quizFor(field.id).questions.length} questions, so ${esc(field.label)} may not match what you enjoy. Want to find out which field suits you better?`);
    return `<div class="flow-screen quiz-screen">${top}<div class="flow-body"><div class="flow-actions">${button('discover', `Take the quick field quiz ${icon('arrow-right')}`, true)}${button('anyway', `Show ${esc(field.title)} jobs anyway`)}${button('likes-back', `${icon('arrow-left')} Previous question`)}</div></div></div>`;
  }

  function discoverMarkup() {
    const answers = current.quiz || [];
    if (answers.length < fieldQuiz.length) {
      const question = fieldQuiz[answers.length];
      return questionMarkup({
        top: heading('02 / FIND YOUR FIELD', 'Which field suits you?', 'Five quick questions about what you enjoy. We will suggest the field that fits you best.'),
        count: answers.length + 1, total: fieldQuiz.length, text: question.text, none: false,
        answers: question.answers.map(([text, id]) => answerButton('discover', id, text)).join(''),
        back: 'discover-back', backLabel: answers.length ? 'Previous question' : 'Back to fields',
      });
    }
    const best = fieldById(bestField(answers, careerFields.map(field => field.id)));
    const chart = pieChart({ esc, label: 'Your answers in the field quiz', slices: careerFields.map((field, index) => ({ key: field.id, label: field.label, value: answers.filter(answer => answer === field.id).length, color: PIE_COLORS[index] })) });
    return `<div class="flow-screen quiz-screen">${heading('02 / YOUR BEST MATCH', esc(best.label), esc(best.description))}<div class="flow-body"><div class="match-grid"><section class="match-card"><span class="match-kicker">Your answers</span><h2>What you enjoy</h2>${chart}</section><section class="match-card"><span class="match-kicker">Next step</span><h2>Continue with ${esc(best.title)}</h2><p>Answer seven questions about what you like in ${esc(best.label)}, and we will suggest jobs that suit you.</p><div class="flow-actions">${pickButton(best, `Continue with ${esc(best.title)} ${icon('arrow-right')}`, true)}</div><p class="match-also">Or pick a field yourself:</p><div class="match-fields">${careerFields.filter(field => field !== best).map(field => pickButton(field, esc(field.title))).join('')}</div></section></div><div class="flow-actions">${button('discover-back', `${icon('arrow-left')} Previous question`)}</div></div></div>`;
  }

  function matchJob(job, guide) {
    const role = roleById(job);
    if (!role) return `<li><button type="button" class="match-job" data-flow-action="guide"><span class="match-job-copy"><strong>${esc(job)}</strong><small>${guide === 'ohs' ? 'Example job' : 'COSMO Business career'} · see how to get there</small></span>${icon('arrow-right')}</button></li>`;
    return `<li><button type="button" class="match-job" data-match-career="${esc(role.id)}"><span class="match-job-portrait" aria-hidden="true">${sprite(characterFrame(role))}</span><span class="match-job-copy"><strong>${esc(role.title)}</strong><small>${esc(stageNames[role.stage] || 'Career')} · ${esc(role.summary)}</small></span>${icon('arrow-right')}</button></li>`;
  }

  // Your match: the pie of answers, the best-matching jobs, then the rest of the field.
  function matchMarkup() {
    const field = fieldById(current.field);
    const ranked = rankGroups(field.id, current.likes);
    const topScore = ranked[0]?.score || 0;
    const best = ranked.filter(group => group.score === topScore);
    const others = ranked.filter(group => group.score < topScore);
    const slices = Object.entries(quizFor(field.id).groups).map(([key, group], index) => ({ key, label: group.name, value: current.likes.filter(answer => answer === key).length, color: PIE_COLORS[index] }));
    if (noneCount(current.likes)) slices.push({ key: NONE, label: 'None of these', value: noneCount(current.likes), color: PIE_NONE });
    const groups = list => list.map(group => `<div class="match-group"><h3>${esc(group.name)}</h3><ul class="match-jobs">${group.jobs.map(job => matchJob(job, field.id)).join('')}</ul></div>`).join('');
    const guide = guideFor(field.id);
    const top = heading('04 / YOUR MATCH', topScore ? best.map(group => esc(group.name)).join(' & ') : `Jobs in ${esc(field.label)}`, `${topScore ? `Your answers point to ${best.length > 1 ? 'these areas' : 'this area'} of ${esc(field.label)}.` : 'Your answers did not point to one area, so here is every job in this field.'} Choose a job to see how to get there.`);
    return `<div class="flow-screen match-screen">${top}<div class="flow-body"><div class="match-grid"><section class="match-card match-answers"><span class="match-kicker">Your answers</span><h2>What you enjoy</h2>${pieChart({ esc, slices, label: `Your answers for ${field.label}` })}</section><section class="match-card"><span class="match-kicker">${topScore ? 'Jobs that suit you' : 'Jobs in this field'}</span>${groups(best)}</section></div>${others.length ? `<section class="match-card match-others"><span class="match-kicker">Other jobs in ${esc(field.label)}</span><div class="match-columns">${groups(others)}</div></section>` : ''}<div class="flow-actions">${guide ? button('guide', `See how to get there ${icon('arrow-right')}`, true) : ''}${button('retake', 'Answer again')}${button('fields', `${icon('arrow-left')} Choose another field`)}</div></div></div>`;
  }

  const fitRank = { qualifies: 0, 'needs-experience-or-portfolio': 1, 'with-experience': 2, 'builds-skills': 3 };
  const fitText = link => link.fit === 'qualifies' ? 'meets an entry route' : link.fit === 'needs-experience-or-portfolio' ? 'meets an entry route, with experience or a portfolio' : `meets an entry route, with ${link.years} years' experience`;

  // One line naming the closest COSMO qualification; the journey's role details list every linked course.
  function studyLine(role) {
    const [qualification] = (roleCourses?.[role.id] || []).filter(link => link.type === 'qualification').sort((a, b) => fitRank[a.fit] - fitRank[b.fit] || (a.years ?? 0) - (b.years ?? 0));
    return qualification ? `<p class="mission-study"><b>At COSMO</b> ${esc(qualification.title)} ${fitText(qualification)}.</p>` : '';
  }

  function profileMarkup() {
    const role = roleById(current.career);
    const stage = stageNames[role.stage] || 'Career';
    const routes = role.routes || [];
    const skills = (role.skills || []).slice(0, 5);
    const certs = role.certs || [];
    const unlocks = (role.next || []).map(roleById).filter(Boolean);
    const level = difficulty[role.stage] || 1;
    const objectives = [
      ['Qualify for entry', `${routes.length ? `<ul class="mission-routes">${routes.map((route, index) => `<li><b>Route ${'ABCDE'[index]}</b><span>${esc(route.note || `BDQF ${route.bdqf}`)}</span></li>`).join('')}</ul>` : '<p>Entry requirements have not been published yet.</p>'}${studyLine(role)}`],
      ['Master the core skills', skills.length ? `<ul class="mission-skills">${skills.map(([name, value]) => { const rank = Math.max(0, Math.min(5, Number(value) || 0)); return `<li><span>${esc(name)}</span>${pips(rank)}<small>L${rank}</small></li>`; }).join('')}</ul>` : '<p>Skills have not been published yet.</p>'],
      ['Earn certifications', `<p>${certs.length ? `${certs.length} recommended, such as ${certs.slice(0, 3).map(esc).join(', ')}.` : 'Certifications have not been published yet.'}</p>`],
    ];
    return `<div class="flow-screen flow-select flow-mission">${topRow()}<header class="cs-header"><button type="button" class="cs-back" data-flow-action="back" aria-label="Back to careers">${icon('arrow-left')}</button><h1 class="cs-title" id="flow-title" tabindex="-1">Mission briefing</h1><span class="cs-meta">${esc(sectorDisplay[role.sector]?.name || role.sector)} · Mission 04</span>${planet()}</header><div class="cs-stage mission-stage"><div class="cs-art cs-art-xl mission-art">${shape}<div class="cs-figure flow-profile-character" role="img" aria-label="Illustrated ${esc(stage)} character">${sprite(characterFrame(role))}</div><span class="mission-operative"><small>Operative</small><strong>Your future self</strong></span></div><div class="mission-brief"><div class="mission-tags"><span class="cs-class">${esc(stage)}</span><span class="mission-difficulty">Difficulty ${pips(level, 4)}<span class="sr-only">${level} of 4</span></span></div><p class="mission-label">Mission</p><div class="cs-name${role.title.length > 22 ? ' is-long' : ''}"><h2>${esc(role.title)}</h2></div><p class="cs-summary">${esc(role.summary)}</p><h3 class="mission-heading">Objectives</h3><ol class="mission-objectives">${objectives.map(([title, body], index) => `<li><span class="mission-check" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><strong>${title}</strong>${body}</div></li>`).join('')}</ol>${unlocks.length ? `<p class="mission-unlock"><span>Unlocks next</span>${unlocks.map(next => esc(next.title)).join(' · ')}</p>` : role.stage === 'top' ? '<p class="mission-unlock"><span>Final level</span>The top of this pathway.</p>' : ''}</div></div><footer class="mission-footer"><button type="button" class="mission-back" data-flow-action="back">${icon('arrow-left')}<span>Back<small>to careers</small></span></button><p class="mission-note"><strong>${routes.length ? 'Next: set your loadout' : 'Mission intel pending'}</strong>${routes.length ? 'Choose your qualification and experience, and we map the published stages leading toward this role.' : 'This role is listed in the source, but its detailed requirements are still pending. Your journey will show what is currently available.'} You can change it at any time.</p><button type="button" class="cs-choose mission-accept" data-flow-action="ready">Accept mission ${icon('arrow-right')}</button></footer></div>`;
  }

  function render({ focus = false } = {}) {
    const journey = current.screen === 'journey';
    if (wasJourney && !journey) onLeaveJourney?.();
    wasJourney = journey;
    flow.hidden = journey;
    experience.hidden = !journey;
    const skip = document.getElementById('skip-link');
    if (skip) { skip.href = journey ? '#main-content' : '#career-flow'; skip.textContent = journey ? 'Skip to career pathway' : 'Skip to career selection'; }
    progress.innerHTML = progressMarkup();
    // Each screen hosts the progress in its top row, so return it before the content is replaced.
    if (progressNav.parentElement !== flow) flow.insertBefore(progressNav, content);
    hero3d?.dispose(); hero3d = null;
    if (journey) {
      document.getElementById('journey-top').prepend(progressNav);
      syncFullscreen();
      if (focus) document.getElementById('page-title')?.focus({ preventScroll: true });
      return;
    }
    const screens = { welcome: welcomeMarkup, fields: fieldsMarkup, discover: discoverMarkup, likes: likesMarkup, match: matchMarkup, careers: careersMarkup, profile: profileMarkup };
    content.innerHTML = screens[current.screen]();
    content.querySelector('.flow-top')?.prepend(progressNav);
    syncFullscreen();
    if (current.screen === 'welcome') hero3d = mountHero3d(content.querySelector('.flow-welcome'), motion);
    motion?.refresh(content);
    if (focus) { document.getElementById('flow-title')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }

  function navigate(next, { focus = true } = {}) {
    current = next;
    writeLocation(current);
    render({ focus });
  }

  function handleClick(event) {
    const control = event.target.closest('button');
    if (!control || control.disabled) return;
    if (control.dataset.flowField) return selectField(control.dataset.flowField);
    if (control.dataset.csSector) return selectSector(control.dataset.csSector);
    if (control.dataset.flowCareer) return selectCareer(control.dataset.flowCareer);
    if (control.dataset.csSkill) return selectSkill(Number(control.dataset.csSkill));
    if (control.dataset.quizAnswer) {
      const next = { ...current, likes: [...current.likes, control.dataset.quizAnswer] };
      return navigate({ ...next, screen: matched(next) ? 'match' : 'likes' });
    }
    if (control.dataset.discoverAnswer) return navigate({ ...current, quiz: [...(current.quiz || []), control.dataset.discoverAnswer] });
    if (control.dataset.flowPick) return navigate({ screen: 'likes', field: control.dataset.flowPick, career: '', ...fresh });
    if (control.dataset.matchCareer) return navigate({ ...current, screen: 'careers', career: control.dataset.matchCareer });
    if (control.dataset.flowScreen) {
      const screen = control.dataset.flowScreen;
      // Returning to Likes reopens the last question rather than the finished set.
      const reopen = screen === 'likes' && likesComplete() ? { likes: current.likes.slice(0, -1), anyway: false } : {};
      if (steps.findIndex(([id]) => id === screen) < steps.findIndex(([id]) => id === (current.screen === 'discover' ? 'fields' : current.screen))) navigate({ ...current, screen, quiz: null, ...reopen });
      return;
    }
    const action = control.dataset.flowAction;
    if (action === 'start' || action === 'fields') return navigate({ ...current, screen: 'fields', career: '', quiz: null });
    if (action === 'choose-field') return navigate({ screen: 'likes', field: (fieldById(current.field) || careerFields[0]).id, career: '', ...fresh });
    if (action === 'likes-back') return navigate(current.likes.length ? { ...current, screen: 'likes', likes: current.likes.slice(0, -1), anyway: false } : { ...current, screen: 'fields' });
    if (action === 'anyway') return navigate({ ...current, screen: 'match', anyway: true });
    if (action === 'retake') return navigate({ ...current, screen: 'likes', career: '', likes: [], anyway: false });
    if (action === 'guide') return navigate({ ...current, screen: 'careers' });
    if (action === 'to-match') return navigate({ ...current, screen: 'match' });
    if (action === 'discover') return navigate({ ...current, screen: 'discover', quiz: [] });
    if (action === 'discover-back') return navigate(current.quiz?.length ? { ...current, quiz: current.quiz.slice(0, -1) } : { ...current, screen: 'fields', quiz: null });
    if (action === 'choose') {
      const role = roleById(current.career) || selectedRole(orderedRoles(current.field));
      if (role) navigate({ ...current, screen: 'profile', career: role.id });
      return;
    }
    if (action === 'explore-it') return navigate({ screen: 'careers', field: 'it', career: '', ...fresh });
    if (action === 'back') return navigate(current.screen === 'profile' ? { ...current, screen: 'careers' } : { screen: 'welcome', field: '', career: '', ...fresh });
    if (action === 'ready') {
      const role = roleById(current.career);
      if (current.screen !== 'profile' || !role || fieldForRole(role) !== current.field) return;
      current = { ...current, screen: 'journey' };
      writeLocation(current);
      onStart?.(role);
      render();
      document.getElementById('page-title')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  content.addEventListener('click', event => { if (!event.composedPath().includes(progress)) handleClick(event); });
  progress.addEventListener('click', handleClick);
  content.addEventListener('pointerover', highlightPie);
  content.addEventListener('pointerout', highlightPie);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('click', event => {
    if (!event.target.closest('.flow-fullscreen')) return;
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  });
  // Arrow keys browse the roster like a character select screen.
  content.addEventListener('keydown', event => {
    if (!['fields', 'careers'].includes(current.screen) || !['ArrowLeft', 'ArrowRight'].includes(event.key) || !event.target.closest('.cs-roster, .cs-stage')) return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    // Move from the focused portrait when there is one, otherwise from the highlighted one.
    const thumbs = [...content.querySelectorAll('.cs-thumb')];
    const focused = thumbs.indexOf(event.target.closest('.cs-thumb'));
    event.preventDefault();
    if (current.screen === 'fields') {
      const index = focused >= 0 ? focused : careerFields.indexOf(fieldById(current.field) || careerFields[0]);
      return selectField(careerFields[(index + step + careerFields.length) % careerFields.length].id, { focus: true });
    }
    const items = orderedRoles(current.field);
    if (!items.length) return;
    const index = focused >= 0 ? focused : items.indexOf(selectedRole(items));
    selectCareer(items[(index + step + items.length) % items.length].id, { focus: true });
  });
  changeCareer?.addEventListener('click', () => {
    const params = new URLSearchParams(location.search);
    const role = roleById(params.get('goal')) || roleById(params.get('career'));
    navigate(role ? { ...current, screen: 'profile', field: fieldForRole(role), career: role.id } : { screen: 'fields', field: '', career: '', ...fresh });
  });

  return {
    syncFromLocation({ focus = false } = {}) {
      const params = new URLSearchParams(location.search);
      current = resolveLocation();
      if (params.has('screen')) writeLocation(current, false);
      if (current.screen === 'journey') {
        const role = roleById(current.career);
        if (role && (params.get('goal') !== role.id || params.get('sector') !== role.sector)) onStart?.(role);
      }
      render({ focus });
    },
    showWelcome() { navigate({ screen: 'welcome', field: '', career: '', ...fresh }); },
  };
}
