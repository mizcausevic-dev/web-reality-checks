// Runs the exact deterministic sequence shown in the video and writes evidence.json.
// SIMULATED DNS MODEL · NO REAL NETWORK — no sockets, no real domain, no real resolvers.
import fs from 'node:fs';
import {runSequence, DOMAIN, INTENDED_IP, WRONG_IP, DEFAULT_TTL} from './simulator.mjs';

const {sim, snapshots} = runSequence();

const evidence = {
  generatedAt: new Date().toISOString(),
  model: 'SIMULATED DNS MODEL · NO REAL NETWORK',
  domain: DOMAIN,
  intendedIp: INTENDED_IP,
  wrongIp: WRONG_IP,
  ttl: DEFAULT_TTL,
  simplifications: [
    'no serve-stale', 'no prefetch / pre-expiry refresh', 'no browser DNS cache', 'no operating-system DNS cache',
    'no negative caching', 'A record only (AAAA not modelled)', 'connect stage is a string comparison against the intended IP',
    'TLS and HTTP are not modelled', 'record TTL is distinct from any website-content cache lifetime',
  ],
  authoritativeChanges: sim.authChanges,
  cacheWrites: sim.cacheWrites,
  snapshots,
  events: sim.events,
  summary: {
    totalQueries: sim.events.length,
    failedConnections: sim.events.filter((e) => e.connect === 'failed').length,
    resolutionFailures: 0, // every query returned an address; the wrong ones were still successful resolutions
    resolverARecoveredAt: sim.events.find((e) => e.resolver === 'A' && e.t >= 30 && !e.cacheHit && e.answer === INTENDED_IP).t,
    resolverBRecoveredAt: sim.events.find((e) => e.resolver === 'B' && e.t >= 30 && !e.cacheHit && e.answer === INTENDED_IP).t,
  },
};

fs.writeFileSync(new URL('./evidence.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.log(`${evidence.model}\n${DOMAIN}  intended ${INTENDED_IP}  wrong ${WRONG_IP}  TTL ${DEFAULT_TTL}s`);
console.table(sim.events.map((e) => ({t: e.t, client: e.client, resolver: e.resolver, hit: e.cacheHit ? 'HIT' : 'MISS', answer: e.answer, ttlLeft: e.ttlRemaining, connect: e.connect})));
console.log('authoritative changes:', sim.authChanges.map((c) => `t=${c.t} → ${c.value} (TTL ${c.ttl})`).join('; '));
console.log('summary:', evidence.summary);
