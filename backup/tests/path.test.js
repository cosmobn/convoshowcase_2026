// Runs the must-pass test cases from spec §6.4.  Usage: npm test
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildRoadmap, FROM_BDQF, findPaths } from '../js/path.js';

const roles = JSON.parse(readFileSync(new URL('../data/roles.json', import.meta.url)));
const title = id => roles.find(r => r.id === id).title;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ', name); }
  catch (e) { failed++; console.log('  FAIL', name, '\n       ', e.message); }
}
const run = (goal, from, exp = 0, alt = 0) => buildRoadmap(roles, goal, FROM_BDQF[from], exp, alt);
const okTitles = rm => rm.steps.filter(s => s.status.type === 'ok').map(s => s.role.title);

test('ciso from hnd', () => {
  const rm = run('ciso', 'hnd');
  assert.deepEqual(rm.ids, ['associate-security-analyst', 'cyber-risk-analyst', 'security-engineer', 'cyber-risk-manager', 'ciso']);
  assert.equal(rm.header.years, 12);
  assert.equal(rm.study, null);
  assert.equal(rm.steps[rm.firstOk].role.id, 'associate-security-analyst');
  assert.deepEqual(okTitles(rm), ['Associate Security Analyst']);
});

test('ciso from degree', () => {
  const rm = run('ciso', 'degree');
  assert.deepEqual(rm.ids, run('ciso', 'hnd').ids);
  assert.equal(rm.header.years, 10);
  // Spec lists Cyber Risk Analyst as first ✅ (Security Engineer also ✅). With the §6.2 rule a
  // degree holder also meets Associate Security Analyst's BDQF 5 / 0-year route, so it is ✅ too.
  const ok = okTitles(rm);
  assert.ok(ok.includes('Cyber Risk Analyst') && ok.includes('Security Engineer'));
  assert.equal(rm.steps[rm.furthestOk].role.id, 'security-engineer');
});

test('data-scientist from olevel', () => {
  const rm = run('data-scientist', 'olevel');
  assert.deepEqual(rm.study, { needBdqf: 4 });
  assert.deepEqual(rm.ids, ['data-entry', 'data-analyst', 'data-engineer', 'data-architect', 'bi-director', 'data-scientist']);
  assert.ok(rm.hasAlt);
  assert.deepEqual(rm.altIds, ['data-entry', 'data-analyst', 'ai-engineer', 'data-manager', 'bi-director', 'data-scientist']);
  assert.equal(rm.header.years, 10);
  assert.equal(rm.header.route.bdqf, 5);
  assert.equal(rm.firstOk, -1);
});

test('applications-developer from hnd', () => {
  const rm = run('applications-developer', 'hnd');
  assert.deepEqual(rm.ids.map(title), ['Junior Programmer', 'Applications Developer']);
  assert.equal(rm.header.years, 5);
  assert.equal(rm.steps[rm.firstOk].role.title, 'Junior Programmer');
});

test('cio from degree', () => {
  const rm = run('cio', 'degree');
  assert.deepEqual(rm.ids, ['it-technician', 'it-administrator-manager', 'systems-engineer', 'project-manager', 'it-operations-manager', 'cio']);
  assert.deepEqual(rm.altIds, ['it-technician', 'project-coordinator', 'systems-engineer', 'project-manager', 'it-operations-manager', 'cio']);
  assert.equal(rm.header.years, 10);
  assert.equal(rm.steps[rm.firstOk].role.title, 'IT Technician');
});

test('marketing-manager from hnd', () => {
  const rm = run('marketing-manager', 'hnd');
  assert.deepEqual(rm.ids, ['market-analyst', 'digital-marketing-executive', 'business-development-manager', 'marketing-manager']);
  assert.deepEqual(rm.altIds, ['market-analyst', 'digital-marketing-executive', 'customer-experience-manager', 'marketing-manager']);
  assert.equal(rm.header.years, 8);
  assert.equal(rm.firstOk, -1);
  assert.equal(rm.steps[0].status.type, 'experience');
});

test('alternative route toggles and keeps the goal', () => {
  const rm = run('cio', 'degree', 0, 1);
  assert.equal(rm.routeIndex, 1);
  assert.equal(rm.ids[1], 'project-coordinator');
  assert.equal(rm.split, 0);
});

test('data-architect shows info status', () => {
  const rm = run('data-architect', 'degree');
  assert.equal(rm.steps.at(-1).status.type, 'info');
  assert.equal(rm.header.years, null);
});

test('every role is reachable from its sector entry', () => {
  for (const r of roles) assert.ok(findPaths(roles, r.id).length > 0, r.id);
});

test('experience slider unlocks steps', () => {
  const rm = run('ciso', 'hnd', 4);
  assert.deepEqual(okTitles(rm), ['Associate Security Analyst', 'Cyber Risk Analyst', 'Security Engineer']);
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
