import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dokvlgzzlycwapitylua.supabase.co';
const supabaseKey = 'sb_publishable_i6mZ9NQsPoqA2aQrGg22PA_iGFjEwlC';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('admin_settings').select('contact_email').eq('id', 1).single();
  console.log('Contact Email in DB:', data?.contact_email);
  console.log('Error:', error);
}

run();
