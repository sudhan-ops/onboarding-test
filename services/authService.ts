


import { supabase } from './supabase';
import type { User as AppUser } from "../types";
import type { Session, User as SupabaseUser, SignUpWithPasswordCredentials } from '@supabase/supabase-js';

export const getAppUserProfile = async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
  try {
    let { data, error } = await supabase
      .from('users')
      .select('*, role_id')
      .eq('id', supabaseUser.id)
      .single();

    // If profile not found, create one on the fly. This handles the first login after signup.
    if (error && error.code === 'PGRST116') { // PGRST116: Row not found
      const newUserProfile = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata.name || 'New User',
          email: supabaseUser.email!,
          role_id: 'unverified'
      };

      const { data: createdData, error: insertError } = await supabase
          .from('users')
          .insert(newUserProfile)
          .select('*, role_id')
          .single();

      if (insertError) {
          console.error("Error creating user profile on-the-fly:", insertError.message, insertError);
          return null; // Creation failed, login fails.
      }
      
      data = createdData;
      error = null; // Clear the "not found" error
    }


    if (error) {
      console.error("Error fetching app profile:", error.message, error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: supabaseUser.email || '',
      phone: data.phone,
      role: data.role_id, // Use role_id
      organizationId: data.organization_id,
      organizationName: data.organization_name,
      reportingManagerId: data.reporting_manager_id,
      photoUrl: data.photo_url,
    };
  } catch (e) {
    console.error("Exception fetching profile:", e);
    return null;
  }
};

const signInWithPassword = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

const signUpWithPassword = async (credentials: SignUpWithPasswordCredentials) => {
    const { email, password, options } = credentials;
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            ...options,
            emailRedirectTo: `${window.location.origin}/`,
        },
    });
};

// This would be a Supabase Edge Function in a real project
const approveUser = async (userId: string, newRole: string) => {
    return await supabase.from('users').update({ role_id: newRole }).eq('id', userId);
};

const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        }
    });
};

const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error signing out:", error.message);
    }
};

const resetPasswordForEmail = async (email: string) => {
     const redirectTo = `${window.location.origin}/#/auth/update-password`;
     return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    });
};

const updateUserPassword = async (password: string) => {
    return await supabase.auth.updateUser({ password });
};

export const authService = {
    getAppUserProfile,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    resetPasswordForEmail,
    updateUserPassword,
    approveUser,
};