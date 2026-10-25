// Main-thread side of the cross-thread barrier used by the transaction-consistency test and the demo.
// setPrice() BLOCKS the calling thread (Atomics.wait) until the worker's separate SQLite connection has
// tried the UPDATE, so it can be called from inside a store transaction hook and the outcome is known
// before the transaction continues.
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';

export const startPriceWriter = async (path, productId) => {
  const sab = new SharedArrayBuffer(16);
  const a = new Int32Array(sab);
  const worker = new Worker(new URL('./price-writer.mjs', import.meta.url), {workerData: {path, productId, sab}});
  await once(worker, 'online');
  let seq = 0;
  return {
    setPrice(cents) {
      Atomics.store(a, 3, cents);
      seq += 1;
      Atomics.store(a, 0, seq);
      Atomics.notify(a, 0);
      const r = Atomics.wait(a, 1, seq - 1, 5000); // wait until done-seq leaves its previous value
      if (r === 'timed-out') throw new Error('barrier timed out');
      return ['ok', 'busy', 'error'][Atomics.load(a, 2)];
    },
    async stop() {
      Atomics.store(a, 0, -1);
      Atomics.notify(a, 0);
      await once(worker, 'exit');
    },
  };
};
