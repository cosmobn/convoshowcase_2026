import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const profile = path.join(process.cwd(), 'artifacts', 'motion-chrome-profile');
const baseUrl = process.env.PATHFINDER_URL || 'http://127.0.0.1:8080/';
const fixtureUrl = new URL('?sector=ict-security&from=olevel&exp=0&goal=ciso', baseUrl).href;
await mkdir(profile, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--remote-debugging-port=9335', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let ws;

try {
  let target;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { target = (await (await fetch('http://127.0.0.1:9335/json')).json()).find(item => item.type === 'page'); if (target) break; } catch {}
    await sleep(150);
  }
  assert(target, 'Motion check Chrome debugging endpoint did not start');
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
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
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
    do { if (await evaluate(expression)) return; await sleep(35); } while (Date.now() < deadline);
    throw new Error(`Timed out waiting for ${description}`);
  }
  async function frames() { await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
  async function click(selector) {
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing ${selector}`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await frames();
  }
  async function ready() { await waitFor('document.querySelectorAll(".pathway-card").length === 5', 'the security pathway'); }
  async function revealPathway() {
    await evaluate('document.querySelector(".pathway-scroll").scrollIntoView({ block: "center", behavior: "instant" })'); await frames();
  }
  const active = 'document.getAnimations().filter(animation => animation.playState === "running" || animation.pending)';
  const cardActive = '[...document.querySelectorAll(".pathway-card, .study-card, .starting-card")].flatMap(element => element.getAnimations({ subtree: true })).filter(animation => animation.playState === "running" || animation.pending)';
  const contentVisible = `[...document.querySelectorAll('.pathway-card, .study-card, .starting-card')].every(element => {
    const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
    for (let node = element; node instanceof Element; node = node.parentElement) {
      const style = getComputedStyle(node); if (Number(style.opacity) < .99 || style.visibility !== 'visible' || style.display === 'none') return false;
    }
    return true;
  })`;
  async function settle() {
    await waitFor(`${cardActive}.length === 0`, 'finite card entrance animations to finish');
    assert(await evaluate(contentVisible), 'A pathway card remains hidden after motion finishes');
  }
  async function reduced(value) { await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] }); await frames(); }
  async function escape() {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor('!document.querySelector("#detail-dialog").open', 'native Escape to close details');
  }
  async function checkSliderFocus(value) {
    const state = await evaluate(`(() => { const input = document.querySelector('#experience-slider'); input.focus(); input.value = ${JSON.stringify(String(value))}; input.dispatchEvent(new Event('input', { bubbles: true })); return { focused: document.activeElement === input, output: document.querySelector('#experience-output').textContent.trim() }; })()`);
    assert(state.focused, 'An animated update replaced the focused experience slider'); assert.equal(state.output, String(value)); await settle();
  }

  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await reduced('no-preference'); await load('Page.navigate', { url: fixtureUrl }); await ready();
  await evaluate('localStorage.clear()'); await load('Page.reload'); await ready();
  assert(!await evaluate('document.querySelector("#motion-toggle")'), 'Motion should always be on, without a toggle');
  await revealPathway();
  await waitFor(`${cardActive}.length > 0`, 'finite pathway entrance to start');
  assert(await evaluate(`${cardActive}.every(animation => animation.effect.getComputedTiming().iterations !== Infinity)`), 'A pathway card has an infinite animation');
  await settle(); await waitFor(`${active}.length === 0`, 'finite header and profile entrances to finish');
  assert.equal(await evaluate(`${active}.length`), 0, 'Settled page has an unexpected running animation');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop document overflows with motion');
  await click('[data-qualification="hnd"]'); await checkSliderFocus(4);
  assert.equal(await evaluate('document.querySelectorAll(".pathway-card .status-ready").length'), 3);
  const stage = 'document.querySelector("[data-evolution][aria-pressed=true]").dataset.evolution';
  assert(!await evaluate('document.querySelector("#play-journey")'), 'The journey should play itself without a play button');
  await evaluate('document.querySelector("#journey-panel").scrollIntoView({ block: "center", behavior: "instant" })');
  const autoStart = await evaluate(stage);
  await waitFor(`${stage} !== ${JSON.stringify(autoStart)}`, 'the journey to autoplay to another stage');
  await waitFor(`${stage} === "0"`, 'the journey autoplay to loop back to the start', 20000);
  assert(await evaluate('getComputedStyle(document.querySelector(".evolution-step.is-current .character-sprite")).transform !== "none"'), 'The highlighted stage character should be enlarged');
  await click('[data-evolution="2"]');
  await sleep(2600);
  assert.equal(await evaluate(stage), '2', 'Picking a stage should rest the journey autoplay');
  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'Animated details did not open');
  await waitFor('!document.querySelector("#detail-dialog").getAnimations({ subtree: true }).some(animation => animation.playState === "running" || animation.pending)', 'modal entrance to finish');
  assert(await evaluate('getComputedStyle(document.querySelector("#detail-dialog")).opacity === "1"'), 'Animated details remain transparent');
  await escape(); await click('.card-open[data-detail="associate-security-analyst"]'); await click('#close-detail');
  assert(!await evaluate('document.querySelector("#detail-dialog").open'), 'Reopened details could not close');

  await evaluate('localStorage.setItem("pathfinder-motion", "paused")'); await load('Page.reload'); await ready();
  assert(!await evaluate('document.documentElement.classList.contains("motion-paused")'), 'A stale pause preference should not turn motion off'); await settle();

  await evaluate('document.querySelector("#journey-panel").scrollIntoView({ block: "center", behavior: "instant" })');
  const beforeReduce = await evaluate(stage);
  await waitFor(`${stage} !== ${JSON.stringify(beforeReduce)}`, 'journey autoplay before changing the system motion setting');
  await reduced('reduce'); await waitFor(`${active}.length === 0`, 'system reduced motion to stop animation');
  const reducedStage = await evaluate(stage);
  await sleep(2600);
  assert.equal(await evaluate(stage), reducedStage, 'Reduced motion left the journey autoplaying');
  await click('[data-evolution="5"]');
  assert(await evaluate('document.querySelector("#journey-insight .insight-copy strong").textContent.includes("(CISO)")'), 'Reduced motion should preserve manual stage exploration');
  assert(await evaluate(contentVisible), 'System reduced motion hides pathway content'); await checkSliderFocus(6);
  await load('Page.reload'); await ready(); await waitFor(`${active}.length === 0`, 'reduced motion to remain still after reload');
  assert(await evaluate(contentVisible), 'Reload with reduced motion hides pathway content');
  await click('.card-open[data-detail="associate-security-analyst"]');
  assert(await evaluate('document.querySelector("#detail-dialog").open'), 'Reduced motion prevented details from opening');
  await waitFor(`${active}.length === 0`, 'reduced-motion modal to remain still'); await escape();

  await reduced('no-preference');
  assert(!await evaluate('document.documentElement.classList.contains("motion-paused")'), 'Motion did not resume after the system preference changed');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await click('[data-qualification="hnd"]'); await checkSliderFocus(4);
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile document overflows with motion');
  await click('.card-open[data-detail="associate-security-analyst"]');
  await waitFor('!document.querySelector("#detail-dialog").getAnimations({ subtree: true }).some(animation => animation.playState === "running" || animation.pending)', 'mobile modal entrance to finish');
  assert(await evaluate('(() => { const r = document.querySelector("#detail-dialog").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height <= innerHeight; })()'), 'Animated mobile details do not fit');
  await escape(); await settle();

  await load('Page.navigate', { url: baseUrl });
  await waitFor('document.querySelector("#flow-title") && !document.querySelector("#career-flow").hidden && document.querySelector("#career-experience").hidden', 'the mobile career-selection welcome screen');
  assert(await evaluate(`${active}.every(animation => animation.effect.getComputedTiming().iterations !== Infinity)`), 'Career selection has an infinite animation');
  await waitFor(`${active}.length === 0`, 'finite career-selection entrances to finish');
  assert(await evaluate('getComputedStyle(document.querySelector("#flow-content")).opacity === "1" && document.documentElement.scrollWidth <= innerWidth'), 'Motion leaves the mobile career-selection content hidden or overflowing');
  await click('[data-flow-action=start]');
  await waitFor('new URL(location.href).searchParams.get("screen") === "fields" && document.activeElement === document.querySelector("#flow-title")', 'the career-selection field screen');
  await waitFor(`${active}.length === 0`, 'finite field-selection entrances to finish');
  await reduced('reduce');
  for (const [selector, screen] of [['[data-flow-field=it]', 'fields'], ['[data-flow-action=choose-field]', 'careers'], ['[data-flow-career=ciso]', 'careers'], ['[data-flow-action=choose]', 'profile']]) {
    await click(selector);
    await waitFor(`new URL(location.href).searchParams.get('screen') === ${JSON.stringify(screen)} && document.activeElement === document.querySelector('#flow-title')`, `the reduced-motion ${screen} screen`);
    await waitFor(`${active}.length === 0`, `the reduced-motion ${screen} screen to stay still`);
  }
  await click('[data-flow-action=ready]'); await ready();
  await waitFor('!document.querySelector("#career-experience").hidden && document.querySelector("#career-flow").hidden', 'career confirmation to show the journey with reduced motion');
  await waitFor(`${active}.length === 0`, 'the confirmed journey to respect reduced motion');
  assert.deepEqual(errors, [], 'Uncaught browser errors during motion checks');
  console.log('PASS: finite pathway and career-selection entrances, visible settled content, slider focus, looping journey autoplay that rests on a manual pick, always-on motion with no toggle, immediate system reduced-motion stop, stage exploration, modal animation/Escape, mobile layout and fully operable reduced-motion career selection.');
  await call('Browser.close');
} finally { if (ws?.readyState === WebSocket.OPEN) ws.close(); chrome.kill(); }
