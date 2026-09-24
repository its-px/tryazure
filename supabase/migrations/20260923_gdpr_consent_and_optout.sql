-- GDPR / Law 3471/2006 art. 11: record terms acceptance at signup, and give
-- every marketing message (rebooking nudge, review request, replenishment SMS)
-- a one-click opt-out. Recipients of those are always profiles, so the flag
-- lives there. unsubscribe_token is the unguessable key in the opt-out link.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unsubscribe_token_key ON profiles (unsubscribe_token);

-- Account deletion (delete-account edge function) anonymises bookings instead
-- of deleting them (tenants must keep records), so user_id must be nullable
-- and must not block deleting the auth user.
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE booking_status_history DROP CONSTRAINT IF EXISTS booking_status_history_changed_by_fkey;
ALTER TABLE booking_status_history ADD CONSTRAINT booking_status_history_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE waitlist_entries DROP CONSTRAINT IF EXISTS waitlist_entries_user_id_fkey;
ALTER TABLE waitlist_entries ADD CONSTRAINT waitlist_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_referred_by_fkey
  FOREIGN KEY (referred_by) REFERENCES profiles(id) ON DELETE SET NULL;
