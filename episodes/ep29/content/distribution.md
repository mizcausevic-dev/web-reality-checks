# EP29 distribution kit: The Browser Said $10. What Price Did the Server Trust?

All numbers and outcomes below come from the local synthetic fixture in `fixtures/ep29-server-side-price/` (evidence.json, test.mjs, README.md).

## YouTube

### Title options (≤ 60 chars), ranked

1. `The Browser Said $10. What Price Did the Server Trust?` (54) : the series title; poses the exact question the episode answers.
2. `Never Trust the Price in the Request` (36) : states the rule in the title, so search intent around client-side price tampering lands here.
3. `The Page Said $10.00. The Order Said $2.00.` (43) : concrete before and after from the fixture; the gap is the hook.
4. `One Edited Field Made a $20 Order Cost $2` (41) : short and specific; centers how little the attacker needed.
5. `Who Sets the Price: Your Page or Your Server?` (45) : framed as a design decision, aimed at founders and tech leads.
6. `Why a Checkout Demo Can't Catch Price Tampering` (47) : for buyers and PMs; the demo blind spot is the surprising part.

### Description

The page showed $10.00. The order was stored at $2.00. One edited field in the request is all it took, and the checkout answered 201 Created.

In this episode we build a mock checkout on a laptop, with synthetic data and no payment provider. The page displays $10.00. Before the request leaves the browser, we change the unit price to 100 cents. The flawed endpoint trusts it and stores two mugs at $2.00 total; the correct total was $20.00. The trusted field is unitPriceCents, read straight from the request body.

Then we move authority to the server's catalog. The request carries a product, a quantity and the price shown, used only to detect change. Inside one BEGIN IMMEDIATE transaction in SQLite, the server reads the catalog price and stores a snapshot on the order line. The altered request now returns 409 price_changed with the current quote of $10.00, and the orders table holds zero rows. Zero, negative, fractional and oversized quantities, and unknown products, are refused too.

Then a legitimate change: the catalog moves to $12.00 after page load. The same request returns 409 with a $24.00 quote for two and still creates no order. Only an explicit confirmation of 1200 cents creates one, with a $12.00 snapshot. The suite runs 37 tests, 37 pass, including two known-positive controls.

What this does not fix: this is not a price lock. Taxes, discounts, shipping, inventory and payment are not modeled.

Chapters
00:00 The page says $10, the request says $1
00:08 Flawed endpoint: 201 Created at $2.00
00:19 The trusted field: unitPriceCents
00:31 The repair: catalog authority in one transaction
00:46 Retest: 409 price_changed, 0 orders
00:59 A legitimate change: 409 with the $24.00 quote
01:11 Confirmation: snapshot at $12.00
01:26 What is not modeled

Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks
Articles (technical, business, general reader): episodes/ep29/content/ in the repo.

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Miz Causevic, Kinetic Gain LLC

### Tags (20)

server-side validation, price tampering, parameter tampering, never trust the client, checkout security, ecommerce security, web security, node.js, sqlite, BEGIN IMMEDIATE, database transaction, order price snapshot, 409 conflict, http status codes, api design, input validation, known-positive control, regression test, web development, web reality checks

### Pinned comment (≤ 300 chars)

Everything here runs on a deliberately built local fixture with synthetic data and no payment provider. The flawed checkout was written by hand to show the mechanism; it is not a finding about any real shop. Fixture, 37 tests and video source: github.com/mizcausevic-dev/web-reality-checks

## LinkedIn

### Post 1: engineers

The page said $10.00. The order was stored at $2.00. The server answered 201 Created.

Episode 29 of Web Reality Checks. The flaw: the order endpoint reads unitPriceCents from the request body. A price in a request is a claim by the client, not a fact held by the server.

The repair has two parts:

1. Catalog authority. The request carries productId, quantity and expectedUnitPriceCents. The expected price is a comparison value only. Any difference, up or down, returns 409 price_changed with the current quote and creates no order. A retry needs an explicit confirmPriceCents.

2. One BEGIN IMMEDIATE transaction in SQLite: read the catalog row, compare, insert the order and an order-line price snapshot. Without it, a second connection repriced the product in the gap between read and insert (control test: snapshot 1000 cents, catalog 1200 at insert time).

37 tests, 37 pass (local synthetic fixture), including two known-positive controls so the flaw and the race are both visible to the suite.

Limits: not a price lock. SQLite-specific locking. One tested interleaving, not HTTP. No tax, discounts, shipping, inventory or payment.

Video, fixture, tests: github.com/mizcausevic-dev/web-reality-checks

#WebSecurity #NodeJS #SoftwareEngineering

### Post 2: non-technical leaders

Your checkout passed the demo. Who decides the price on the order: your page, or your system?

A demo clicks the normal buttons, and the normal buttons send the right price. The failure in episode 29 of Web Reality Checks only appears when a request is edited before it is sent, and no screen has a button for that.

On a pretend shop with made-up data, the page showed $10.00. The request was changed to $1.00. The flawed checkout accepted it and recorded two mugs at $2.00 when the correct total was $20.00. No error anywhere.

It works like a cashier who rings up whatever the customer wrote on the order slip. The fix is a cashier who looks up the real price list, and stops to confirm when the customer's price is out of date.

Five questions for your team or vendor:
1. Where does the order price come from: the request or our catalog?
2. Has anyone edited the price in a request and tried to check out?
3. If the price changes between page view and purchase, what happens?
4. Does each order line store the price it was sold at?
5. Is there a deliberately broken version the tests catch?

Vague answers mean "unknown," not "safe."

Synthetic fixture, no real product. Video and write-ups: github.com/mizcausevic-dev/web-reality-checks

#ProductManagement #Ecommerce #Leadership

## X/Twitter thread

1/ The page said $10.00. The request said 100 cents. The server said 201 Created and stored two mugs at $2.00 total. The correct total was $20.00. Episode 29 of Web Reality Checks: who sets the price? Thread.

2/ The flawed endpoint reads unitPriceCents straight from the request body. A price in a request is a claim by the client, not a fact held by the server. The page showing $10.00 is irrelevant, because the page is only one possible author of the request.

3/ The fix moves authority to the catalog. The request carries productId, quantity and the price shown. That price is used only to detect change, never to compute a total. The server reads the catalog price and stores a snapshot on the order line.

4/ Same altered request, corrected endpoint: 409 price_changed with the current quote of $10.00. Orders created: 0. Zero, negative, fractional and oversized quantities, plus unknown products, are refused too.

5/ A legitimate change is different. The page loaded at $10.00, then the catalog moved to $12.00. Same request: 409 with a $24.00 quote for two, still no order. Only an explicit confirmPriceCents of 1200 creates one, with a $12.00 snapshot.

6/ Why BEGIN IMMEDIATE? SQLite takes the write lock up front, so a second connection cannot reprice the product mid-transaction. The control without a transaction let it: snapshot 1000 cents, catalog 1200 cents at insert time.

7/ Scope: 37 tests, 37 pass on a synthetic local fixture. This is not a price lock. Taxes, discounts, shipping, inventory and payment are not modeled, and the transaction strategy is SQLite-specific. Not a finding about any real shop.

8/ The client requests the purchase. The server determines the price. Fixture, tests, video and three write-ups: github.com/mizcausevic-dev/web-reality-checks

## Reddit / Hacker News

**Title:** A Node and SQLite fixture showing a checkout that trusts a client-submitted unit price, with a catalog-authority fix and a BEGIN IMMEDIATE race control

**First comment:** This is a deliberately constructed local fixture with synthetic data and no payment provider; the flawed endpoint was written by hand to demonstrate the mechanism, so it is not a finding about any real shop. The repair reads the price from a server-side catalog inside one BEGIN IMMEDIATE transaction, treats the client's price only as a comparison value, and returns 409 with the current quote on any difference. The suite is 37 tests including two known-positive controls, and the limits (SQLite-specific locking, one tested interleaving, not a price lock, no tax, shipping, inventory or payment) are in the README.

## Short-form hook lines (≤ 12 words)

1. The page said $10.00. The server charged $2.00.
2. A price in a request is a claim, not a fact.
3. One edited field. A $20 order stored as $2.
4. Your checkout demo never sends the price a cheater would.
5. The client requests the purchase. The server determines the price.

## Alt text

**hero.png:** Product page showing a $10.00 mug beside the submitted request, where the unit price has been edited to 100 cents; the flawed endpoint answers 201 Created and stores two mugs at a $2.00 total instead of $20.00.

**thumbnail.png:** Episode thumbnail for "The Browser Said $10. What Price Did the Server Trust?" showing a $10.00 price tag on a product page next to a $1.00 value in the outgoing request, with a 201 Created response beneath.
