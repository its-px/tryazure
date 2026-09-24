# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `my-app/`:

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview dist build
npm run test      # vitest run
npm run test:e2e  # Playwright booking-flow tests (mocked Supabase, see my-app/e2e/)
```

Supabase edge functions are Deno-based. Deploy with:
```bash
supabase functions deploy <function-name>
```

## Architecture

**RENDEZVOUS** is a multi-tenant appointment booking PWA. All active app code lives under `my-app/src/`.

### Multi-tenancy

The `tenants` table is the root of everything. Tenant is resolved on load in `TenantContext.tsx` by domain/slug. Every table (`services`, `professionals`, `bookings`, etc.) has a `tenant_id` FK and RLS policies scoped to it. `useResolvedColors()` merges the tenant's brand palette into the MUI theme.

### Role-based routing

`App.tsx` is the auth state machine. After Supabase auth (PKCE + Google OAuth), it reads the user's role from the `profiles` table and routes to the matching panel:
- `UserPanel` — booking wizard
- `AdminPanel` — platform admin
- `OwnerPanel` — tenant owner dashboard  
- `ProfessionalPanel` — professional's calendar/schedule

### Booking wizard

State lives in Redux (`src/slices/appSlice.ts`): `currentStep` and `userSelections`. Step components live in `src/assets/components/`. Framer Motion drives step animations.

### Backend

- **Supabase** (project: `qrvxmqksekxbtipdnfru`) — Postgres with RLS, auth, realtime
- **Edge Functions** (`supabase/functions/`) — Deno runtime. Key ones: `manage-booking-lifecycle` (cron, 15min), `send_booking_email` (Resend), `send-appointment-reminders`
- **SMS** — Gateway API via `BookingSMSService.ts`; multiple edge function iterations exist (`send-sms`, `send-sms-v2`, `send-sms-final`) — `send-sms-final` is current
- **Stripe** — tenants pay the platform (flat monthly plan, 30-day trial). Hosted Checkout + Customer Portal via the `billing` edge function; `stripe-webhook` (deploy `--no-verify-jwt`) syncs state into `tenant_billing` (owner SELECT only). `isTenantActive()` in `src/assets/components/billing.ts` gates OwnerPanel (7-day grace on failed payment); public booking is never gated
- **Stripe Connect** — client card payments at booking go to the tenant's own Standard account (direct charges via `booking-payment`; amount recomputed server-side). `stripe-webhook` also handles Connect events (`STRIPE_CONNECT_WEBHOOK_SECRET`). `bookings.payment_status` can only be changed by service role or the tenant owner (trigger `protect_booking_payment`)
- **Owner settings** — owners can't UPDATE `tenants` directly; use RPC `update_my_tenant(p_name, p_config)` (validates colors/URLs). Uploads go through `PhotoUploadField` (signature check + WebP re-encode; bucket `tenant-assets` limits type/size and folder = tenant_id)

### Environment variables

`VITE_` prefix = injected into browser bundle. Non-prefixed vars are edge-function-only — never reference them in client code.

Required in `my-app/.env`:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — client-side Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — edge functions only
- `RESEND_API_KEY` — email (edge functions only)
- `REACT_APP_GATEWAY_API_KEY/SECRET/TOKEN` — SMS gateway
- `SMS_API_KEY`, `SMS_SENDER` — SMS sender identity
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` — edge function secrets only

### i18n

Greek (`gr`) and English (`en`) locales under `src/locales/`. i18next configured in `src/i18n.ts`.
