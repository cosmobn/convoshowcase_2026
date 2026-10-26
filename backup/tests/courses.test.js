// Checks that COSMO course links are consistent with the roles data and the website's roadmap rules.
// Usage: npm test
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { stepStatus } from '../js/path.js';

const read = f => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url)));
const roles = read('roles.json'), courses = read('courses.json'), index = read('role-courses.json');
const byId = Object.fromEntries(roles.map(r => [r.id, r]));
const course = id => courses.find(c => c.id === id);
const links = id => Object.fromEntries(course(id).careerLinks.map(l => [l.role, l]));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok  ', name); }
  catch (e) { failed++; console.log('  FAIL', name, '\n       ', e.message); }
}

test('every link points at a real role and every nextCourse exists', () => {
  const ids = new Set(courses.map(c => c.id));
  assert.equal(ids.size, courses.length, 'duplicate course ids');
  for (const c of courses) {
    for (const l of c.careerLinks) assert.ok(byId[l.role], `${c.id} → ${l.role}`);
    if (c.nextCourse) assert.ok(ids.has(c.nextCourse), `${c.id}.nextCourse`);
  }
});

test('role-courses.json is the exact reverse of courses.json', () => {
  assert.deepEqual(Object.keys(index).sort(), roles.map(r => r.id).sort());
  const fromCourses = courses.flatMap(c => c.careerLinks.map(l => `${l.role}|${c.id}|${l.fit}`)).sort();
  const fromIndex = Object.entries(index).flatMap(([r, list]) => list.map(x => `${r}|${x.course}|${x.fit}`)).sort();
  assert.deepEqual(fromIndex, fromCourses);
});

test('qualification links agree with the roadmap status rule', () => {
  for (const c of courses.filter(c => c.type === 'qualification')) {
    for (const l of c.careerLinks) {
      const st = stepStatus(byId[l.role], c.bdqf, l.years ?? 0);
      assert.equal(st.type, 'ok', `${c.id} → ${l.role}: roadmap says ${st.type}`);
    }
  }
});

test('HND in Computing opens the main ICT entry roles', () => {
  const L = links('hnd-computing');
  for (const r of ['junior-programmer', 'associate-security-analyst', 'network-engineer', 'it-technician', 'data-entry'])
    assert.equal(L[r]?.fit, 'qualifies', r);
  assert.equal(L['cyber-risk-analyst'].years, 4);
  assert.equal(L.ciso.years, 12);
});

test('subject requirements are respected', () => {
  // Market Analyst asks for Marketing, Communications or Economics: Graphic Design must not match it
  assert.equal(links('hnd-graphic-design')['market-analyst'], undefined);
  // Associate Security Analyst (BDQF 5 in IS or CS): Business HND must not match
  assert.equal(links('hnd-business')['associate-security-analyst'], undefined);
});

test('short courses only "build skills" and explain why', () => {
  for (const c of courses.filter(c => c.type !== 'qualification'))
    for (const l of c.careerLinks) { assert.equal(l.fit, 'builds-skills'); assert.ok(l.why, `${c.id} → ${l.role}`); }
});

test('courses with no links explain why', () => {
  for (const c of courses.filter(c => !c.careerLinks.length)) assert.ok(c.note, c.id);
});

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
