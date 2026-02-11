'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && !loading) {
            const pendingCode = localStorage.getItem('pendingRoomCode');
            if (pendingCode) {
                localStorage.removeItem('pendingRoomCode');
                router.replace(`/`);
            } else {
                router.replace('/');
            }
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
            // router.push('/'); // Handled by useEffect
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
        padding: '0.75rem 1rem 0.75rem 2.8rem', // Added left padding for icon
        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
        fontSize: '0.95rem',
        background: 'rgba(0, 0, 0, 0.4)', // Darker background
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        transition: 'all 0.2s ease',
        outline: 'none'
    };

    const iconStyle = {
        position: 'absolute' as 'absolute',
        left: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-secondary)',
        pointerEvents: 'none' as 'none'
    };

    // 3D Button Styles (extracted for reuse if needed, or kept inline for clarity)
    const googleBtnStyle: React.CSSProperties = {
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '0.85rem',
        fontSize: '1rem',
        fontWeight: 600,
        // Gradient background for a subtle colorful effect (light blue/purple hint)
        background: 'linear-gradient(to bottom, #ffffff 0%, #f0f4f8 100%)',
        color: '#333',
        border: 'none',
        // 3D Border Bottom
        borderBottom: '4px solid #b0b8c4',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'transform 0.1s ease, border-bottom 0.1s ease, box-shadow 0.2s ease',
        marginBottom: '1.25rem',
        whiteSpace: 'nowrap',
        fontFamily: "'Poppins', sans-serif",
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    };

    const loginBtnStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.85rem',
        marginTop: '0.5rem',
        fontSize: '1rem',
        fontFamily: "var(--font-orbitron), 'Orbitron', sans-serif",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        background: 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)', // Cyan Gradient (Top Light -> Bottom Dark)
        border: 'none',
        borderBottom: '4px solid #0891b2', // Darker Cyan/Teal
        borderRadius: '12px',
        color: 'white',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.1s ease'
    };

    return (
        <section className="screen active login-page-bg" style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Brand Logos - Outside Card */}
            <img
                className="desktop-view"
                src="/assets/logo2.webp"
                alt="Astro Learning"
                style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', height: '60px', objectFit: 'contain' }}
            />
            <img
                className="desktop-view"
                src="/assets/logo.webp"
                alt="Gameforsmart Logo"
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', height: '70px', objectFit: 'contain' }}
            />

            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '1.5rem',
                    borderRadius: '24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.5)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Glossy Overlay for extra 3D feel */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    transform: 'rotate(45deg)',
                }}></div>

                <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                    <h1 className="neon-title" style={{
                        fontSize: '3rem',
                        marginBottom: '0.25rem',
                        letterSpacing: '0.1rem',
                        fontWeight: '800',
                        background: 'linear-gradient(180deg, #E0F7FA 0%, #00E5FF 100%)', // White/Light Cyan to Cyan
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.5))'
                    }}>
                        LOGIN
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

                {/* Google Button - 3D Gradient & Poppins */}
                <button
                    onClick={handleGoogleLogin}
                    style={googleBtnStyle}
                    onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'translateY(2px)';
                        e.currentTarget.style.borderBottom = '2px solid #b0b8c4';
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderBottom = '4px solid #b0b8c4';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderBottom = '4px solid #b0b8c4';
                    }}
                    disabled={isLoading}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                            EMAIL OR USERNAME
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={iconStyle} />
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter your email or username"
                                required
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                            PASSWORD
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={iconStyle} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                style={{ ...inputStyle, paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={loginBtnStyle}
                        onMouseDown={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(2px)';
                                e.currentTarget.style.borderBottom = '2px solid #0891b2';
                            }
                        }}
                        onMouseUp={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderBottom = '4px solid #0891b2';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderBottom = '4px solid #0891b2';
                            }
                        }}
                    >
                        <span>{isLoading ? 'Processing...' : 'Login'}</span>
                        <div className="btn-glow"></div>
                    </button>
                </form>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                    <span style={{
                        color: 'var(--text-secondary)',
                        fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                        fontSize: '0.8rem'
                    }}>
                        Don't have an account?{' '}
                        <a
                            href="https://gameforsmart2026.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#22d3ee', // Lighter Cyan
                                fontWeight: '700', // Bold
                                textDecoration: 'none', // Remove underline
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' // Cyan Glow
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.color = '#67e8f9'; // Even lighter on hover
                                e.currentTarget.style.textShadow = '0 0 15px rgba(103, 232, 249, 0.8)';
                                e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.color = '#22d3ee';
                                e.currentTarget.style.textShadow = '0 0 10px rgba(34, 211, 238, 0.5)';
                                e.currentTarget.style.textDecoration = 'none';
                            }}
                        >
                            Register here
                        </a>
                    </span>
                </div>
            </div>
        </section>
    );
}
