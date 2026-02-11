import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrlGame = process.env.NEXT_PUBLIC_SUPABASE_URL_GAME;
const supabaseAnonKeyGame = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseAnonKey) throw new Error("Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!supabaseUrlGame) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_GAME");
if (!supabaseAnonKeyGame) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_GAME");

// supabaseGame: Non-aktifkan auto-refresh auth karena game DB tidak butuh auth user
// Ini mencegah error bad_jwt saat client mencoba validasi token ke supabase game
export const supabaseGame = createClient(supabaseUrlGame, supabaseAnonKeyGame, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);