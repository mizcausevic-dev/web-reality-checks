# EP08 test conditions

## What ran here (Executed)

| Measurement | Tool | Conditions | Where |
|---|---|---|---|
| Hero image byte sizes | `fs.statSync` + fetched through `serve.mjs` on 127.0.0.1 | file bytes on disk; `Cache-Control: no-store`; no throttling involved | `evidence.json → assets` |
| Handler CPU time | `performance.now()` in Node 22 | same seeded 20,000-item catalogue; 1 warm-up run excluded; 7 timed runs per variant; median + raw retained | `evidence.json → handlers` |

Label that must accompany every handler number: **fixture-measured handler CPU time in Node, NOT browser INP**.

Why the label matters: Node and Chromium share V8, but Node has no input pipeline, no rendering, no compositor and no Event Timing accounting. The handler time bounds the main-thread work the click would cause; it does not equal what a user would wait for, and it is not Interaction to Next Paint.

Environment of the recorded run: see `evidence.json → environment` (Node version, CPU model, core count). The container is shared and not CPU-pinned, so the raw runs vary (the before variant spread roughly 3.3–4.9 s across runs in the recorded sample). The median is the reported figure.

## What did NOT run here (Blocked)

No browser was available in this environment, so **no LCP and no Event Timing / INP values exist** for either page. The video shows none.

## Procedure for the browser lab run (for Miz to execute locally)

Fixed conditions for every trial, both variants:

1. **Same browser build.** Record the exact version (e.g. `chrome://version`). Use the same profile with extensions disabled, or a fresh profile.
2. **Same machine, mains power, nothing else heavy running.** Note the CPU model.
3. **Same viewport.** DevTools device toolbar or window size pinned to 1600×900 CSS px (the hero slot is 1600 px wide at that width). Device pixel ratio 1.
4. **Same CPU throttle.** DevTools → Performance → CPU: 4× slowdown for every trial (or none for every trial — never mixed).
5. **Same network profile.** DevTools → Network: pick one preset (e.g. "Fast 3G" or "Slow 4G") and keep it for every trial. Loopback is otherwise instantaneous, so without throttling the 12 MB PNG still arrives in milliseconds; the throttle is what makes the loading comparison meaningful.
6. **Cold vs warm defined separately.**
   - *Cold:* "Disable cache" ticked in DevTools Network, hard reload (Ctrl/Cmd+Shift+R) for each trial. The server already sends `no-store`.
   - *Warm:* untick "Disable cache", remove `no-store` from `serve.mjs` for this run only (documented deviation), load the page once (discarded), then measure the next reload.
   - Report cold and warm as different tables. Never average them.
7. **At least five trials per variant per condition.** Report the median; keep every raw value.
8. **Record an initial trace before attributing the cause.** Take one Performance-panel trace per variant first; confirm the LCP element is the hero `<img>` and that the long task on click is inside `relatedCounts` before quoting any numbers.

Start the server on a fixed port so URLs stay the same across trials:

```
node fixtures/ep08-feels-slow/make-assets.mjs     # once
node fixtures/ep08-feels-slow/serve.mjs 4508       # http://127.0.0.1:4508/before/  /after/
```

### Loading timeline — LCP

Paste this in the console *before* loading (or use a DevTools snippet), then reload:

```js
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) console.log('LCP candidate', e.startTime.toFixed(0), 'ms', e.element?.tagName, e.url);
}).observe({type: 'largest-contentful-paint', buffered: true});
```

The last candidate logged before the first interaction is the LCP value for that trial. Confirm `e.element` is `IMG` for both pages. Alternatively, Lighthouse in the Performance panel reports LCP directly; keep the same throttling preset.

### Interaction timeline — Event Timing (lab)

```js
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) if (e.name === 'click')
    console.log('Event Timing click', 'duration', e.duration, 'ms', 'processing', (e.processingEnd - e.processingStart).toFixed(0), 'ms');
}).observe({type: 'event', buffered: true, durationThreshold: 16});
```

Click **Show related counts** once per trial, after the page has been idle for two seconds. `duration` is the Event Timing duration (input delay + processing + presentation delay) for that one scripted click. Report it as a **lab measurement of one scripted interaction**. It is **not** a field INP assessment (INP is the ~98th percentile of all interactions over a page visit, from real users), and Total Blocking Time must not be substituted for it.

### Reporting

For each of the four tables (cold-load LCP, warm-load LCP, interaction before, interaction after), give: browser version, viewport, CPU throttle, network preset, trial count, median, and the raw list. Add the results to `evidence.json` under a new `browserLab` key with these conditions, then the video's "Blocked" lines can be replaced by "Executed" lines.
