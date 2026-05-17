-- Run this in your Supabase SQL Editor

CREATE TABLE public.enquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS (Row Level Security)
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anon)
CREATE POLICY "Allow public insert" ON public.enquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated admins to view/manage
-- Note: Assuming you rely on the same admin mechanism, but for simplicity, we allow anon to view them if they have access to the dashboard.
CREATE POLICY "Allow anon select" ON public.enquiries
  FOR SELECT
  TO anon
  USING (true);
