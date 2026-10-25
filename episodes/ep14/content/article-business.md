SEO title (≤60 chars): The Upload Says 100%. Why Your Customers Still Wait
Meta description (≤155 chars): A full progress bar reports one of four upload stages. Why demos hide the other three, what to ask your team, and what the gap costs in support and trust.
Slug: upload-stages
Primary keyword: file upload user experience   Secondary keywords (3–5): upload progress bar misleading, async file processing status, 202 accepted meaning, product demo blind spots, vendor questions file upload
Medium tags (5): Product Management, UX, Startup, Software Development, Customer Experience

# 100% Uploaded. Why Isn't My File Ready?

![A browser upload bar reads 100% while the status line beneath it still says the file is not ready; the caption notes the bar measured request-body bytes, not completed work](../hero.png)

## The symptom as a business event

A customer uploads a spreadsheet. The bar fills to 100%. They wait, click around, refresh, and the import still shows nothing. Ten minutes later a support ticket arrives: "Your upload is broken." Another customer uploads a file, sees 100%, closes the tab, and discovers the next morning that the import was rejected and nobody told them. A third uploads a file with a typo in one row, sees 100%, and assumes the data is in.

None of those customers saw a bug. They saw a progress bar that answered a different question than the one they were asking. The bar reported "how much of your request has left the browser." They read it as "how close is my file to being usable." Those are not the same thing, and this episode reproduces the gap on a small uploader built on a laptop with synthetic data (local synthetic fixture).

## Why a demo cannot show this

In a demo, the presenter uploads a small, clean file on a fast connection. The bar fills, the server accepts the file, the processing finishes within the same instant, and the result appears. Four separate events happen so close together that they look like one. The interface gets credit for a smoothness it did not earn.

The gap opens when a later stage slows down or fails: a file the server rejects after it was fully sent, a file accepted but failing validation, a queue with real work in it. None of those appear in a demo, because a demo is built to avoid them. The fixture in this episode constructs them on purpose, and deliberately delays processing by a labeled 400 milliseconds so the "accepted but not ready" state can be observed. That delay is artificial and is not a measurement of anything.

## The mechanism in plain terms

Think of sending a parcel. The courier's tracking page says "collected" the moment the driver takes it from your door. That is transfer. It does not say the depot accepted it; a parcel can be refused at intake for being overweight or mislabeled. It does not say the contents passed inspection. And it does not say the recipient can pick it up, which only becomes true at the end.

An upload has the same four stages. First, the bytes leave the browser; that is all a progress bar measures, and the count includes packaging (the request wrapper), not just the file. In the fixture an 82-byte file traveled as a 232-byte request (local synthetic fixture). Second, the server answers: in the fixture, "202 Accepted" with a job number, or a rejection with a reason. "Accepted" means stored and queued, not finished. Third, a worker reads the file and checks the rows. Fourth, and only if that succeeded, the result becomes available.

In the fixture, a clean file went 100%, 202, then ready, with three rows totaling 114.75. A file with one bad email and one non-numeric amount went 100%, 202, then failed, with a reason naming the lines. A file of image data renamed to `.csv` went 100%, then was refused with "binary content is not CSV" and no job was created. The progress bar read 100% in all three cases (local synthetic fixture). The analogy holds because the stages are owned by different parts of the system, just as the driver, the intake desk and the inspector are different people.

## What to ask your team or vendor

1. What exactly does our upload progress bar measure? The honest answer is "bytes of the request leaving the browser, wrapper included." If the answer is "how far along the upload is," the team has not separated the stages.
2. When the server rejects a file, what does the user see, and when? In the fixture the rejection arrives after the bar has already hit 100%. Ask whether the interface shows "sent, then rejected" or just leaves the bar full.
3. What does "accepted" mean in our system, and does the interface say so? The fixture answers 202 with the note "accepted for processing; not processed yet," and the status line reads "accepted ≠ processed."
4. Do we show a processing percentage, and if so, what measures it? The fixture shows none, because the worker does not measure one. A percentage that is not measured is a guess dressed as a fact.
5. Can one customer see another customer's job status by guessing a job number? In the fixture, another user asking for a job gets 404, the same answer as for a job that does not exist, so the response never confirms the number is real.

If the answers are "the bar just shows progress," your product is telling customers something it does not know.

## What it costs if ignored

No invented figures here, only the shape of the cost.

The direct cost is support volume. Every customer who reads 100% as "done" and finds otherwise opens a ticket or sends an email, and the first reply is almost always an explanation of what the bar meant. That explanation is work the interface should have done.

The second cost is silent failure. A file that is fully sent and then rejected, or accepted and then failed in validation, leaves no trace in the customer's mind if the interface stopped reporting at the bar. The customer believes the data is in. The team discovers otherwise when a report is wrong or a downstream process runs on missing rows.

The third cost is trust in the indicators you do show. Once a customer learns that 100% did not mean ready, they stop believing the next status too. A product that says less but says it accurately keeps that trust; the fixture's four-line status does exactly that, including the admission "no percentage: the server does not report one."

## FAQ

**Why do customers think an upload is done when it is not?**
Because the progress bar is the only indicator they are given, and it fills when the request leaves their browser. The server's acceptance, the processing and the result's availability happen after that, and if the interface does not report them separately, the customer has no way to know they exist.

**Is a "202 Accepted" response from our server a success?**
It means the server stored the file and queued a job. In the fixture, a file with invalid rows received 202 and then failed in processing with a reason. Treat 202 as "the next stage has started," and make sure the interface keeps reporting until the job is ready or failed.

**Should we add a processing progress bar to reassure users?**
Only if something measures processing progress. If the worker reports a state but no percentage, show the state. A fabricated percentage reassures until it is wrong, and then it costs more trust than a plain "processing" label ever would.

## Watch the episode

[YouTube link]

Related episodes: [You Clicked Pay Once. Why Did the App Create Two Orders?](../../ep15/content/article-technical.md) and [Your Dashboard Says 'Live.' Its Data Is Ten Minutes Old.](../../ep17/content/article-technical.md)

> This episode uses a deliberately constructed local fixture with synthetic data. Nothing here is a finding about a real product or company. Fixture, tests and video source: github.com/mizcausevic-dev/web-reality-checks

Bytes transferred is not the same as work completed. Ask your team which of the four stages the interface reports, and ask what the customer sees when the other three go wrong.

Miz Causevic, Kinetic Gain LLC
