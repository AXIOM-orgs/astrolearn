'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && !loading) {
            router.replace('/');
        }
    }, [user, loading, router]);

    const resolveEmail = async (input: string) => {
        if (input.includes('@')) return input.toLowerCase();

        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', input)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Username not found!');

        return data.email.toLowerCase();
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const email = await resolveEmail(identifier.trim());
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Google login failed.');
            setIsLoading(false);
        }
    };

    // Shared styles for cleaner JSX
    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem',
        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
        fontSize: '0.95rem',
        background: 'rgba(10, 10, 15, 0.6)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        transition: 'all 0.2s ease',
        outline: 'none'
    };

    return (
        <section className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '16px' }}>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 className="neon-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                        Login
                    </h1>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255, 0, 110, 0.15)',
                        border: '1px solid rgba(255, 0, 110, 0.3)',
                        color: '#ffb3c6',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}



                {/* Google Button - Moved to Top */}
                <button
                    onClick={handleGoogleLogin}
                    className="option-btn"
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        background: 'white',
                        color: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                        marginBottom: '1.5rem',
                        whiteSpace: 'nowrap'
                    }}
                    disabled={isLoading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Email or Username
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Enter email or username"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.5rem',
                            fontSize: '1rem'
                        }}
                    >
                        <span>{isLoading ? 'Processing...' : 'Login'}</span>
                        <div className="btn-glow"></div>
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <span style={{
                        color: 'var(--text-secondary)',
                        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                        fontSize: '0.85rem'
                    }}>
                        Don't have an account?{' '}
                        <a
                            href="https://gameforsmart2026.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: 'var(--primary-color)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            Register here
                        </a>
                    </span>
                </div>
            </div>
        </section>
    );
}
