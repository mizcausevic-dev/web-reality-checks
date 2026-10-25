
## Episodes 21-30 (batch 2)

EPISODE BRIEF:
21. Why deleting a record does not delete every copy
text
TITLE
“I Deleted the Record. Why Is It Still Showing Up?”

CENTRAL IDEA
Deleting a primary record does not automatically remove derived copies
from a search index, application cache, or already-open browser.

FIXTURE
Build a local synthetic contact directory with:
- A primary contact table.
- A separate search-index table containing denormalized contact fields.
- A deliberately implemented application response cache.
- A browser displaying previously fetched search results.
- An outbox table and a cleanup worker.

Use fictional contacts and non-reused contact IDs.

FLAWED VERSION
Delete only the primary contact row.
Show the search index and cached search response still returning the contact.

CORRECTED VERSION
- Delete the primary row and insert a deletion event into the outbox within
  one database transaction.
- Process the event using a local cleanup worker.
- Remove the corresponding search-index entry.
- Invalidate cached directory responses.
- Mark the event processed only after all required cleanup steps succeed.
- Retry a deliberately failed cleanup step.
- Make cleanup idempotent so replaying the event is safe.

For this small fixture, invalidate the entire directory-response cache
rather than pretending a complex dependency-invalidation system exists.

SCENES
1. Delete a contact; search still returns it.
2. Reveal the primary record and its derived representations.
3. Show the flawed deletion stopping after the primary database operation.
4. Add the transactional outbox and cleanup worker.
5. Fail cache invalidation once after search-index removal.
6. Leave the event pending and retry.
7. Verify both backend representations are clean.
8. Refresh the browser and show the stale display disappearing.
9. End: “Deletion is a workflow when data has more than one home.”

VISUAL MECHANIC
Use one stable contact ID across all layers.
Remove each representation only when its cleanup actually completes.

ACCURACY
- The outbox records cleanup intent; it does not make all destinations
  update atomically.
- A stale browser display can remain after backend cleanup.
- If retries are exhausted, show an explicit failed-cleanup state and alert;
  do not silently mark the event complete.
- A directory cache may expose stale data until invalidation succeeds.
- This is not a comprehensive privacy-erasure implementation.
- Backups, logs, exports, and third-party copies are outside the fixture.
- Do not claim deletion retrieves previously downloaded information.
- Do not reuse deleted IDs during the demonstration.

SUPPLEMENT
Provide deletion, partial-failure, replay, retry, and stale-browser tests.
22. The invisible bug in your dates
text
TITLE
“Your Deadline Moved Back a Day. Nobody Edited It.”

CENTRAL IDEA
A calendar date and a timestamp represent different information.
An unnecessary conversion can change the displayed calendar date.

FIXTURE
Build a small task interface with:
- Date-only deadline: "2026-01-15".
- Scheduled-event instant: "2026-01-15T15:00:00Z".
- Explicit display zones: UTC, America/New_York, and Asia/Tokyo.

Do not depend on the machine’s default time zone.

FLAWED DATE-ONLY PATH
Parse the deadline using:
new Date("2026-01-15")

Format that Date with Intl.DateTimeFormat using each explicit display zone.
Verify that the New York display shows the previous calendar date.

CORRECTED DATE-ONLY PATH
Keep the deadline as a validated calendar-date value.
Render its year, month, and day without converting it to an instant.

For this fixture, displaying the validated YYYY-MM-DD string is sufficient.
If using a plain-date library, verify its installed API and do not assume
Temporal is available natively.

SCHEDULED EVENT
Parse the explicitly UTC timestamp and display that same instant in each
selected time zone.

SCENES
1. Two views show different dates for the same deadline.
2. Reveal the original date-only string.
3. Show JavaScript interpreting the standard date-only input as UTC midnight.
4. Convert that instant to New York and reveal the previous date.
5. Separate calendar deadlines from scheduled instants.
6. Render the deadline without instant conversion.
7. Show the scheduled event correctly changing local clock time by zone.
8. End: “A date is not always a moment.”

VISUAL MECHANIC
Use calendar tiles for date-only values and points on a global timeline
for instants.

ACCURACY
- Validate calendar dates, not merely their string shape.
- Do not claim all date-string formats parse the same way.
- Use named IANA time zones.
- A fixed UTC offset is not a complete substitute for a time zone.
- Future recurring local schedules may require local-time and zone rules.
- Keep daylight-saving ambiguity outside the main demonstration.
- Do not “fix” a date-only field by arbitrarily adding twelve hours.

SUPPLEMENT
Provide explicit expected outputs and cross-zone regression tests.
23. Why two tabs overwrite each other
text
TITLE
“Two Tabs. One Document. Where Did My Changes Go?”

CENTRAL IDEA
Two editors can load the same version and silently overwrite each other
if the server accepts unconditional updates.

FIXTURE
Build a local document editor with:
- Two independent browser contexts or client instances.
- A document containing content and an integer version.
- A flawed unconditional update endpoint.
- A corrected optimistic-concurrency endpoint.

Initialize the document at version 1.

DETERMINISTIC FAILURE
- Both clients load version 1.
- Client A changes the title and saves.
- Client B changes a different part of its stale local copy and saves the
  entire document.
- The flawed endpoint replaces A’s accepted change.

CORRECTED UPDATE
Send expectedVersion with the edited content.

Execute one atomic conditional update:
- Match document ID and current version.
- Replace content.
- Increment version.

If the update succeeds, return the new version.
If no row matches, return 409 for this fixture.

On conflict:
- Preserve unsaved text.
- Offer the current server version for comparison.
- Require explicit resolution.
- Do not automatically retry by overwriting the new version.

SCENES
1. A’s saved change disappears after B saves.
2. Rewind to both clients loading version 1.
3. Show their local copies diverging.
4. Reveal the unconditional update.
5. Add the atomic version condition.
6. Repeat: A succeeds; B receives a conflict.
7. Show both versions without inventing an automatic merge.
8. End: “Before saving, check what you are replacing.”

ACCURACY
- Do not implement the check as a separate unprotected read and write.
- Distinguish version conflicts from database connection or lock failures.
- Do not report every database error as 409.
- This detects conflicts; it is not collaborative real-time editing.
- Do not call it a CRDT or operational transformation.
- Keep document IDs and user authorization checked separately.
- Do not discard unsaved edits on conflict.

SUPPLEMENT
Provide stale-version and coordinated concurrent-save tests.
Assert that only one update using the same expected version is accepted.
24. Why a private page leaks through a cache
text
TITLE
“Why Did This Dashboard Show Someone Else’s Name?”

CENTRAL IDEA
A custom shared cache can leak personalized content when its key ignores
the identity that changes the response.

FIXTURE
Build a loopback-only dashboard with:
- Synthetic user Alice.
- Synthetic user Bob.
- Server-controlled sessions.
- A custom in-process response cache.
- Isolated browser contexts for each user.

FLAWED VERSION
Authenticate the request, then look up a cached personalized response using
only the path "/dashboard".

Alice’s request populates the entry.
Bob’s authenticated request incorrectly receives Alice’s cached response.

CORRECTED VERSION
- Remove this personalized page from the shared application-cache path.
- Authenticate and authorize every dashboard request.
- Render the response for the current user.
- Send Cache-Control: private, no-store for this fixture.
- Explicitly purge the old custom-cache entry.

SCENES
1. Alice loads her greeting.
2. Bob loads the page and sees Alice’s name.
3. Reveal the path-only cache key.
4. Show that correct authentication did not make the cached payload correct.
5. Remove the unsafe shared-cache path and purge its entry.
6. Repeat requests using independent sessions.
7. Verify each user receives only their own response.
8. End: “A cache key defines which requests you treat as equivalent.”

VISUAL MECHANIC
Show two identity badges mapping to one incorrectly shared slot.
After repair, personalized responses bypass that shared slot.

ACCURACY
- This is a deliberately flawed application cache, not a real CDN incident.
- Do not imply all CDNs cache authenticated responses by default.
- Cache-Control does not repair custom server code that ignores it.
- New headers cannot retract responses already delivered.
- Do not present Vary: Cookie as a universal solution.
- Identity-aware caching would require separate authorization, partitioning,
  invalidation, and data-classification decisions.
- Do not claim no-store removes every historical browser artifact.
- Use synthetic personal information only.

SUPPLEMENT
Provide cross-user isolation tests, cache-purge assertions, and response-header tests.
25. Why backups need restore tests
text
TITLE
“Your Backup Says ‘Successful.’ Can You Actually Restore It?”

CENTRAL IDEA
Creating a backup artifact and recovering usable application data are
different outcomes.

FIXTURE
Build a local SQLite application with:
- Customers.
- Orders linked to customers.
- A fixed seed dataset.
- A known schema version.
- An application query displaying customer order totals.

Enable foreign-key enforcement on application connections.

BACKUP
Use SQLite’s supported Online Backup API through an installed binding,
such as Python sqlite3.Connection.backup().

Keep the seed dataset quiescent while creating this demonstration backup
so expected snapshot contents are unambiguous.

Do not copy only the main file of a live WAL-mode database.

RESTORE
- Restore or open the backup in a new isolated database path.
- Never overwrite the source database.
- Keep the source application separate from validation.

VALIDATION
Run:
- PRAGMA integrity_check; expect "ok".
- PRAGMA foreign_key_check; expect no rows.
- Expected schema-version checks.
- Expected table and record-count checks.
- Selected known-value checks.
- The application’s actual order-total query.

SCENES
1. A backup operation reports success.
2. Ask what that establishes.
3. Restore into an isolated location.
4. Run structural and foreign-key checks separately.
5. Verify known data and the application query.
6. Show a deliberately invalid backup artifact failing validation.
7. End: “The restore is the test.”

ACCURACY
- integrity_check does not replace foreign_key_check.
- Record counts alone do not establish complete recovery.
- Use an unmistakably invalid fixture if demonstrating corruption; do not
  assume an arbitrary truncation will produce one specific SQLite error.
- Handle validation failure without crashing the entire video build.
- Report restore duration only if measured.
- Do not invent recovery-time or recovery-point guarantees.
- External files, object storage, secrets, and infrastructure are outside scope.
- The restored copy contains the backup’s data, not later source writes.

SUPPLEMENT
Provide backup/restore commands, validation code, and a test report.
26. Why one page makes 101 database queries
text
TITLE
“One Page. 101 Database Queries. Here’s Why.”

CENTRAL IDEA
One HTTP request can trigger one list query plus one related-record query
for every item.

FIXTURE
Build a local article directory with:
- Exactly 100 articles.
- A non-null author ID on every article.
- Valid author records.
- A SQL-query counter scoped to the article-list operation.
- A flawed endpoint and a corrected endpoint.

Keep setup, authentication, transaction-control, and instrumentation queries
outside the demonstrated SELECT count.

FLAWED VERSION
1. Fetch all 100 articles in one SELECT.
2. Fetch each article’s author with one SELECT inside the loop.
3. Disable or avoid ORM identity caching and batching.

Verify the operation executes exactly 101 SELECT statements.

CORRECTED VERSION
Use one explicit joined SELECT returning the same article and author fields.
Preserve deterministic article ordering.

SCENES
1. One HTTP request expands into 101 database SELECTs.
2. Separate the initial list query from the 100 author lookups.
3. Show repeated author lookups where articles share an author.
4. Replace the loop with the joined query.
5. Render equivalent results.
6. Compare actual SELECT counts: 101 versus 1.
7. End: “The interface made one request. The backend multiplied the work.”

VISUAL MECHANIC
Expand one request into a branching query tree.
Collapse the tree after the correction.

ACCURACY
- Derive counts from instrumentation, not hardcoded narration alone.
- Do not call all database activity 101 queries if additional statements ran.
- Do not infer a latency improvement solely from query count.
- Fewer queries do not universally mean better performance.
- Preserve the same result shape and ordering.
- Keep valid author relationships enforced in the seed data.
- Do not introduce untested indexing, pagination, or throughput claims.
- This is one N+1 pattern, not every possible form.

SUPPLEMENT
Provide seed data, scoped SQL logs, and result-equivalence tests.
27. Why search results jump backward
text
TITLE
“You Typed ‘React.’ Why Did Results for ‘Re’ Come Back?”

CENTRAL IDEA
Responses can arrive out of order. An older response can overwrite newer
search state unless the client checks which request is current.

FIXTURE
Build a local search interface with a controllable mock API.

Use two explicit requests:
- "re": delayed longer.
- "react": delayed less.

Coordinate request creation and response release deterministically.
Do not rely on unpredictable machine timing.

Each response contains its original query and request ID.

FLAWED VERSION
Render every arriving result.

CORRECTED VERSION
- Increment a request-generation counter for each new search.
- Capture the counter value when starting the request.
- Update results, errors, and loading state only if that generation is
  still current.
- Invalidate pending generations when the query is cleared or the component
  is disposed.
- Optionally abort superseded requests.

SCENES
1. Results for react appear, then results for re overwrite them.
2. Separate request order from response order.
3. Reveal the late response from the earlier request.
4. Add the latest-generation guard.
5. Repeat the exact response schedule.
6. Discard the obsolete result.
7. Demonstrate that an obsolete failure also cannot replace current state.
8. End: “The last response is not always the latest answer.”

ACCURACY
- Apply the guard in success, error, and finally paths.
- An older finally block must not clear the current loading state.
- Do not show aborted obsolete requests as current user-facing errors.
- Abort is an optimization, not the only correctness mechanism.
- Aborting a browser request does not prove server execution stopped.
- Debouncing alone does not guarantee response order.
- Do not rely on server request IDs being globally ordered.
- This is local UI concurrency control, not a general distributed-ordering solution.

SUPPLEMENT
Provide deterministic tests for stale success, stale failure, loading state,
query clearing, and disposal.
28. Why hiding an admin button is not security
text
TITLE
“I Hid the Admin Button. The Admin Action Still Worked.”

CENTRAL IDEA
Client-side visibility is an interface decision.
Privileged actions require server-side permission checks.

FIXTURE
Build a local application with:
- One synthetic administrator.
- One synthetic regular member.
- Server-controlled sessions.
- A harmless privileged action: publishing a synthetic announcement.
- A server-side role or permission store.

Hide the publish button from the member in both versions.

FLAWED ENDPOINT
Accept any authenticated user without checking publish permission.

CORRECTED ENDPOINT
- Authenticate the session.
- Resolve current permission from trusted server-side state.
- Check permission before any side effect.
- Reject a member with 403.
- Permit the administrator.
- Use the framework’s CSRF protection for cookie-authenticated state changes.

SCENES
1. The member sees no publish button.
2. A controlled test sends the publish request using the member’s valid session
   and any required CSRF token.
3. The flawed endpoint publishes the announcement.
4. Separate UI visibility from server authorization.
5. Add the permission check.
6. Repeat the same member request; receive 403.
7. Verify no announcement was created.
8. Send an authorized administrator request; verify success.
9. End: “The browser can hide the action. Only the server can deny it.”

ACCURACY
- Keep the fixture loopback-only.
- Do not accept a browser-submitted role as authority.
- Do not let a CSRF failure masquerade as proof that authorization works.
- Test authorization with a valid session and valid CSRF context.
- Distinguish authentication, CSRF protection, and authorization.
- Verify database state after rejected requests.
- Use 401 or the framework’s documented unauthenticated behavior consistently.
- This demonstrates function-level permission checks, not object ownership.

SUPPLEMENT
Provide member, administrator, unauthenticated, CSRF, and no-side-effect tests.
29. Why the browser cannot set the order price
text
TITLE
“The Browser Said $10. What Price Did the Server Trust?”

CENTRAL IDEA
The browser can display a price, but the server must determine the
authoritative price used to create an order.

FIXTURE
Build a local mock checkout with:
- A server-side product catalog.
- Prices stored as integer cents.
- One currency.
- Bounded positive integer quantities.
- Synthetic orders.
- No payment provider or real charges.

Exclude taxes, discounts, shipping, and inventory reservation explicitly.

FLAWED VERSION
Trust a client-submitted unit price when calculating the mock order.

CORRECTED VERSION
Accept:
- Product ID.
- Quantity.
- Expected displayed unit price used only for change detection.

Look up the authoritative catalog price on the server.

If the expected displayed price differs from the catalog:
- Return a price-changed response with the current quote.
- Create no order.
- Require explicit confirmation before a new order attempt.

If prices match:
- Calculate the total from the server price.
- Store an order-line price snapshot.

For this fixture, perform the catalog read and order creation within a
short transaction that prevents the demonstrated price-change race.

SCENES
1. Modify the submitted price while the page still displays $10.
2. The flawed endpoint creates an incorrectly priced mock order.
3. Reveal the trusted client field.
4. Move price authority to the catalog lookup.
5. Repeat the altered-price request; no underpriced order is created.
6. Change the catalog price after the page loads.
7. Show the updated quote and explicit confirmation.
8. End: “The client requests the purchase. The server determines the price.”

ACCURACY
- Treat expected price as a comparison value, never the pricing authority.
- Reject malformed, negative, fractional, zero, or excessive quantities.
- Reject unknown or unavailable products.
- Check arithmetic remains within the implementation’s safe integer range.
- Do not use floating-point currency calculations.
- Keep the transaction strategy specific to the selected database.
- Do not silently claim a price lock without implementing one.
- No real payments occur.

SUPPLEMENT
Provide price-tampering, quantity, unknown-product, changed-price,
and transaction-consistency tests.
30. Why a scheduled job runs twice
text
TITLE
“Your Scheduled Job Ran Twice. Was the Scheduler Wrong?”

CENTRAL IDEA
Two invocations can target the same logical job.
The application must coordinate which result is committed.

FIXTURE
Use SQLite with:
- Two independent worker processes.
- Separate database connections.
- One shared database.
- A logical-run identity: report type plus scheduled UTC instant.
- Synthetic source rows.
- Reports stored entirely inside the same database.

No emails, external files, or third-party actions.

FLAWED VERSION
Use a report table without a uniqueness constraint on the logical run.

Coordinate the race:
1. Both workers check for an existing report in autocommit mode.
2. Both observe that it is absent.
3. A test barrier releases both workers.
4. Each separately inserts and commits a report.

Handle short write contention so the second insert can complete.
Verify two report rows for one logical run.

CORRECTED VERSION
Use a UNIQUE constraint on report type and scheduled instant.

Each worker:
1. Starts a short write transaction using a deliberate SQLite transaction mode.
2. Attempts to insert the logical report row with conflict handling targeted
   specifically to the logical-run constraint.
3. If the run already exists, verifies that committed report and exits.
4. If the insertion succeeds, calculates the small database-local report.
5. Stores the complete result and commits.

Do not commit an incomplete placeholder report.

Configure a bounded busy timeout or retry policy.
Treat exhausted lock contention as a retryable database failure—not as
proof that another worker completed the job.

SCENES
1. One scheduled instant produces two reports.
2. Reveal both workers passing separate existence checks.
3. Add the unique logical-run key and atomic transaction.
4. Run both workers again.
5. Show one committed report and the other worker detecting that result.
6. Fail a worker after insertion but before commit.
7. Show rollback and a successful retry.
8. End: “Scheduling starts work. Coordination decides what commits.”

ACCURACY
- Do not claim exactly-once execution.
- The demonstrated guarantee is one committed database report per logical run.
- A unique constraint does not perform retries by itself.
- An in-process Boolean cannot coordinate independent processes.
- Do not report every constraint violation as “already completed.”
- Keep report generation short and entirely database-local.
- Do not hold the transaction around slow external work.
- External effects require additional coordination beyond this fixture.
- Define scheduled instants in UTC so the logical-run key is unambiguous.

SUPPLEMENT
Provide coordinated-race, concurrent-corrected, pre-commit-failure,
lock-contention, rollback, and retry tests.