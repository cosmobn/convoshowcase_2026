import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'https://ccctmacademy.edu.bn/showcase_2026/openapi.json';
const base = new URL('./', source);
const names = ['roles', 'sectors', 'courses', 'role-courses'];
const dataDirectory = path.join(root, 'data');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueIds(items, label) {
  assert(Array.isArray(items) && items.length > 0, `${label} must be a nonempty array.`);
  assert(items.every(item => item && typeof item.id === 'string' && item.id && typeof item.title === 'string'), `${label} contain invalid records.`);
  const ids = new Set(items.map(item => item.id));
  assert(ids.size === items.length, `${label} contain duplicate IDs.`);
  return ids;
}

function validate(data, spec) {
  const { roles, sectors, courses } = data;
  const roleCourses = data['role-courses'];
  const roleIds = uniqueIds(roles, 'Roles');
  const courseIds = uniqueIds(courses, 'Courses');
  assert(Array.isArray(sectors) && sectors.length > 0 && sectors.every(sector => sector && typeof sector.id === 'string' && typeof sector.name === 'string'), 'Sectors contain invalid records.');
  const sectorIds = new Set(sectors.map(sector => sector.id));
  assert(sectorIds.size === sectors.length, 'Sectors contain duplicate IDs.');
  for (const [label, ids] of [['RoleId', roleIds], ['SectorId', sectorIds], ['CourseId', courseIds]]) {
    const expected = spec.components?.schemas?.[label]?.enum || [];
    assert(expected.every(id => ids.has(id)), `${label} dataset is missing IDs documented in the OpenAPI specification.`);
  }
  for (const role of roles) {
    assert(sectorIds.has(role.sector), `Role ${role.id} has an unknown sector.`);
    assert(Array.isArray(role.next) && role.next.every(id => roleIds.has(id)), `Role ${role.id} has invalid next roles.`);
    assert(Array.isArray(role.routes) && role.routes.every(route => Number.isFinite(route.bdqf) && (route.years === null || Number.isFinite(route.years))), `Role ${role.id} has invalid entry routes.`);
    assert(Array.isArray(role.skills) && Array.isArray(role.certs), `Role ${role.id} has invalid skills or certifications.`);
  }
  for (const course of courses) {
    assert(Array.isArray(course.careerLinks) && course.careerLinks.every(link => roleIds.has(link.role)), `Course ${course.id} has invalid career links.`);
  }
  assert(roleCourses && typeof roleCourses === 'object' && !Array.isArray(roleCourses), 'Role-course index must be an object.');
  for (const id of roleIds) {
    assert(Array.isArray(roleCourses[id]) && roleCourses[id].every(link => courseIds.has(link.course)), `Role-course index is invalid for ${id}.`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error(`${url}: response is not valid JSON.`);
  }
}

let staging;
let backup;
let movedOriginal = false;
try {
  const spec = JSON.parse(await readFile(path.join(root, 'openapi.json'), 'utf8'));
  // All four remote files must download and validate before local data changes.
  const results = await Promise.allSettled(names.map(name => fetchJson(new URL(`data/${name}.json`, base))));
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
  assert(errors.length === 0, errors.join('\n'));
  const data = Object.fromEntries(names.map((name, index) => [name, results[index].value]));
  validate(data, spec);
  const metadata = {
    mode: 'live-snapshot',
    source,
    baseUrl: base.href,
    downloadedAt: new Date().toISOString(),
    explanation: 'A complete validated snapshot of the four public datasets described by the supplied OpenAPI document.',
    counts: { roles: data.roles.length, sectors: data.sectors.length, courses: data.courses.length, roleCourseMappings: Object.keys(data['role-courses']).length },
    unavailableEndpoints: [],
  };
  const suffix = `${Date.now()}-${process.pid}`;
  staging = path.join(root, `.career-data-staging-${suffix}`);
  backup = path.join(root, `.career-data-backup-${suffix}`);
  await mkdir(staging);
  await Promise.all([...names.map(name => writeFile(path.join(staging, `${name}.json`), `${JSON.stringify(data[name], null, 2)}\n`, 'utf8')), writeFile(path.join(staging, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')]);
  // Swap the complete directory, restoring the old snapshot if the swap fails.
  await rename(dataDirectory, backup);
  movedOriginal = true;
  try {
    await rename(staging, dataDirectory);
    staging = undefined;
  } catch (error) {
    await rename(backup, dataDirectory);
    movedOriginal = false;
    throw error;
  }
  if (path.dirname(backup) !== root || !path.basename(backup).startsWith('.career-data-backup-')) throw new Error('Unexpected backup path.');
  await rm(backup, { recursive: true, force: true });
  movedOriginal = false;
  console.log(`Updated ${metadata.counts.roles} roles, ${metadata.counts.sectors} sectors, and ${metadata.counts.courses} courses.`);
} catch (error) {
  console.error(`Data refresh failed. The existing snapshot is retained.\n${error.message}`);
  process.exitCode = 1;
} finally {
  if (staging) {
    if (path.dirname(staging) !== root || !path.basename(staging).startsWith('.career-data-staging-')) throw new Error('Unexpected staging path.');
    await rm(staging, { recursive: true, force: true });
  }
  if (movedOriginal) console.error(`The previous snapshot remains at ${backup}.`);
}
