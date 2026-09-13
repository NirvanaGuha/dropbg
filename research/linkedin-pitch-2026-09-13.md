# LinkedIn pitch drafts — remove.bg thread — 13 Sep 2026

Voice: nirvana persona (casual 5, dry wit, first person, mechanism + failure modes, no "it's not X it's Y"). Plain prose only; LinkedIn renders no markdown.

## Comment A — short, for the thread (≈80 words)

Same reaction here, so I spent Saturday building the version I wanted: dropbg.app. The model runs inside your browser, so there is no upload, no account, no credit counter, and full resolution stays free. That is the whole trick: when the work happens on the user's device, "free forever" is an architecture decision instead of a marketing promise. Honest limits: the first load pulls about 90 MB of model, and fine hair against a busy background is still where every one of these tools struggles.

## Comment B — slightly longer, for the thread (≈140 words)

The part nobody in this thread has said out loud: remove.bg charged per image because every image cost them GPU time. Canva folding it into a subscription is the same economics with a different wrapper.

So I built the other version this weekend: dropbg.app. The segmentation model downloads into your browser once, about 90 MB, and after that every image is processed on your own machine in one to three seconds. Nothing is uploaded, which you can check in the network tab. No signup, no watermark, no cap, and full resolution is free because it costs me nothing to give away.

Where it is honest about limits: the first load is slow on a phone, and hair over a busy background still needs a touch-up, same as remove.bg did. It also runs on an open model, so the cutout quality is "very good", not "magic".

If your credits expire on December 1, this is one place to put the workflow.

## Standalone post — the build story (≈230 words)

remove.bg is shutting its website on December 1 and pushing everyone into Canva. The credits people paid for expire the same morning. My LinkedIn feed has been furious about it all week, so on Saturday I built the alternative I actually wanted and shipped it by Sunday.

dropbg.app. Drop a photo, get a transparent PNG. The interesting part is where the work happens: the model runs inside your browser, on your GPU if you have one. Nothing is uploaded. There is no server bill, so there is no reason for credits, signups, watermarks or a resolution cap. Free stays free because the architecture makes it free, and I do not have to trust myself to keep a promise.

What actually happened while building it, since that is the useful bit:

The model loads once, about 90 MB, then each image takes one to three seconds on a laptop. The first load on a phone is slow and I say so on the page.

I planned to monetise with ads. Then I ran the numbers. Tool pages earn about $1.70 per thousand visits, most background-remover searches come from markets where that ad bids two cents, and nobody else in the category runs ads for exactly that reason. So no ads, ever, and a one-time Pro unlock later for batch zips and an HD pass.

Two bugs made it to production before I caught them. A slider handle that drifted from the image, and a display rule that quietly beat the hidden attribute. Both fixed; both in the commit log.

If you have remove.bg credits, spend them before December 1, then bookmark this.

## Notes for Nirvana
- Comment A for the thread if the post author is a stranger; B if the thread is already long and technical.
- The standalone post can run the same day; it does not depend on the thread.
- Optional line for the standalone (fits the AI-first positioning, cut if it feels like a flex): "Most of the code was written with an AI coding agent in one session; the two bugs above are what that buys you, and why I read every diff."
- Do not mention the $19 or the founder's price publicly yet. "One-time Pro unlock later" is enough; the waitlist page carries the rest.
- All numbers are verified in the session log: 85 to 105 MB model, 1.0 to 3.0 s per image on WebGPU, $1.70 per 1k visits blended RPM, credits expire 2026-12-01 09:00 CET.
