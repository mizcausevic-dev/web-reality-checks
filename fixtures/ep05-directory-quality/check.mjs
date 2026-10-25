// Episode 05 checker. Input: the PUBLIC listing rows only. It never opens ground-truth.json.
//
// Five independent checks, each producing issue instances {listingId, check, code, evidence}:
//   completeness   -> missing_required
//   duplicates     -> duplicate_candidate (pairs; reported per listing)
//   url_validity   -> malformed_url (syntactic only)
//   website        -> site_unreachable (timeout / connection refused / DNS) or site_gone (410/404)
//   verification   -> stale_verification (age), edited_since_verified (lastChangedAt > lastVerifiedAt)
//
// Website checks go to a LOCAL MOCK RESPONDER keyed by hostname pattern. Nothing leaves the process.
// A failed website check is a LEAD, never proof of closure: it routes to the review queue.
//
// Reporting rule: `uniqueFlaggedListings` counts listings, `totalIssueInstances` counts issues.
// They are never added together.

export const CHECKS = ['completeness', 'duplicates', 'url_validity', 'website', 'verification'];
export const REQUIRED_FIELDS = ['name', 'category', 'address.street', 'address.city', 'address.state', 'address.zip', 'phone'];
export const STALE_DAYS = 365;
export const SITE_TIMEOUT_MS = 50; // mock; "slow" sites answer after 10x this

const DAY = 86_400_000;
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const blank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/* ---------------- 1. completeness ---------------- */
export const checkCompleteness = (l) => {
  const missing = REQUIRED_FIELDS.filter((f) => blank(get(l, f)));
  return missing.length ? [{listingId: l.id, check: 'completeness', code: 'missing_required', evidence: {fields: missing}}] : [];
};

/* ---------------- 2. duplicate candidates ---------------- */
const normName = (s) => (s ?? '').toLowerCase().replace(/\b(the|co|llc|inc|group|and|sons)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const normPhone = (s) => (s ?? '').replace(/\D/g, '');
const normStreet = (s) => (s ?? '').toLowerCase().replace(/\bstreet\b/g, 'st').replace(/\bavenue\b/g, 'ave').replace(/\broad\b/g, 'rd').replace(/[^a-z0-9]+/g, ' ').trim();
/** Three blocking keys: same phone; same normalised name + zip; same normalised street + zip + name stem. */
export const checkDuplicates = (listings) => {
  const byKey = new Map();
  const add = (key, l) => { if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(l); };
  for (const l of listings) {
    const ph = normPhone(l.phone);
    if (ph.length >= 10) add(`phone:${ph}`, l);
    const nm = normName(l.name);
    if (nm && !blank(l.address?.zip)) add(`name:${nm}|${l.address.zip}`, l);
    const st = normStreet(l.address?.street);
    if (st && !blank(l.address?.zip) && nm) add(`addr:${st}|${l.address.zip}|${nm.split(' ').pop()}`, l);
  }
  const pairs = new Map(); // "a|b" -> reasons
  for (const [key, group] of byKey) {
    if (group.length < 2 || group.length > 6) continue; // skip giant blocks (not a true pair signal)
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const [a, b] = [group[i].id, group[j].id].sort();
      const k = `${a}|${b}`;
      if (!pairs.has(k)) pairs.set(k, new Set());
      pairs.get(k).add(key.split(':')[0]);
    }
  }
  const issues = [];
  for (const [k, reasons] of pairs) {
    const [a, b] = k.split('|');
    const ev = {pairWith: null, matchedOn: [...reasons]};
    issues.push({listingId: a, check: 'duplicates', code: 'duplicate_candidate', evidence: {...ev, pairWith: b}});
    issues.push({listingId: b, check: 'duplicates', code: 'duplicate_candidate', evidence: {...ev, pairWith: a}});
  }
  return {issues, candidatePairs: pairs.size};
};

/* ---------------- 3. URL validity (syntactic) ---------------- */
export const checkUrl = (l) => {
  const w = l.website;
  if (w === null || w === undefined) return []; // optional field: absence is not malformation
  const bad = (reason) => [{listingId: l.id, check: 'url_validity', code: 'malformed_url', evidence: {website: w, reason}}];
  if (typeof w !== 'string' || w.trim() === '') return bad('empty');
  if (/\s/.test(w)) return bad('whitespace');
  let u;
  try { u = new URL(w); } catch { return bad('unparseable'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return bad(`scheme:${u.protocol}`);
  if (!u.hostname || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return bad('hostname');
  if (!/^https?:\/\//i.test(w)) return bad('authority'); // "https:/x" parses but is not a URL a browser got
  return [];
};

/* ---------------- 4. website availability via LOCAL MOCK RESPONDER ---------------- */
/**
 * The mock world. Keyed by the hostname's second-level label (`<slug>.<bucket>.test`).
 * Returns the same shape a real probe would: {status} or {error}.
 * No network. The bucket is world behaviour, not a quality label.
 */
export const mockResponder = (hostname) => {
  const bucket = hostname.split('.').slice(-2, -1)[0];
  switch (bucket) {
    case 'ok': return {status: 200, ms: 20};
    case 'slow': return {error: 'timeout', ms: SITE_TIMEOUT_MS}; // exceeds SITE_TIMEOUT_MS
    case 'down': return {error: 'ECONNREFUSED', ms: 5};
    case 'nx': return {error: 'ENOTFOUND', ms: 3};
    case 'gone': return {status: 410, ms: 18};
    default: return {error: 'ENOTFOUND', ms: 3}; // unknown hosts (e.g. typo domains) resolve to nothing
  }
};
export const checkWebsite = (l, responder = mockResponder) => {
  if (checkUrl(l).length || l.website == null) return []; // malformed is reported by url_validity, not here
  const host = new URL(l.website).hostname;
  const r = responder(host);
  if (r.status && r.status < 400) return [];
  if (r.status === 410 || r.status === 404) return [{listingId: l.id, check: 'website', code: 'site_gone', evidence: {host, status: r.status}}];
  return [{listingId: l.id, check: 'website', code: 'site_unreachable', evidence: {host, error: r.error ?? `http_${r.status}`}}];
};

/* ---------------- 5. verification age — three timestamps, three meanings ---------------- */
export const checkVerification = (l, nowMs) => {
  const out = [];
  const v = Date.parse(l.lastVerifiedAt), c = Date.parse(l.lastChangedAt);
  if (Number.isNaN(v)) out.push({listingId: l.id, check: 'verification', code: 'never_verified', evidence: {}});
  else {
    const days = Math.floor((nowMs - v) / DAY);
    if (days > STALE_DAYS) out.push({listingId: l.id, check: 'verification', code: 'stale_verification', evidence: {verifiedDaysAgo: days, note: 'age is a reason to re-verify, not evidence the row is wrong'}});
    if (!Number.isNaN(c) && c > v) out.push({listingId: l.id, check: 'verification', code: 'edited_since_verified', evidence: {lastChangedAt: l.lastChangedAt, lastVerifiedAt: l.lastVerifiedAt}});
  }
  return out;
};

/* ---------------- routing: which codes go to human review ---------------- */
// Deterministic issues (malformed URL, missing field) are fixable without a human judgement call.
// Everything that only *suggests* a real-world fact routes to review.
export const REVIEW_CODES = new Set(['site_unreachable', 'site_gone', 'duplicate_candidate', 'edited_since_verified', 'stale_verification']);
export const PRIORITY = {site_gone: 1, duplicate_candidate: 2, site_unreachable: 3, edited_since_verified: 4, stale_verification: 5};

/* ---------------- run everything ---------------- */
export const inspect = (listings, {now, responder = mockResponder} = {}) => {
  if (!now) throw new Error('inspect() needs an explicit now (ISO) so results are reproducible');
  const nowMs = Date.parse(now);
  const issues = [];
  for (const l of listings) issues.push(...checkCompleteness(l), ...checkUrl(l), ...checkWebsite(l, responder), ...checkVerification(l, nowMs));
  const dup = checkDuplicates(listings);
  issues.push(...dup.issues);

  const byCode = {}, byCheck = {}, perListing = new Map();
  for (const i of issues) {
    byCode[i.code] = (byCode[i.code] ?? 0) + 1;
    byCheck[i.check] = (byCheck[i.check] ?? 0) + 1;
    if (!perListing.has(i.listingId)) perListing.set(i.listingId, new Set());
    perListing.get(i.listingId).add(i.code);
  }
  const uniqueFlaggedListings = perListing.size;
  const flagsPerListing = {};
  for (const s of perListing.values()) flagsPerListing[s.size] = (flagsPerListing[s.size] ?? 0) + 1;
  const uniqueByCode = {};
  for (const s of perListing.values()) for (const c of s) uniqueByCode[c] = (uniqueByCode[c] ?? 0) + 1;

  // review queue: one entry per listing, carrying all its review-worthy flags
  const queue = [];
  for (const [id, codes] of perListing) {
    const rc = [...codes].filter((c) => REVIEW_CODES.has(c));
    if (!rc.length) continue;
    rc.sort((a, b) => PRIORITY[a] - PRIORITY[b]);
    const ev = issues.filter((i) => i.listingId === id && REVIEW_CODES.has(i.code)).map((i) => ({code: i.code, ...i.evidence}));
    queue.push({listingId: id, flags: rc, priority: PRIORITY[rc[0]], evidence: ev, status: 'open'});
  }
  queue.sort((a, b) => a.priority - b.priority || a.listingId.localeCompare(b.listingId));

  return {
    now, total: listings.length,
    totalIssueInstances: issues.length,
    uniqueFlaggedListings,
    cleanListings: listings.length - uniqueFlaggedListings,
    byCheck, byCode, uniqueListingsByCode: uniqueByCode, flagsPerListing,
    duplicateCandidatePairs: dup.candidatePairs,
    reviewQueueSize: queue.length,
    issues, queue,
  };
};

/* ---------------- evaluation: ONLY after checking, and only here ---------------- */
// Maps detector codes onto seeded classes. A seeded class counts as "detected" for a listing
// when at least one of its mapped codes fired on that listing.
export const CLASS_TO_CODES = {
  duplicate: ['duplicate_candidate'],
  malformed_url: ['malformed_url'],
  missing_required: ['missing_required'],
  stale_verification: ['stale_verification'],
  changed_address: ['edited_since_verified'],
  closed: ['site_gone', 'site_unreachable'],
};
export const evaluate = (result, groundTruth) => {
  const flagged = new Map();
  for (const i of result.issues) { if (!flagged.has(i.listingId)) flagged.set(i.listingId, new Set()); flagged.get(i.listingId).add(i.code); }
  const perClass = {};
  for (const [cls, codes] of Object.entries(CLASS_TO_CODES)) {
    let seeded = 0, detected = 0; const missedIds = [];
    for (const [id, t] of Object.entries(groundTruth.listings)) {
      if (!t.labels.includes(cls)) continue;
      seeded++;
      const f = flagged.get(id);
      if (f && codes.some((c) => f.has(c))) detected++; else missedIds.push(id);
    }
    perClass[cls] = {seeded, detected, missed: seeded - detected, recall: seeded ? +(detected / seeded).toFixed(3) : null, missedSample: missedIds.slice(0, 5)};
  }
  // listings flagged by any check that carry NO seeded label at all (not "false" per se: e.g. an
  // open business whose site times out is correctly flagged as a lead, but it is not a seeded defect)
  const labelled = new Set(Object.keys(groundTruth.listings));
  let flaggedWithoutSeededLabel = 0;
  for (const id of flagged.keys()) if (!labelled.has(id)) flaggedWithoutSeededLabel++;
  // the headline fact: a site_unreachable flag on a business that is NOT closed in ground truth
  const unreachableButOpen = result.issues.filter((i) => i.code === 'site_unreachable' && !(groundTruth.listings[i.listingId]?.labels.includes('closed')));
  const seededLabelledListings = labelled.size;
  const seededMissedEntirely = [...labelled].filter((id) => !flagged.has(id)).length;
  return {perClass, seededLabelledListings, seededMissedEntirely, flaggedWithoutSeededLabel, unreachableButOpen: {count: unreachableButOpen.length, sample: unreachableButOpen.slice(0, 3)}};
};
