SEO title (≤60 chars): What Your Login Does After the Click, and What to Ask
Meta description (≤155 chars): A login screen that works tells you nothing about how passwords are stored or sessions handled. One traced implementation and five questions for your team.
Slug: sign-in-session
Primary keyword: login security questions   Secondary keywords (3–5): password storage, session management, vendor security review, account takeover risk, authentication due diligence
Medium tags (5): Startup, Product Management, Cybersecurity, Software Development, Leadership

# Watch What Happens When You Click 'Sign In'

![The Set-Cookie header from the fixture's login response, sid=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/ with no Domain attribute, and the note that the cookie identifies a session, not a permission](../hero.png)

## The symptom as a business event

The login page works. Customers type an email and a password, click Sign In, and land on their dashboard. Nobody complains, because nothing visible is wrong. Then one of three things happens. A copy of the user table leaves the building and the passwords in it turn out to be readable. A customer reports that a link someone sent them left them signed in to an account that was not theirs. Or a security questionnaire from a large prospect asks how sessions are handled after login, and nobody on the team is sure.

Each traces back to a decision made between the click and the dashboard. This episode follows one implementation of sign-in through that interval on a small local fixture with two synthetic users (local synthetic fixture). It is one way that works, built from maintained libraries, not how every sign-in system works.

## Why a demo cannot show this

A demo shows the happy path: correct password in, dashboard out. The properties that matter live where a demo never looks.

How the password is stored is a property of the database. Whether the session identifier changes after login is a property of a cookie header most people never read. Whether a protected page checks "is this a valid session?" and then separately "is this user allowed?" is a property of server code. Whether sign-out destroys the session on the server, or merely hides the button, can only be learned by trying the old session afterward.

In the fixture, the wrong password returns 401 and the right password returns 200 with one cookie (local synthetic fixture). That is all a demo would show. Everything the episode is about happens behind those two numbers.

## The mechanism in plain terms

Think of a hotel with a strict front desk. You give your name and a passphrase. The desk does not keep your passphrase in a drawer. It keeps a smudge made from it by a process that only runs one way: given your passphrase, the desk can make the smudge again and compare, but nobody can turn the smudge back into the passphrase. In the fixture that smudge is a salted argon2id hash. Two smudges from the same passphrase look different, and both check out (local synthetic fixture: two hashes of one password differ, both verify).

Once confirmed, you get a key card. The card is not your passphrase and does not contain your name. It is a random number the desk wrote in its ledger next to your name and room class. The hotel also voids any card you were carrying before check-in, so a card someone slipped into your pocket in the lobby does not become a working key. In the fixture, the session is regenerated on login and replaying the pre-login identifier returns 401 (local synthetic fixture).

The card has restrictions printed on it. It works in this building only (no `Domain` attribute, host-only). It works only through the official reader (`Secure`: HTTPS only). It is hard for a passerby to read (`HttpOnly`: ordinary page scripts cannot read it, though this does not stop every misuse). When you present it, the desk asks two separate questions: is this card still valid, and is this guest allowed into this room? In the fixture, no card is 401, a member's card at the admin door is 403, an admin's card is 200 (local synthetic fixture).

Check-out destroys the ledger entry and voids the card. The old card then fails: 401 on replay after logout (local synthetic fixture).

The analogy holds where it matters: passphrase, card and permission decision are three different things in the hotel and three different objects in the software. The password never becomes the cookie. The cookie never carries a permission.

One limit. The encrypted HTTPS connection the credentials travel through was not executed in this fixture, because the environment has no trusted local certificate authority. The video draws it as a labeled conceptual illustration and documents what was not run.

## What to ask your team or vendor

1. How are passwords stored? You want a maintained hashing library and a salted, one-way algorithm. "Encrypted" is the wrong answer, because encryption reverses with the key. Ask to see the stored format.
2. Does the session identifier change on sign-in? Ask for the test that replays the pre-login identifier and expects failure. The fixture has that test, and a second test proves the flawed version keeps the old identifier.
3. What is in the session cookie, and what attributes does it carry? You want an opaque value with `HttpOnly`, `Secure`, an explicit `SameSite`, and a deliberate decision about `Domain`.
4. Is "allowed" checked separately from "signed in"? Two checks, two responses. A single "logged in, therefore allowed" check is episode one's bug in a different coat.
5. What happens on sign-out, and is it protected against forged requests? In the fixture the old session fails afterward, `GET /logout` is refused with 405, and login and logout both require a CSRF token.

Vague answers mean "unknown," not "secure."

## What it costs if ignored

No invented figures, only the shape of the cost.

If passwords are stored reversibly, one copy of the user table becomes a list of working credentials, for your product and for every service where customers reused the password. The disclosure obligation is yours.

If the session identifier survives login, an attacker who can plant one in a victim's browser gets a signed-in session without the password, and with no failed-login record to detect, because nothing failed.

If sign-out does not destroy the session on the server, a shared or stolen device stays signed in after the user believes they have left.

The quieter cost is procurement. Larger buyers ask these questions in security questionnaires, and "we use a standard library" with no test to point at is a weaker answer than a test that fails on purpose when the protection is removed.

## FAQ

**Is "encrypted passwords" a good answer from a vendor?**
No, it is a warning sign. Encryption is reversible with a key; whoever holds the key can read every password. Passwords should be hashed with a salted, one-way algorithm from a maintained library. The fixture uses argon2id; the server can only recompute and compare.

**Why does it matter that the session changes after login?**
If the identifier a browser held before login is kept after login, anyone who planted it now holds a signed-in session, with no password and no failed attempt to detect. Regenerating on login makes the pre-login identifier worthless. The fixture tests this, and tests that the flawed version fails.

**Does HTTPS make the login safe?**
HTTPS protects credentials in transit between an honest browser and an honest server. It does nothing for a compromised browser, a compromised server, or a script already running in the page. In this fixture the HTTPS leg was illustrated, not executed, and the episode says so.

## Watch the episode

[YouTube link]

Related episodes: [Your AI-Built App Works. Is It Safe to Launch?](../../ep01/content/article-technical.md) and [HTTPS Encrypts Your Request. What Can the Network Still See?](../../ep20/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

The login screen is the lobby. Ask what the desk keeps in the drawer, what is printed on the key card, and whether the old card still works after check-out. Then ask to see the test.

Miz Causevic, Kinetic Gain LLC
