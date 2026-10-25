// Deterministic seed data for the EP26 fixture. Synthetic people and titles only.
// Pure integer arithmetic (mulberry32 + weighted table) so the result is identical on every machine.
// `node seed.mjs` rewrites seed-data.json; test.mjs fails if the committed file is stale.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0);
};

// 12 synthetic authors. Weights make some authors prolific so shared authors are obvious.
const AUTHOR_DEFS = [
  ['Ana Petrov', 'apetrov', 14], ['Bram Okafor', 'bokafor', 12], ['Cleo Lindqvist', 'clindqvist', 11],
  ['Dev Marlowe', 'dmarlowe', 10], ['Esi Varga', 'evarga', 9], ['Finn Abara', 'fabara', 8],
  ['Gus Hollis', 'ghollis', 7], ['Hana Ruiz', 'hruiz', 7], ['Ivo Chen', 'ichen', 6],
  ['Jude Santos', 'jsantos', 6], ['Kira Novak', 'knovak', 5], ['Lio Brandt', 'lbrandt', 5],
];
const TOPICS = ['Caching', 'Routing', 'Queues', 'Indexes', 'Sessions', 'Forms', 'Search', 'Feeds', 'Uploads', 'Exports'];
const ANGLES = ['in practice', 'without the myths', 'for small teams', 'a field guide', 'what to check first', 'a worked example', 'common mistakes', 'notes from a rewrite'];

export const buildSeed = () => {
  const rand = mulberry32(2610);
  const total = AUTHOR_DEFS.reduce((a, d) => a + d[2], 0);
  const authors = AUTHOR_DEFS.map(([name, handle], i) => ({id: i + 1, name, handle}));
  const pick = () => {
    let r = rand() % total;
    for (let i = 0; i < AUTHOR_DEFS.length; i++) {
      if (r < AUTHOR_DEFS[i][2]) return i + 1;
      r -= AUTHOR_DEFS[i][2];
    }
    throw new Error('unreachable');
  };
  const articles = [];
  for (let id = 1; id <= 100; id++) {
    const day = new Date(Date.UTC(2026, 0, 1) + (id - 1) * 86400000).toISOString().slice(0, 10);
    articles.push({
      id,
      title: `${TOPICS[rand() % TOPICS.length]}: ${ANGLES[rand() % ANGLES.length]} (${id})`,
      published_on: day,
      author_id: pick(),
    });
  }
  return {authors, articles};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL('./seed-data.json', import.meta.url));
  fs.writeFileSync(out, JSON.stringify(buildSeed(), null, 2) + '\n');
  console.log('wrote', out);
}
