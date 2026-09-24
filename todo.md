# TODO: things you need to do yourself

Work through these top to bottom. Use Stripe **test mode** first, then repeat the Stripe steps in live mode.

---

## 1. Tenant subscriptions (tenants pay you)

- [ ] **Set the real prices.** `PLANS` at the top of `my-app/src/assets/components/BillingPanel.tsx` has placeholders (€29 Basic, €59 Pro). Change them to match what you create in Stripe.
- [ ] **Stripe → Product catalog:** create a product with two monthly prices (Basic, Pro). Copy both `price_...` IDs.
- [ ] **Stripe → Settings → Billing → Customer portal:** turn it on. Allow: update payment method, cancel, switch plan (add both prices), view invoices.
- [ ] **Stripe → Developers → Webhooks → Add endpoint** ("Your account"):
  - URL: `https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/stripe-webhook`
  - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copy the signing secret (`whsec_...`). This is `STRIPE_WEBHOOK_SECRET`.

## 2. Client card payments (clients pay the tenant through Stripe Connect)

- [ ] **Stripe → Connect → Get started:** set up your platform profile. Choose "Platform" and let businesses use **Standard** accounts (they get their own full Stripe account, and refunds and disputes are theirs).
- [ ] **Stripe → Settings → Connect → Branding:** add your platform name, logo and colour. Tenants see these during onboarding.
- [ ] **Stripe → Developers → Webhooks → Add endpoint** ("Connected accounts"):
  - URL: the same `.../functions/v1/stripe-webhook`
  - Listen to: **Events on Connected accounts**
  - Events: `account.updated`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`
  - Copy its signing secret. This is `STRIPE_CONNECT_WEBHOOK_SECRET`.

## 3. Secrets + deploy (run from the repo root)

- [ ] Set the secrets:
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_CONNECT_WEBHOOK_SECRET=whsec_... STRIPE_PRICE_BASIC=price_... STRIPE_PRICE_PRO=price_...
  ```
- [ ] Deploy the functions:
  ```bash
  supabase functions deploy billing
  supabase functions deploy booking-payment
  supabase functions deploy stripe-webhook --no-verify-jwt
  ```

## 4. Database migrations (apply in this order)

- [ ] `supabase/migrations/20260922_add_tenant_billing.sql`: the `tenant_billing` table. Every business gets a 30-day trial.
- [ ] `supabase/migrations/20260922_owner_settings_and_client_payments.sql`: the owner settings RPC, payment columns on bookings, and anti-tampering trigger.
  - Run them with `supabase db push` or paste them into the Supabase SQL editor. You can also ask Claude to apply them through the Supabase connection.
  - This also fixes the **"Show location step" toggle in owner Settings, which never actually saved** (owners had no permission to update tenants).
- [ ] Deploy the frontend **after** the migrations. Card payments and the settings screen need them. Cash bookings keep working either way.

## 5. Git

- [ ] `.gitignore` excludes `*.sql` and `CLAUDE.md`, so force-add them when you commit:
  ```bash
  git add -f supabase/migrations/20260922_*.sql CLAUDE.md
  ```

## 6. Test (test mode)

Subscriptions:
- [ ] Owner → Billing → Subscribe with card `4242 4242 4242 4242`. The status should change to Active.
- [ ] Manage billing → cancel. The owner panel should lock to the Billing screen only, and the public booking page should still work.
- [ ] Subscribe with `4000 0000 0000 0341` (card that fails later). It should show "Payment failed" but keep access for 7 days.
- [ ] In the SQL editor, set a tenant's `tenant_billing.trial_ends_at` to yesterday. Its owner panel should lock.

Owner settings:
- [ ] Settings → change the name, address, hours and colour, then upload a logo. Check that the booking page and Info page update.
- [ ] Try uploading a renamed `.html` or `.svg` file as the logo. It should be rejected.
- [ ] Staff → add someone. They should appear in the booking wizard with Mon–Fri 9–17 hours.
- [ ] Staff → removing someone who has upcoming bookings should be blocked. Removing someone with no upcoming bookings should work.

Client payments:
- [ ] Settings → Connect Stripe → finish the test onboarding. It should say "Card payments are on".
- [ ] As a client, book → "Pay by card now" → pay with `4242...`. The owner's booking details should show "Card · Paid".
- [ ] Book again, choose card, then press back on the Stripe page. The booking should stay reserved and show "Card · Not paid yet".
- [ ] Refund that payment in the tenant's Stripe dashboard. The booking should change to "Refunded".
- [ ] Choose "Pay at venue". The booking should behave exactly as before.

## Later / optional

- [ ] Platform fee: add `application_fee_amount` in `supabase/functions/booking-payment/index.ts` if you ever want a cut of client payments.
- [x] Staff logins: done (Staff → "Invite to log in"; see below).
- [x] Unpaid card bookings are now auto-cancelled after 60 min (`manage-booking-lifecycle`).
- [x] Currency per tenant via `config.currency` (default EUR).

---

# Going public: GDPR / Greek compliance

The code side is done: consent banner, legal pages, unsubscribe, data export/delete, retention and self-hosted fonts. These steps are yours.

## Before launch (blockers)

- [ ] **Apply the migration before deploying the frontend:** `supabase/migrations/20260923_gdpr_consent_and_optout.sql`. The signup form writes `terms_accepted_at` / `marketing_opt_out`, so profile completion **fails** until the migration is applied.
- [ ] Deploy the new and changed functions:
  ```bash
  supabase functions deploy unsubscribe --no-verify-jwt
  supabase functions deploy delete-account
  supabase functions deploy send-rebooking-nudges
  supabase functions deploy send-review-requests
  supabase functions deploy send-replenishment-nudges
  supabase functions deploy manage-booking-lifecycle
  ```
- [ ] **Fill in your company details** in `COMPANY` at the top of `my-app/src/components/legalContent.ts`: legal name, address, ΑΦΜ, ΔΟΥ, ΓΕΜΗ, privacy email and phone. Also replace `[CITY]` (courts) in the terms, both EN and GR. Greek e-commerce law (ΠΔ 131/2003) requires these details on the site.
- [ ] **Have a lawyer review** the privacy policy, terms and DPA in the same file. They are solid templates, but not legal advice.
- [ ] **myDATA / e-invoicing (ΑΑΔΕ):** Stripe invoices alone don't count as Greek tax documents for your subscription fees. Connect an e-invoicing provider (e.g. Elorus, Oxygen, Epsilon Smart, which can sync with Stripe) or issue invoices from your accountant's system.
- [ ] **Accept the DPAs** of your processors (mostly a click in their dashboards): Supabase, Stripe, Resend, GatewayAPI, PostHog, Crisp. Check that Supabase and PostHog use EU regions.

## Soon after

- [ ] **Record of processing activities (GDPR art. 30):** a one-page spreadsheet listing what data, why, legal basis, retention and processors. You can copy the privacy policy sections.
- [ ] **Data-breach procedure:** write down who does what. Breaches must be reported to the ΑΠΔΠΧ within 72h (https://www.dpa.gr).
- [ ] **Supabase backups:** move to a paid plan with daily backups/PITR before paying customers arrive.
- [ ] **CSP:** `public/_headers` ships `Content-Security-Policy-Report-Only`. After deploying, click through the app (booking, login, Stripe, Crisp, map) with DevTools open. If no CSP violations show in the console, rename the header to `Content-Security-Policy`.
- [ ] Owner-account deletion is handled by support. Business accounts can't self-delete, because they hold tenant data. Handle those requests manually within 1 month.
- [ ] Accessibility: the European Accessibility Act has applied since 28 June 2025. Microenterprises (<10 staff and ≤€2M turnover) are exempt, but a quick pass (contrast, keyboard, labels) is cheap insurance.

---

# Going public: product and ops

## Apply migrations (staging branch first, then prod, in this order)

- [ ] `20260922_add_tenant_billing.sql` and `20260922_owner_settings_and_client_payments.sql`. These are **not applied in prod yet**: card payments and the trial row for new signups depend on them.
- [ ] `20260923_gdpr_consent_and_optout.sql`. Apply it **before** deploying the frontend, because signup writes its columns.
- [ ] `20260924_staff_logins.sql`: staff logins, plus the booking policies ProfessionalPanel is missing (today a logged-in professional sees no bookings).
- [ ] `20260925_tighten_tenant_rls.sql`: **security fix.** Right now any client with a `tenant_id` can edit or delete their business's staff, hours and SMS templates through the API. Owners can also read *other* businesses' SMS logs. After applying, test booking with products, joining the waitlist, the owner staff and hours screens, and ProfessionalPanel.
- [ ] Use a **Supabase staging branch** (Dashboard → Branches) and run these there first.

## Deploy functions

```bash
supabase functions deploy create-tenant
supabase functions deploy invite-staff
supabase functions deploy booking-payment
supabase functions deploy manage-booking-lifecycle
```

## Self-serve signup (`<slug>.pxbs.site`)

- [ ] **DNS:** add a wildcard `*.pxbs.site` record (CNAME/A) pointing at your host. `pxbs.site` itself serves the landing page.
- [ ] **Hosting:** add `*.pxbs.site` as a wildcard custom domain with a wildcard TLS certificate. Netlify requires Netlify DNS for this. Cloudflare Pages needs a Worker route or proxy.
- [ ] **Supabase Auth → URL Configuration → Redirect URLs:** add `https://pxbs.site/**` and `https://*.pxbs.site/**`. This covers OAuth returns and staff invite links.
- [ ] **Supabase Auth email templates / SMTP:** check the "Invite user" email, which staff invites use.
- [ ] After signup, owners sign in a **second time** on their subdomain, because sessions don't cross domains. This is on purpose, and the UI says so.
- [ ] Create `hello@pxbs.site` (the landing page contact) and a privacy address. Put the privacy address in `legalContent.ts`.

## Monitoring

- [ ] **Sentry:** create a project in the **EU region (de.sentry.io)**. Set `VITE_SENTRY_DSN` in the hosting env. Turn on "Prevent storing of IP addresses" and sign Sentry's DPA. Without the DSN, Sentry stays off.
- [ ] **Uptime:** set up a free UptimeRobot or Better Stack check. Use a keyword check on a tenant booking page, plus an HTTP check on `https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/booking-payment` (a 401 means it's up). Also watch the `manage-booking-lifecycle` cron history in Supabase.

## Notes / later

- Tenant pages set their title, OG tags and LocalBusiness JSON-LD in the browser. Google reads them, but WhatsApp/Facebook link previews show the generic RENDEZVOUS tags. Fixing that needs an edge or SSR step.
- `sitemap.xml` covers only the main domain. A per-tenant sitemap would need a function that lists `tenants.domain`.
- Currency can be set per tenant (`config.currency`), but the client UI still shows €.
- Staff whose email already has an account get an error on invite. Linking those needs an accept-invite flow.
- Unpaid card bookings are auto-cancelled 60 minutes after creation. Checkout links expire after 30 minutes.
