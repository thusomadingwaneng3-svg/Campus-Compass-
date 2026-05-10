import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akhavwcwnjqjkklufyzj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraGF2d2N3bmpxamtrbHVmeXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzMxMjYsImV4cCI6MjA5MjQ0OTEyNn0.1hgRzopQnQUqK3RXJXgSSwx3dtIoywSAizusjX8D4X8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);