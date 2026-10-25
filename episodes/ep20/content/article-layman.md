SEO title (≤60 chars): The Padlock Hides Your Message, Not Your Envelope
Meta description (≤155 chars): HTTPS keeps what you send private. It does not hide which site you visit, when, or from where. A plain-language look at what the network still sees.
Slug: https-visibility
Primary keyword: what does the padlock mean   Secondary keywords (3–5): is HTTPS private, can my ISP see what I do, what does HTTPS hide, website security explained, encrypted browsing
Medium tags (5): Technology, Privacy, Security, Explainer, Internet

# HTTPS Encrypts Your Request. What Can the Network Still See?

![Three columns, browser, passive observer and TLS endpoint, for one HTTPS request; the observer column shows only hatched ciphertext blocks with lengths while the request line GET /account?tab=billing is readable in the browser and endpoint columns](../hero.png)

You write a letter, seal it in an envelope, and mail it. Nobody who handles it on the way can read the letter. But every one of them can read the address, see the postmark that says when you sent it, and feel how heavy it is.

That is what the padlock in your browser means. The letter is sealed. The envelope is not, and cannot be, because the envelope is how the letter gets delivered.

## What the episode shows

This episode is a drawing, not a recording. Nobody tapped a network or captured traffic; it is an illustration built from the public rulebooks browsers and servers follow, and every frame is labeled "CONCEPTUAL ILLUSTRATION · NO TRAFFIC CAPTURED." It also makes simplifying assumptions, shown on screen: the current encryption (TLS 1.3) over an ordinary connection, an old-fashioned unencrypted address lookup, no VPN, none of the newer privacy add-ons, and a quiet observer between you and the website who only reads and never interferes. Not every connection looks like this; many modern ones hide more.

Here is one trip to `https://example.test/account?tab=billing#history`, seen from the observer's seat.

First, your browser has to find out where `example.test` lives. With ordinary lookups that question is an unsealed postcard: anyone on the route between you and the lookup service can read the name of the site you are about to visit.

Second, your browser connects to the address it got back. That address, the port number, when the connection happens and how much goes back and forth are all readable, because the network needs them to deliver anything. One address does not always mean one website: many sites can share one, the way an apartment building shares a street address.

Third, the secure handshake begins, and its very first message names the site again in the clear, because there is no shared secret yet to hide it with. After that first exchange the two sides agree on keys and everything else is sealed, including the website's certificate, which in TLS 1.3 travels inside the sealed part.

Fourth, your actual request goes inside the sealed envelope: the page you asked for (`/account?tab=billing`), your login cookie, any form you filled in. The observer sees envelopes going by and how big they are. Size and timing on their own do not tell them what you wrote.

One more detail. The part of the address after the `#`, here `#history`, is a note your browser keeps for itself. It never goes into the envelope. The one piece of real code in this episode checks exactly that, and it passes (local synthetic fixture).

Counted up (local synthetic fixture): of the 11 pieces of this one visit, the observer reads 5, sees 5 only as sealed boxes, and never receives 1.

## The two ends are different

Your browser wrote the letter, so it knows what is in it. The website you sent it to opens it, reads it, and may keep a copy. If the website uses a delivery company to handle its mail, as many large sites do, that company opens the envelope on the website's behalf and may keep a copy too. The padlock protects the letter in transit. It does not protect it from the recipient, and it does not tell you whether the recipient is honest. A fake site can have a real padlock.

## What this means for you

- The padlock means the words you type are private from people on the network between you and the site. It does not mean your visit is invisible. Someone running the network can usually tell which site you connected to, when, and roughly how much.
- Newer tools close some gaps. Encrypted address lookups seal the postcard but not the envelope's address. Encrypted Client Hello hides the site name in the handshake, but not the address or timing. A VPN moves the observer's view elsewhere. Each helps with one thing; none makes the envelope disappear.
- The padlock is not a safety rating for the site. It says your letter arrives sealed, not that the recipient is honest or careful with it.

## FAQ

**Can my internet provider see what I do on a secure website?**
Under this episode's assumptions, they can see which site you connected to, when, and how much data moved. They cannot read the pages you opened, your login, your cookies or anything you typed. The site's name is visible because of the address lookup and the first handshake message.

**Does the padlock mean a website is safe?**
No. It means the connection between you and that site is sealed against readers on the way. A scam site can have a padlock. And the site you reach, or the company handling its traffic, reads what you send and may keep it.

**Is there a way to hide which sites I visit?**
Partly. Encrypted address lookups hide the question, and Encrypted Client Hello hides the site name in the handshake, but the address you connect to stays visible. A VPN changes where the observer sits rather than removing it. Nothing in this episode makes a connection invisible.

## Watch the episode

[YouTube link]

Related episodes: [I Clicked 'Reject All.' What Did the Website Actually Do?](../../ep11/content/article-technical.md) and [The Browser Shows Your Page. What Does the Server Send?](../../ep19/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The padlock seals the letter. The envelope still has an address, a postmark and a weight, and it has to, or nothing would arrive. Knowing which is which is the point.

Miz Causevic, Kinetic Gain LLC
