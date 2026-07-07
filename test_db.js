import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://dndsodarfrolbztdesxh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1OLKklZ5K8HN17RC22m4nQ_PBtZvg8o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const profile = {
    id: "test-user-1234",
    first_name: "John",
    last_name: "Doe",
    username: "johndoe",
    birthdate: "2000-01-01",
    age: 26,
    zodiac: "Capricornio",
    zodiac_icon: "♑",
    gender: "hombre",
    gender_icon: "♂️",
    orientation: "hetero",
    orientation_icon: "✨",
    show_age: true,
    show_orientation: true,
    avatar_url: "",
    banner_url: "",
    bio: "Test",
    gustos: ["#music"],
    looking_for: "amistad",
    emotional_status: "soltero",
    location_lat: 0,
    location_lng: 0,
    location_name: "Test",
    country: "Test",
    language: "es",
    is_admin: false
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert([profile])
    .select();

  console.log("Data:", data);
  console.log("Error:", JSON.stringify(error, null, 2));
}
run();
