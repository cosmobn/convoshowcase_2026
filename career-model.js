/** Career graph and qualification rules from the supplied PathFinder OpenAPI spec. */

const nonnegativeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const experienceRequired = route => route.years ?? 0;

function compareRoutes(left, right) {
  return experienceRequired(left) - experienceRequired(right)
    || Number(left.years === null) - Number(right.years === null)
    || right.bdqf - left.bdqf;
}

/**
 * Breadth-first routes from a sector's entry roles to the goal.
 * Preserve dataset / next ordering for ties. Only routes at most one node
 * longer than the shortest qualify as an alternative in the supplied API.
 */
export function findPaths(roles, goalId) {
  const goal = roles.find(role => role.id === goalId);
  if (!goal) return [];

  const sectorRoles = roles.filter(role => role.sector === goal.sector);
  const byId = new Map(sectorRoles.map(role => [role.id, role]));
  const pointedTo = new Set(sectorRoles.flatMap(role => role.next || []));
  const queue = sectorRoles
    .filter(role => !pointedTo.has(role.id))
    .map(role => [role.id]);
  const paths = [];
  let shortest = Infinity;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const path = queue[cursor];
    if (path.length > shortest + 1) break;
    const currentId = path[path.length - 1];
    if (currentId === goalId) {
      shortest = Math.min(shortest, path.length);
      paths.push(path);
      continue;
    }

    for (const nextId of byId.get(currentId)?.next || []) {
      if (byId.has(nextId) && !path.includes(nextId)) {
        queue.push([...path, nextId]);
      }
    }
  }

  return paths;
}

/** Best route the user's qualification meets; experience is cumulative. */
export function bestRoute(role, bdqf) {
  if (!role || role.unavailable) return null;
  return (role.routes || [])
    .filter(route => route.bdqf <= nonnegativeNumber(bdqf))
    .sort(compareRoutes)[0] || null;
}

/** Status is guidance based on qualification and experience, not a job offer. */
export function getStatus(role, bdqf, years) {
  if (!role || role.unavailable || !role.routes?.length) return { type: 'info' };
  const route = bestRoute(role, bdqf);
  if (!route) {
    return { type: 'study', needBdqf: Math.min(...role.routes.map(item => item.bdqf)) };
  }

  const experience = nonnegativeNumber(years);
  const remaining = experienceRequired(route) - experience;
  if (remaining > 0) return { type: 'experience', years: remaining, route };
  return { type: 'ok', route, soft: route.years === null && experience === 0 };
}

export function buildRoadmap(roles, goalId, bdqf, years, routeIndex = 0) {
  const paths = findPaths(roles, goalId);
  if (!paths.length) return null;

  const byId = new Map(roles.map(role => [role.id, role]));
  const mainIds = paths[0];
  const altIds = paths[1] || null;
  const selectedRoute = altIds && Number(routeIndex) === 1 ? 1 : 0;
  const ids = selectedRoute ? altIds : mainIds;
  const steps = ids.map(id => ({
    role: byId.get(id),
    status: getStatus(byId.get(id), bdqf, years),
  }));
  const goal = byId.get(goalId);
  const fallbackRoute = (goal.routes || [])
    .filter(route => route.bdqf === 5)
    .sort(compareRoutes)[0] || null;
  const headerRoute = bestRoute(goal, bdqf) || fallbackRoute;
  const firstStatus = steps[0].status;
  const firstOk = steps.findIndex(step => step.status.type === 'ok');
  let furthestOk = -1;
  steps.forEach((step, index) => {
    if (step.status.type === 'ok') furthestOk = index;
  });

  let split = -1;
  if (altIds) {
    for (let index = 0; index < Math.min(mainIds.length, altIds.length); index += 1) {
      if (mainIds[index] !== altIds[index]) break;
      split = index;
    }
  }

  return {
    ids,
    steps,
    study: firstStatus.type === 'study' ? { needBdqf: firstStatus.needBdqf } : null,
    hasAlt: Boolean(altIds),
    routeIndex: selectedRoute,
    split,
    mainIds,
    altIds,
    header: {
      steps: ids.length,
      years: headerRoute?.years ?? null,
      route: headerRoute,
    },
    firstOk,
    furthestOk,
  };
}
