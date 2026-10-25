import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generate, makeRng, SEED, TOTAL, NOW} from './generate.mjs';
import {inspect, evaluate, checkUrl, checkWebsite, checkVerification, checkCompleteness, checkDuplicates, mockResponder, REVIEW_CODES, CLASS_TO_CODES} from './check.mjs';

const {listings, groundTruth} = generate();
const result = inspect(listings, {now: NOW});

test('seeded PRNG is deterministic', () => {
  const a = makeRng(SEED), b = makeRng(SEED);
  assert.deepEqual(Array.from({length: 5}, () => a.next()), Array.from({length: 5}, () => b.next()));
  assert.notEqual(makeRng(SEED + 1).next(), makeRng(SEED).next());
});

test('generator yields exactly 10,000 listings with unique ids, and is reproducible', () => {
  assert.equal(listings.length, TOTAL);
  assert.equal(new Set(listings.map((l) => l.id)).size, TOTAL);
  const again = generate();
  assert.deepEqual(again.listings, listings);
  assert.deepEqual(again.groundTruth, groundTruth);
});

test('committed listings.json matches the generator output', () => {
  const onDisk = JSON.parse(fs.readFileSync(new URL('./listings.json', import.meta.url), 'utf8'));
  assert.deepEqual(onDisk, listings);
});

test('ground truth is separate and every class is seeded; defects overlap', () => {
  for (const cls of Object.keys(CLASS_TO_CODES)) assert.ok(groundTruth.seededCounts[cls] > 0, cls);
  const multi = Object.values(groundTruth.listings).filter((t) => new Set(t.labels).size > 1).length;
  assert.ok(multi > 0, 'at least one listing carries several seeded labels');
  // ground truth is not embedded in the public rows
  for (const l of listings.slice(0, 200)) assert.equal('labels' in l || 'groundTruth' in l || 'defects' in l, false);
});

test('the checker never reads ground-truth.json', () => {
  const src = fs.readFileSync(new URL('./check.mjs', import.meta.url), 'utf8');
  assert.equal(/ground-truth/.test(src.replace(/\/\/.*$/gm, '')), false, 'check.mjs must not reference the ground-truth file outside comments');
  assert.equal(/readFileSync|node:fs/.test(src), false, 'check.mjs must not read any file');
  assert.equal(/fetch\(|node:http|node:net|node:dns/.test(src), false, 'check.mjs must not touch the network');
});

test('every public listing separates lastCheckedAt, lastChangedAt, lastVerifiedAt', () => {
  for (const l of listings) {
    for (const k of ['lastCheckedAt', 'lastChangedAt', 'lastVerifiedAt']) assert.ok(!Number.isNaN(Date.parse(l[k])), `${l.id}.${k}`);
  }
  const differ = listings.filter((l) => l.lastCheckedAt !== l.lastVerifiedAt).length;
  assert.ok(differ > TOTAL * 0.9, 'checked and verified are different facts, not the same date');
});

test('completeness: blank and null required fields are flagged; present fields are not', () => {
  const ok = {id: 'x', name: 'A', category: 'B', address: {street: '1 St', city: 'C', state: 'MA', zip: '01000'}, phone: '555-000-0000'};
  assert.deepEqual(checkCompleteness(ok), []);
  const bad = {...ok, name: '', address: {...ok.address, zip: null}};
  assert.deepEqual(checkCompleteness(bad)[0].evidence.fields, ['name', 'address.zip']);
});

test('url validity: malformed forms are flagged, valid and absent are not', () => {
  const f = (w) => checkUrl({id: 'x', website: w}).map((i) => i.evidence.reason);
  assert.deepEqual(f('https://a.ok.test'), []);
  assert.deepEqual(f(null), []);
  assert.deepEqual(f('htp://a.ok.test'), ['scheme:htp:']);
  assert.deepEqual(f('https:/a.ok.test'), ['authority']);
  assert.deepEqual(f('a.ok.test'), ['unparseable']);
  assert.deepEqual(f('https://a..test'), ['hostname']);
  assert.deepEqual(f('https://a.ok.test/our team'), ['whitespace']);
  assert.deepEqual(f('mailto:x@a.test'), ['scheme:mailto:']);
});

test('website check uses the local mock responder only, keyed by hostname', () => {
  const seen = [];
  const spy = (h) => { seen.push(h); return mockResponder(h); };
  assert.deepEqual(checkWebsite({id: 'x', website: 'https://a.ok.test'}, spy), []);
  assert.equal(checkWebsite({id: 'x', website: 'https://a.slow.test'}, spy)[0].evidence.error, 'timeout');
  assert.equal(checkWebsite({id: 'x', website: 'https://a.gone.test'}, spy)[0].code, 'site_gone');
  assert.deepEqual(seen, ['a.ok.test', 'a.slow.test', 'a.gone.test']);
  // a malformed URL is not probed at all
  assert.deepEqual(checkWebsite({id: 'x', website: 'htp://a.ok.test'}, spy), []);
  assert.equal(seen.length, 3);
});

test('verification: stale age and edited-since-verified are separate codes', () => {
  const now = Date.parse(NOW);
  const codes = (l) => checkVerification({id: 'x', ...l}, now).map((i) => i.code);
  assert.deepEqual(codes({lastVerifiedAt: '2026-10-01', lastChangedAt: '2026-09-01'}), []);
  assert.deepEqual(codes({lastVerifiedAt: '2020-01-01', lastChangedAt: '2019-01-01'}), ['stale_verification']);
  assert.deepEqual(codes({lastVerifiedAt: '2026-09-01', lastChangedAt: '2026-10-01'}), ['edited_since_verified']);
  assert.deepEqual(codes({lastVerifiedAt: '2020-01-01', lastChangedAt: '2026-10-01'}), ['stale_verification', 'edited_since_verified']);
});

test('duplicates: a pair is reported on both members with the matched keys', () => {
  const a = {id: 'a', name: 'Cedar Bakery', phone: '(555) 123-4567', address: {street: '1 Main St', city: 'X', zip: '01000'}};
  const b = {id: 'b', name: 'CEDAR BAKERY LLC', phone: '555.123.4567', address: {street: '1 Main Street', city: 'X', zip: '01000'}};
  const c = {id: 'c', name: 'Other', phone: '(555) 999-9999', address: {street: '9 Elm St', city: 'Y', zip: '02000'}};
  const r = checkDuplicates([a, b, c]);
  assert.equal(r.candidatePairs, 1);
  assert.deepEqual(r.issues.map((i) => i.listingId).sort(), ['a', 'b']);
  assert.deepEqual(r.issues[0].evidence.matchedOn.sort(), ['addr', 'name', 'phone']);
});

test('unique flagged listings is reported separately from total issue instances and is never their sum', () => {
  const sumOfCodes = Object.values(result.byCode).reduce((x, y) => x + y, 0);
  assert.equal(sumOfCodes, result.totalIssueInstances);
  assert.ok(result.uniqueFlaggedListings < result.totalIssueInstances, 'overlap exists, so unique < instances');
  const fromHistogram = Object.values(result.flagsPerListing).reduce((x, y) => x + y, 0);
  assert.equal(fromHistogram, result.uniqueFlaggedListings);
  assert.equal(result.uniqueFlaggedListings + result.cleanListings, TOTAL);
  assert.ok(Object.keys(result.flagsPerListing).some((k) => Number(k) >= 2), 'some listings carry several flags');
});

test('KNOWN-POSITIVE CONTROL: website failures occur on businesses that are OPEN in ground truth', () => {
  const ev = evaluate(result, groundTruth);
  assert.ok(ev.unreachableButOpen.count > 0, 'if this were 0 the "lead, not proof" lesson would be untestable');
  const timeoutOpen = result.issues.find((i) => i.code === 'site_unreachable' && i.evidence.error === 'timeout' && !groundTruth.listings[i.listingId]?.labels.includes('closed'));
  assert.ok(timeoutOpen, 'a timeout on an open business exists');
});

test('KNOWN-POSITIVE CONTROL: some seeded defects are missed by the checker (and are reported as missed)', () => {
  const ev = evaluate(result, groundTruth);
  for (const [cls, v] of Object.entries(ev.perClass)) assert.equal(v.seeded, groundTruth.seededCounts[cls], cls);
  assert.ok(ev.perClass.changed_address.missed > 0, 'a moved business with no public edit trail cannot be detected from the row');
  assert.ok(ev.perClass.closed.missed > 0, 'a closed business whose site still answers 200 is invisible to a website check');
  assert.ok(ev.perClass.malformed_url.missed > 0, 'a syntactically valid typo domain passes a syntax check');
  for (const v of Object.values(ev.perClass)) assert.equal(v.detected + v.missed, v.seeded);
});

test('evaluation happens AFTER checking and does not change the checker output', () => {
  const before = JSON.stringify({a: result.byCode, b: result.uniqueFlaggedListings});
  evaluate(result, groundTruth);
  assert.equal(JSON.stringify({a: result.byCode, b: result.uniqueFlaggedListings}), before);
});

test('review queue holds only judgement-call codes, one entry per listing, with evidence', () => {
  assert.equal(new Set(result.queue.map((q) => q.listingId)).size, result.queue.length);
  for (const q of result.queue) {
    assert.ok(q.flags.length > 0 && q.flags.every((f) => REVIEW_CODES.has(f)), q.listingId);
    assert.ok(q.evidence.length >= q.flags.length);
  }
  // deterministic issues do not create queue entries on their own
  const onlyDeterministic = listings.filter((l) => { const codes = result.issues.filter((i) => i.listingId === l.id).map((i) => i.code); return codes.length && codes.every((c) => !REVIEW_CODES.has(c)); });
  for (const l of onlyDeterministic.slice(0, 20)) assert.equal(result.queue.some((q) => q.listingId === l.id), false);
});

test('demo outputs exist and agree with a fresh run; decision carries evidence, timestamp and reviewer', () => {
  const insp = JSON.parse(fs.readFileSync(new URL('./inspection-results.json', import.meta.url), 'utf8'));
  assert.equal(insp.summary.totalIssueInstances, result.totalIssueInstances);
  assert.equal(insp.summary.uniqueFlaggedListings, result.uniqueFlaggedListings);
  assert.deepEqual(insp.summary.byCode, result.byCode);
  assert.equal(insp.realNetworkCalls, 0);
  const q = JSON.parse(fs.readFileSync(new URL('./review-queue.json', import.meta.url), 'utf8'));
  const d = q.decisions[0];
  assert.equal(d.reviewer, 'reviewer-synthetic-01');
  assert.ok(!Number.isNaN(Date.parse(d.reviewedAt)));
  assert.ok(Array.isArray(d.evidence) && d.evidence.length > 0);
  assert.equal('lastVerifiedAt' in d.fieldsUpdated, false, 'a re-check updates lastCheckedAt, not lastVerifiedAt');
});
