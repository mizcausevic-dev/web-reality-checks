# Episode briefs (verbatim from the producer)

Global rules for every episode are in `00-global-production-prompt.md`. Each episode below applies on top of those.

---

## EP01 — “Your AI-Built App Works. Is It Safe to Launch?”

CENTRAL IDEA: A polished interface does not establish server-side authorization. Show one specific access-control failure and its repair.

SCOPE: This is an intentionally constructed local fixture. Do not claim that an AI tool actually generated the vulnerability unless that happened and was documented.

FIXTURE: Build a minimal project-management application with: two synthetic users, Alice and Bob; one private project owned by each user; a server-controlled identity mechanism; an intentionally vulnerable project-read endpoint; a corrected version of the endpoint. Do not accept a user ID supplied by the browser as proof of identity. Use a test session mechanism or a test harness that establishes identity on the server.

VULNERABLE BEHAVIOR: The endpoint checks whether Alice is authenticated, but returns a project by ID without checking whether Alice owns it.

CORRECTED BEHAVIOR: Resolve the authenticated user on the server and constrain the project lookup by both project ID and owner ID. For this fixture, return 404 for a project that is absent or inaccessible, and explain this deliberate response policy in the README.

SCENES: 1. A polished application displays “Demo complete.” 2. Reveal browser, session, API, and database layers. 3. Alice retrieves her own project successfully. 4. A controlled test requests Bob’s project as Alice. 5. The vulnerable endpoint incorrectly returns Bob’s project. 6. Freeze at the missing server-side ownership condition. 7. Apply the ownership-scoped query. 8. Repeat both tests: Alice’s project succeeds; Bob’s returns 404. 9. End: “A working interface is not an authorization test.”

VISUAL MECHANIC: Animate an authenticated-user badge and a resource-owner badge. The vulnerable gate checks only whether a user exists. The corrected gate checks whether access is permitted for that resource.

TESTS: Unauthenticated request is rejected. Alice can read Alice’s project. Alice cannot read Bob’s project after the repair. Changing client-side UI state does not bypass server enforcement.

LIMITS: This repair addresses the demonstrated read-access flaw only. Do not claim the application is now fully secure. Do not deploy the vulnerable fixture.

SUPPLEMENT: Provide the regression tests and a concise launch-review checklist.

---

## EP02 — “One Click. Three Purchase Events. Here’s What Went Wrong.”

CENTRAL IDEA: One completed purchase can trigger multiple event emitters. Raw event duplication and platform reporting are separate questions.

FIXTURE: Build a local purchase-confirmation page and a local event collector. Create one synthetic completed order with one stable transaction ID. Deliberately configure three event paths: 1. Application purchase-completion handler. 2. Simulated tag-manager listener. 3. Confirmation-component mount handler. Run a deterministic scenario in which all three paths emit a purchase event for the same order. Clearly label the collector “Local event collector — not GA4.”

SCENES: 1. One completed order appears beside three received event envelopes. 2. Rewind to the original completion action. 3. Follow the three emitters into the collector. 4. Inspect event name, transaction ID, emitter source, and timestamp. 5. Explain the problem: several components claim ownership of the same business event. 6. Choose one authoritative emission path. 7. Remove the redundant listeners and component-mount emission. 8. Repeat the original action and remount the confirmation component. 9. Show the actual received-event count from the corrected test. 10. End: “Fix the emitters. Then verify the reporting.”

VISUAL MECHANIC: Split one order-completion signal into three event envelopes. After the correction, only the intended emitter sends the event in the tested scenario.

ACCURACY: Do not label three received events as three GA4 conversions. State briefly that GA4 documents purchase deduplication using matching transaction IDs for web streams. Do not imply that transaction IDs deduplicate all event types. Use a unique transaction ID per order, not per emission. Do not promise exactly-once delivery across reloads, devices, retries, or distributed systems. Treat robust order-level idempotency as a separate design concern. Do not depict this simulation as a reproduction of GA4’s internal logic.

SUPPLEMENT: Provide the fixture, captured event log, and event-ownership checklist.

---

## EP03 — “Watch What Happens When You Click ‘Sign In’”

CENTRAL IDEA: Explain one implementation: email/password authentication over HTTPS, with an opaque cookie identifying a server-side session. Do not present this as the architecture of every sign-in system.

IMPLEMENTATION SCOPE: Prefer a conceptual animation plus a small framework-supported fixture. Use maintained password-hashing and session libraries rather than implementing cryptography or session-token generation yourself.

SCENES: 1. The user clicks Sign In. 2. Separate browser, HTTPS connection, application server, user database, and session store into distinct lanes. 3. Credentials travel inside the HTTPS-protected connection. 4. The server uses a password-verification library to check the submitted password against a salted stored password hash. 5. On success, establish a fresh authenticated session and invalidate any pre-authentication session identifier. 6. Return an opaque session identifier in a cookie with HttpOnly, Secure, and an explicitly selected SameSite policy. 7. A subsequent request carries the cookie. 8. The server checks session validity and separately checks permission for the requested action. 9. Sign out invalidates the server-side session and expires the cookie. 10. End: “The cookie identifies a session. The server enforces access.”

VISUAL MECHANIC: Show credentials, session identifiers, and authorization decisions as different objects. Never turn the password into the cookie.

SECURITY REQUIREMENTS: Password hashing is not reversible encryption. Use a fresh session identifier after authentication. Set cookie scope deliberately; prefer a host-only cookie where suitable. Explain HttpOnly as limiting ordinary JavaScript access to the cookie, not preventing every session attack. Treat SameSite as defense in depth, not complete CSRF protection. For a working cookie-authenticated fixture, use the framework’s CSRF protection for applicable state-changing requests, including login and logout where appropriate. Do not use GET requests for state-changing operations. Do not imply HTTPS protects a compromised browser or server.

ENVIRONMENT: If the fixture cannot run with trusted local HTTPS, do not fake a working Secure-cookie exchange. Render the exchange as a labeled conceptual illustration and document what was not executed.

SUPPLEMENT: Provide the sequence diagram, framework configuration, and test notes.

---

## EP04 — “I Put a Database Inside a Website”

CENTRAL IDEA: Run a small database locally inside the browser, with browser-local persistence and a separately implemented offline application shell.

FIXTURE: Build a small notes application using PGlite if supported. Use an explicit IndexedDB-backed data directory, such as: new PGlite('idb://video-notes'). Verify the exact API against the installed version. Do not use an in-memory database while claiming persistence. Provide create, search, edit, and delete operations.

OFFLINE SETUP: Serve the application from localhost or another valid secure context. Cache the application shell and all required assets, including any database WASM/data assets, using a suitable service-worker strategy. Avoid uncached CDN dependencies. Complete the initial online load and database initialization before testing offline behavior. Wait for database writes to complete before reloading.

SCENES: 1. Create a note and query it. 2. Reveal the database engine inside the browser. 3. Distinguish the engine’s working memory from IndexedDB persistence. 4. Reload under the same origin and browser profile; verify the note. 5. Switch to offline mode after caching is complete. 6. Reload and edit the note successfully, if the test actually passes. 7. Open a clean browser profile; show that the local notes are absent. 8. Clear the original profile’s site data; show the stored note is gone. 9. End: “Local persistence is not cloud sync—or a backup.”

VISUAL MECHANIC: Keep application code, database engine, and browser storage inside a browser boundary. Show remote synchronization as absent.

ACCURACY: Persistence belongs to the same origin and browser profile. Do not imply the database is shared automatically across devices. Browser storage can be cleared or removed; do not promise permanence. Avoid enabling relaxed durability for this demonstration. Do not claim universal browser compatibility. If offline reload fails, report the failure rather than simulating success.

SUPPLEMENT: Provide the application, service-worker configuration, and test checklist.

---

## EP05 — “Your Directory Has 10,000 Listings. How Many Are Wrong?”

CENTRAL IDEA: Separate listing quantity from evidence-backed data quality. Use a reproducible synthetic dataset, not invented real-world findings.

FIXTURE: Generate exactly 10,000 synthetic listings using a fixed random seed. Maintain: a public listing dataset; a separate ground-truth fixture used only for evaluation. Seed controlled examples of: duplicate entities; malformed URLs; missing required fields; old verification timestamps; changed addresses; simulated business closures. Allow defects to overlap and preserve their ground-truth labels. Use local mock HTTP responses for website checks. Do not contact 10,000 real websites.

SCENES: 1. A headline counter reaches 10,000 listings. 2. Reveal overlapping quality problems behind the count. 3. Run separate checks for completeness, duplicate candidates, URL validity, website availability, and verification age. 4. Display actual computed counts from the generated dataset. 5. Show a website timeout beside a business that remains open in the ground-truth fixture. 6. Route uncertain cases into a review queue. 7. Record a review decision with evidence, timestamp, and reviewer. 8. End: “A failed website check is a lead to investigate—not proof.”

VISUAL MECHANIC: Move listing cards into reason-coded queues. Allow one card to carry several flags.

ACCURACY: Clearly label all data and results as synthetic. Do not treat an old verification date as proof the listing is wrong. Do not treat HTTP failure as proof of business closure. Separate last checked, last changed, and last verified. Report unique flagged listings separately from total issue instances. Do not add overlapping issue counts as if they were distinct listings. Do not let the checker read ground-truth labels as input. Distinguish detected problems from seeded problems missed by the checker.

SUPPLEMENT: Provide the synthetic dataset, ground-truth file, inspection results, and review rules.

---

## EP06 — “What Happens Between Your Prompt and the Answer?”

CENTRAL IDEA: Explain the observable steps in a tool-using AI application. Do not depict private model reasoning.

FIXTURE: Create a local assistant workflow for: “How many open support tickets are high priority?” Use a seeded synthetic ticket dataset and a narrowly scoped read-only tool such as: countTickets({ status: "open", priority: "high" }). Use a real model API only if authorized and available. Otherwise use a deterministic mock and display “Simulated model response” throughout the affected scenes.

SCENES: 1. The user submits the question. 2. Reveal the application assembling messages and tool definitions. 3. Show a model response requesting the structured countTickets tool. 4. The application validates tool name and arguments. 5. The application enforces the user’s permitted data scope. 6. The tool queries the synthetic tickets. 7. A structured result returns to the application, then to the model. 8. The final answer displays the actual computed count. 9. Replay a tool failure and show an honest failure message. 10. End: “The model requests the tool. The application controls execution.”

VISUAL MECHANIC: Use distinct lanes for user interface, application, model API, tool executor, and data store. Show observable requests and responses only. Use opaque request IDs to connect steps without revealing secrets.

ACCURACY: Do not show hidden chain-of-thought. Do not imply the model directly opens the database. Do not expose arbitrary SQL execution. Do not accept a model-supplied account ID as authorization. Enforce user/data scope outside the model. Do not fabricate a count after a tool failure. Use measured timings only when actually measured. If showing retry behavior, implement one bounded retry for a simulated transient error on this read-only operation. State that retry safety differs for state-changing tools. Explain that this is one application design, not every AI request.

SUPPLEMENT: Provide the dataset, tool schema, sanitized trace, and failure test.

---

## EP07 — “It Works Locally. Why Is Production Broken?”

CENTRAL IDEA: A frontend API address embedded at build time can point a deployed client at its own localhost instead of the intended API.

FIXTURE: Build a minimal Vite frontend that reads: import.meta.env.VITE_API_BASE_URL. Use a local API endpoint such as /health.

LOCAL SUCCESS: Run the browser and API in the developer’s environment, where the configured localhost API address is reachable.

DEPLOYED-CLIENT FAILURE: Build the frontend with that same localhost API address. Serve the static bundle to a browser in a separate machine or isolated network context that has no API listening on its own loopback interface. If using containers, verify the browser’s network isolation explicitly. Do not assume a different port or a different static server is sufficient. If a genuinely isolated browser context cannot be created, present the remote-client scenario as a labeled conceptual simulation. Do not claim the failure was reproduced.

SCENES: 1. The local application succeeds. 2. The remote-client test fails. 3. Follow the request to the remote client’s own localhost. 4. Reveal the API URL embedded in the built JavaScript. 5. Change an environment variable on the static hosting server without rebuilding. 6. Show that the existing bundle still contains the original value. 7. Rebuild with an API URL reachable by the test browser. 8. Serve the new bundle and verify the successful request. 9. End: “A server environment change cannot rewrite an existing bundle.”

VISUAL MECHANIC: Stamp the API address into the bundle during the build. Draw separate boundaries around developer machine, static host, API host, and remote browser.

ACCURACY: Verify actual Vite environment-variable behavior. Use the literal import.meta.env.VITE_API_BASE_URL reference. Explain that VITE_-prefixed values are public client configuration. Never put secrets in client-exposed variables. Configure test CORS or a same-origin proxy deliberately so it does not become an unrelated failure. Identify the actual observed error rather than calling every failure CORS. Keep runtime configuration as an optional alternative, not a second partially implemented repair.

SUPPLEMENT: Provide the topology, reproduction commands, built-value inspection, and successful retest.

---

## EP08 — “Why This Beautiful Website Feels Slow”

CENTRAL IDEA: Separate visual appearance, loading speed, and interaction responsiveness. Demonstrate two controlled bottlenecks without conflating their metrics.

FIXTURE: Create visually equivalent before-and-after pages. The flawed version includes: an unnecessarily large hero image; a deliberately expensive synchronous interaction handler. Use fixed local assets and deterministic test data.

CORRECTIONS: Serve an appropriately sized and encoded hero image. Do not lazy-load the above-the-fold hero image when it is the expected largest-contentful element. Replace the expensive interaction implementation with a genuinely lower-cost implementation. Do not merely hide the delay with animation.

SCENES: 1. Show a polished page that loads its hero slowly and reacts late to a click. 2. Separate the loading timeline from the interaction timeline. 3. Inspect the hero image request and rendering milestone. 4. Inspect the interaction handler’s main-thread work. 5. Apply the image correction and retest loading. 6. Apply the handler correction and retest the same interaction. 7. Display actual measured results with their conditions. 8. End: “Loading quickly and responding quickly are different tests.”

MEASUREMENT: Use the same browser version, viewport, machine, CPU/network settings, and cache policy. Define cold-load and warm-load tests separately. Run at least five comparable trials per variant if feasible. Report the median and retain raw results. Measure LCP for the loading comparison if tooling supports it. Use Event Timing or suitable interaction tooling for the scripted interaction and label the result as a lab measurement. Do not call one scripted interaction a field INP assessment. Do not substitute Total Blocking Time for INP. Record an initial trace before attributing the cause.

LIMITS: If measurement tools are unavailable, render an illustrative explanation without numerical performance claims.

SUPPLEMENT: Provide both variants, test commands, test conditions, and raw results.

---

## EP09 — “This Form Looks Finished. Try Using It Without a Mouse.”

CENTRAL IDEA: A polished screenshot cannot establish keyboard usability. Demonstrate specific defects and repairs without claiming a full accessibility audit.

FIXTURE: Create a small registration form. Intentionally flawed version: a clickable div used as the submit control without keyboard support; removed focus indicators; placeholder text used instead of persistent labels; error messages not programmatically associated with their fields. Corrected version: native form and button elements; explicitly associated persistent labels; clearly visible focus indicators; predictable DOM order; error text associated using suitable HTML and ARIA; appropriate invalid-state indication after validation fails.

SCENES: 1. Show the polished form as a static image. 2. Remove the pointer and begin a recorded keyboard-only test. 3. Show the missing focus indication and inaccessible custom control. 4. Introduce native controls and restore visible focus. 5. Add persistent labels with correct associations. 6. Submit invalid data and show meaningful error identification. 7. Correct the data and complete the same keyboard journey. 8. End: “A screenshot cannot show whether a form is operable.”

VISUAL MECHANIC: Use a keystroke overlay and a restrained focus spotlight. Show label/control and error/control relationships as connecting lines.

ACCURACY: Do not use positive tabindex values to rearrange focus order. Do not use placeholder text as the only label. Do not replace native semantics with unnecessary ARIA. Preserve entered values after errors. Manage focus deliberately; do not jump focus unpredictably. Keyboard testing does not establish overall accessibility compliance. Only report screen-reader behavior if tested with a named browser and screen-reader combination. If no screen reader is available, describe the implemented associations without claiming that announcements were verified. Label any animated accessibility-tree diagram as simplified.

SUPPLEMENT: Provide both versions and a manual keyboard test checklist.

---

## EP10 — “I Changed One DNS Record and Broke My Website”

CENTRAL IDEA: An incorrect authoritative A record can send new DNS lookups to the wrong IPv4 address, while different caches temporarily retain different answers.

SCOPE: Build a deterministic local simulation. Do not modify a real domain or contact external DNS infrastructure. Use: Domain example.test; intended address 192.0.2.10; incorrect address 192.0.2.20. Treat these as documentation addresses represented inside the simulator. Do not attempt to use them as reachable public servers.

SIMULATION MODEL: One authoritative A record. Two recursive resolver caches. Two clients assigned to different resolvers. A simplified connection stage after DNS resolution. No additional browser or operating-system DNS cache in this model. Clearly state these simplifications on screen or in the notes.

DETERMINISTIC SEQUENCE: 1. At t=0, resolver A caches the correct address with TTL 60 seconds. 2. At t=10, change the authoritative record to the incorrect address. 3. At t=15, resolver B has a cache miss and caches the incorrect address with TTL 60 seconds. 4. At t=20, client A still resolves the correct address; client B resolves the incorrect address and its simulated connection fails. 5. At t=30, restore the correct authoritative address. 6. Resolver B still holds the incorrect cached answer. 7. At t=60 or later, resolver A refreshes successfully on its next query. 8. At t=75 or later, resolver B’s bad entry expires and its next query retrieves the corrected answer. Make the simulator implement the sequence, rather than merely displaying predetermined countdowns disconnected from state.

SCENES: 1. A record edit is followed by a failed website connection for one client. 2. Separate DNS resolution from connection establishment. 3. Compare the authoritative answer and the two cached answers. 4. Restore the correct authoritative record. 5. Show why one cached wrong answer remains temporarily. 6. Advance time and trigger a fresh query after expiration. 7. Show recovery. 8. End: “Fixing the source does not erase every cached answer.”

ACCURACY: Do not call the wrong A-record answer a DNS-resolution failure: resolution succeeded, but returned an unintended destination. Lowering authoritative TTL does not retroactively shorten an answer already cached with an earlier TTL. TTL expiration permits a new lookup; it does not push an update to clients. Label this as a simplified model without serve-stale behavior, prefetch, browser caches, or operating-system caches. Distinguish record TTL from website-content cache lifetimes. Mention that real investigations must also consider AAAA records. Do not imply all DNS incidents recover within one fixed global interval.

SUPPLEMENT: Provide the simulator, state-transition tests, and a diagnostic checklist separating DNS resolution, connectivity, TLS, and HTTP.

---

## EP11 — “I Clicked ‘Reject All.’ What Did the Website Actually Do?”

CENTRAL IDEA: A consent banner’s appearance does not prove that the application follows the user’s choice. Demonstrate technical behavior in a controlled fixture, not a legal audit or an accusation against a real website.

FIXTURE: Build a local page containing: Accept optional, Reject optional, and Settings controls; a stored consent preference; a simulated optional analytics module; a local collector recording simulated analytics requests; a control for reopening settings and withdrawing consent. Define the fixture’s policy: no optional analytics requests before a choice; no optional analytics requests after rejection; optional analytics begins after acceptance; withdrawal stops new optional analytics emissions; a preference recording the user’s choice may remain stored. Create flawed and corrected versions.

FLAWED VERSION: The banner stores the choice, but the analytics module initializes and emits events independently.

CORRECTED VERSION: Analytics initialization respects consent. Every emission path checks the current policy. Withdrawal removes optional listeners and clears unsent optional events. Already-transmitted requests are not portrayed as recoverable. Rejection persists across reloads in the same browser context.

SCENES: 1. Click “Reject optional”; the flawed page still emits an analytics request. 2. Reveal consent UI, preference storage, analytics module, and collector. 3. Show the missing connection between preference and execution. 4. Implement consent-gated initialization and dispatch. 5. Test no choice, rejection, acceptance, withdrawal, and reload behavior. 6. Display actual collector logs. 7. End: “The button is a promise. The requests show the implementation.”

VISUAL MECHANIC: Use an explicit consent state machine controlling an event gate. Do not animate a toggle disconnected from actual behavior.

ACCURACY: Label analytics as simulated. Tracking can occur without cookies. First-party does not automatically mean necessary or exempt. Stopping future requests does not delete previously collected data. Do not claim to cancel requests that already reached the server. This is not a legal compliance certification. Contact no real analytics or advertising services.

SUPPLEMENT: Provide both implementations, consent-state tests, and collector logs.

---

## EP12 — “Your Website Updated. Why Am I Still Seeing the Old Version?”

CENTRAL IDEA: An existing page can remain controlled by an older service worker while an updated worker waits to activate.

FIXTURE: Build a same-origin application with: Build 1: blue interface labeled “Build 1”; Build 2: green interface labeled “Build 2”; versioned precache names; a stable service-worker script URL; an explicit update-available notification. Use localhost or another valid secure context. Use local, versioned assets without CDN dependencies.

UPDATE FLOW: 1. Install and activate Build 1’s worker. 2. Ensure the demonstration page is controlled by it. 3. Keep that page open. 4. Serve Build 2, including changed service-worker script content. 5. Trigger registration.update(). 6. Detect the installed worker waiting behind the existing active worker. 7. Display “Update available.” 8. On explicit user approval, message the waiting worker to call skipWaiting(). 9. Handle controllerchange with a guard that reloads the page only once. 10. Verify the reloaded page displays Build 2. Use clients.claim() only as part of a deliberate, documented activation strategy. Do not describe it as the command that deletes old caches.

SCENES: 1. Deployment completes, but the open tab still displays Build 1. 2. Reveal page, active worker, waiting worker, and Cache Storage. 3. Show the updated worker waiting rather than immediately replacing the existing page’s application code. 4. Display and accept the update notification. 5. Show activation, controller change, and one controlled reload. 6. Verify Build 2. 7. End: “Deployment and client activation are different events.”

ACCURACY: This is one controlled cause of stale content, not every cause. Keep HTTP cache separate from service-worker Cache Storage. Explicit user approval is this app’s update policy, not a browser requirement. An update affects the registration and can affect multiple open tabs. For this fixture, run the main demonstration with one controlled tab. Document multi-tab implications and unsaved-work risks. Do not delete assets still needed by older clients without a safe strategy. Do not fake lifecycle events or create a controllerchange reload loop.

SUPPLEMENT: Provide both builds, worker code, update controls, and reproduction tests.

---

## EP13 — “That API Key Is in Your JavaScript. Is That Always a Leak?”

CENTRAL IDEA: Classify a credential by what it authorizes, not by its name or prefix.

FIXTURE: Build a fictional local service with: PUBLIC_PROJECT_ID, a public identifier granting no privileged access; SERVER_SECRET_TOKEN, a synthetic bearer credential authorizing one privileged operation. Build: a browser application; an application backend; a mock upstream service; server-side user authentication and authorization. Use synthetic credentials only. Do not reproduce or test a real vendor’s credentials.

FLAWED VERSION: Embed the synthetic secret in the browser bundle. Use a local test harness to demonstrate that possession of it authorizes the mock privileged operation.

CORRECTED VERSION: Remove the secret from all browser-delivered assets. Keep it in backend-only configuration. Authenticate and authorize the user on the backend. Validate the requested operation. Invoke the upstream service without returning its secret to the browser.

SCENES: 1. Inspect a bundle and discover two credential-like values. 2. Ask what each value can actually do. 3. Show the public identifier failing to authorize a privileged operation. 4. Show the synthetic secret succeeding. 5. Move privileged access behind the backend. 6. Reject an unauthorized user request. 7. Allow an authorized request without exposing the upstream secret. 8. Inspect the corrected browser artifacts. 9. End: “A public identifier names something. A secret grants capability.”

ACCURACY: A value is not safe merely because it is named PUBLIC. Some browser-exposed vendor keys intentionally grant limited capabilities; this fictional fixture does not establish another provider’s policy. CORS is not authentication or authorization. Moving a secret to a backend does not make an unrestricted proxy safe. Inspect JavaScript, HTML, configuration payloads, and source maps if produced. Do not claim absence from tested assets proves every possible leak is closed. Removing a leaked production secret would not revoke existing copies; revocation or rotation would be a separate required response.

SUPPLEMENT: Provide both architectures, capability tests, and an artifact-inspection script.

---

## EP14 — “100% Uploaded. Why Isn’t My File Ready?”

CENTRAL IDEA: Request-body transfer, server acceptance, processing, and availability are separate stages.

FIXTURE: Build a local uploader for a small synthetic CSV file. Flow: 1. Browser sends the multipart request body. 2. Server validates size and permitted input format. 3. Server stores the file and creates a job record. 4. Server responds with an accepted status and job ID. 5. A worker parses and validates the CSV. 6. Browser polls an authorized job-status endpoint. 7. The job becomes ready or failed. Use generated filenames. Keep uploads outside publicly served directories. Do not trust the client-provided filename or MIME type alone. Use durable local storage and job records if claiming restart persistence. Otherwise state that the fixture does not survive process restarts.

SCENES: 1. Upload reaches 100%, but processing is still pending. 2. Reveal transfer, acceptance, processing, and availability separately. 3. Show browser upload progress events. 4. Show the later HTTP response containing the job ID. 5. Follow the job into ready. 6. Repeat with a fully transferred file that fails validation. 7. Replace the misleading single bar with stage-specific status. 8. End: “Bytes transferred is not the same as work completed.”

VISUAL MECHANIC: Move the file through distinct checkpoints. Only ready status enables result access.

ACCURACY: Use XMLHttpRequest upload events if real browser upload progress is needed. Calculate percentages only when lengthComputable is true. Otherwise show indeterminate transfer progress. Upload progress concerns the request body, which may include multipart overhead; do not label it an exact stored-file byte count. Upload completion does not establish a successful HTTP status. Check the HTTP response separately. An accepted response does not mean processing succeeded. Do not invent percentage progress for unmeasurable processing. Parsing is not malware scanning. Use controlled pacing only when labeled; do not fabricate observed timings.

SUPPLEMENT: Provide success, HTTP-rejection, processing-failure, and status-access tests.

---

## EP15 — “You Clicked Pay Once. Why Did the App Create Two Orders?”

CENTRAL IDEA: A lost response can leave the client uncertain even after the server commits an operation. Retrying can duplicate the operation. Use a local mock order service. Do not process payments or contact a payment provider.

FIXTURE: Build: a vulnerable endpoint that creates an order on every POST; a corrected endpoint supporting idempotency keys; a transactional local database; a controlled fault that suppresses the response after the commit.

CORRECTED DESIGN: Generate one key per logical checkout attempt. Reuse that key for retries of that same attempt. Scope it to the authenticated user and operation. Normalize validated request fields and derive a request fingerprint. Enforce uniqueness atomically in the database. Store the created order and successful result in the same transaction as the idempotency record. Return the stored result for the same key and matching request. Reject the same key with materially different request data. Document the policy for concurrent in-flight requests. For this fixture, retain idempotency records for the test database lifetime. Do not imply that retention is indefinite in a production service.

SCENES: 1. One checkout intention produces two mock orders. 2. The server commits the first order. 3. The response is deliberately lost after commit. 4. The client retries. 5. The vulnerable endpoint creates a second order. 6. Add atomic idempotency handling. 7. Repeat the lost-response test. 8. Show two request attempts but one committed order. 9. End: “A new request is not always a new intention.”

ACCURACY: Do not claim exactly-once network delivery. Disabling a button is not sufficient. Avoid non-atomic check-then-insert logic. Do not trust a client-supplied user ID as identity. A local database transaction does not automatically cover external payment-provider side effects. Different logical purchases require different keys. Expiring an idempotency record can allow a sufficiently late retry to be treated as new; state this limitation.

SUPPLEMENT: Provide lost-response, mismatched-payload, and concurrent-request tests.

---

## EP16 — “Your App Isn’t Broken. It’s Being Rate-Limited.”

CENTRAL IDEA: A client can exceed an API’s request budget. Improve request coordination instead of retrying immediately.

FIXTURE: Build a same-origin local search API with: a fixed-window limit of five allowed requests per ten seconds; a server-established synthetic test identity; 429 responses after the allowance is exhausted; Retry-After as an integer number of seconds until the next window. Use a controllable clock for deterministic limiter tests. Define whether rejected requests are counted; for this fixture, they do not consume additional allowance. Build: flawed client (sends on every keystroke and immediately retries); corrected client (debounces, handles stale results, respects Retry-After, and bounds retries).

SCENES: 1. Typing creates a burst and triggers a 429. 2. Reveal the fixed-window allowance. 3. Show immediate retries receiving further rejections. 4. Debounce the same scripted typing sequence. 5. Ignore obsolete responses using a request sequence or equivalent guard. 6. Abort obsolete browser requests where supported. 7. Respect Retry-After before at most one retry of the still-current search. 8. Compare actual request logs. 9. End: “Coordinate the work. Don’t just repeat it faster.”

ACCURACY: Fixed-window accounting is this fixture’s design, not every API’s. Retry-After is not guaranteed on every real 429 response. The header can use delay seconds or an HTTP date; implement the format declared for this fixture. Round the delay up so the client does not retry before the reset. A browser abort does not prove server processing stopped. Cancel scheduled retries when the query changes. Debouncing does not replace server-side rate limiting. Do not automatically reuse this retry policy for state-changing requests. Keep the flawed immediate-retry loop bounded to avoid runaway tests. Do not describe the shared test identity as production authentication.

SUPPLEMENT: Provide limiter boundary tests, scripted typing tests, and request logs.

---

## EP17 — “Your Dashboard Says ‘Live.’ Its Data Is Ten Minutes Old.”

CENTRAL IDEA: A newly received response can contain an old measurement.

FIXTURE: Build a local synthetic pipeline: source produces timestamped readings; collector samples the source every ten simulated minutes; API returns the latest collected reading; dashboard polls every thirty simulated seconds. Use one controlled clock shared by the fixture. Label compressed time throughout the video. Include: sourceObservedAt, collectedAt, servedAt, value. Create: a healthy collection scenario; a collector-failure scenario; an API-response failure scenario.

SCENES: 1. The dashboard says Live while its measurement is ten minutes old. 2. Separate source, collector, API, and browser timelines. 3. Show successful browser polling without a new collected reading. 4. Compare response freshness with measurement freshness. 5. Replace Live with explicit measurement age and connection status. 6. Advance the controlled clock without changing the source value. 7. Show the age increasing between polls. 8. Simulate collector failure and then API failure. 9. End: “Freshly fetched does not mean freshly observed.”

VISUAL MECHANIC: Give the measurement and each transfer stage separate timestamps. Do not reset the measurement-age clock when an HTTP response arrives.

STATE RULES: Measurement age uses sourceObservedAt. Connection status reflects recent API communication. A successful poll can coexist with stale source data. A failed poll retains the last known value with an explicit warning. Missing or invalid timestamps produce an unknown state.

ACCURACY: Define the stale threshold as this fixture’s product policy. Do not imply that ten-minute-old data is unacceptable for every use case. Do not display negative ages; flag impossible future timestamps. Cross-system clock precision is simplified by the shared test clock. Polling faster does not make the collector sample faster. WebSockets do not fix stale upstream measurements by themselves. Do not fabricate a current reading after failure.

SUPPLEMENT: Provide the pipeline, state rules, and clock-controlled freshness tests.

---

## EP18 — “Your Webhook Arrived Twice. Then an Older Update Arrived.”

CENTRAL IDEA: A webhook receiver should not assume unique delivery or arrival order matching resource-update order.

FIXTURE: Build a fictional local subscription provider and receiver. Each event contains: unique event ID; subscription ID; event type; full subscription-state snapshot; monotonically increasing version for that subscription; event timestamp. The full-snapshot and version guarantees belong to this fictional provider. Do not claim real providers universally offer them.

SIGNING: Use a synthetic server-side HMAC secret. Include a delivery timestamp. Sign a documented concatenation of the timestamp and exact body bytes. Verify the signature using a maintained cryptographic library. Enforce a defined delivery-timestamp tolerance. Use a fresh delivery timestamp/signature for each legitimate retry.

PROCESSING: Verify signature and timestamp before trusting the payload. Parse and validate the verified payload. Deduplicate by provider and event ID using a database uniqueness constraint. Apply resource-state updates only when the incoming version is newer. Record event handling and update state within one database transaction. Return success only after the transaction commits. Return success for a verified duplicate already handled. Return an appropriate failure when acceptance or processing cannot commit.

SCENES: 1. An active subscription incorrectly regresses after an older event arrives. 2. Separate event creation order from delivery order. 3. Verify signature and timestamp. 4. Show duplicate-event rejection by event ID. 5. Show older-version rejection by resource version. 6. Replay the same deliveries. 7. Confirm the latest valid resource state remains. 8. End: “Delivery order is not business order.”

ACCURACY: Raw-body signature verification must precede JSON reserialization. A valid signature alone does not establish freshness. Timestamp tolerance does not replace event-ID deduplication. Version-based skipping is safe here because events contain full snapshots. Do not apply this strategy blindly to incremental events where every intermediate operation may matter. Do not claim timestamps alone provide reliable event ordering. This fixture performs no external side effects. Document that external side effects require additional coordination.

SUPPLEMENT: Provide signature, tampering, expired-delivery, duplicate, concurrent, and out-of-order tests.

---

## EP19 — “The Browser Shows Your Page. What Does the Server Send?”

CENTRAL IDEA: Two pages can look identical after JavaScript runs while their initial HTTP responses contain different amounts of meaningful content.

FIXTURE: Build two versions of one synthetic article: client-rendered (initial HTML contains an application shell, and JavaScript inserts the article); statically generated (initial HTML contains the article). Use static generation for this fixture to avoid unnecessary server and hydration complexity. Keep equivalent: article text; heading structure; ordinary anchor links with href attributes; title and description metadata; HTTP success status for valid article routes; deliberate 404 behavior for missing routes. Serve valid page shells directly. Do not use a development server’s automatic fallback to hide route errors.

INSPECTION: Capture: raw response HTML; browser DOM after JavaScript runs; browser result with JavaScript disabled in a clean context.

SCENES: 1. Both pages look identical after loading. 2. Compare raw response HTML. 3. Show JavaScript populating the client-rendered article. 4. Disable JavaScript and compare again. 5. Show article content already present in the generated page response. 6. Separate crawling, rendering, indexing, and ranking. 7. End: “Initial HTML and the eventual DOM are different artifacts.”

ACCURACY: Google can execute JavaScript. A disabled-JavaScript browser is not a Googlebot simulator. A plain HTTP fetch is not a complete search-engine rendering test. Static generation does not guarantee indexing or rankings. Do not invent rendering delays or indexing timelines. Do not fabricate Search Console results. Do not claim server-rendered pages never enter a rendering stage. Hydration is not required for a static page without client interactivity. Do not claim this test establishes how every crawler handles the page. Keep robots and indexing configuration intentional and documented.

SUPPLEMENT: Provide both implementations, saved initial HTML, rendered-DOM captures, and route/status tests.

---

## EP20 — “HTTPS Encrypts Your Request. What Can the Network Still See?”

CENTRAL IDEA: Separate encrypted HTTP content from observable connection metadata.

SCOPE: Use a clearly labeled conceptual illustration with: HTTPS over TLS 1.3; TCP, not HTTP/3; a conventional DNS query over an unencrypted transport; no VPN or proxy; no Encrypted Client Hello; no TLS session resumption or 0-RTT; a trusted browser and TLS-terminating server; a passive observer positioned to see the illustrated network traffic. Do not present these assumptions as every modern browser connection.

EXAMPLE: The browser navigates to https://example.test/account?tab=billing#history. Explain that: the hostname is used for resolution and connection setup; the HTTP request includes the path and query; the fragment is not included in the HTTP request target; page JavaScript could separately read and transmit a fragment, but that is outside the illustrated request.

SCENES: 1. Show the navigation and place an observer on the network path. 2. Reveal the unencrypted DNS question containing example.test. 3. Show destination IP, port, connection timing, and traffic volume. 4. Show the TLS ClientHello exposing SNI in this no-ECH scenario. 5. Mark the ServerHello transition into encrypted handshake messages. 6. Keep the TLS 1.3 server certificate inside the encrypted handshake. 7. Put HTTP method, path, query, headers, cookies, and body inside encrypted application data. 8. Show the browser and TLS endpoint accessing plaintext at their ends. 9. End: “Encrypted content can still travel with visible metadata.”

VISUAL MECHANIC: Use three views: browser; passive network observer; TLS-terminating endpoint. Show visibility separately for content, names, addresses, and timing.

ACCURACY: Do not depict the observer reading encrypted HTTP content. Do not depict the TLS 1.3 server certificate as plaintext on the wire. Without ECH, SNI can reveal the requested hostname. DNS visibility depends on transport and observer position. Destination IP visibility does not necessarily identify one unique website. Record lengths and traffic timing remain observable, but do not reveal exact application content by themselves. ECH protects the inner ClientHello; it does not hide all metadata. Encrypted DNS does not hide destination IP addresses. If a CDN terminates TLS, it is an endpoint for that connection; any onward connection is separate. HTTPS does not prevent phishing, compromised endpoints, or server logging. Do not fabricate packet captures or imply actual TLS traffic was recorded.

SUPPLEMENT: Provide the visibility matrix, scope notes, and scene-by-scene technical accuracy checklist.

---

## EP21 — (reserved: combined series cut / index)

Not a brief. The orchestrator may produce a series index page instead.
