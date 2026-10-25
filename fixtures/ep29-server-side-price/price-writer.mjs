// Worker thread: a SECOND, independent SQLite connection that changes a catalog price on command.
// Command/response travel through shared memory so the main thread can block on a real cross-thread barrier.
//   a[0] command sequence (main increments; -1 = exit)   a[3] new price (cents)
//   a[1] done sequence (worker sets = command sequence)   a[2] result: 0 ok, 1 SQLITE_BUSY ("database is locked"), 2 other
// The connection uses busy timeout 0 so a held write lock is observable instead of silently waited out.
import {workerData} from 'node:worker_threads';
import {openConnection} from './store.mjs';

const {path, productId, sab} = workerData;
const a = new Int32Array(sab);
const db = openConnection(path, {timeout: 0});
const upd = db.prepare(`UPDATE products SET unit_price_cents = ? WHERE id = ?`);
let seen = 0;
for (;;) {
  Atomics.wait(a, 0, seen);
  const seq = Atomics.load(a, 0);
  if (seq === seen) continue;
  seen = seq;
  if (seq < 0) break;
  let code = 0;
  try { upd.run(Atomics.load(a, 3), productId); } catch (e) { code = /database is locked|SQLITE_BUSY/i.test(String(e.message)) ? 1 : 2; }
  Atomics.store(a, 2, code);
  Atomics.store(a, 1, seq);
  Atomics.notify(a, 1);
}
db.close();
