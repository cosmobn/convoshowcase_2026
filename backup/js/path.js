// path.js — path-finding + status logic (spec §6). Pure functions, no DOM.

export const FROM_BDQF = { olevel: 3, alevel: 4, hnd: 5, degree: 6 };

export const QUALS = [
  { id: 'olevel', bdqf: 3, emoji: '🎒', label: 'Secondary school', sub: 'O Level' },
  { id: 'alevel', bdqf: 4, emoji: '📘', label: 'Pre-university', sub: 'A Level, HNTec' },
  { id: 'hnd', bdqf: 5, emoji: '🎓', label: 'HND / Diploma', sub: 'Level 5' },
  { id: 'degree', bdqf: 6, emoji: '🏛️', label: "Bachelor's degree", sub: 'Level 6' },
];

export const BDQF_LABEL = {
  2: 'O Level D–E (BDQF 2)',
  3: 'O Level (BDQF 3)',
  4: 'A Level / HNTec (BDQF 4)',
  5: 'HND / Diploma (BDQF 5)',
  6: "Bachelor's degree (BDQF 6)",
};

export const STUDY_TITLE = {
  3: 'Get your O Levels (BDQF 3)',
  4: 'Get your A Level or HNTec (BDQF 4)',
  5: 'Get an HND or Diploma (BDQF 5)',
  6: "Get a Bachelor's degree (BDQF 6)",
};

export const SKILL_LEVEL_NAMES = ['', 'Follow', 'Assist', 'Apply', 'Ensure', 'Strategise'];

/** All chains from the sector's entry roles to goalId, shortest first (§6.1). */
export function findPaths(roles, goalId) {
  const byId = Object.fromEntries(roles.map(r => [r.id, r]));
  const goal = byId[goalId];
  if (!goal) return [];
  const inSector = roles.filter(r => r.sector === goal.sector);
  const hasParent = new Set(inSector.flatMap(r => r.next));
  const entries = inSector.filter(r => !hasParent.has(r.id)).map(r => r.id);

  const paths = [];
  const queue = entries.map(id => [id]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === goalId) { paths.push(path); continue; }
    for (const n of byId[last].next) {
      if (!path.includes(n)) queue.push([...path, n]);
    }
  }
  paths.sort((a, b) => a.length - b.length); // stable: ties keep "first listed next" order
  return paths;
}

/** Main route + an alternative of the same or similar (±1 step) length, if any. */
export function mainAndAlt(paths) {
  const main = paths[0] || [];
  const alt = paths.slice(1).find(p => p.length <= main.length + 1) || null;
  let split = -1;
  if (alt) {
    let i = 0;
    while (i < main.length && main[i] === alt[i]) i++;
    split = i - 1; // index of the last shared node (where the road forks)
  }
  return { main, alt, split };
}

const yrs = r => (r.years ?? 0);

/** The user's best entry route into a role: least experience, then explicit years, then highest BDQF. */
export function bestRoute(routes) {
  return [...routes].sort((a, b) =>
    yrs(a) - yrs(b) ||
    (a.years === null) - (b.years === null) ||
    b.bdqf - a.bdqf
  )[0];
}

/** Status for one role node (§6.2). */
export function stepStatus(role, userBdqf, userYears) {
  if (role.unavailable) return { type: 'info' };
  const eligible = role.routes.filter(r => userBdqf >= r.bdqf);
  if (!eligible.length) {
    const minB = Math.min(...role.routes.map(r => r.bdqf));
    return { type: 'study', needBdqf: minB };
  }
  const best = bestRoute(eligible);
  const need = best.years ?? 0;
  if (userYears >= need) {
    // years === null means "some experience, unspecified" — a portfolio usually counts
    return { type: 'ok', route: best, soft: best.years === null && userYears === 0 };
  }
  return { type: 'experience', years: need - userYears, route: best };
}

/** Experience the goal role needs on the user's best route (or the BDQF 5 route if below it) — §6.3. */
export function headerYears(goal, userBdqf) {
  if (goal.unavailable || !goal.routes.length) return { years: null, route: null };
  const eligible = goal.routes.filter(r => userBdqf >= r.bdqf);
  let route;
  if (eligible.length) route = bestRoute(eligible);
  else {
    route = goal.routes.find(r => r.bdqf === 5) ||
      [...goal.routes].sort((a, b) => a.bdqf - b.bdqf)[0];
  }
  return { years: route.years, route };
}

export function minBdqf(role) {
  if (!role.routes.length) return 0;
  return Math.min(...role.routes.map(r => r.bdqf));
}

/**
 * Everything the roadmap screen needs.
 * @param {object[]} roles
 * @param {string} goalId
 * @param {number} userBdqf
 * @param {number} userYears
 * @param {number} routeIndex 0 = main route, 1 = alternative
 */
export function buildRoadmap(roles, goalId, userBdqf, userYears = 0, routeIndex = 0) {
  const byId = Object.fromEntries(roles.map(r => [r.id, r]));
  const goal = byId[goalId];
  if (!goal) return null;
  const paths = findPaths(roles, goalId);
  const { main, alt, split } = mainAndAlt(paths);
  const useAlt = routeIndex === 1 && alt;
  const ids = useAlt ? alt : main;

  const steps = ids.map(id => ({ role: byId[id], status: stepStatus(byId[id], userBdqf, userYears) }));
  const first = steps[0]?.role;
  const firstMin = first ? minBdqf(first) : 0;
  const study = first && userBdqf < firstMin ? { needBdqf: firstMin } : null;

  const okIdx = steps.map((s, i) => (s.status.type === 'ok' ? i : -1)).filter(i => i >= 0);
  const firstOk = okIdx.length ? okIdx[0] : -1;
  const furthestOk = okIdx.length ? okIdx[okIdx.length - 1] : -1;

  return {
    goal,
    ids,
    steps,
    study,
    hasAlt: !!alt,
    routeIndex: useAlt ? 1 : 0,
    split,
    altIds: alt,
    mainIds: main,
    header: { steps: ids.length, ...headerYears(goal, userBdqf) },
    firstOk,
    furthestOk,
  };
}
