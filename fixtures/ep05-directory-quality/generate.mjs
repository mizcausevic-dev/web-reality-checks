// Episode 05 fixture: generates exactly 10,000 SYNTHETIC directory listings from a fixed seed,
// plus a SEPARATE ground-truth file used only for evaluation (never read by the checker).
//
//   node generate.mjs            -> writes listings.json and ground-truth.json next to this file
//   import {generate} from './generate.mjs'
//
// Everything here is invented: business names, cities, phone numbers (555 exchange) and
// hostnames under the reserved .test TLD. No real entity is described.
//
// Website behaviour is a "mock world": the hostname's second-level label selects how the local
// mock responder in check.mjs answers (ok / slow / down / nx / gone). That label is NOT a
// ground-truth label — an open business can have a timing-out site, and a closed business can
// still have a working one. The checker only ever sees the public listing row.
import fs from 'node:fs';

export const SEED = 20261025;
export const TOTAL = 10000;
/** Fixed "now" so every run yields identical ages. */
export const NOW = '2026-10-25T00:00:00.000Z';
const NOW_MS = Date.parse(NOW);
const DAY = 86_400_000;

/* ---------------- seeded PRNG (mulberry32; own implementation) ---------------- */
export const makeRng = (seed) => {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)); // inclusive
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const sample = (arr, n) => { // distinct indices, deterministic
    const out = [];
    const used = new Set();
    while (out.length < n) { const i = int(0, arr.length - 1); if (!used.has(i)) { used.add(i); out.push(arr[i]); } }
    return out;
  };
  return {next, int, pick, chance, sample};
};

/* ---------------- vocab (synthetic) ---------------- */
const ADJ = ['Northfield', 'Harbor', 'Summit', 'Cedar', 'Maple', 'Granite', 'Blue Heron', 'Riverbend', 'Ironwood', 'Lantern', 'Copper', 'Sunrise', 'Meadow', 'Willow', 'Beacon', 'Old Mill', 'Fox Hollow', 'Quarry', 'Birch', 'Silver Lake', 'Stonebridge', 'Westgate', 'Pinecrest', 'Oak Ridge', 'Juniper', 'Red Barn', 'Clearwater', 'Bramble', 'Hilltop', 'Saltmarsh', 'Thistle', 'Amber', 'Driftwood', 'Highland', 'Kestrel', 'Larkspur', 'Mosswood', 'Orchard', 'Pebble', 'Tidewater'];
const NOUN = ['Plumbing', 'Bakery', 'Dental', 'Auto Repair', 'Books', 'Florist', 'Hardware', 'Veterinary', 'Yoga', 'Cycles', 'Roofing', 'Tax Services', 'Pizzeria', 'Optical', 'Landscaping', 'Pharmacy', 'Studio', 'Diner', 'Electric', 'Cleaners', 'Music', 'Physio', 'Tailoring', 'Brewing', 'Daycare', 'Locksmith', 'Pet Supply', 'Printing', 'Kitchen', 'Framing', 'Tutoring', 'Upholstery', 'Glass', 'Nursery', 'Catering', 'Barbers', 'Insurance', 'Appliance', 'Photography', 'Fencing'];
const SUFFIX = ['', '', '', ' Co.', ' LLC', ' Inc', ' & Sons', ' Group'];
const CATEGORY = ['Home services', 'Food & drink', 'Health', 'Automotive', 'Retail', 'Professional services', 'Fitness', 'Education', 'Pets', 'Arts & crafts'];
const CITY = ['Northfield', 'Ashby Falls', 'Port Ellery', 'Greyhaven', 'Millbrook', 'Carrow', 'Sedgewick', 'Danforth', 'Lindell', 'Wrenmoor', 'Hollis Bay', 'Tamsin', 'Orrick', 'Fennwick', 'Bellamy', 'Castleton', 'Dunmore', 'Everly', 'Harlow', 'Kingsmere'];
const STATE = ['MA', 'NH', 'VT', 'ME', 'RI', 'CT', 'NY', 'PA', 'OH', 'MI'];
const STREET = ['Main St', 'Elm St', 'Mill Rd', 'Harbor Ave', 'Church St', 'Washington St', 'Bridge St', 'Park Ave', 'School St', 'Water St', 'Pleasant St', 'High St', 'Union St', 'Prospect St', 'Summer St', 'Winter St', 'Spring St', 'Maple Ave', 'Oak St', 'Center St'];

/* ---------------- helpers ---------------- */
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const iso = (ms) => new Date(ms).toISOString();
const daysAgo = (d) => NOW_MS - Math.round(d * DAY);
const pad = (n, w) => String(n).padStart(w, '0');
const fmtPhone = (digits, style) => {
  const a = digits.slice(0, 3), b = digits.slice(3, 6), c = digits.slice(6);
  return style === 0 ? `(${a}) ${b}-${c}` : style === 1 ? `${a}-${b}-${c}` : `${a}.${b}.${c}`;
};

/** Website hostname bucket -> how the mock responder behaves (see check.mjs). */
const site = (slug, bucket) => `https://${slug}.${bucket}.test/`;

export const generate = () => {
  const rng = makeRng(SEED);
  const listings = [];
  const truth = {}; // id -> {labels: [...], detail: {...}}
  const label = (id, cls, detail = {}) => { (truth[id] ??= {labels: [], detail: {}}).labels.push(cls); Object.assign(truth[id].detail, {[cls]: detail}); };

  // ---- base entities ----
  const DUP_GROUPS = 320;
  const nBase = TOTAL - DUP_GROUPS; // each group adds exactly one extra row
  const usedSlugs = new Set();
  for (let i = 0; i < nBase; i++) {
    let name, slug;
    do { name = `${rng.pick(ADJ)} ${rng.pick(NOUN)}${rng.pick(SUFFIX)}`; slug = slugify(name); } while (usedSlugs.has(slug));
    usedSlugs.add(slug);
    const city = rng.pick(CITY), state = rng.pick(STATE);
    const zip = `${pad(rng.int(1000, 99999), 5)}`;
    const street = `${rng.int(1, 999)} ${rng.pick(STREET)}`;
    const phoneDigits = `555${pad(rng.int(2000000, 9999999), 7)}`;
    // open-business website bucket distribution (world behaviour, NOT a truth label)
    const r = rng.next();
    const bucket = r < 0.88 ? 'ok' : r < 0.93 ? 'slow' : r < 0.97 ? 'down' : 'nx';
    const changedD = rng.int(0, 700);
    const verifiedD = rng.int(0, Math.min(300, changedD)); // normally verified AFTER the last change
    const checkedD = rng.int(0, 60);
    listings.push({
      id: `L${pad(i + 1, 5)}`,
      name, category: rng.pick(CATEGORY),
      address: {street, city, state, zip},
      phone: fmtPhone(phoneDigits, 0),
      website: rng.chance(0.08) ? null : site(slug, bucket),
      lastCheckedAt: iso(daysAgo(checkedD)),
      lastChangedAt: iso(daysAgo(changedD)),
      lastVerifiedAt: iso(daysAgo(verifiedD)),
    });
  }

  // ---- 1. duplicates: one extra row per group; some are made hard to match ----
  const dupBases = rng.sample(listings.slice(), DUP_GROUPS);
  dupBases.forEach((base, gi) => {
    const hard = rng.chance(0.25);
    const copy = structuredClone(base);
    copy.id = `L${pad(listings.length + 1, 5)}`;
    const plainName = base.name.replace(/ (Co\.|LLC|Inc|& Sons|Group)$/, '');
    copy.name = hard ? plainName.split(' ').slice(1).join(' ') || plainName : rng.pick([`${plainName} LLC`, `The ${plainName}`, plainName.toUpperCase(), `${plainName} Inc`]);
    const digits = base.phone.replace(/\D/g, '');
    copy.phone = hard ? fmtPhone(`555${pad(rng.int(2000000, 9999999), 7)}`, rng.int(0, 2)) : fmtPhone(digits, rng.int(0, 2));
    if (hard) copy.address = {...base.address, street: base.address.street.replace(/ St$/, ' Street').replace(/ Ave$/, ' Avenue').replace(/ Rd$/, ' Road')};
    copy.lastChangedAt = iso(daysAgo(rng.int(0, 400)));
    copy.lastVerifiedAt = iso(daysAgo(rng.int(0, 300)));
    listings.push(copy);
    const group = `D${pad(gi + 1, 3)}`;
    label(base.id, 'duplicate', {group, role: 'canonical', hardVariant: hard});
    label(copy.id, 'duplicate', {group, role: 'copy', of: base.id, hardVariant: hard});
  });
  if (listings.length !== TOTAL) throw new Error(`expected ${TOTAL} rows, got ${listings.length}`);

  // ---- 2. malformed URLs (overlap allowed with anything) ----
  const MALFORMED = ['scheme_typo', 'single_slash', 'no_scheme', 'empty_host', 'empty_label', 'bad_port', 'space_in_path', 'wrong_scheme', 'typo_domain'];
  rng.sample(listings.filter((l) => l.website), 250).forEach((l) => {
    const slug = new URL(l.website).hostname.split('.')[0];
    const kind = rng.pick(MALFORMED);
    l.website = {
      scheme_typo: `htp://${slug}.ok.test/`,
      single_slash: `https:/${slug}.ok.test/`,
      no_scheme: `${slug}.ok.test`,
      empty_host: 'https://',
      empty_label: `https://${slug}..test/`,
      bad_port: `https://${slug}.ok.test:99999/`,
      space_in_path: `https://${slug}.ok.test/our team`,
      wrong_scheme: `mailto:info@${slug}.ok.test`,
      typo_domain: `https://${slug}.okk.test/`, // syntactically valid; semantically wrong
    }[kind];
    label(l.id, 'malformed_url', {kind});
  });

  // ---- 3. missing required fields ----
  const REQUIRED = ['name', 'category', 'address.street', 'address.city', 'address.state', 'address.zip', 'phone'];
  rng.sample(listings, 300).forEach((l) => {
    const fields = rng.sample(REQUIRED, rng.int(1, 2));
    fields.forEach((f) => {
      if (f.startsWith('address.')) l.address[f.slice(8)] = rng.chance(0.5) ? '' : null;
      else l[f] = rng.chance(0.5) ? '' : null;
    });
    label(l.id, 'missing_required', {fields});
  });

  // ---- 4. old verification timestamps (NOT proof the listing is wrong) ----
  rng.sample(listings, 900).forEach((l) => {
    const d = rng.int(400, 1500);
    l.lastVerifiedAt = iso(daysAgo(d));
    // keep the invariant "verified after the last change" for these unless step 5 changes it
    if (Date.parse(l.lastChangedAt) > Date.parse(l.lastVerifiedAt)) l.lastChangedAt = iso(daysAgo(d + rng.int(1, 200)));
    label(l.id, 'stale_verification', {verifiedDaysAgo: d});
  });

  // ---- 5. changed addresses: the business moved. The public row still shows the OLD address.
  //      In ~55% of cases an editor touched the row afterwards (lastChangedAt > lastVerifiedAt),
  //      which is the only public signal the checker can use. The rest leave no trace -> missed.
  rng.sample(listings, 400).forEach((l) => {
    const newStreet = `${rng.int(1, 999)} ${rng.pick(STREET)}`;
    const signal = rng.chance(0.55);
    if (signal) {
      const changedD = rng.int(0, 120);
      l.lastChangedAt = iso(daysAgo(changedD));
      if (Date.parse(l.lastVerifiedAt) > Date.parse(l.lastChangedAt)) l.lastVerifiedAt = iso(daysAgo(changedD + rng.int(30, 400)));
    }
    label(l.id, 'changed_address', {currentStreet: newStreet, listedStreet: l.address.street, editedSinceVerified: signal});
  });

  // ---- 6. closures: the business is closed. Website behaviour varies: some sites are gone,
  //      some domains lapsed, some sites are still up (-> the checker cannot see the closure).
  rng.sample(listings.filter((l) => typeof l.website === 'string' && l.website.startsWith('https://') && /\.(ok|slow|down|nx)\.test\//.test(l.website)), 350).forEach((l) => {
    const r = rng.next();
    const bucket = r < 0.4 ? 'gone' : r < 0.7 ? 'nx' : 'ok';
    l.website = l.website.replace(/\.(ok|slow|down|nx)\.test\//, `.${bucket}.test/`);
    label(l.id, 'closed', {siteBucket: bucket, closedDaysAgo: rng.int(30, 600)});
  });

  // ---- 7. ordinary edits since verification that are NOT address changes (e.g. hours) ----
  rng.sample(listings.filter((l) => !truth[l.id]), 200).forEach((l) => {
    const changedD = rng.int(0, 90);
    l.lastChangedAt = iso(daysAgo(changedD));
    if (Date.parse(l.lastVerifiedAt) > Date.parse(l.lastChangedAt)) l.lastVerifiedAt = iso(daysAgo(changedD + rng.int(10, 200)));
    // no ground-truth label: the listing is correct, it was merely edited
  });

  const seededCounts = {};
  Object.values(truth).forEach((t) => t.labels.forEach((c) => { seededCounts[c] = (seededCounts[c] ?? 0) + 1; }));
  const groundTruth = {
    note: 'SYNTHETIC. Evaluation only. The checker (check.mjs) must never read this file.',
    seed: SEED, now: NOW, total: TOTAL,
    seededCounts, // per class, counting LISTINGS (duplicate counts both members of each group)
    labelledListings: Object.keys(truth).length,
    listings: truth,
  };
  return {listings, groundTruth};
};

export const writeFixtures = (dir = new URL('./', import.meta.url)) => {
  const {listings, groundTruth} = generate();
  // one listing per line: readable diffs, ~2.6 MB
  const body = '[\n' + listings.map((l) => JSON.stringify(l)).join(',\n') + '\n]\n';
  fs.writeFileSync(new URL('./listings.json', dir), body);
  fs.writeFileSync(new URL('./ground-truth.json', dir), JSON.stringify(groundTruth, null, 1));
  return {listings, groundTruth};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const {listings, groundTruth} = writeFixtures();
  console.log(`wrote ${listings.length} listings; seeded classes:`, groundTruth.seededCounts, `labelled listings: ${groundTruth.labelledListings}`);
}
