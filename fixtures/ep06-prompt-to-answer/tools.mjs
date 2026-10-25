// Episode 06 fixture: the tool layer.
//
//   generateTickets(seed)  -> deterministic synthetic ticket dataset (what tickets.json holds)
//   loadTickets()          -> reads tickets.json
//   countTickets(scope, args, deps) -> narrowly scoped READ-ONLY count. No SQL, no arbitrary query.
//
// The tool never receives an account/org id from the model. The application passes `scope`
// (derived from the authenticated session) as a separate first argument. The model-supplied
// `args` object is validated against tool-schema.json before it ever reaches this function.
import fs from 'node:fs';

const STATUSES = ['open', 'pending', 'closed'];
const PRIORITIES = ['low', 'normal', 'high'];
const ORGS = ['org_acme', 'org_globex', 'org_initech'];

// Small seeded PRNG (mulberry32). Synthetic data only.
export const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const SEED = 20260625;
export const generateTickets = (seed = SEED, n = 120) => {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const tickets = [];
  for (let i = 1; i <= n; i++) {
    tickets.push({
      id: `T-${String(1000 + i)}`,
      orgId: pick(ORGS),
      status: pick(STATUSES),
      priority: pick(PRIORITIES),
      subject: `Synthetic ticket ${i}`,
    });
  }
  return {seed, generatedBy: 'tools.mjs generateTickets(seed)', synthetic: true, tickets};
};

export const loadTickets = () => JSON.parse(fs.readFileSync(new URL('./tickets.json', import.meta.url), 'utf8')).tickets;

export class TransientToolError extends Error {
  constructor(msg) { super(msg); this.name = 'TransientToolError'; this.transient = true; }
}

/**
 * countTickets — read-only, scope-constrained count.
 * @param scope  {orgId}  — from the application's session resolution, NOT from the model
 * @param args   {status, priority} — already schema-validated by the application
 * @param deps   {tickets?, failTimes?} — test seams: dataset override; simulate N transient failures
 */
export const makeCountTickets = (deps = {}) => {
  const tickets = deps.tickets ?? loadTickets();
  let remainingFailures = deps.failTimes ?? 0;
  const fn = (scope, args) => {
    fn.calls++;
    if (remainingFailures > 0) { remainingFailures--; throw new TransientToolError('simulated transient error: ticket store unavailable'); }
    if (!scope || typeof scope.orgId !== 'string') throw new Error('scope.orgId missing: application bug, refuse to run unscoped');
    // Only the two whitelisted filters exist. There is no query string, no SQL, no field selection.
    const count = tickets.filter((t) => t.orgId === scope.orgId && t.status === args.status && t.priority === args.priority).length;
    return {count, filters: {status: args.status, priority: args.priority}, scope: {orgId: scope.orgId}};
  };
  fn.calls = 0;
  return fn;
};
