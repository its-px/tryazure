-- One-tap confirm/cancel links in SMS need a per-booking secret token
-- (not guessable from the booking id) that the public booking-sms-action
-- edge function validates before mutating status.
ALTER TABLE bookings ADD COLUMN sms_action_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX bookings_sms_action_token_idx ON bookings (sms_action_token);
