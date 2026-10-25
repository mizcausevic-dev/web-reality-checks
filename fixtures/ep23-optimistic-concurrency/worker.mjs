// Worker for the coordinated concurrent-save test. Each worker owns its OWN SQLite connection to the
// same database file, waits at a barrier (SharedArrayBuffer + Atomics), then fires the same conditional
// update at the same instant. Real parallelism: workers run on separate threads.
import {workerData, parentPort} from 'node:worker_threads';
import {createDb} from './db.mjs';

const {file, n, who, expectedVersion, shared} = workerData;
const ia = new Int32Array(shared);
const db = createDb({file, busyTimeoutMs: 5000, seed: false});

// barrier: ia[0] = arrivals, ia[1] = go flag
const arrived = Atomics.add(ia, 0, 1) + 1;
if (arrived === n) { Atomics.store(ia, 1, 1); Atomics.notify(ia, 1); }
else { while (Atomics.load(ia, 1) === 0) Atomics.wait(ia, 1, 0, 5000); }

let out;
try { out = db.updateIfVersion('doc_1', expectedVersion, {title: `title by ${who}`, body: `body by ${who}`}, who); }
catch (e) { out = {error: String(e.message)}; }
db.close();
parentPort.postMessage({who, ...out});
