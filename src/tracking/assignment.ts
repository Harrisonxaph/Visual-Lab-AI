/** Rectangular Hungarian minimization; private dummy columns allow every row to be unmatched. */
export function minimumCostAssignment(
  costs: readonly (readonly number[])[],
  unmatchedCost: number,
): (number | null)[] {
  const n = costs.length;
  if (!n) return [];
  const real = costs[0].length,
    m = real + n;
  if (
    n > 100 ||
    real > 50 ||
    !Number.isFinite(unmatchedCost) ||
    unmatchedCost < 0 ||
    costs.some((r) => r.length !== real)
  )
    throw new Error("Invalid assignment dimensions/cost");
  const u = Array(n + 1).fill(0),
    v = Array(m + 1).fill(0),
    p = Array(m + 1).fill(0),
    way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const min = Array(m + 1).fill(Infinity),
      used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity,
        j1 = 0;
      for (let j = 1; j <= m; j++)
        if (!used[j]) {
          const raw = j <= real ? costs[i0 - 1][j - 1] : unmatchedCost;
          const cur = (Number.isFinite(raw) ? raw : 1e12) - u[i0] - v[j];
          if (cur < min[j]) {
            min[j] = cur;
            way[j] = j0;
          }
          if (min[j] < delta) {
            delta = min[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= m; j++)
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else min[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result: (number | null)[] = Array(n).fill(null);
  for (let j = 1; j <= real; j++)
    if (
      p[j] &&
      Number.isFinite(costs[p[j] - 1][j - 1]) &&
      costs[p[j] - 1][j - 1] <= unmatchedCost
    )
      result[p[j] - 1] = j - 1;
  return result;
}
