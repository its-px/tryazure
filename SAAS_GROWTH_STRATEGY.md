# SaaS Growth Strategy — Booking Platform

Strategy notes for improving UX, making tenants (salons, barbers, service businesses) more money, bringing them new clients, and generating platform revenue. Compiled from a strategy session on 2026-07-02, grounded in the current codebase (React/MUI PWA + Supabase, multi-tenant, SMS via GatewayAPI, Stripe installed but not yet used).

---

## 1. Current State (what the app already has)

- Multi-tenant booking platform: tenant resolved by URL/domain, per-tenant branding (logo, colors), roles: admin / owner / professional / user.
- Booking flow: Location → Professional → Services → Time Slots.
- SMS infrastructure: GatewayAPI integration, `SMSLogger`, SMS admin dashboard.
- Booking lifecycle cron (`manage-booking-lifecycle`): expires unconfirmed bookings 8h before start, marks past bookings completed.
- Owner statistics dashboard (`BookingStatistics`) with revenue estimates from service prices.
- PWA with service worker, install prompt, notifications scaffolding.
- i18n (Greek/English).
- **Stripe is in `package.json` but never used in `src` — payments are the single biggest untapped lever.**

---

## 2. UX Improvements (the booking experience)

Core insight: every extra step before a confirmed slot loses customers; every phone call the owner still has to make weakens the "this app saves me time" argument.

- **Reduce booking friction.** Let first-time customers book with just name + phone (SMS OTP), create the account silently behind it. Don't force account creation + profile completion before booking.
- **One-tap "Book again."** Returning customers see "Book your usual: Maria, Haircut, Tuesday-ish" first — one tap — instead of the 4-step wizard.
- **Self-serve confirm / cancel / reschedule links in the SMS.** One-tap links in the confirmation/reminder SMS. Cuts owner phone-tag and silent no-shows.
- **"Next available slot" suggestion.** Show the 3 soonest openings for the chosen service/professional up front; full calendar as fallback.
- **Waitlist.** Day full → join waitlist → on cancellation, auto-offer the slot by SMS to the first person. Converts cancellations into revenue.
- **Polish loading/empty states.** Replace bare `<div>Loading...</div>` with skeleton screens.
- **Use the PWA investment.** Web push for confirmations/reminders (free), SMS as fallback for non-installed users.

---

## 3. Making Tenants More Money (retention & per-visit value)

Three buckets: *lose less* (no-shows), *earn more per visit* (upsell/rebook), *bring in new people* (§4).

### Lose less
- **Deposits / prepayment via Stripe.** A €5–10 deposit at booking is the most effective no-show killer in the industry. Also the platform monetization lever (§6).
- **Per-client no-show tracking** — let owners require deposits only from repeat offenders.

### Earn more per visit
- **Post-visit rebooking automation.** The cron already marks bookings `completed`. N weeks after completion (configurable per service — haircuts ~4 weeks), auto-SMS "time for your next appointment?" with a booking link. Mostly existing plumbing.
- **Upsells in the booking flow.** "People also add" suggestions at the Services step (beard trim with haircut, treatment with color).
- **Fill dead hours:** owners flag off-peak slots with a discount shown in the booking UI.
- **Gift cards, packages (5 sessions for the price of 4), simple loyalty** ("10th visit free") — all straightforward once payments exist.

### Make the value visible
- Extend statistics beyond revenue to *actionable* insights: no-show rate, retention, busiest hours, revenue per professional, lapsed clients.
- Every insight gets an action button: "32 lapsed clients → Send win-back SMS."

---

## 4. Bringing Tenants NEW Clients (acquisition)

A booking tool by itself mostly converts and retains; these features genuinely bring new people, roughly in order of speed:

1. **Google reviews automation — the real acquisition engine.** New salon clients come overwhelmingly from Google Maps; ranking is driven by review count/recency. The app knows the moment a visit ends (lifecycle cron) → SMS/push a direct review link while the client is happy. This is the feature where "we will get you new clients" is true.
2. **Referral program that runs itself.** After a completed visit: "Give a friend 20% off their first visit, get €5 off your next." App generates the link, tracks redemption, applies discounts. Each redemption = a countable new client.
3. **Gift cards as an acquisition vehicle** — bought by existing clients, redeemed by people who've never been in the shop.
4. **Public "last-minute openings" page** — discounted empty slots, shareable as an Instagram story link. Attracts price-driven first-timers; empty-chair time at 30% off is nearly free money.
5. **SEO booking pages + Instagram/QR capture.** Public page per tenant (services, prices, reviews, book button) ranks for "{service} {neighborhood}"; converts Instagram traffic that currently leaks into DMs.
6. **Endgame: marketplace.** With enough tenants in one city, a consumer-facing "find & book" directory literally hands tenants new clients (the Booksy/Fresha moat); charge a first-visit commission. Requires tenant density — items 1–5 build it.

Pitch evolution: reviews + referrals + last-minute deals bring new clients *today*; the marketplace at scale *later*; retention/products maximize what each client is worth.

---

## 5. Retail Products (hair clay etc. — high-margin physical sales)

Retail carries much higher margins than chair time, but shops sell it badly (register upsell only). **Don't build a POS or inventory system** — build what a register can't do: sell *before and after* the visit, and remember what each client bought.

- **Product add-ons in the booking flow.** Lightweight per-tenant `products` catalog (name, photo, price, optional stock). Offer at the last booking step: "Add the styling clay Maria uses — €18, ready at your appointment." Pre-paid via the same Stripe checkout as the deposit, picked up at the visit. No shipping.
- **Replenishment reminders — the killer feature.** Clay lasts ~2 months → 7 weeks after purchase: "Running low? Reserve one for your visit Tuesday." Same mechanic as rebooking automation, powered by purchase history. Creates a *recurring* product revenue stream that didn't exist before the app — strongest possible value proof.
- **Professional-attributed product sales.** Record which professional's booking a product was attached to; surface in statistics. Enables staff retail commissions — a feature owners actively want.
- **Bundles:** "Haircut + clay" kits at a small discount; product-inclusive gift cards.
- **QR code on the mirror/shelf** linking to the product page. Even in-store purchases routed through the app capture the purchase history that powers the replenishment loop — that's the real prize.
- **Platform cut:** the Stripe Connect application fee applies to product sales too — transaction revenue scales with retail GMV.

---

## 6. Platform Revenue (how the app makes YOU money)

- **Tiered subscriptions per tenant**, priced by number of professionals/seats.
  - Basic: bookings + reminders.
  - Pro: statistics, review requests, rebooking automation.
  - Premium: marketing campaigns, custom domain, API.
- **Payment take rate (the big one):** deposits/prepayments via **Stripe Connect** with a small application fee (1–2%) per transaction on top of Stripe's fee. Revenue grows automatically with tenants' success (the Fresha/Booksy model).
- **SMS credit margin:** SMS is already metered via `SMSLogger` — sell SMS bundles at a markup over provider cost. Marketing blasts make tenants want more credits.
- **Prove ROI to kill churn:** monthly owner report — "This month the app handled 84 bookings worth €2,340, saved ~12 no-shows (€360), brought back 6 lapsed clients." €30 subscription vs. €500 demonstrated value = nobody cancels.
- **Later: marketplace layer** — boosted listings / first-visit commission.

---

## 7. The "Stupid to Refuse" Offer (sales playbook)

No feature makes an offer irresistible. Owners refuse because of **effort, risk, and unproven monthly cost** — destroy those three:

1. **Walk in with their salon already built.** Multi-tenancy makes a new tenant nearly free: their name, logo from Instagram, services/prices from their price list, brand color — all set up *before* the meeting. Hand them a phone with their live booking page: "book yourself a haircut." Bring a laminated QR code. Refusing now means throwing away something they already own — loss aversion sells for you.
2. **Zero effort: done-for-you onboarding.** "Send me a photo of your appointment book — tomorrow every client and standing appointment is in the system." Owner never touches a settings page.
3. **Zero risk: free until it earns.** "Free until the app brings your first 20 bookings / prevents your first 5 no-shows. Then €30/month. Cancel anytime, export all your data." Marginal cost per tenant is ~zero (push is free; SMS deferred). Paying only *after* profiting is irrational to refuse.
4. **Price in haircuts, not euros.** "One no-show costs €25. The app costs one haircut a month and stops several."

### Features that make the demo undeniable
- **"Booked while you were closed" counter:** "€480 in appointments booked between 9pm and 8am this month — bookings your phone could never take." Trivial query (`created_at` vs. business hours); attacks pen-and-paper at its weakest point.
- **Live ROI ticker** front and center on the owner panel: "The app has earned you €___ so far." Also the free-tier graduation trigger ("you've hit €500 — time for the paid plan" feels earned).
- **Client no-show risk scores on the calendar:** "no-showed 3 of 5 times — deposit required automatically." Intelligence a paper book can't have.
- **Internal demo generator (for you):** punch in a salon's name, Instagram, price list → live tenant in 10 minutes. Your sales machine; highest-ROI internal tool.

**Warning:** "free until it earns" requires delivering in weeks. Build fast-win features first (review requests, after-hours booking) so the guarantee is safe.

Condensed pitch: *"Your salon is already live — here's the QR code. I'll load your clients tonight. You pay nothing until it's made you money, and the dashboard shows you the receipts. If it doesn't work, you've lost nothing and keep your client list."*

---

## 8. Honest Attribution (justifying "the app did this")

You can't prove a no-show that *didn't happen* — so don't claim it. Count observable events. If an owner ever catches an inflated number, the "here are the receipts" pitch dies.

### Layer 1 — Hard numbers (events with timestamps and sources)
- **Advance cancellations via the app link:** "14 clients cancelled *in advance* — without the app those are empty chairs you discover at 3pm."
- **Refilled slots** (especially via waitlist auto-offer): "9 cancelled slots re-filled = €270 recovered." Strongest number on the dashboard — booking A died, booking B took its place, both are database rows.
- **Expired unconfirmed bookings** (lifecycle cron): "6 slots freed from clients who would have ghosted" — the non-confirmation actually happened.
- **Kept deposits** on actual no-shows: literal money, literal Stripe record.
- **After-hours bookings, review clicks, referral redemptions, win-back returns** — all source-tagged events (e.g., "booked within 72h of the win-back SMS").

### Layer 2 — Rates, framed as before/after, clearly labeled
- **No-show rate over time:** "Month 1: 14%. Month 4: 5%." A trend the owner can verify, not a per-incident claim. Anchor against industry norm (salon no-show rates typically 10–20%).
- **Platform natural experiment** (once multiple tenants): "bookings that received a reminder no-show 3× less than bookings made too late to get one." Same salons, same clients — only difference is the reminder.

### Dashboard structure
- **"Earned & recovered"** — refilled slots, kept deposits, after-hours bookings, referral clients, win-back returns. Euro sum, every line item clickable down to the actual booking.
- **"Your trends"** — no-show rate, retention, review count. Curves, no euro claims.
- Never blur the two sections. "23 slots freed or refilled, worth €690 in recoverable time" is nearly as impressive as an inflated estimate and completely bulletproof.

### Implementation prerequisite (do this EARLY — data only accrues from the day it exists)
- `source` field on every booking (organic link, reminder SMS, win-back campaign, rebook prompt, waitlist offer, replenishment SMS, referral link).
- Status-change history (who/what/when cancelled).
- Small `attribution` log for SMS-link clicks.

---

## 9. SMS Provider Problem (no company yet, in development)

**In development, pay no one.** Refactor sending into a provider interface (`send(message, recipient) → result`), provider chosen by env var:

- **`mock` provider (dev, free):** writes to `sms_logs` as if sent, visible in the SMS admin dashboard. Develop/test all reminder/win-back logic with zero real SMS.
- **Twilio trial (dev, free, no company):** individual sign-ups allowed, free trial credit, sends only to verified numbers — perfect for testing to your own phone. Paid SMS to Greece ≈ $0.062/message (pricier than GatewayAPI, zero company paperwork). https://www.twilio.com/en-us/sms/pricing/gr
- **Vonage, Plivo, Telnyx:** also individual pay-as-you-go, no monthly minimum.
- **Keep the GatewayAPI code path as one more adapter** — cheapest for Greek delivery; switch back via env var when the company exists.

Make the problem smaller:
- **Web push is free and mostly built** (PWA, service worker, `notifications.ts`). Primary channel for installed users; SMS only as fallback → cuts SMS volume by more than half in production.
- **Email is nearly free** (`send_booking_email` exists; Resend has a generous individual free tier). Fine for confirmations; SMS/push matter mainly for the time-critical reminder.

**Caveat:** the "no company" constraint is temporary — Stripe billing, alphanumeric SMS sender registration, and reselling SMS credits will eventually need at least a sole proprietorship (ατομική επιχείρηση). Pick the adapter architecture, not a provider.

---

## 10. Priority Roadmap

1. **Stripe deposits with a platform fee (Stripe Connect).** One feature that cuts tenant no-shows, unlocks gift cards/packages/products, and creates transaction revenue.
2. **`source` attribution field + event logging.** Do it early — data only accrues from the day it exists. Powers the entire ROI story.
3. **Post-visit review-request + rebooking automations.** Nearly all plumbing exists (cron, SMS, completed status); highest tenant-visible ROI per hour of work. Fast wins that make "free until it earns" safe.
4. **One-tap confirm/cancel/reschedule links in SMS.** Biggest UX and no-show win.
5. **Actionable stats:** lapsed clients + win-back button, "booked while closed" counter, ROI ticker. Justifies the Pro tier.
6. **Product catalog + booking-flow add-ons**, then replenishment SMS on top of the rebooking automation.
7. **SMS provider adapter with mock mode** — unblocks all SMS-dependent development immediately.
8. **Internal demo-tenant generator** — the sales machine for signing new salons.
9. Later: referral program, last-minute deals page, waitlist, gift cards, marketplace.

### Tailoring per tenant (when going specific)
Key variables: **visit cadence** (rebooking timing), **average ticket size** (whether deposits make sense), and whether the bottleneck is **empty slots** (→ discovery/marketing features) or **no-shows** (→ deposits/reminders).
