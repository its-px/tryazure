# Professional Page Plan

This document defines the first version of a professional-only dashboard for the booking app. The goal is to give a signed-in professional access only to their own schedule, their own bookings, and their own metrics without exposing tenant-wide data.

## Scope

The professional page should let a professional:

- see only their own bookings
- confirm a pending booking
- decline or cancel a booking
- mark a booking as completed
- delete one of their own bookings if needed
- manage only their own weekly working hours
- see summary stats for only their own data

The professional page should not let them:

- switch to another professional
- view all tenant bookings
- edit store-wide availability dates
- edit another professional's working hours
- access owner/admin dashboards

## Routing And Access

- Add a new role value: `professional`
- Redirect authenticated professionals away from `/` and `/bookings` to `/professional`
- Protect `/professional` so only the `professional` role can enter
- Keep admin and owner routing unchanged

## Identity Model

Use `session.user.user_metadata.professional_code` as the identity source for v1.

Why:

- It is explicit and does not require guessing from names
- It matches the current booking model where `professional_id` is a string code

Required rule:

- If `professional_code` is missing, the page must stop and show a clear setup/error state

## Data Rules

Every professional query must be scoped by both:

- `professional_id = professional_code`
- `tenant_id = current tenant id`

This applies to:

- bookings
- professional_hours
- any stats derived from bookings

## UX Structure

The page should include:

- a header with the professional name and logout button
- a stats section
- a bookings section with statuses and actions
- a weekly schedule editor for `professional_hours`
- a dialog for booking details and customer contact info

Suggested secondary features for later:

- upcoming bookings count
- canceled booking count
- completed booking count
- today/tomorrow schedule summary
- export of own booking list

## What Could Go Wrong

- `professional_code` is missing or wrong in user metadata, which would block access or show the wrong data.
- A query forgets the `tenant_id` filter and leaks another tenant's records.
- A query forgets the `professional_id` filter and leaks another professional's records.
- The UI filters correctly but the backend still allows direct REST reads or writes, so data isolation is not actually secure.
- A professional deletes or cancels the wrong booking because the dialog is not clearly tied to the selected record.
- Weekly hours edits overwrite the wrong professional if the save filter is too broad.
- Stats are accidentally computed from all tenant bookings instead of only the professional's own bookings.
- The role redirect is incomplete, causing a professional to land on the user panel instead of their dashboard.

## Mitigations

- Hard stop on missing `professional_code`.
- Filter every query with both `professional_id` and `tenant_id`.
- Keep destructive actions behind a confirmation dialog.
- Do not render a professional switcher in the professional panel.
- Reuse existing booking status update patterns but apply them only to the selected booking.
- Validate with manual login tests for professional, owner, admin, and user roles.

## Rollout Plan

1. Add routing and role support for `professional`.
2. Add the new `ProfessionalPanel` page.
3. Wire own-bookings, schedule, and stats.
4. Validate build and role redirects.
5. Review whether server-side RLS rules should be tightened for professional-specific reads and writes.

## Test Checklist

- Professional login redirects to `/professional`.
- `/admin` and `/owner` stay blocked for professional users.
- Professional sees only bookings where `professional_id` matches their code.
- Professional can confirm, decline/cancel, complete, and delete only their own bookings.
- Professional can edit only their own weekly hours.
- Stats match only the professional's filtered bookings.
- Missing `professional_code` shows a safe blocking state.