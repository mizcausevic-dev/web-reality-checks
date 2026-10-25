// Runs an explicit release schedule against a controller + mock API.
// The schedule is the ONLY thing that decides ordering: each step awaits the promise it affects.
// steps: {do:'type', query} | {do:'release', request} | {do:'fail', request, message?} | {do:'clear'} | {do:'dispose'}
export async function runSchedule(controller, api, steps) {
  const calls = new Map(); // request number -> promise returned by controller.search
  const log = [];
  for (const s of steps) {
    const before = controller.timeline.length;
    if (s.do === 'type') {
      const p = controller.search(s.query); // api.search runs synchronously inside search()
      const n = api.requests.length;
      if (n > calls.size) calls.set(n, p);
      else await p;
    } else if (s.do === 'release') {
      api.release(s.request);
      await calls.get(s.request);
    } else if (s.do === 'fail') {
      api.fail(s.request, s.message);
      await calls.get(s.request);
    } else if (s.do === 'clear') controller.clear();
    else if (s.do === 'dispose') controller.dispose();
    else throw new Error(`unknown step ${s.do}`);
    for (const [n, p] of calls) if (api.byN(n).state === 'aborted') await p; // let abort rejections settle before logging
    log.push({step: {...s}, entries: controller.timeline.slice(before), after: controller.snapshot(), writes: controller.stateWrites});
  }
  return log;
}
