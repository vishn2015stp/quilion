-- Run this in your Supabase SQL Editor to add the status column

ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Also ensure the admin_settings has anon update access if it doesn't already,
-- but mainly this script just adds the status column for the enquiries tracking.
