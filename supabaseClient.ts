import { createClient } from '@supabase/supabase-js';

// Configuración de conexión a Supabase
const SUPABASE_URL = 'https://cjybonlhlkttpzagunxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqeWJvbmxobGt0dHB6YWd1bnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODg1NzksImV4cCI6MjA4MTI2NDU3OX0.2K6QpZEIx-gh_m6igHqnstQMlqKYE4Yyn6b0rSXjbbY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
