export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  birthdate: string; // YYYY-MM-DD
  age: number;
  zodiac: string;
  zodiac_icon: string;
  gender: string;
  gender_icon: string;
  orientation: string;
  orientation_icon: string;
  show_age: boolean;
  show_orientation: boolean;
  avatar_url: string;
  banner_url: string;
  bio: string;
  gustos: string[]; // array of hashtags
  looking_for: string;
  emotional_status: string;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string;
  country: string;
  created_at: string;
  language: string;
  is_admin: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  hashtags: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  likes: string[]; // IDs of profile likes
  shares: string[]; // IDs of profile shares
  profiles?: Profile; // Joins
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: Profile; // Joins
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_urls: string[];
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  status: 'sending' | 'sent' | 'read';
  deleted_for: string[]; // list of profile ids
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  post_id: string | null;
  reason: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  error_text: string;
  created_at: string;
  user_name?: string;
}
