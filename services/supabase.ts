import { createClient } from '@supabase/supabase-js';

// The application was unable to load Supabase credentials from environment variables,
// causing "Failed to fetch" errors. Using the credentials provided for the project.
export const supabaseUrl = 'https://fmyafuhxlorbafbacywa.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteWFmdWh4bG9yYmFmYmFjeXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjg1NDYsImV4cCI6MjA3NzgwNDU0Nn0.RqsniEqzNec6ww35TXJtLJD3mafnGbMI82om4XRUdUU';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "Supabase credentials are not set. API calls to Supabase will fail. "
    );
}

// Main client for all requests
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // Set to true for standard web app behavior
        autoRefreshToken: true,
        detectSessionInUrl: true,
    }
});
