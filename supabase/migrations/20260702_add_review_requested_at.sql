-- Tracks whether a post-visit review request has already been sent for a
-- booking, so the daily cron job can't double-send.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;
