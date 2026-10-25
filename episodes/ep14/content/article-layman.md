SEO title (≤60 chars): Why an Upload Can Say 100% and Still Not Be Finished
Meta description (≤155 chars): The upload bar filled, but the file is not ready. A plain-language look at the four steps hiding behind one progress bar, and what to do while you wait.
Slug: upload-stages
Primary keyword: upload stuck at 100%   Secondary keywords (3–5): upload complete but not processing, what does upload progress mean, file upload explained, why is my file not ready, upload says done
Medium tags (5): Technology, Explainer, Internet, Software, Productivity

# 100% Uploaded. Why Isn't My File Ready?

![A browser upload bar reads 100% while the status line beneath it still says the file is not ready; the caption notes the bar measured request-body bytes, not completed work](../hero.png)

You hand a parcel to a courier at your front door. Their app updates at once: "Collected." That is true. The driver has it. But the parcel has not reached the depot, nobody has checked whether it is allowed in the van, nobody has opened it, and the person you sent it to cannot pick it up yet. "Collected" is the first of several steps, and it is the only one the app showed you.

An upload progress bar is the "Collected" message. This episode is about the three steps it does not show.

## What the episode shows

We built a small, deliberately simple file uploader on a laptop, with made-up users and made-up spreadsheet files. Nothing here is real data and nothing here is about a real product (local synthetic fixture).

A user picks a tiny spreadsheet file and clicks send. The bar fills to 100%. At that moment, all it means is that the file has left the browser. It does not even count only the file: the browser wraps the file in some packaging before sending, and the bar counts the packaging too. In the episode, an 82-byte file traveled as a 232-byte parcel (local synthetic fixture). The bar was accurate about the parcel. It just was not measuring what the user thought.

Then the server replies, separately, after the bar is already full. In the episode the reply is "202 Accepted" plus a job number. That is the depot saying "we have it and it is in the queue." It is not the depot saying "done." Ask for the result at that moment and the server says "not available yet" (a code called 409).

A moment later, a worker opens the file and checks the rows. Only when that finishes does the result become available: three rows, totaling 114.75 (local synthetic fixture). Four steps: sent, accepted, processed, available. The bar showed the first.

## When the parcel is refused, or the contents are wrong

The same uploader was given two other files. One was really an image renamed to look like a spreadsheet. It sent fully, 100%, and then the server refused it: "binary content is not CSV." No job was created. The depot looked inside the parcel instead of trusting the label, but the bar had already said 100% before the refusal arrived (local synthetic fixture).

The other was a real spreadsheet with mistakes: a bad email address on line 3 and the word "lots" where a number should be on line 4. It sent fully, 100%, was accepted, 202, and then failed when the worker checked the rows. The server recorded why, naming both lines. Anyone looking only at the bar would have believed the file was in (local synthetic fixture).

So the bar was right every time and useful almost none of the time, because everything that went wrong happened after the part it measures.

## The fix, in one sentence

Show each step on its own. The episode replaces the single bar with four short status lines: sent (with the honest note that it counts packaging), accepted or refused (from the server's reply), processing (as a plain word, no percentage, because nothing measures one), and available (only when the result can really be opened). It says less than a confident bar, and all of it is true.

## What this means for you

- When an upload bar hits 100%, you have finished your part, not the whole job. Wait for a message that says accepted, processed or ready before you close the tab or assume the data is in. If the site never shows one, that is a gap in the site, not something you did wrong.
- "Accepted" and "done" are different words for a reason. If a site tells you a file was accepted or is queued, it is being honest that work remains. Check back for the final status, especially if the file matters.
- Be suspicious of a processing bar that moves smoothly. Sending can be measured, because bytes can be counted. Processing often cannot. A site that says "processing" with no percentage may be telling you more truth than one that shows a bar creeping toward 100%.

## FAQ

**Why does my upload say 100% but the file is not ready?**
The bar measures how much of your request has left your browser. The server's reply, the processing of your file and the result becoming available all happen afterward. If the site only shows the bar, it stops reporting right when the interesting part begins.

**Does 100% mean the website received my file correctly?**
No. 100% means the data was sent. The server can still refuse it after it arrives. In the episode, a fake spreadsheet reached 100% and was then rejected. Look for a separate message from the site saying the file was accepted.

**My upload was accepted. Is the file safe and ready?**
Accepted means stored and queued. The file still has to be processed, and in the episode an accepted file later failed because of bad rows. Also, a file being checked for shape or format is not the same as being scanned for malware; the episode's uploader is careful to say so.

## Watch the episode

[YouTube link]

Related episodes: [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md) and [Your Website Updated. Why Am I Still Seeing the Old Version?](../../ep12/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

"Collected" was never "delivered." Bytes transferred is not the same as work completed.

Miz Causevic, Kinetic Gain LLC
