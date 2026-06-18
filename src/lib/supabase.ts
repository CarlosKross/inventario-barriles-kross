import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

export async function signInAdmin(email: string, password: string): Promise<{ email: string; error?: string }> {
  if (!supabase) {
    if (!email.includes("@") || password.length < 4) {
      return { email, error: "Ingresa credenciales de administrador válidas." };
    }
    return { email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { email, error: error.message };
  return { email: data.user?.email ?? email };
}

export async function signOutAdmin(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}
