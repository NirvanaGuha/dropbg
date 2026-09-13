# DropBG pricing review — 13 Sep 2026

Published page: see conversation artifact (also reproduced here). Data: Semrush US Sep 2026; 26 competitor pricing pages fetched live; model in `economics.py`.

## Recommendation
- **$19 one-time list price.** Founder's price **$9** for waitlist members via a Polar discount code, honoured for life.
- **Cap HD Refine at 300/month per key** (Polar usage counter already increments; worker enforces).
- **No AdSense.** Category doesn't run ads; at 37k visits/mo ads ≈ $63 vs Pro ≈ $2,000. Make "no ads" a free-tier promise, replace the Pro perk with "commercial licence + priority support".
- **Become a small hub** of variant pages (transparent background maker 22.2k KD59, make image transparent 14.8k KD56, png maker 49.5k KD63, logo 1.9k KD72, signature, product-on-white, bulk 260 KD45 CPC $2.12).
- Reserve a $49 "Catalog" tier and API credits ($0.013–0.02/img market) until Pro has sold ~100.
- Waitlist is the price test: <10% waitlist→buyer means the base-case buy rate is wrong.

## Landscape in one paragraph
Every incumbent = subscription to a suite ($8–13/mo annual; Canva $18/mo). Single-purpose removers = credit packs; "lifetime" = 1–3-yr expiry. Only Picsart runs ads. Only IMG.LY (the SDK) runs in-browser among established players. New entrants (PurgeBG, Backgroundless, snipmat, bgclear, KleanBG, Nero, SammaPix/Imagera/BigImg) converge on free-unlimited-in-browser + paid HD/batch/API. **5 of 8 entrants are hubs**, not single tools. **Backgroundless.io = same thesis as DropBG, launched Aug 29, $49 one-time Pro with e-com presets.**

## One-time price anchors
Removal.AI $8.99/10cr (3-yr) · Permute $14.99 · Retrobatch $19.99 · Backgroundless $49 · Pixelmator Pro $49.99 · BackgroundCut AppSumo LTD $99. Pay-once utility band = $15–50.

## Unit economics (economics.py)
- Free user: $0 compute (device), ~0.9 MB CF bandwidth (unmetered), model from IMG.LY CDN. Fixed costs $1.22/mo (domain).
- Pro sale @ $19: gross $19 − Polar $1.45 − 25 refines $0.04 = **$17.52 net (92%)**. Heavy user 300 refines/mo ×12 = $5.76.
- Blended page RPM $1.31 (23% high-CPC markets @ $4, 77% low @ $0.50) → ads $1.70 per 1k visits.

| Price | Net/sale | Sales/mo for $2k | Visits/mo pess 0.2% / base 0.5% / opt 1.0% |
|---|---|---|---|
| Ads only | $1.70/1k | – | 1,180,000 |
| $9 | $8.06 | 248 | 176k / 77k / 40k |
| $14 | $12.79 | 156 | 117k / 50k / 25.5k |
| **$19** | **$17.52** | **114** | **88k / 37k / 18.7k** |
| $29 | $26.96 | 74 | 59k / 24k / 12k |
| $5/mo sub | $4.29/active mo | 467 active | beats $9 one-time after 1.9 months retention |

Buy rate = share of cutout-completing visits (60% of visits) that purchase.

## Traffic to 37k/mo
remove.bg = 3.6M US organic/mo → 1% of displaced = target. Head terms KD 98–100 unreachable; variant pages KD 35–65 reachable. DE/FR/NL: 134k/mo at $0.45–0.86 CPC (value); PL 49.5k at $0.12 (volume only).

## Risks
Backgroundless (same pitch, 2 weeks ahead); IMG.LY CDN dependency (→ self-host on R2); Canva could free its remover; buy rate unvalidated.

## Copy change required if adopting $19
index.html #pro-soon: "Planned as a one-time purchase around $9. Early-list members get it at the launch price for life." → "Planned as a one-time purchase. Early-list members get a founder's price for life."

Researcher notes: `suite-incumbents.md`, `single-purpose-removers.md`, `sunset-entrants-and-lifetime-benchmarks.md`.
