-- Run this in your Supabase SQL Editor to add session tracking columns

ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS session_token text,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone;
