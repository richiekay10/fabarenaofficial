import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ukkkahncnkmfkpvgfcmn.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVra2thaG5jbmttZmtwdmdmY21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzMwOTEsImV4cCI6MjEwMjkwOTA5MX0.MZ6VpldYi0KnRgVi6YizzvTP9WiniH9dUvpTV37QZM0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
