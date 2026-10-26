import test from 'node:test';
import assert from 'node:assert/strict';
import { bestRoute, buildRoadmap, findPaths, getStatus } from '../career-model.js';

const route = (bdqf, years) => ({ bdqf, years, note: `BDQF ${bdqf}` });
const role = (id, next = [], routes = [route(5, 0)], extra = {}) => ({
  id, sector: 'test-sector', next, routes, ...extra,
});

test('breadth-first routes preserve graph ordering and accept only nearby alternatives', () => {
  const graph = [
    role('start', ['long', 'left', 'right']),
    role('long', ['extra']), role('extra', ['extra-two']), role('extra-two', ['goal']),
    role('left', ['goal']), role('right', ['bridge']), role('bridge', ['goal']),
    role('goal'),
  ];
  assert.deepEqual(findPaths(graph, 'goal'), [
    ['start', 'left', 'goal'],
    ['start', 'right', 'bridge', 'goal'],
  ]);
  const alternate = buildRoadmap(graph, 'goal', 5, 0, 1);
  assert.equal(alternate.hasAlt, true);
  assert.equal(alternate.split, 0);
  assert.deepEqual(alternate.ids, ['start', 'right', 'bridge', 'goal']);
});

test('routes never cross sectors or repeat cycle nodes, and unknown goals are safe', () => {
  const graph = [
    role('start', ['a', 'foreign']), role('a', ['b']), role('b', ['a', 'goal']),
    role('goal'), role('foreign', ['goal'], undefined, { sector: 'other-sector' }),
  ];
  assert.deepEqual(findPaths(graph, 'goal'), [['start', 'a', 'b', 'goal']]);
  assert.deepEqual(findPaths(graph, 'missing'), []);
  assert.equal(buildRoadmap(graph, 'missing', 5, 0), null);
});

test('route selection prioritizes experience, explicit numbers, then higher qualification', () => {
  const routes = [route(4, 6), route(5, null), route(4, 0), route(5, 0), route(6, 2)];
  const candidate = role('candidate', [], routes);
  assert.equal(bestRoute(candidate, 6), routes[3]);
  assert.equal(bestRoute(candidate, 4), routes[2]);
  assert.equal(bestRoute(candidate, 3), null);
  assert.deepEqual(candidate.routes, routes);
});

test('statuses distinguish study, missing experience, portfolio, and unavailable details', () => {
  const candidate = role('candidate', [], [route(6, 5), route(5, 8)]);
  assert.deepEqual(getStatus(candidate, 4, 20), { type: 'study', needBdqf: 5 });
  assert.deepEqual(getStatus(candidate, 6, 3), {
    type: 'experience', years: 2, route: candidate.routes[0],
  });
  assert.equal(getStatus(candidate, 6, 5).type, 'ok');
  const portfolio = role('portfolio', [], [route(5, null)]);
  assert.equal(getStatus(portfolio, 5, 0).soft, true);
  assert.equal(getStatus(portfolio, 5, 1).soft, false);
  assert.deepEqual(getStatus(role('unavailable', [], [], { unavailable: true }), 6, 20), { type: 'info' });
});

test('roadmap uses cumulative goal experience rather than adding experience at each step', () => {
  const graph = [
    role('entry', ['mid'], [route(5, 0)]),
    role('mid', ['goal'], [route(5, 4)]),
    role('goal', [], [route(6, 10), route(5, 12)]),
  ];
  const roadmap = buildRoadmap(graph, 'goal', 5, 5, 1);
  assert.equal(roadmap.header.years, 12);
  assert.equal(roadmap.header.steps, 3);
  assert.equal(roadmap.steps[2].status.years, 7);
  assert.equal(roadmap.firstOk, 0);
  assert.equal(roadmap.furthestOk, 1);
  assert.equal(roadmap.routeIndex, 0);
  assert.equal(roadmap.split, -1);
  assert.equal(roadmap.study, null);
});

test('study preparation and goal header fallback reflect qualification requirements', () => {
  const graph = [role('entry', ['goal'], [route(5, 0)]), role('goal', [], [route(6, 10), route(5, 12)])];
  const roadmap = buildRoadmap(graph, 'goal', 3, 0);
  assert.deepEqual(roadmap.study, { needBdqf: 5 });
  assert.equal(roadmap.header.route.bdqf, 5);
  assert.equal(roadmap.header.years, 12);
  assert.equal(roadmap.firstOk, -1);
  assert.equal(roadmap.furthestOk, -1);
});
