"""DropBG unit economics. All assumptions explicit; edit and re-run."""
# --- costs -------------------------------------------------------------------
DOMAIN_MO      = 14.69/12          # Spaceship renewal
HOSTING_MO     = 0.0               # Cloudflare Pages free
WORKER_MO      = 0.0               # Workers free tier 100k req/day; KV free tier
MODEL_CDN      = 0.0               # imgly CDN (risk: could be throttled → self-host on R2 ~$0.015/GB egress-free)
REFINE_RUN     = 0.0016            # Replicate BiRefNet per image
POLAR_PCT      = 0.055             # 4% + ~1.5% intl cards
POLAR_FIXED    = 0.40
# --- traffic & ads ---------------------------------------------------------------
PV_PER_VISIT   = 1.3
RPM_HIGH       = 4.0               # page RPM, US/UK/DE/AU tool pages (AdSense)
RPM_LOW        = 0.5               # IN/PH/ID/PK/BD etc
SHARE_HIGH     = 0.23              # from Semrush: 23% of head-term volume sits in ≥$0.30 CPC markets
RPM_BLEND      = SHARE_HIGH*RPM_HIGH + (1-SHARE_HIGH)*RPM_LOW
ADS_PER_1K     = RPM_BLEND*PV_PER_VISIT
# --- pro conversion ---------------------------------------------------------------
COMPLETE_RATE  = 0.60              # visits that actually finish a cutout
BUY_RATES      = {"pessimistic":0.002, "base":0.005, "optimistic":0.010}   # of completing visits
REFINES_PER_BUYER = 25             # lifetime HD refines per Pro buyer (avg)

def net_one_time(price): return price*(1-POLAR_PCT) - POLAR_FIXED - REFINES_PER_BUYER*REFINE_RUN
def net_sub_month(price): return price*(1-POLAR_PCT-0.005) - POLAR_FIXED - 8*REFINE_RUN   # +0.5% sub fee, 8 refines/mo

TARGET = 2000.0
print(f"blended page RPM ≈ ${RPM_BLEND:.2f}; ads ≈ ${ADS_PER_1K:.2f} per 1,000 visits; fixed costs ≈ ${DOMAIN_MO:.2f}/mo\n")
print("| Price point | Net per sale | Per 1k visits (base) | Visits/mo for $2k (pess / base / opt) |")
print("|---|---|---|---|")
for label, price in [("$9 once",9),("$14 once",14),("$19 once",19),("$29 once",29)]:
    n = net_one_time(price)
    per1k = {k: 1000*COMPLETE_RATE*r*n + ADS_PER_1K for k,r in BUY_RATES.items()}
    need  = {k: (TARGET+DOMAIN_MO)/v*1000 for k,v in per1k.items()}
    print(f"| {label} | ${n:.2f} | ${per1k['base']:.0f} | {need['pessimistic']:,.0f} / {need['base']:,.0f} / {need['optimistic']:,.0f} |")
print(f"| Ads only | – | ${ADS_PER_1K:.2f} | {(TARGET+DOMAIN_MO)/ADS_PER_1K*1000:,.0f} (all scenarios) |")

print("\nSubscription comparison (recurring; needs retention):")
print("| Plan | Net/month per sub | Active subs for $2k | Months of one-time $9 revenue equalled after |")
print("|---|---|---|---|")
for label, price, months in [("$4/mo",4,12),("$5/mo",5,12),("$29/yr (≈$2.42/mo)",29/12,12)]:
    n = net_sub_month(price)
    print(f"| {label} | ${n:.2f} | {TARGET/n:,.0f} | {net_one_time(9)/n:.1f} months |")

print("\nSales needed per month at $2k target:")
for label, price in [("$9",9),("$14",14),("$19",19)]:
    print(f"  {label}: {TARGET/net_one_time(price):.0f} sales/mo ≈ {TARGET/net_one_time(price)/30:.1f}/day")
