import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://dndsodarfrolbztdesxh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1OLKklZ5K8HN17RC22m4nQ_PBtZvg8o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log("Profiles:", data);
}
run();
