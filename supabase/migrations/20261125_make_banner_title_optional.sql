-- ============================================================================
-- MIGRATION: Make Banner Title Optional in public.ssc_banners
-- Date: 2026-11-25
-- Description:
--   Allows promotional carousel banners to be created/saved without a mandatory
--   title (pure image graphic banners).
-- ============================================================================

-- 1. Drop NOT NULL constraint on title in ssc_banners
ALTER TABLE public.ssc_banners ALTER COLUMN title DROP NOT NULL;

-- 2. Ensure default value is empty string or NULL
ALTER TABLE public.ssc_banners ALTER COLUMN title SET DEFAULT '';
