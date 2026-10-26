/** The career chooser is a URL-driven introduction to the existing pathway. */
import { mountHero3d } from './hero3d.js';

export const careerFields = [
  { id: 'it', title: 'IT', label: 'Information Technology', description: 'Build, connect and protect the digital world.', icon: 'compass', portrait: 'assets/field-it-smiling', portraitAlt: 'Smiling IT professional holding a laptop', art: 'assets/field-it-select', artAlt: 'Smiling IT student holding a laptop, surrounded by a golden energy glow' },
  { id: 'creative', title: 'Creative', label: 'Creative & Digital Media', description: 'Bring ideas to life through design, content and digital experiences.', icon: 'bookmark', portrait: 'assets/field-creative-smiling', portraitAlt: 'Smiling Creative professional with a drawing tablet', art: 'assets/field-creative-select', artAlt: 'Smiling Creative Media student with a stylus and drawing tablet, outlined in a golden glow' },
  { id: 'business', title: 'Business', label: 'Business & Leadership', description: 'Explore the people, decisions and ideas behind organisations.', icon: 'book', portrait: 'assets/field-business-smiling', portraitAlt: 'Smiling Business professional in a navy suit holding a portfolio', art: 'assets/field-business-select', artAlt: 'Smiling Business student in a navy suit and yellow tie holding a portfolio, outlined in a golden glow' },
];

export function initializeCareerFlow({ roles, sectorDisplay, characterFrame, icon, esc, motion, onStart, onLeaveJourney }) {
  const flow = document.getElementById('career-flow');
  const content = document.getElementById('flow-content');
  const progress = document.getElementById('flow-progress');
  const progressNav = progress.closest('nav');
  const experience = document.getElementById('career-experience');
  const changeCareer = document.getElementById('change-career');
  const steps = [ ['welcome', 'Start'], ['fields', 'Field'], ['careers', 'Career'], ['profile', 'Your future'], ['journey', 'Journey'] ];
  const stageNames = { entry: 'Entry', mid: 'Mid-career', senior: 'Senior', top: 'Leadership' };
  const stageOrder = { entry: 0, mid: 1, senior: 2, top: 3 };
  let current = { screen: 'welcome', field: '', career: '' };
  let wasJourney = false;
  let hero3d = null;
  const allRoles = Array.isArray(roles) ? roles : [];
  const fieldForRole = role => role?.sector === 'digital-media' ? 'creative' : role && Object.hasOwn(sectorDisplay, role.sector) ? 'it' : '';
  const fieldById = id => careerFields.find(field => field.id === id);
  const roleById = id => allRoles.find(role => role.id === id);
  const rolesInField = field => allRoles.filter(role => fieldForRole(role) === field).sort((a, b) => (stageOrder[a.stage] ?? 4) - (stageOrder[b.stage] ?? 4) || a.title.localeCompare(b.title));
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
  const fieldArt = field => `<picture class="flow-field-picture"><source srcset="${field.art}.webp" type="image/webp"><img class="flow-field-photo" src="${field.art}.png" alt="${esc(field.artAlt)}" width="1086" height="1448" decoding="async"></picture>`;
  const fieldPortrait = field => `<picture class="flow-field-picture"><source srcset="${field.portrait}.webp" type="image/webp"><img class="flow-field-photo" src="${field.portrait}.png" alt="${esc(field.portraitAlt)}" width="1086" height="1448" decoding="async"></picture>`;

  function resolveLocation() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('screen');
    const field = fieldById(params.get('field'))?.id || '';
    const career = roleById(params.get('career'));
    const goal = roleById(params.get('goal'));
    if (!requested) return goal ? { screen: 'journey', field: fieldForRole(goal), career: goal.id } : { screen: 'welcome', field: '', career: '' };
    if (!steps.some(([id]) => id === requested)) return { screen: 'welcome', field: '', career: '' };
    if (requested === 'welcome' || requested === 'fields') return { screen: requested, field, career: career && fieldForRole(career) === field ? career.id : '' };
    if (requested === 'journey') {
      // A shared journey can use either the new career parameter or a legacy goal.
      const target = params.has('career') ? career : goal;
      if (target && (!field || fieldForRole(target) === field)) return { screen: 'journey', field: fieldForRole(target), career: target.id };
      const sector = params.get('sector');
      if (!params.has('career') && !params.has('goal') && Object.hasOwn(sectorDisplay, sector) && !allRoles.some(role => role.sector === sector)) return { screen: 'journey', field: sector === 'digital-media' ? 'creative' : 'it', career: '' };
      return { screen: field ? 'careers' : 'fields', field, career: '' };
    }
    if (!field) return { screen: 'fields', field: '', career: '' };
    if (requested === 'profile' && career && fieldForRole(career) === field) return { screen: 'profile', field, career: career.id };
    // Career select keeps its highlighted character; a shared goal in the same field preselects it.
    const pick = requested === 'careers' ? [career, goal].find(role => role && fieldForRole(role) === field) : null;
    return { screen: 'careers', field, career: pick?.id || '' };
  }

  function writeLocation(next, push = true) {
    const url = new URL(location.href);
    url.searchParams.set('screen', next.screen);
    if (next.field) url.searchParams.set('field', next.field); else url.searchParams.delete('field');
    if (next.career) url.searchParams.set('career', next.career); else url.searchParams.delete('career');
    if (next.screen === 'journey') {
      const role = roleById(next.career);
      if (role) { url.searchParams.set('goal', role.id); url.searchParams.set('sector', role.sector); }
    }
    history[push ? 'pushState' : 'replaceState']({}, '', url);
  }

  function progressMarkup() {
    const index = steps.findIndex(([id]) => id === current.screen);
    return steps.map(([screen, title], position) => {
      const available = position < index && (screen !== 'careers' || current.field) && (screen !== 'profile' || current.career);
      return `<li><button type="button" data-flow-screen="${screen}" class="${position === index ? 'is-current' : position < index ? 'is-complete' : ''}" ${position === index ? 'aria-current="step"' : ''} ${available ? '' : 'disabled'}><span class="flow-progress-number" aria-hidden="true">${position < index ? icon('check') : String(position + 1).padStart(2, '0')}</span><span>${title}</span></button></li>`;
    }).join('');
  }

  function welcomeMarkup() {
    return `<div class="flow-screen flow-welcome">${planet()}${topRow()}<div class="flow-welcome-copy"><h1 class="flow-title" id="flow-title" tabindex="-1"><span class="flow-title-line">What do you</span> <span class="flow-title-line">want to be<span class="flow-title-dot">?</span></span></h1><p class="flow-intro">Find a career that feels like you. Meet your future self, then discover the steps to get there.</p><div class="flow-actions">${button('start', `Find my future ${icon('arrow-right')}`, true)}</div><p class="flow-caption">Choose a field. Find your role. Follow your pathway.</p></div><div class="flow-welcome-scene flow-character-stage" role="img" aria-label="An illustrated pathway from a student today to a future career character"><div class="flow-portrait flow-portrait-start">${sprite(0)}<span class="flow-scene-label"><small>THE START</small><strong>You, today</strong></span></div><div class="flow-scene-path" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div><div class="flow-portrait flow-portrait-future">${sprite(5)}<span class="flow-scene-label"><small>THE POSSIBILITY</small><strong>Your future self</strong></span></div></div></div>`;
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
    const stats = [[careers.length, 'Careers'], [sectors.length, 'Sectors'], [new Set(careers.map(role => role.stage)).size, 'Stages']];
    return `<div class="cs-art cs-art-xl cs-art-field">${shape}<div class="cs-figure cs-figure-field">${fieldArt(field)}</div></div><div class="cs-info"><span class="cs-class">${careers.length ? 'Open world' : 'Coming soon'}</span><div class="cs-name"><span class="cs-index" aria-hidden="true">${String(careerFields.indexOf(field) + 1).padStart(2, '0')}</span><h2>${esc(field.title)}</h2></div><p class="cs-sector cs-sector-top">${esc(field.label)}</p><dl class="cs-stats">${stats.map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="cs-summary">${esc(field.description)}</p>${sectors.length ? `<div class="cs-skills" role="group" aria-label="Sectors in ${esc(field.title)}">${sectors.map((key, index) => `<button type="button" class="cs-skill" data-cs-sector="${key}" aria-pressed="${index === 0}" aria-label="${esc(sectorDisplay[key].name)}" title="${esc(sectorDisplay[key].name)}">${skillGlyph(sectorDisplay[key].name, glyphs)}</button>`).join('')}</div>` : ''}<div class="cs-skill-detail" id="cs-skill-detail">${sectorDetail(field, sectors[0])}</div></div>`;
  }

  const selectFooter = (back, backLabel, choose, chooseLabel, roster) => `<footer class="mission-footer select-footer"><button type="button" class="mission-back" data-flow-action="${back}">${icon('arrow-left')}<span>Back<small>${backLabel}</small></span></button><div class="select-roster">${roster}<div class="cs-roster-track" aria-hidden="true"><span></span></div></div><button type="button" class="cs-choose mission-accept" data-flow-action="${choose}">${chooseLabel} ${icon('arrow-right')}</button></footer>`;

  function fieldsMarkup() {
    const field = fieldById(current.field) || careerFields[0];
    return `<div class="flow-screen flow-select" style="--cs-count:${careerFields.length};--cs-index:${careerFields.indexOf(field)}">${topRow()}<header class="cs-header"><button type="button" class="cs-back" data-flow-action="back" aria-label="Back to start">${icon('arrow-left')}</button><h1 class="cs-title" id="flow-title" tabindex="-1">Field select</h1><span class="cs-meta">Choose your world · ${careerFields.length} fields</span>${planet()}</header><div class="cs-stage" id="cs-stage">${fieldStageMarkup(field)}</div>${selectFooter('back', 'to start', 'choose-field', 'Select field', `<div class="cs-roster" role="group" aria-label="Choose a field. Use the arrow keys to browse.">${careerFields.map(item => `<button type="button" class="cs-thumb cs-thumb-field" data-flow-field="${item.id}" aria-pressed="${item === field}" aria-label="${esc(item.title)}${rolesInField(item.id).length ? '' : ', coming soon'}" title="${esc(item.label)}">${fieldArt(item)}</button>`).join('')}</div>`)}<p class="sr-only" id="cs-status" aria-live="polite"></p></div>`;
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
    return `<div class="cs-art cs-art-xl">${shape}<div class="cs-figure" role="img" aria-label="Illustrated ${esc(stage)} character">${sprite(characterFrame(role))}</div></div><div class="cs-info"><span class="cs-class">${esc(stage)}</span><div class="cs-name${role.title.length > 22 ? ' is-long' : ''}"><span class="cs-index" aria-hidden="true">${String(items.indexOf(role) + 1).padStart(2, '0')}</span><h2>${esc(role.title)}</h2></div><dl class="cs-stats">${careerStats(role).map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="cs-summary">${esc(role.summary)}</p><p class="cs-sector">${esc(sectorDisplay[role.sector]?.name || role.sector)}</p>${skills.length ? `<div class="cs-skills" role="group" aria-label="Skills for ${esc(role.title)}">${skills.map(([name], index) => `<button type="button" class="cs-skill" data-cs-skill="${index}" aria-pressed="${index === 0}" aria-label="${esc(name)}" title="${esc(name)}">${skillGlyph(name, glyphs)}</button>`).join('')}</div>` : ''}<div class="cs-skill-detail" id="cs-skill-detail">${skillDetail(role, 0)}</div></div>`;
  }

  function careersMarkup() {
    const field = fieldById(current.field);
    const items = rolesInField(current.field);
    if (!items.length) {
      const heading = band(`<span class="flow-kicker flow-eyebrow">03 / EXPLORE ${esc(field.title.toUpperCase())}</span><h1 class="flow-title" id="flow-title" tabindex="-1">Your next chapter is coming.</h1><p class="flow-intro">The source does not include ${esc(field.title.toLowerCase())} career profiles yet. You can explore the available IT pathways while more careers are added.</p>`);
      return `<div class="flow-screen">${heading}<div class="flow-body"><div class="flow-empty flow-empty-with-portrait" data-field="${field.id}"><div class="flow-empty-copy"><span class="flow-empty-icon" aria-hidden="true">${icon(field.icon)}</span><h2>No published careers here yet</h2><p>Your possibilities are bigger than this preview. Career profiles will appear here when the source provides them.</p><div class="flow-actions">${button('explore-it', `Explore IT careers ${icon('arrow-right')}`, true)}${button('fields', `${icon('arrow-left')} Back to fields`)}</div></div><div class="flow-empty-portrait">${fieldPortrait(field)}</div></div></div></div>`;
    }
    const role = selectedRole(items);
    const index = items.indexOf(role);
    return `<div class="flow-screen flow-select" style="--cs-count:${items.length};--cs-index:${index}">${topRow()}<header class="cs-header"><button type="button" class="cs-back" data-flow-action="fields" aria-label="Back to fields">${icon('arrow-left')}</button><h1 class="cs-title" id="flow-title" tabindex="-1">Career select</h1><span class="cs-meta">${esc(field.label)} · ${items.length} careers</span>${planet()}</header><div class="cs-stage" id="cs-stage">${stageMarkup(role, items)}</div>${selectFooter('fields', 'to fields', 'choose', 'Select career', `<div class="cs-roster" role="group" aria-label="Choose a career. Use the arrow keys to browse.">${items.map(item => `<button type="button" class="cs-thumb" data-flow-career="${esc(item.id)}" aria-pressed="${item === role}" aria-label="${esc(item.title)}" title="${esc(item.title)}">${sprite(characterFrame(item))}</button>`).join('')}</div>`)}<p class="sr-only" id="cs-status" aria-live="polite"></p></div>`;
  }

  function selectCareer(id, { focus = false } = {}) {
    const items = rolesInField(current.field);
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
    current = { ...current, field: field.id, career: kept && fieldForRole(kept) === field.id ? kept.id : '' };
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
    const role = roleById(current.career) || selectedRole(rolesInField(current.field));
    for (const tile of content.querySelectorAll('.cs-skill')) tile.setAttribute('aria-pressed', String(Number(tile.dataset.csSkill) === index));
    document.getElementById('cs-skill-detail').innerHTML = skillDetail(role, index);
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
      ['Qualify for entry', routes.length ? `<ul class="mission-routes">${routes.map((route, index) => `<li><b>Route ${'ABCDE'[index]}</b><span>${esc(route.note || `BDQF ${route.bdqf}`)}</span></li>`).join('')}</ul>` : '<p>Entry requirements have not been published yet.</p>'],
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
    content.innerHTML = current.screen === 'welcome' ? welcomeMarkup() : current.screen === 'fields' ? fieldsMarkup() : current.screen === 'careers' ? careersMarkup() : profileMarkup();
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
    if (control.dataset.flowScreen) {
      const screen = control.dataset.flowScreen;
      if (steps.findIndex(([id]) => id === screen) < steps.findIndex(([id]) => id === current.screen)) navigate({ ...current, screen });
      return;
    }
    const action = control.dataset.flowAction;
    if (action === 'start' || action === 'fields') return navigate({ screen: 'fields', field: current.field, career: '' });
    if (action === 'choose-field') {
      const field = fieldById(current.field) || careerFields[0];
      const kept = roleById(current.career);
      return navigate({ screen: 'careers', field: field.id, career: kept && fieldForRole(kept) === field.id ? kept.id : '' });
    }
    if (action === 'choose') {
      const role = roleById(current.career) || selectedRole(rolesInField(current.field));
      if (role) navigate({ screen: 'profile', field: current.field, career: role.id });
      return;
    }
    if (action === 'explore-it') return navigate({ screen: 'careers', field: 'it', career: '' });
    if (action === 'back') return navigate(current.screen === 'profile' ? { screen: 'careers', field: current.field, career: current.career } : { screen: 'welcome', field: '', career: '' });
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
    const items = rolesInField(current.field);
    if (!items.length) return;
    const index = focused >= 0 ? focused : items.indexOf(selectedRole(items));
    selectCareer(items[(index + step + items.length) % items.length].id, { focus: true });
  });
  changeCareer?.addEventListener('click', () => {
    const params = new URLSearchParams(location.search);
    const role = roleById(params.get('goal')) || roleById(params.get('career'));
    navigate(role ? { screen: 'profile', field: fieldForRole(role), career: role.id } : { screen: 'fields', field: '', career: '' });
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
    showWelcome() { navigate({ screen: 'welcome', field: '', career: '' }); },
  };
}
