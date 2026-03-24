import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// MOCK values for frontend architecture MVP
// The user will replace these with real Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const auth = {
  signIn: async () => ({ user: { id: 'user-123', name: 'Partner 1' }, error: null }),
  signOut: async () => ({ error: null }),
  getSession: async () => ({ data: { session: null } })
};
