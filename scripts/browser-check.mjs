import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const artifacts = path.join(process.cwd(), 'artifacts');
const baseUrl = process.env.PATHFINDER_URL || 'http://127.0.0.1:8080/';
await mkdir(artifacts, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--remote-debugging-port=9333', `--user-data-dir=${path.resolve(process.env.PATHFINDER_CHROME_PROFILE || path.join(artifacts, 'chrome-profile'))}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let ws;

try {
  let target;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(item => item.type === 'page'); if (target) break; } catch {}
    await sleep(150);
  }
  assert(target, 'Chrome debugging endpoint did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, method === 'Runtime.evaluate' ? 30000 : 10000);
      pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).catch(error => { throw new Error(`${error.message} while evaluating ${expression.slice(0, 180)}`, { cause: error }); });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function load(method, params = {}) {
    let loaded;
    let failed;
    const complete = new Promise((resolve, reject) => { loaded = resolve; failed = reject; });
    const listener = event => { if (JSON.parse(event.data).method === 'Page.loadEventFired') loaded(); };
    const timeout = setTimeout(() => failed(new Error(`Load timeout: ${method}`)), 10000);
    ws.addEventListener('message', listener);
    try { await call(method, params); await complete; }
    finally { clearTimeout(timeout); ws.removeEventListener('message', listener); }
  }
  async function waitFor(expression, description = expression, timeout = 5000) {
    const deadline = Date.now() + timeout;
    do { if (await evaluate(expression)) return; await sleep(40); } while (Date.now() < deadline);
    const state = await evaluate('({ query: location.search, focus: document.activeElement?.id || document.activeElement?.dataset.flowAction || document.activeElement?.tagName, heading: document.querySelector("#flow-title")?.textContent, hidden: document.querySelector("#career-flow")?.hidden, errors: document.querySelector("#flow-content")?.textContent.includes("could not be loaded") })');
    throw new Error(`Timed out waiting for ${description}: ${JSON.stringify(state)}`);
  }
  async function frames() { await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
  async function click(selector) {
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing ${selector}`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await frames();
  }
  async function key(key, code = key) {
    const windowsVirtualKeyCode = { Enter: 13, ' ': 32, Tab: 9, Home: 36, End: 35, ArrowLeft: 37, ArrowRight: 39 }[key];
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode }); await frames();
  }
  async function waitFlow(screen, focused = false) {
    await waitFor(`document.querySelector('#career-flow')?.getClientRects().length > 0 && document.querySelector('#flow-title') && document.querySelectorAll('#flow-progress > li').length === 7 && !document.querySelector('#flow-content .flow-loading') && (new URL(location.href).searchParams.get('screen') || 'welcome') === ${JSON.stringify(screen)}`, `the ${screen} career-selection screen`);
    assert(await evaluate('document.querySelector("#career-experience").hidden'), `The pathway is visible before the ${screen} step is confirmed`);
    if (focused) await waitFor('document.activeElement === document.querySelector("#flow-title")', `the ${screen} screen title to receive focus`);
  }
  async function waitJourney(goal) {
    await waitFor(`document.querySelector('#career-experience')?.getClientRects().length > 0 && document.querySelector('#goal-select')?.value === ${JSON.stringify(goal)} && document.querySelectorAll('.pathway-card').length > 0`, `the visible ${goal} career journey`);
    assert(await evaluate('document.querySelector("#career-flow").hidden'), 'Career selection remains visible after starting the journey');
  }
  // Answers the "What do you like?" questions (kind "quiz") or the quick field quiz (kind "discover") one click at a time.
  async function answer(values, kind = 'quiz') {
    for (const value of values) {
      const count = await evaluate('new URL(location.href).searchParams.get(' + JSON.stringify(kind === 'quiz' ? 'likes' : 'quiz') + ')?.split(".").filter(Boolean).length || 0');
      await click(`[data-${kind}-answer="${value}"]`);
      await waitFor(`(new URL(location.href).searchParams.get(${JSON.stringify(kind === 'quiz' ? 'likes' : 'quiz')})?.split(".").filter(Boolean).length || 0) === ${count + 1}`, `${kind} answer ${count + 1} to be recorded`);
    }
  }
  async function historyStep(delta, screen, goal) {
    await evaluate(`history.go(${delta})`);
    if (screen === 'journey') await waitJourney(goal); else await waitFlow(screen, true);
  }
  async function setValue(selector, value, event = 'change') {
    await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`); await frames();
  }
  async function escape() {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor('!document.querySelector("#detail-dialog").open', 'native Escape to close the dialog');
  }
  async function closeDialog() { if (await evaluate('document.querySelector("#detail-dialog").open')) await click('#close-detail'); }
  async function screenshot(name, full = false) {
    await frames();
    await waitFor('!document.getAnimations().some(animation => animation.playState === "running" || animation.pending)', 'the page to settle before screenshot');
    const dimensions = (await call('Page.getLayoutMetrics')).cssContentSize;
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height, scale: 1 } } : {}) });
    await writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64'));
  }
  async function screenshotRegion(name, selector) {
    await frames();
    await waitFor('!document.getAnimations().some(animation => animation.playState === "running" || animation.pending)', 'the character artwork to settle before screenshot');
    const clip = await evaluate(`(() => { const bounds = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: bounds.left + scrollX, y: bounds.top + scrollY, width: bounds.width, height: bounds.height, scale: 2 }; })()`);
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
    await writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64'));
  }
  async function checkCharacterSprites(selector = '.character-sprite') {
    const characters = await evaluate(`Promise.all([...document.querySelectorAll(${JSON.stringify(selector)})].map(async element => {
      const style = getComputedStyle(element);
      const source = style.backgroundImage.match(/url\\(["']?(.*?)["']?\\)/)?.[1];
      if (!source) throw new Error('A career character has no image source');
      const image = new Image(); image.src = source; await image.decode();
      return { level: element.dataset.characterLevel, frame: element.style.getPropertyValue('--character-frame').trim(), source, width: image.naturalWidth, height: image.naturalHeight, position: style.backgroundPositionX };
    }))`);
    assert(characters.length > 0, `${selector} has no career characters`);
    for (const character of characters) {
      assert.match(new URL(character.source).pathname, /\/assets\/character-levels-smiling\.webp$/, 'A character still uses the earlier fantasy artwork');
      assert.deepEqual({ width: character.width, height: character.height }, { width: 2172, height: 724 }, 'The smiling six-level character artwork did not decode correctly');
      assert.match(character.level || '', /^[0-5]$/, 'A character is missing its explicit level');
      assert.equal(character.level, character.frame, 'A character level does not match its selected artwork frame');
    }
    return characters;
  }
  // CM, IT and Business have field art; OHS has none yet and shows the illustrated character.
  async function checkFieldPortraits(mobile = false) {
    assert(await evaluate('!!document.querySelector("#flow-content [data-flow-field=ohs] .flow-field-sprite .character-sprite") && !document.querySelector("#flow-content [data-flow-field=ohs] img")'), 'OHS should show the illustrated character until it has field art');
    const portraits = await evaluate(`Promise.all([...document.querySelectorAll('#flow-content [data-flow-field]:not([data-flow-field=ohs])')].map(async card => {
      const image = card.querySelector('img.flow-field-photo');
      if (!image) throw new Error('Missing career portrait for ' + card.dataset.flowField);
      await image.decode();
      const bounds = image.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      return {
        field: card.dataset.flowField,
        fallback: image.getAttribute('src'),
        webp: image.closest('picture')?.querySelector('source[type="image/webp"]')?.getAttribute('srcset'),
        loaded: image.currentSrc,
        alt: image.alt,
        width: image.naturalWidth,
        height: image.naturalHeight,
        displayed: bounds.width > 40 && bounds.height > 40 && getComputedStyle(image).visibility !== 'hidden' && getComputedStyle(image).display !== 'none',
        contained: bounds.left >= cardBounds.left - 1 && bounds.right <= cardBounds.right + 1 && bounds.left >= -1 && bounds.right <= innerWidth + 1,
      };
    }))`);
    assert.equal(portraits.length, 3, 'Each career field should have its own portrait');
    assert.equal(new Set(portraits.map(portrait => portrait.loaded)).size, 3, 'Career fields share the same portrait instead of their respective professional');
    const descriptions = { it: /\bIT\b|technology/i, creative: /creative|design/i, business: /business/i };
    for (const portrait of portraits) {
      assert.match(portrait.webp || '', new RegExp(`(?:^|/)assets/field-${portrait.field}-select\\.webp(?:$|\\s)`), `${portrait.field} has a mismatched WebP source`);
      assert.match(portrait.fallback || '', new RegExp(`(?:^|/)assets/field-${portrait.field}-select\\.png$`), `${portrait.field} has a mismatched PNG fallback`);
      assert.equal(new URL(portrait.loaded).pathname.endsWith(`/assets/field-${portrait.field}-select.webp`), true, `${portrait.field} did not load its field-select WebP art`);
      assert(portrait.width > 0 && portrait.height > 0, `${portrait.field} portrait did not decode`);
      assert(portrait.alt.length > 15 && descriptions[portrait.field]?.test(portrait.alt), `${portrait.field} portrait needs meaningful field-specific alternative text`);
      assert(portrait.displayed, `${portrait.field} portrait is not visibly displayed`);
      if (mobile) assert(portrait.contained, `${portrait.field} portrait overflows its mobile field card`);
    }
  }
  async function checkHorizontalScroll(selector = '.pathway-scroll') {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center", behavior: "instant" }); document.querySelector(${JSON.stringify(selector)}).scrollLeft = 0`); await frames();
    const rect = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: Math.min(innerHeight - 20, rect.top + rect.height / 2), overflow: element.scrollWidth - element.clientWidth }; })()`);
    assert(rect.overflow > 50, `${selector} should contain horizontally scrollable stages`);
    await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: rect.x, y: rect.y, deltaX: 500, deltaY: 0 });
    await waitFor(`document.querySelector(${JSON.stringify(selector)}).scrollLeft > 50`, `horizontal wheel input to scroll ${selector}`);
  }
  async function navigate(query = '') {
    await load('Page.navigate', { url: new URL(query, baseUrl).href });
    await waitFor('document.querySelector("#career-flow #flow-title") || (!document.querySelector("#career-experience")?.hidden && document.querySelectorAll(".pathway-card").length > 0)', 'the career guide to load'); await frames();
  }

  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(); await evaluate('localStorage.clear()'); await load('Page.reload');
  await waitFlow('welcome');
  assert.equal(await evaluate('document.querySelector("#flow-title").innerText.replace(/\\s+/g, " ").trim()'), 'What do you want to be?');
  assert.equal(await evaluate('document.querySelector("#flow-progress").children.length'), 7, 'The guide should communicate its seven selection steps');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'The desktop welcome screen overflows');
  const welcomeCharacters = await checkCharacterSprites('#flow-content .character-sprite');
  assert.deepEqual(welcomeCharacters.map(character => character.level), ['0', '5'], 'The welcome scene should show the student and future professional');
  await screenshot('desktop-welcome.png', true);
  await evaluate('document.querySelector("[data-flow-action=start]").focus()'); await key('Enter');
  await waitFlow('fields', true);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#flow-content [data-flow-field]")].map(card => card.dataset.flowField)'), ['creative', 'it', 'business', 'ohs'], 'Students should be offered CM, IT, Business and OHS');
  await checkFieldPortraits();
  await screenshot('desktop-fields.png', true);
  assert(await evaluate('document.querySelector("#flow-progress [data-flow-screen=journey]").disabled'), 'Future progress steps must not bypass career confirmation');
  await evaluate('document.querySelector("[data-flow-field=creative]").focus()'); await key('ArrowRight');
  assert.equal(await evaluate('document.activeElement.dataset.flowField'), 'it', 'Arrow keys should move through the field roster');
  assert.equal(await evaluate('new URL(location.href).searchParams.get("field")'), 'it', 'The highlighted field should be kept in the URL');
  await evaluate('document.querySelector("[data-flow-action=choose-field]").focus()'); await key('Enter');
  await waitFlow('likes', true);
  assert.match(await evaluate('document.querySelector(".quiz-progress").textContent'), /Question 1 of 7/, 'What do you like? should ask seven questions');
  assert.equal(await evaluate('document.querySelectorAll("[data-quiz-answer]").length'), 6, 'Each IT question offers five job areas and None of these');
  await screenshot('desktop-likes.png', true);
  await answer(Array(7).fill('security'));
  await waitFlow('match', true);
  assert.equal(await evaluate('document.querySelectorAll(".pie-chart .pie-slice").length'), 1, 'All-security answers should draw one full slice');
  assert.equal(await evaluate('document.querySelectorAll(".pie-legend li").length'), 5, 'The answers legend should list every IT job area');
  assert.match(await evaluate('document.querySelector("#flow-title").textContent'), /Cyber Security/, 'The match should name the best job area');
  assert.equal(await evaluate('document.querySelectorAll(".match-card:not(.match-others) [data-match-career]").length'), 5, 'Jobs that suit you should list the five Cyber Security roles');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'The desktop match screen overflows');
  await screenshot('desktop-match.png', true);
  await click('[data-match-career="associate-security-analyst"]');
  await waitFlow('careers', true);
  assert.equal(await evaluate('document.querySelectorAll("#flow-content [data-flow-career]").length'), 33, 'IT should contain all 33 IT roles');
  assert.equal((await checkCharacterSprites('#flow-content .cs-thumb .character-sprite')).length, 33, 'Each roster portrait should show the smiling human character');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#flow-content [data-flow-career]")].slice(0, 5).map(thumb => thumb.dataset.flowCareer)'), ['associate-security-analyst', 'cyber-risk-analyst', 'security-engineer', 'cyber-risk-manager', 'ciso'], 'The roster should lead with the best-matching roles');
  assert(await evaluate('!!document.querySelector(".cs-info .cs-best")'), 'A best-matching role should be tagged');
  await screenshot('desktop-careers.png', true);
  assert.equal(await evaluate('document.querySelector(".cs-thumb[aria-pressed=true]").dataset.flowCareer'), 'associate-security-analyst', 'Career select should highlight the first career');
  await evaluate('document.querySelector(".cs-thumb[aria-pressed=true]").focus()'); await key('ArrowRight');
  assert.equal(await evaluate('document.activeElement.dataset.flowCareer'), 'cyber-risk-analyst', 'Arrow keys should move through the career roster');
  assert.equal(await evaluate('new URL(location.href).searchParams.get("career")'), 'cyber-risk-analyst', 'The highlighted career should be kept in the URL');
  assert.match(await evaluate('document.querySelector(".cs-info h2").textContent'), /Cyber Risk Analyst/, 'The character card did not follow the roster');
  await click('.cs-skill[data-cs-skill="1"]');
  assert(await evaluate('document.querySelector(".cs-skill[aria-pressed=true]").dataset.csSkill === "1" && /Level [1-5]/.test(document.querySelector("#cs-skill-detail").textContent)'), 'Choosing a skill tile did not show its level');
  assert.equal(await evaluate('document.querySelectorAll("#flow-content [data-flow-career]").length'), 33);
  assert.equal(await evaluate('new URL(location.href).searchParams.get("field")'), 'it');
  await click('[data-flow-career="associate-security-analyst"]'); await click('[data-flow-action=choose]'); await waitFlow('profile', true);
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /Associate Security Analyst/);
  assert.match(await evaluate('document.querySelector(".mission-study")?.textContent || ""'), /Pearson BTEC HND in Computing meets an entry route/, 'The profile should name the COSMO qualification that leads to the role');
  assert(await evaluate('!!document.querySelector("#flow-content .character-sprite")'), 'The career profile is missing its illustrated character');
  assert.equal((await checkCharacterSprites('#flow-content .flow-profile-character .character-sprite')).length, 1, 'The selected career profile should show the smiling human character');
  await screenshot('desktop-profile.png', true);
  assert.match(await evaluate('document.querySelector("[data-flow-action=ready]").textContent'), /Accept mission/i);
  assert(await evaluate('document.querySelector("#flow-progress [data-flow-screen=journey]").disabled'), 'The profile should require the I’m Ready action before starting a journey');
  await click('#flow-progress [data-flow-screen=journey]'); await waitFlow('profile');
  await click('[data-flow-action=ready]'); await waitJourney('associate-security-analyst');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 1, 'Confirming the associate career did not start its pathway');
  assert.match(await evaluate('document.querySelector("#future-title").textContent'), /Associate Security Analyst/);
  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'The first career journey did not open role details');
  await historyStep(-1, 'profile');
  assert(!await evaluate('document.querySelector("#detail-dialog").open'), 'Browser Back left a journey modal blocking career selection');
  await historyStep(1, 'journey', 'associate-security-analyst');
  // Each answer is its own history entry, so Back steps through the questions too.
  for (const screen of ['profile', 'careers', 'match', ...Array(7).fill('likes'), 'fields', 'welcome']) await historyStep(-1, screen);
  for (const screen of ['fields', ...Array(7).fill('likes'), 'match', 'careers', 'profile', 'journey']) await historyStep(1, screen, 'associate-security-analyst');
  await click('[data-qualification="hnd"]'); await setValue('#experience-slider', '4', 'input');
  assert.equal(await evaluate('new URL(location.href).searchParams.get("screen")'), 'journey', 'Updating a profile lost the current flow screen');
  await click('#change-career'); await waitFlow('profile', true);
  assert.equal(await evaluate('new URL(location.href).searchParams.get("career")'), 'associate-security-analyst', 'Change career did not return to the selected career profile');
  await click('[data-flow-action=ready]'); await waitJourney('associate-security-analyst');
  assert.equal(await evaluate('document.querySelector(".qualification-pill[aria-pressed=true]").dataset.qualification'), 'hnd', 'Reconfirming a career lost the chosen qualification');
  assert.equal(await evaluate('document.querySelector("#experience-slider").value'), '4', 'Reconfirming a career lost the experience value');
  await click('#change-career'); await waitFlow('profile', true); await click('[data-flow-screen=fields]'); await waitFlow('fields', true);
  await click('[data-flow-field=business]'); await click('[data-flow-action=choose-field]'); await waitFlow('likes', true);
  await answer(Array(7).fill('numbers')); await waitFlow('match', true);
  assert.equal(await evaluate('document.querySelectorAll("[data-match-career]").length'), 0, 'Business jobs are COSMO careers, not BIICF roles');
  await click('[data-flow-action=guide]'); await waitFlow('careers', true);
  assert.equal(await evaluate('document.querySelectorAll("#flow-content [data-flow-career]").length'), 0, 'Business should not invent an ordered career ladder');
  assert.equal(await evaluate('document.querySelectorAll(".business-level").length'), 4, 'Business should show the four published BTEC study levels');
  assert.equal(await evaluate('document.querySelectorAll(".business-tags li").length'), 10, 'Business should show the ten career possibilities published by COSMO');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".business-tags li.is-match")].map(item => item.firstChild.textContent.trim())'), ['Business Analyst', 'Finance Assistant'], 'Business should mark the best-matching careers');
  assert.equal(await evaluate('document.querySelectorAll(".business-topics li").length'), 7, 'Business should show the published HND leadership topics');
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /course-based study guide|not a BIICF competency framework/i, 'Business does not explain its source boundary');
  await screenshot('desktop-business.png', true);
  await click('[data-flow-action=to-match]'); await waitFlow('match', true);
  await click('[data-flow-action=fields]'); await waitFlow('fields', true);
  await click('[data-flow-field=creative]'); await click('[data-flow-action=choose-field]'); await waitFlow('likes', true);
  await answer(Array(7).fill('research')); await waitFlow('match', true);
  await click('[data-match-career="market-analyst"]'); await waitFlow('careers', true);
  assert.equal(await evaluate('document.querySelectorAll("#flow-content [data-flow-career]").length'), 6, 'CM should contain the six published Digital Media careers');
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /Market Analyst/, 'The Digital Media entry career is missing');
  await click('[data-flow-action=to-match]'); await waitFlow('match', true);
  await click('[data-flow-action=fields]'); await waitFlow('fields', true);
  await click('[data-flow-field=it]'); await click('[data-flow-action=choose-field]'); await waitFlow('likes', true);
  await answer(Array(7).fill('security')); await waitFlow('match', true);
  await click('[data-match-career="ciso"]'); await waitFlow('careers', true);
  assert.equal(await evaluate('new URL(location.href).searchParams.get("field")'), 'it', 'Returning from Digital Media did not open IT careers');
  await click('[data-flow-career=ciso]'); await click('[data-flow-action=choose]'); await waitFlow('profile', true);
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /Chief Information Security Officer/);
  await click('[data-flow-action=ready]'); await waitJourney('ciso');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'Selecting a different career did not replace the pathway goal');
  await click('[data-qualification="olevel"]'); await setValue('#experience-slider', '0', 'input');
  await waitFor('document.querySelectorAll(".pathway-card").length === 5', 'the default five-role security pathway');
  assert.equal(await evaluate('document.querySelector("#page-title").textContent.replace(/\\s+/g, "")'), 'Yourfuture.Onelevelatatime.');
  assert(await evaluate('!document.querySelector(".brandbar") && !document.querySelector("#motion-toggle") && !!document.querySelector(".study-card")'), 'Default layout should have no brand bar or motion toggle but keep its study preparation');
  assert.equal(await evaluate('document.querySelector(".qualification-pill[aria-pressed=true]").dataset.qualification'), 'olevel');
  assert.equal(await evaluate('document.querySelector("#goal-select").value'), 'ciso');
  assert.equal(await evaluate('document.querySelector("#experience-slider").max'), '50');
  assert.equal(await evaluate('document.querySelectorAll("[data-evolution]").length'), 6, 'The default journey should include a starting point and five career stages');
  assert.match(await evaluate('document.querySelector("#future-title").textContent'), /Chief Information Security Officer \(CISO\)/);
  assert.equal(await evaluate('document.querySelector("#future-character").style.getPropertyValue("--character-frame")'), '5');
  const journeyCharacters = await checkCharacterSprites();
  const levels = await checkCharacterSprites('#evolution-track .character-sprite');
  assert.deepEqual(levels.map(character => character.level), ['0', '1', '2', '3', '4', '5'], 'The default journey should show six distinct ordered human character levels');
  assert.equal(new Set(levels.map(character => character.position)).size, 6, 'Journey levels repeat the same artwork frame');
  assert(journeyCharacters.length >= 13, 'Hero, stage, insight and role-card character artwork should all be present');
  assert.match(await evaluate('document.querySelector(".journey-footnote").textContent'), /not BDQF levels or guaranteed promotions/i, 'Visual progression must be distinguished from formal qualifications');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop document has horizontal overflow');
  await screenshot('desktop.png', true);
  await screenshotRegion('character-levels.png', '#evolution-track');

  await click('[data-evolution="5"]');
  assert.equal((await checkCharacterSprites('#journey-insight .character-sprite'))[0].level, '5', 'Selecting the destination did not update the smiling insight character');
  assert(await evaluate('document.querySelector("#journey-insight .insight-copy strong").textContent.includes("(CISO)") && document.querySelector("[data-role-card=ciso]").classList.contains("is-highlighted")'), 'Selecting the final stage did not connect its insight and requirement card');
  assert.equal(await evaluate('document.querySelector("#journey-next").disabled'), true);
  await click('#journey-prev'); assert.equal(await evaluate('document.querySelector("[data-evolution][aria-pressed=true]").dataset.evolution'), '4');
  await evaluate('document.querySelector("[data-evolution=\\"4\\"]").focus()');
  for (const [key, index] of [['Home', '0'], ['End', '5'], ['ArrowLeft', '4'], ['ArrowRight', '5']]) {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key });
    assert.equal(await evaluate('document.activeElement.dataset.evolution'), index, `${key} did not focus the matching stage`);
    assert.equal(await evaluate('document.querySelector("[data-evolution][aria-pressed=true]").dataset.evolution'), index, `${key} did not select the matching stage`);
  }

  await click('[data-qualification="btec3"]');
  assert.equal(await evaluate('document.querySelector("[data-qualification=btec3]").getAttribute("aria-pressed")'), 'true');
  assert(await evaluate('document.querySelectorAll(".status-study, .status-experience").length > 0'), 'BTEC Level 3 does not show remaining study or experience requirements');
  await evaluate('window.stageBeforeProfileChange = document.querySelector("[data-evolution=\\"5\\"]"); window.stageBeforeProfileChange.focus()');
  await click('[data-qualification="hnd"]');
  assert(await evaluate('window.stageBeforeProfileChange === document.querySelector("[data-evolution=\\"5\\"]") && document.activeElement === window.stageBeforeProfileChange'), 'Changing qualification replaced or unfocused an existing journey control');
  const slider = await evaluate('(() => { const input = document.querySelector("#experience-slider"); input.focus(); input.value = "4"; input.dispatchEvent(new Event("input", { bubbles: true })); return { focus: document.activeElement === input, output: document.querySelector("#experience-output").textContent.trim(), ready: document.querySelectorAll(".pathway-card .status-ready").length }; })()');
  assert(slider.focus, 'Updating experience replaced the focused slider'); assert.equal(slider.output, '4');
  assert.equal(slider.ready, 3, 'HND and four years should make three security steps ready');
  assert.equal(await evaluate('document.querySelector("#route-ready").textContent'), '3', 'The journey summary is inconsistent with matching role requirements');
  assert(await evaluate('window.stageBeforeProfileChange === document.querySelector("[data-evolution=\\"5\\"]")'), 'Changing experience replaced the journey stage controls');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card .status-experience").length'), 2);
  assert(!await evaluate('!!document.querySelector(".study-card")'), 'HND should not need a preparation card');
  await checkHorizontalScroll();

  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'Role details did not open');
  assert(await evaluate('document.querySelector("#detail-dialog").textContent.includes("CompTIA Security+")'), 'Full certification list is absent');
  await escape(); await click('.card-open[data-detail="associate-security-analyst"]'); await click('[data-goal="associate-security-analyst"]');
  assert(await evaluate('!document.querySelector("#detail-dialog").open && document.querySelector("#goal-select").value === "associate-security-analyst" && document.querySelectorAll(".pathway-card").length === 1'), 'A detail goal did not produce the one-step pathway');
  assert.equal(await evaluate('document.querySelectorAll("[data-evolution]").length'), 2, 'A one-role goal should show a starting point and that role');
  await click('.card-save[data-save="associate-security-analyst"]');
  assert.equal(await evaluate('document.querySelector(".card-save[data-save=associate-security-analyst]").getAttribute("aria-pressed")'), 'true');
  assert(await evaluate('JSON.parse(localStorage.getItem("pathfinder-saved")).includes("associate-security-analyst")'), 'Saved role was not persisted');
  await load('Page.reload');
  await waitFor('document.querySelector(".card-save[data-save=associate-security-analyst]")?.getAttribute("aria-pressed") === "true"', 'saved state to survive reload');
  await click('#saved-button'); assert.equal(await evaluate('document.querySelectorAll("#detail-dialog .saved-role").length'), 1); await closeDialog();

  await click('#sector-tabs [data-sector="apps-solutions"]');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'Software should show the path to Chief Technology Officer (Software)');
  await click('#sector-tabs [data-sector="telecom-network"]');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'Network should show the path to Chief Technology Officer (Network)');
  await setValue('#more-sectors', 'it-services');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 6, 'IT Services should show the path to Chief Information Officer');
  await setValue('#more-sectors', 'digital-media'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'Digital Media should show the published path to Chief Marketing Officer');
  await click('#sector-tabs [data-sector="data-ai"]'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'Data & AI should show the path to Business Intelligence Director');
  await setValue('#goal-select', 'data-architect'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 4);
  assert.equal(await evaluate('document.querySelectorAll("[data-evolution]").length'), 5);
  await click('[data-evolution="4"]');
  assert.match(await evaluate('document.querySelector("#journey-insight").textContent'), /not been published/i, 'Data Architect progression should explain unpublished requirements');
  await click('.card-open[data-detail="data-architect"]');
  assert(await evaluate('/not published|coming soon|unavailable/i.test(document.querySelector("#detail-dialog").textContent)'), 'Data Architect should explain unavailable detail data');
  await closeDialog(); await click('#sector-tabs [data-sector="ict-security"]');
  await setValue('#goal-select', 'associate-security-analyst'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 1);
  await setValue('#goal-select', 'ciso'); assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5);
  await click('#courses-button'); assert.equal(await evaluate('document.querySelectorAll("#detail-dialog .course-card").length'), 38); await closeDialog();
  await click('#about-button');
  const about = await evaluate('document.querySelector("#detail-dialog").textContent');
  assert(/39\s+documented\s+roles/i.test(about), 'Data provenance does not disclose the 39 roles');
  assert(/(?:6|six)\s+Digital Media/i.test(about), 'Data provenance does not disclose six Digital Media roles');
  assert(/Business & Leadership/i.test(about) && /Occupational Health & Safety/i.test(about), 'Data provenance does not disclose the Business and OHS guides');
  assert(/38\s+COSMO\s+courses/i.test(about), 'Data provenance does not disclose the 38 courses'); await closeDialog();

  await navigate(); await waitFlow('welcome');
  assert.equal(await evaluate('document.querySelector("#flow-title").innerText.replace(/\\s+/g, " ").trim()'), 'What do you want to be?', 'A remembered qualification should not skip the welcome screen');
  await navigate('?screen=profile&field=business&career=ciso'); await waitFlow('careers');
  assert.equal(await evaluate('new URL(location.href).searchParams.get("field")'), 'business', 'An invalid career/field combination did not retain the valid field');
  assert.equal(await evaluate('document.querySelectorAll("#flow-content [data-flow-career]").length'), 0, 'A mismatched career leaked into the Business list');
  assert.equal(await evaluate('document.querySelectorAll(".business-level").length'), 4, 'The guarded Business link did not restore its study guide');
  await navigate('?screen=profile&field=invalid&career=ciso'); await waitFlow('fields');
  await navigate('?screen=invalid&field=it&career=ciso'); await waitFlow('welcome');
  await navigate('?screen=profile&field=it&career=data-architect'); await waitFlow('profile');
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /not (?:yet )?published|not available|coming soon|unavailable|requirements are still pending/i, 'The Data Architect profile should disclose unpublished requirements');
  await navigate('?screen=match&field=ohs&likes=site.site.site.site.site.site.site'); await waitFlow('match');
  assert.match(await evaluate('document.querySelector("#flow-title").textContent'), /On-site safety/, 'OHS answers should pick an OHS work area');
  await click('[data-flow-action=guide]'); await waitFlow('careers', true);
  assert.equal(await evaluate('document.querySelectorAll(".business-level").length'), 1, 'OHS should show the COSMO City and Guilds qualification');
  assert.equal(await evaluate('document.querySelectorAll(".business-tags li").length'), 10, 'OHS should list its example jobs');
  assert.match(await evaluate('document.querySelector("#flow-content").textContent'), /example OHS job titles/i, 'OHS must say its jobs are examples');
  await screenshot('desktop-ohs.png', true);
  await navigate('?screen=match&field=it&likes=none.none.none.apps.apps.apps'); await waitFlow('likes');
  await answer(['none']); await waitFlow('likes');
  assert.match(await evaluate('document.querySelector("#flow-title").textContent'), /may not be the best fit/, 'Mostly "None of these" should question the chosen field');
  await click('[data-flow-action=discover]'); await waitFlow('discover', true);
  await answer(Array(5).fill('ohs'), 'discover');
  assert.match(await evaluate('document.querySelector("#flow-title").textContent'), /Occupational Health & Safety/, 'The field quiz should suggest the field its answers point to');
  assert.equal(await evaluate('document.querySelectorAll(".pie-legend li").length'), 4, 'The field quiz pie should list all four fields');
  await screenshot('desktop-discover.png', true);
  await click('[data-flow-pick=ohs]'); await waitFlow('likes', true);
  assert.equal(await evaluate('new URL(location.href).searchParams.get("field")'), 'ohs', 'Continuing from the field quiz should open that field');
  await navigate('?screen=match&field=it&likes=none.none.none.none.apps.apps.apps&anyway=1'); await waitFlow('match');
  await navigate('?screen=journey&field=it&career=ciso&from=olevel&exp=0'); await waitJourney('ciso');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card").length'), 5, 'An explicit journey deep link failed to restore its career');
  await navigate('?sector=ict-security&from=hnd&exp=4&goal=ciso');
  await waitJourney('ciso');
  assert.equal(await evaluate('document.querySelector(".qualification-pill[aria-pressed=true]").dataset.qualification'), 'hnd');
  assert.equal(await evaluate('document.querySelector("#experience-slider").value'), '4');
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card .status-ready").length'), 3);
  assert.equal(await evaluate('document.querySelector(".card-save[data-save=associate-security-analyst]").getAttribute("aria-pressed")'), 'true');
  await evaluate('history.pushState(null, "", "?sector=data-ai&from=degree&exp=9&goal=data-architect"); dispatchEvent(new PopStateEvent("popstate"))');
  await waitFor('document.querySelector("#goal-select").value === "data-architect" && document.querySelectorAll(".pathway-card").length === 4', 'popstate to restore URL choices');
  assert.equal(await evaluate('document.querySelector("#experience-slider").value'), '9');
  await navigate('?sector=ict-security&from=hnd&exp=4&goal=ciso'); await waitJourney('ciso'); await click('#share-button');
  await waitFor('!!document.querySelector(".share-url") || (document.querySelector("#toast") && !document.querySelector("#toast").hidden)', 'share confirmation or URL fallback');
  const fallbackUrl = await evaluate('document.querySelector(".share-url")?.value || document.querySelector(".share-url")?.textContent || null');
  if (fallbackUrl) {
    const shared = new URL(fallbackUrl.trim());
    assert.equal(shared.searchParams.get('goal'), 'ciso'); assert.equal(shared.searchParams.get('from'), 'hnd'); assert.equal(shared.searchParams.get('exp'), '4');
  }
  await closeDialog();

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await navigate(); await waitFlow('welcome');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile welcome has horizontal overflow');
  await checkCharacterSprites('#flow-content .character-sprite');
  await screenshot('mobile-welcome.png', true);
  await click('[data-flow-action=start]'); await waitFlow('fields', true);
  assert(await evaluate('[...document.querySelectorAll("#flow-content [data-flow-field]")].every(element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth; })'), 'Mobile field-selection buttons are clipped');
  await checkFieldPortraits(true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile field portraits cause horizontal overflow');
  await screenshot('mobile-fields.png', true);
  await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
  await frames();
  await checkFieldPortraits(true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll("#flow-content [data-flow-field]")].every(card => { const bounds = card.getBoundingClientRect(); return bounds.left >= 0 && bounds.right <= innerWidth; })'), 'Career field cards or portraits overflow a narrow 320px screen');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await frames();
  await click('[data-flow-field=business]'); await click('[data-flow-action=choose-field]'); await waitFlow('likes', true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll("[data-quiz-answer]")].every(answer => answer.getBoundingClientRect().right <= innerWidth)'), 'Mobile questions are clipped');
  await screenshot('mobile-likes.png', true);
  await answer(Array(7).fill('people')); await waitFlow('match', true);
  await click('[data-flow-action=guide]'); await waitFlow('careers', true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth && document.querySelectorAll(".business-level").length === 4'), 'Mobile Business & Leadership guide is clipped or incomplete');
  await screenshot('mobile-business.png', true);
  await click('[data-flow-action=to-match]'); await waitFlow('match', true);
  await click('[data-flow-action=fields]'); await waitFlow('fields', true);
  await click('[data-flow-field=it]'); await click('[data-flow-action=choose-field]'); await waitFlow('likes', true);
  await answer(['security', 'security', 'apps', 'security', 'none', 'data', 'security']); await waitFlow('match', true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth && document.querySelector(".pie-chart").getBoundingClientRect().right <= innerWidth'), 'Mobile match screen or pie chart overflows');
  await screenshot('mobile-match.png', true);
  await click('[data-match-career="ciso"]'); await waitFlow('careers', true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile career list has horizontal overflow');
  await click('[data-flow-career=ciso]'); await click('[data-flow-action=choose]'); await waitFlow('profile', true);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth && document.querySelector("[data-flow-action=ready]").getBoundingClientRect().right <= innerWidth'), 'Mobile career profile or confirmation action is clipped');
  await checkCharacterSprites('#flow-content .flow-profile-character .character-sprite');
  await screenshot('mobile-profile.png', true);
  await click('[data-flow-action=ready]'); await waitJourney('ciso');
  await navigate('?sector=ict-security&from=olevel&exp=0&goal=ciso'); await frames();
  await waitJourney('ciso');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile document has horizontal overflow');
  assert(await evaluate('[...document.querySelectorAll(".qualification-pill, #experience-slider, #goal-select, #more-sectors")].every(element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth; })'), 'Mobile profile controls are clipped');
  await checkCharacterSprites();
  await screenshot('mobile.png', true); await checkHorizontalScroll('#evolution-track'); await checkHorizontalScroll();
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Scrolling mobile journey tracks caused document overflow');
  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('(() => { const dialog = document.querySelector("#detail-dialog"); const r = dialog.getBoundingClientRect(); return dialog.open && r.left >= 0 && r.right <= innerWidth && r.height <= innerHeight; })()'), 'Mobile role details do not fit');
  await screenshot('mobile-detail.png'); await escape();
  assert.deepEqual(errors, [], 'Uncaught browser errors');
  console.log('PASS: seven-step career selection with field choice, "What do you like?" questions, the answers pie chart and best-match jobs, the "None of these" field check and quick field quiz, all 39 BIICF roles across IT and CM, the COSMO Business and OHS study guides, three matched smiling field portraits with PNG fallbacks plus the OHS character, smiling human artwork across welcome/list/profile/hero/stages/insight/role cards, six distinct ordered level frames, keyboard entry/focus, browser Back/Forward, truthful field lists, confirmation/change-career, guarded/deep links, readiness, saved careers, details, courses, sharing, motion-safe mobile selection and pathway layouts.');
  console.log('Screenshots saved in artifacts/desktop-welcome.png, artifacts/desktop-fields.png, artifacts/desktop-likes.png, artifacts/desktop-match.png, artifacts/desktop-business.png, artifacts/desktop-ohs.png, artifacts/desktop-discover.png, artifacts/desktop-careers.png, artifacts/desktop-profile.png, artifacts/mobile-welcome.png, artifacts/mobile-fields.png, artifacts/mobile-likes.png, artifacts/mobile-business.png, artifacts/mobile-match.png, artifacts/mobile-profile.png, artifacts/desktop.png, artifacts/character-levels.png, artifacts/mobile.png and artifacts/mobile-detail.png.');
  await call('Browser.close');
} finally { if (ws?.readyState === WebSocket.OPEN) ws.close(); chrome.kill(); }
