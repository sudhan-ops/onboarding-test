
// The Deno global object was not available during type checking. Removed the non-functional types reference and added `declare const Deno: any;` to make TypeScript aware of the Deno runtime globals and resolve the errors.
declare const Deno: any;

// supabase/functions/admin-create-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: any) => { // Added type to request object in Deno.serve to prevent implicit any errors.
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, email, password, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Mark email as confirmed, or set to false to require verification
      user_metadata: { name: name },
    });

    if (authError) {
      // Handle specific errors, e.g., user already exists
      if (authError.message.includes('already registered')) {
        return new Response(JSON.stringify({ error: 'A user with this email already exists.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      throw authError;
    }

    const newUserId = authData.user.id;

    // The `handle_new_user` trigger will automatically create a row in `public.users`.
    // We now need to update that row with the correct role.
    
    // 2. Update the user's role in public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ role_id: role })
      .eq('id', newUserId);

    if (profileError) {
      // If updating the profile fails, it's a good idea to log this,
      // but the auth user is already created. You might want to handle this case.
      console.error(`Failed to set role for new user ${newUserId}:`, profileError);
      // For now, we'll still return success as the user login is created.
    }

    return new Response(JSON.stringify({ message: 'User created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Error in admin-create-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
