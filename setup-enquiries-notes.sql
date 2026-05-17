-- Run this in your Supabase SQL Editor to add the admin_notes column

ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS admin_notes text;
