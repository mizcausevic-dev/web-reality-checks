SEO title (≤60 chars): Who Sets the Price at Checkout? Ask Before You Ship
Meta description (≤155 chars): A checkout that looked right stored a $2.00 order for a $20.00 purchase. Why demos miss it, how it works, and five questions to ask your team or vendor.
Slug: server-side-price-validation
Primary keyword: checkout price tampering   Secondary keywords (3–5): ecommerce checkout security, price validation, software vendor questions, order pricing, launch review
Medium tags (5): Startup, Product Management, E-commerce, Cybersecurity, Leadership

# The Browser Said $10. What Price Did the Server Trust?

![A product page showing $10.00 while the submitted request carries a unit price of 100 cents, and the flawed endpoint answers 201 Created with a stored total of $2.00](../hero.png)

## The symptom as a business event

Picture the report landing on your desk: a batch of orders that were accepted and recorded at a fraction of the listed price. Nobody saw an error. Every order went through the normal flow and every status was a success.

That is what episode 29 of Web Reality Checks reproduces on a local fixture with synthetic data. The product page showed $10.00. The request that left the browser was edited to say a unit price of 100 cents, which is $1.00. The flawed checkout answered 201 Created, and two mugs that should have cost $20.00 were stored as a $2.00 order. In the fixture's own evidence file, that is an underpayment of 1,800 cents on a single order, and the system recorded it as a normal sale.

## Why a demo cannot show this

A demo follows the path the product team built: open the page, click buy, see the order. On that path the page sends the right price, so the stored price is right. Everything looks correct.

The problem only appears when someone sends a request that the page would never send. No button in your interface produces it. It takes a deliberate edit, a script or a proxy. So the people who review demos, and the staging checks that click through the interface, never exercise the one path that matters. A passing demo tells you the happy path works. It tells you nothing about who is in charge of the price.

## The mechanism in plain terms

Think of a paper order slip at a counter. In the flawed design, the customer fills in the slip, including the price column, and the cashier rings up whatever the slip says. In the corrected design, the customer writes only what they want and the price they believe they were quoted, and the cashier looks up the real price in the price list. If the two differ, the cashier stops, shows the current price and asks the customer to confirm before ringing anything up.

That is the fix in this episode. The server holds the catalog, and the catalog is the only authority. The price in the request is used for one thing, which is detecting that the customer is looking at something stale or altered.

There is a second half, and it matters for real stores. Prices change legitimately. In the fixture, the page loaded at $10.00 and then the catalog moved to $12.00. The same request now came back with a "price changed" response showing the updated quote of $24.00 for two, and no order was created. Only an explicit confirmation of $12.00 produced an order, and the order stored $12.00. The customer is never silently charged a price they did not see, and the business is never silently selling below its list.

The fixture also keeps the price check and the order write inside one short database transaction, so the price cannot change in the gap between "look up" and "record." Without that, the fixture showed an order stored at a price that was no longer current at the moment it was written.

## What to ask your team or vendor

1. When an order is created, where does the price come from: the request, or our catalog on the server?
2. If someone edits the price in the request before it is sent, what happens? Has anyone tried it, and is there an automated test that does?
3. If the price changes between page load and checkout, what does the customer see, and does the order wait for their confirmation?
4. Does each order line store the price it was actually sold at, so a later catalog change cannot rewrite past orders?
5. Is there a deliberately flawed version of the checkout that the tests catch, so we know the tests can detect the problem at all?

Vague answers should be read as "unknown." A good answer names the table, the test and the policy.

## What it costs if ignored

Qualitatively, three things. Revenue leaks: orders accepted below list price are real commitments, and finding them later means reconciling every order against the catalog. Trust erodes internally: finance, support and fulfillment all rely on the order record being right, and one tampered batch makes every record suspect. And the cleanup is awkward, because honoring, canceling or chasing underpriced orders each carry their own customer and legal questions that you would rather not decide under pressure.

None of that requires a sophisticated attacker. The fixture needed one edited field.

## FAQ

**Can a customer really change the price my website sends?**
Yes. Whatever a browser sends can be edited before it leaves the machine, using built-in developer tools or a script. The page you designed is one possible author of the request, not the only one. That is why the server has to decide the price itself.

**Does fixing this mean customers are locked into the price they first see?**
No. The fix compares the displayed price with the current catalog price. When they differ, the customer sees the current quote and must confirm. The fixture states plainly that this is not a price lock. Holding a price for a customer is a separate feature.

**Does this cover taxes, discounts, shipping and payment?**
No. The fixture models none of them, and no payment provider is contacted. Each needs the same rule, that the server decides, plus its own tests. This episode covers only the unit price used to create an order.

## Watch the episode

[YouTube link]

- 00:00 The page says $10, the request says $1
- 00:09 Flawed endpoint: 201 Created at $2.00
- 00:19 The trusted field: unitPriceCents
- 00:31 The repair: catalog authority in one transaction
- 00:47 Retest: 409 price_changed, 0 orders
- 01:00 A legitimate change: 409 with the $24.00 quote
- 01:14 Confirmation: snapshot at $12.00
- 01:29 What is not modeled

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

A price in a request is a claim, not a fact. Ask who holds the price list.

Miz Causevic, Kinetic Gain LLC
