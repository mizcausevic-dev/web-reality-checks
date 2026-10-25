// Episode 10 fixture: deterministic DNS cache simulator with a virtual clock.
//
// SIMULATED DNS MODEL · NO REAL NETWORK. Nothing here opens a socket. The
// addresses are RFC 5737 documentation addresses represented as strings.
//
// Model (deliberately simplified):
//   - one authoritative A record for example.test (value + TTL)
//   - two recursive resolvers (A, B), each with its own cache of that one name
//   - two clients, each bound to one resolver (clientA→resolverA, clientB→resolverB)
//   - a connection stage after resolution: succeeds only if the resolved IPv4
//     address equals the intended origin address 192.0.2.10
//
// NOT modelled (stated on screen and in the README): serve-stale, prefetch /
// pre-expiry refresh, browser DNS cache, operating-system stub cache, negative
// caching, AAAA records, multiple authoritative servers, propagation delay
// between authoritative servers, TLS or HTTP behaviour after the TCP connect.
//
// The clock is virtual: every action carries a time t (seconds). Cache entries
// expire because `t >= expiresAt`, never because of a scripted countdown.

export const DOMAIN = 'example.test';
export const INTENDED_IP = '192.0.2.10';
export const WRONG_IP = '192.0.2.20';
export const DEFAULT_TTL = 60;

export class DnsSim {
  constructor({intendedIp = INTENDED_IP, initialIp = INTENDED_IP, ttl = DEFAULT_TTL} = {}) {
    this.now = 0;
    this.intendedIp = intendedIp;
    this.authoritative = {name: DOMAIN, type: 'A', value: initialIp, ttl};
    this.resolvers = {A: {cache: null}, B: {cache: null}}; // cache: {answer, ttl, cachedAt, expiresAt} | null
    this.clients = {clientA: 'A', clientB: 'B'};
    this.events = [];       // every query: {t, client, resolver, cacheHit, answer, ttlRemaining, connect}
    this.authChanges = [{t: 0, value: initialIp, ttl}];
    this.cacheWrites = [];  // every time a resolver stores an answer
  }

  /** Move the virtual clock forward. Time never runs backwards. */
  at(t) {
    if (typeof t !== 'number' || Number.isNaN(t)) throw new TypeError('t must be a number');
    if (t < this.now) throw new RangeError(`clock cannot go backwards (${this.now} → ${t})`);
    this.now = t;
    return this;
  }

  /** Edit the authoritative record. Takes effect for *new* lookups only. */
  setRecord(value, ttl = this.authoritative.ttl) {
    this.authoritative = {...this.authoritative, value, ttl};
    this.authChanges.push({t: this.now, value, ttl});
    return this;
  }

  /** Cache entry as seen at the current time, or null. Expired entries stay in
   *  the map until the next query replaces them: expiry does not push anything. */
  cacheState(resolverId) {
    const r = this.resolvers[resolverId];
    if (!r) throw new Error(`unknown resolver ${resolverId}`);
    const c = r.cache;
    if (!c) return {status: 'empty', answer: null, ttlRemaining: null};
    const remaining = c.expiresAt - this.now;
    return remaining > 0
      ? {status: 'fresh', answer: c.answer, ttlRemaining: remaining, cachedAt: c.cachedAt, expiresAt: c.expiresAt}
      : {status: 'expired', answer: c.answer, ttlRemaining: 0, cachedAt: c.cachedAt, expiresAt: c.expiresAt};
  }

  /** A recursive resolver answers a query: cache hit if fresh, otherwise it asks the authority. */
  resolve(resolverId) {
    const r = this.resolvers[resolverId];
    const st = this.cacheState(resolverId);
    if (st.status === 'fresh') {
      return {cacheHit: true, answer: st.answer, ttlRemaining: st.ttlRemaining, rcode: 'NOERROR'};
    }
    // Miss (empty or expired): fetch from the authoritative server *as it is now*.
    const {value, ttl} = this.authoritative;
    r.cache = {answer: value, ttl, cachedAt: this.now, expiresAt: this.now + ttl};
    this.cacheWrites.push({t: this.now, resolver: resolverId, answer: value, ttl, expiresAt: this.now + ttl});
    return {cacheHit: false, answer: value, ttlRemaining: ttl, rcode: 'NOERROR'};
  }

  /** Simplified connection stage: succeeds only when the address is the intended origin. */
  connect(ip) {
    return ip === this.intendedIp ? 'ok' : 'failed';
  }

  /** A client resolves the name through its resolver, then tries to connect. Logged. */
  query(clientId) {
    const resolverId = this.clients[clientId];
    if (!resolverId) throw new Error(`unknown client ${clientId}`);
    const res = this.resolve(resolverId);
    const ev = {
      t: this.now,
      client: clientId,
      resolver: resolverId,
      cacheHit: res.cacheHit,
      answer: res.answer,          // resolution succeeded (NOERROR) in every case in this model
      ttlRemaining: res.ttlRemaining,
      connect: this.connect(res.answer), // 'ok' | 'failed'
    };
    this.events.push(ev);
    return ev;
  }

  /** Full state at the current virtual time. */
  snapshot() {
    return {
      t: this.now,
      authoritative: {...this.authoritative},
      resolverA: this.cacheState('A'),
      resolverB: this.cacheState('B'),
    };
  }
}

/**
 * The deterministic sequence from the brief, executed as actions on the clock.
 * Returns the sim plus snapshots taken at the assertion times.
 */
export function runSequence(sim = new DnsSim()) {
  const snapshots = {};
  const snap = () => { snapshots[sim.now] = sim.snapshot(); };

  sim.at(0).query('clientA');            // 1. resolver A caches the correct address, TTL 60
  snap();
  sim.at(10).setRecord(WRONG_IP);        // 2. the authoritative record is changed to the wrong address
  snap();
  sim.at(15).query('clientB');           // 3. resolver B misses and caches the wrong address, TTL 60
  snap();
  sim.at(20).query('clientA');           // 4. client A still gets the correct answer…
  sim.query('clientB');                  //    …client B gets the wrong one and its connection fails
  snap();
  sim.at(30).setRecord(INTENDED_IP);     // 5. restore the correct authoritative address
  sim.query('clientA');
  sim.query('clientB');                  // 6. resolver B still serves the cached wrong answer
  snap();
  sim.at(60).query('clientA');           // 7. resolver A's entry has expired; its next query refreshes
  sim.query('clientB');                  //    resolver B's bad entry is still fresh (15 s left)
  snap();
  sim.at(75).query('clientB');           // 8. resolver B's bad entry has expired; next query gets the corrected answer
  sim.query('clientA');
  snap();
  return {sim, snapshots};
}
