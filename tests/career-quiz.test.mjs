import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { quizFields, fieldQuiz, NONE, MISMATCH_AT, rankGroups, bestField } from '../career-quiz.js';

const read = async name => JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const fieldSectors = { creative: ['digital-media'], it: ['it-services', 'telecom-network', 'apps-solutions', 'ict-security', 'data-ai'] };

test('every field asks seven questions, each offering every job group exactly once', () => {
  assert.deepEqual(Object.keys(quizFields), ['creative', 'it', 'business', 'ohs']);
  for (const [field, { groups, questions }] of Object.entries(quizFields)) {
    assert.equal(questions.length, 7, `${field} question count`);
    for (const question of questions) assert.deepEqual(question.answers.map(([, group]) => group).sort(), Object.keys(groups).sort(), `${field}: ${question.text}`);
    assert(!Object.hasOwn(groups, NONE), `${field} must not use the "None of these" key as a group`);
  }
  assert(MISMATCH_AT > 7 / 2, 'The field check needs most answers to be "None of these"');
});

test('IT and CM groups cover every role in their sectors exactly once', async () => {
  const roles = await read('roles');
  for (const [field, sectors] of Object.entries(fieldSectors)) {
    const jobs = Object.values(quizFields[field].groups).flatMap(group => group.jobs);
    const expected = roles.filter(role => sectors.includes(role.sector)).map(role => role.id);
    assert.deepEqual([...jobs].sort(), [...expected].sort(), field);
  }
});

test('Business groups are exactly the careers COSMO publishes', async () => {
  const guide = await read('business-leadership');
  const jobs = Object.values(quizFields.business.groups).flatMap(group => group.jobs);
  assert.deepEqual([...jobs].sort(), [...guide.potentialCareers].sort());
});

test('the quick field quiz offers each field once per question', () => {
  assert.equal(fieldQuiz.length, 5);
  for (const question of fieldQuiz) assert.deepEqual(question.answers.map(([, field]) => field).sort(), Object.keys(quizFields).sort(), question.text);
});

test('ranking keeps the field order for ties and ignores "None of these"', () => {
  assert.deepEqual(rankGroups('it', ['data', 'apps', NONE, 'data']).map(group => [group.id, group.score]), [['data', 2], ['apps', 1], ['services', 0], ['network', 0], ['security', 0]]);
  assert.deepEqual(rankGroups('ohs', []).map(group => group.id), ['site', 'inspect', 'health', 'training']);
  assert.deepEqual(rankGroups('unknown', ['x']), []);
  const order = ['creative', 'it', 'business', 'ohs'];
  assert.equal(bestField(['ohs', 'it', 'ohs'], order), 'ohs');
  assert.equal(bestField(['it', 'business'], order), 'it', 'A tie goes to the first field in order');
  assert.equal(bestField([], order), 'creative');
});
