import { norm } from "./masterBomEngine.js";

// Normalizes a comma-separated Location string into
// a sorted unique list, plus any duplicate entries
// found within the same cell.
export function normLoc(value) {
  const a = String(value ?? "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  const c = {};

  a.forEach((x) => {
    c[x] = (c[x] || 0) + 1;
  });

  return {
    u: [...new Set(a)].sort(),
    d: Object.keys(c).filter((x) => c[x] > 1),
  };
}

// Compares two Location cells (each possibly holding
// multiple comma-separated positions) and reports
// what was added/removed, plus any duplicates found.
export function locCompare(a, b) {
  const A = normLoc(a);
  const B = normLoc(b);

  const added = B.u.filter((x) => !A.u.includes(x));
  const removed = A.u.filter((x) => !B.u.includes(x));

  return {
    same:
      JSON.stringify(A.u) === JSON.stringify(B.u),
    dup1: A.d,
    dup2: B.d,
    added,
    removed,
  };
}

// Groups rows by a normalized key column, so rows
// with the same Part Number can be found/compared
// together (handles duplicate part numbers too).
export function mapRows(rows, col) {
  const m = new Map();

  rows.forEach((r) => {
    const k = norm(r[col]);

    if (!k) return;

    if (!m.has(k)) {
      m.set(k, []);
    }

    m.get(k).push(r);
  });

  return m;
}
