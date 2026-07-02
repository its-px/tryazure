-- Add photo_url columns for product catalog and professional photos.
-- Storage RLS on tenant-assets (public read, owner/admin write) already
-- exists from a prior migration — no new storage policies needed here.
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS photo_url text;
