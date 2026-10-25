// Runs the exact scenario the video shows and writes:
//   inspection-results.json  — full checker output (counts, issue instances, evaluation vs ground truth)
//   review-queue.json        — reason-coded queue + one recorded review decision
//   evidence.json            — the slim summary the video reads its numbers from
//
// Order matters: the checker runs on listings.json ONLY. ground-truth.json is opened afterwards,
// purely to score detected vs missed per seeded class.
import fs from 'node:fs';
import {NOW, TOTAL} from './generate.mjs';
import {inspect, evaluate, mockResponder, STALE_DAYS} from './check.mjs';

const here = new URL('./', import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, here), 'utf8'));
const write = (f, v) => fs.writeFileSync(new URL(f, here), JSON.stringify(v, null, 1) + '\n');

if (!fs.existsSync(new URL('./listings.json', here))) { const {writeFixtures} = await import('./generate.mjs'); writeFixtures(); }
const listings = read('./listings.json');
if (listings.length !== TOTAL) throw new Error(`listings.json has ${listings.length} rows, expected ${TOTAL}`);

// ---- 1. check (public rows only) ----
let responderCalls = 0;
const countingResponder = (h) => { responderCalls++; return mockResponder(h); };
const result = inspect(listings, {now: NOW, responder: countingResponder});

// ---- 2. only now: evaluation against ground truth ----
const groundTruth = read('./ground-truth.json');
const evaluation = evaluate(result, groundTruth);

// ---- 3. the scene-5 example: a website timeout on a business that is OPEN in ground truth ----
const timeoutOpen = result.issues.find((i) => i.code === 'site_unreachable' && i.evidence.error === 'timeout' && !groundTruth.listings[i.listingId]?.labels.includes('closed'));
const exampleListing = listings.find((l) => l.id === timeoutOpen.listingId);
const exampleQueueEntry = result.queue.find((q) => q.listingId === timeoutOpen.listingId);

// ---- 4. one review decision (synthetic reviewer, fixed timestamp) ----
const decision = {
  listingId: exampleListing.id,
  decision: 'keep_listing_schedule_recheck',
  reason: 'Website timed out once. A timeout is a lead, not evidence of closure. The only other flag is verification age, which is a reason to re-verify, not evidence the row is wrong. No corroborating signal (phone, address, duplicate) was flagged. Re-check in 7 days; escalate only if a second independent signal appears.',
  evidence: exampleQueueEntry.evidence,
  reviewedAt: '2026-10-25T09:14:00Z',
  reviewer: 'reviewer-synthetic-01',
  fieldsUpdated: {lastCheckedAt: NOW}, // checked, not verified: lastVerifiedAt is deliberately untouched
};
const queueOut = {
  note: 'SYNTHETIC DATASET · SEEDED. Queue is derived from inspection-results.json; one decision recorded as an example.',
  now: NOW, size: result.queue.length,
  byTopFlag: result.queue.reduce((a, q) => ((a[q.flags[0]] = (a[q.flags[0]] ?? 0) + 1), a), {}),
  decisions: [decision],
  entries: result.queue.map((q) => (q.listingId === decision.listingId ? {...q, status: 'reviewed', decisionRef: 0} : q)),
};

// ---- 5. write ----
const {issues, queue, ...summary} = result;
const inspection = {
  note: 'SYNTHETIC DATASET · SEEDED. Checker read listings.json only; evaluation ran afterwards against ground-truth.json.',
  seed: groundTruth.seed, now: NOW, staleDays: STALE_DAYS, mockResponderCalls: responderCalls, realNetworkCalls: 0,
  summary,
  evaluation,
  example: {listing: exampleListing, issues: issues.filter((i) => i.listingId === exampleListing.id), groundTruthLabels: groundTruth.listings[exampleListing.id]?.labels ?? []},
  issues,
};
write('./inspection-results.json', inspection);
write('./review-queue.json', queueOut);
write('./evidence.json', {
  generatedAt: new Date().toISOString(),
  source: 'fixtures/ep05-directory-quality/inspection-results.json',
  total: summary.total,
  totalIssueInstances: summary.totalIssueInstances,
  uniqueFlaggedListings: summary.uniqueFlaggedListings,
  cleanListings: summary.cleanListings,
  byCode: summary.byCode,
  uniqueListingsByCode: summary.uniqueListingsByCode,
  flagsPerListing: summary.flagsPerListing,
  duplicateCandidatePairs: summary.duplicateCandidatePairs,
  reviewQueueSize: summary.reviewQueueSize,
  seededPerClass: Object.fromEntries(Object.entries(evaluation.perClass).map(([k, v]) => [k, {seeded: v.seeded, detected: v.detected, missed: v.missed}])),
  unreachableButOpenCount: evaluation.unreachableButOpen.count,
  example: {id: exampleListing.id, name: exampleListing.name, host: timeoutOpen.evidence.host, error: timeoutOpen.evidence.error, lastCheckedAt: exampleListing.lastCheckedAt, lastChangedAt: exampleListing.lastChangedAt, lastVerifiedAt: exampleListing.lastVerifiedAt, groundTruth: 'open (no closed label)'},
  decision: {listingId: decision.listingId, decision: decision.decision, reviewedAt: decision.reviewedAt, reviewer: decision.reviewer},
});

console.log(`listings: ${summary.total}   issue instances: ${summary.totalIssueInstances}   unique flagged listings: ${summary.uniqueFlaggedListings}   clean: ${summary.cleanListings}`);
console.table(Object.entries(summary.byCode).map(([code, n]) => ({code, instances: n, uniqueListings: summary.uniqueListingsByCode[code]})));
console.table(Object.entries(evaluation.perClass).map(([cls, v]) => ({class: cls, seeded: v.seeded, detected: v.detected, missed: v.missed})));
console.log(`review queue: ${summary.reviewQueueSize}   website timeouts/failures on OPEN businesses: ${evaluation.unreachableButOpen.count}   mock responder calls: ${responderCalls}, real network calls: 0`);
console.log(`example: ${exampleListing.id} "${exampleListing.name}" ${timeoutOpen.evidence.host} -> ${timeoutOpen.evidence.error}; ground truth: open. decision: ${decision.decision} by ${decision.reviewer} at ${decision.reviewedAt}`);
