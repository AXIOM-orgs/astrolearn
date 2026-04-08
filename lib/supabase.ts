import { createClient } from "@supabase/supabase-js"

/**
 * Simpan refresh_token ke shared cookie (.gameforsmart.com)
 * Cookie ini kecil (~50 byte), jauh di bawah batas 4KB
 */
export function syncSessionCookie(refreshToken: string | null) {
    if (typeof document === 'undefined') return;
    const hostname = window.location.hostname;
    const isGfs = hostname.endsWith('gameforsmart.com');
    const isHttps = window.location.protocol === 'https:';

    if (!refreshToken) {
        // Hapus cookie
        let cookieStr = `gfs-rt=; path=/; max-age=0`;
        if (isGfs) cookieStr += `; domain=.gameforsmart.com`;
        document.cookie = cookieStr;
        return;
    }

    const parts = [
        `gfs-rt=${encodeURIComponent(refreshToken)}`,
        `path=/`,
        `max-age=${60 * 60 * 24 * 365}`,
        `SameSite=Lax`,
    ];
    if (isGfs) parts.push(`domain=.gameforsmart.com`);
    if (isHttps) parts.push(`Secure`);
    document.cookie = parts.join('; ');
}

/**
 * Baca refresh_token dari shared cookie
 */
export function getRefreshTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split('; ');
    const found = cookies.find(c => c.startsWith('gfs-rt='));
    if (!found) return null;
    const eqIndex = found.indexOf('=');
    return decodeURIComponent(found.substring(eqIndex + 1));
}

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Gunakan localStorage default (aman untuk semua ukuran sesi)
        storageKey: 'gfs-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});