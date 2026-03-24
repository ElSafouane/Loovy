-- Mock Schema reference for Supabase

-- PROFILES
-- Contains user basic info
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  location TEXT,
  timezone TEXT,
  current_mood TEXT,
  partner_id UUID REFERENCES profiles(id)
);

-- MESSAGES / STATUS
-- Quick "thinking of you" messages or status updates
CREATE TABLE status_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  message TEXT,
  type TEXT, -- e.g., 'quick_message', 'mood_update'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ACTIVITIES
-- Dates, movie nights, games
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id UUID, -- Or a logic binding two partner_ids
  title TEXT,
  description TEXT,
  activity_type TEXT, -- 'movie', 'game', 'date'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'planned'
);

-- MEMORIES
-- Photos and timeline events
CREATE TABLE memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  image_url TEXT,
  caption TEXT,
  is_time_capsule BOOLEAN DEFAULT FALSE,
  unlock_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
