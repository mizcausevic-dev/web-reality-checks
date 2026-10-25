SEO title (≤60 chars): The Price on the Screen Is Not the Price the Store Uses
Meta description (≤155 chars): A shop page showed $10.00 but the order was stored at $2.00. A plain-language look at who really decides the price when you buy online.
Slug: server-side-price-validation
Primary keyword: online shopping price check   Secondary keywords (3–5): how online checkout works, price on screen vs price charged, website price tampering, safe online shopping, price changed at checkout
Medium tags (5): Technology, Online Shopping, Cybersecurity, Explained, Software

# The Browser Said $10. What Price Did the Server Trust?

![A product page showing $10.00 while the submitted request carries a unit price of 100 cents, and the flawed endpoint answers 201 Created with a stored total of $2.00](../hero.png)

You are looking at a mug on a shopping site. The screen says $10.00. You click buy and the order goes through.

But there is a question hiding in that moment: when the site records your order, whose price does it write down? The one on your screen, or the one in its own records? Episode 29 of Web Reality Checks builds a tiny pretend shop on one laptop, with made-up data, to find out.

## What the episode shows

Think of a shelf in a physical store. The sticker on the shelf says $10. Behind the counter, the register has its own price list. A well-run store rings up what the register says, no matter what the sticker claims, because stickers can be swapped.

In the pretend shop, the first version of the checkout acted as if the sticker were the price list. Just before the order left the browser, the demo changed the price in the request from $10.00 to $1.00. The screen kept showing $10.00, so nothing looked different. The shop accepted the order anyway. Two mugs that should have cost $20.00 were recorded as a $2.00 order.

No error appeared. The shop did exactly what it was told, by the wrong party.

## The fix, in one sentence

The register stops listening to the sticker. It looks up the real price in its own list, and the price the customer saw is used only to notice a mismatch.

When the demo repeated the altered request against the fixed version, the shop replied that the price had changed, showed the current price of $10.00, and recorded no order at all. The pretend shop's order count stayed at zero.

## Why the pretty screen does not help

The screen is the sticker. It usually matches the real price, and when it does everything looks perfect. The trouble is that the screen runs on your device, and a request can be changed on its way out. A shop that trusts what arrives has handed the pen to whoever is sending it.

That is also why a polished demo cannot reveal the problem. A demo clicks the normal buttons, and the normal buttons send the right price.

## A real price change is different

Prices do change for legitimate reasons. In the demo, the page loaded at $10.00 and then the shop's own list moved to $12.00. The fixed checkout did not quietly charge either price. It said the price had changed, showed the new total of $24.00 for two, and waited. Only after an explicit confirmation of $12.00 was the order recorded, at $12.00.

One honest limit: this does not freeze a price for you. The fix checks the price at the moment you buy. It does not promise the price will still be there five minutes later. That would be a separate feature, and the demo does not build it.

## What this means for you

- **A price on your screen is a display, not a promise.** The number that counts is the one the store's system records when your order is created.
- **A good checkout tells you when the price moved.** If the total changes between page and purchase, you should be shown the new amount and asked, not charged without notice.
- **If you build or buy a shop, ask who decides the price.** The answer should be "our system, from our own price list," and someone should have tested it by trying to cheat.

## FAQ

**Can someone really change the price before they buy?**
On a shop built this way, yes. A request leaving a browser can be edited by anyone who knows how. A well-built shop ignores the price in the request and looks up its own. The demo shows both versions side by side.

**Does this mean online shops are unsafe to use?**
No. The demo is a pretend shop built to show one specific mistake. It is not a finding about any real store. It shows what to check, not what is wrong everywhere.

**Why did the fixed shop refuse my order when the price changed?**
Because it cannot tell whether you meant to pay the new price. Silently accepting either price would surprise someone. So it stops, shows the current price and asks you to confirm.

## Watch the episode

[YouTube link]

- 00:00 The page says $10, the request says $1
- 00:08 Flawed endpoint: 201 Created at $2.00
- 00:19 The trusted field: unitPriceCents
- 00:31 The repair: catalog authority in one transaction
- 00:46 Retest: 409 price_changed, 0 orders
- 00:59 A legitimate change: 409 with the $24.00 quote
- 01:11 Confirmation: snapshot at $12.00
- 01:26 What is not modeled

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The sticker is for you. The register is the authority. Check which one your shop listens to.

Miz Causevic, Kinetic Gain LLC
