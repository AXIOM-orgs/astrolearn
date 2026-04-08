'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface SoundSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SoundSettingsDialog({ open, onOpenChange }: SoundSettingsDialogProps): React.JSX.Element | null {
    const pathname = usePathname();
    const isHost = pathname.startsWith('/host');
    const [bgmEnabled, setBgmEnabled] = useState(isHost);
    const [sfxEnabled, setSfxEnabled] = useState(isHost);
    const t = useTranslations('SoundSettings');
    const tc = useTranslations('Common');
    
    // Fitur terbaru: Mendukung deteksi RTL untuk bahasa tertentu (misal: Arab)
    const locale = useLocale();
    const isRtl = locale === 'ar';

    // Load initial state and add event listeners
    useEffect(() => {
        if (open) {
            const savedBgm = localStorage.getItem('cosmicquest_bgm_enabled');
            const savedSfx = localStorage.getItem('cosmicquest_sfx_enabled');
            
            if (savedBgm !== null) {
                setBgmEnabled(savedBgm === 'true');
            } else {
                setBgmEnabled(isHost);
            }
            
            if (savedSfx !== null) {
                setSfxEnabled(savedSfx === 'true');
            } else {
                setSfxEnabled(isHost);
            }
        }

        const handleSoundChange = (e: any) => {
            if (e.detail?.type === 'bgm') {
                setBgmEnabled(e.detail.enabled);
            } else if (e.detail?.type === 'sfx') {
                setSfxEnabled(e.detail.enabled);
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'cosmicquest_bgm_enabled') {
                setBgmEnabled(e.newValue === 'true');
            } else if (e.key === 'cosmicquest_sfx_enabled') {
                setSfxEnabled(e.newValue === 'true');
            }
        };

        window.addEventListener('cosmicquest_sound_settings_changed', handleSoundChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('cosmicquest_sound_settings_changed', handleSoundChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [open]);

    // Keyboard escape handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };

        if (open) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onOpenChange]);

    const handleToggleBgm = () => {
        const newValue = !bgmEnabled;
        setBgmEnabled(newValue);
        localStorage.setItem('cosmicquest_bgm_enabled', newValue.toString());
        window.dispatchEvent(new CustomEvent('cosmicquest_sound_settings_changed', { 
            detail: { type: 'bgm', enabled: newValue }
        }));
    };

    const handleToggleSfx = () => {
        const newValue = !sfxEnabled;
        setSfxEnabled(newValue);
        localStorage.setItem('cosmicquest_sfx_enabled', newValue.toString());
        window.dispatchEvent(new CustomEvent('cosmicquest_sound_settings_changed', { 
            detail: { type: 'sfx', enabled: newValue }
        }));
    };

    const handleClose = (): void => {
        onOpenChange(false);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!open) return null;

    return (
        <div className="cyan-dialog-overlay" onClick={handleBackdropClick}>
            <div className="cyan-dialog-content" style={{ maxWidth: '400px' }}>

                {/* Header dengan dukungan RTL */}
                <div className="cyan-dialog-header" dir={isRtl ? 'rtl' : 'ltr'}>
                    <h2 className="cyan-dialog-title" style={{ fontSize: '1.2rem', justifyContent: 'center' }}>
                        {t('title')}
                    </h2>
                </div>

                <button
                    onClick={handleClose}
                    className="cyan-dialog-close-button"
                    title={tc('close')}
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col z-10 px-6 py-4 gap-4">
                    
                    {/* BGM Toggle */}
                    <div 
                        onClick={handleToggleBgm}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'rgba(13, 27, 42, 0.4)',
                            border: `1px solid ${bgmEnabled ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: bgmEnabled ? '0 0 10px rgba(0, 212, 255, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={bgmEnabled ? '#00d4ff' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }}>
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                            <span style={{ 
                                color: bgmEnabled ? '#fff' : 'rgba(129, 129, 129, 1)', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                fontFamily: 'var(--font-orbitron)'
                            }}>
                                {t('bgm')}
                            </span>
                        </div>
                        
                        <div style={{ 
                            position: 'relative', 
                            width: '46px', 
                            height: '24px', 
                            background: bgmEnabled ? '#00d4ff' : 'rgba(255,255,255,0.2)', 
                            borderRadius: '12px', 
                            transition: 'all 0.3s ease', 
                            flexShrink: 0 
                        }}>
                            <div style={{ 
                                position: 'absolute', 
                                top: '2px', 
                                left: bgmEnabled ? '24px' : '2px', 
                                width: '20px', 
                                height: '20px', 
                                background: '#fff', 
                                borderRadius: '50%', 
                                transition: 'all 0.3s ease', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)' 
                            }} />
                        </div>
                    </div>

                    {/* SFX Toggle */}
                    <div 
                        onClick={handleToggleSfx}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'rgba(13, 27, 42, 0.4)',
                            border: `1px solid ${sfxEnabled ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: sfxEnabled ? '0 0 10px rgba(0, 212, 255, 0.2)' : 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sfxEnabled ? '#00d4ff' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }}>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                            <span style={{ 
                                color: sfxEnabled ? '#fff' : 'rgba(129, 129, 129, 1)', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                fontFamily: 'var(--font-orbitron)'
                            }}>
                                {t('sfx')}
                            </span>
                        </div>
                        
                        <div style={{ 
                            position: 'relative', 
                            width: '46px', 
                            height: '24px', 
                            background: sfxEnabled ? '#00d4ff' : 'rgba(255,255,255,0.2)', 
                            borderRadius: '12px', 
                            transition: 'all 0.3s ease', 
                            flexShrink: 0 
                        }}>
                            <div style={{ 
                                position: 'absolute', 
                                top: '2px', 
                                left: sfxEnabled ? '24px' : '2px', 
                                width: '20px', 
                                height: '20px', 
                                background: '#fff', 
                                borderRadius: '50%', 
                                transition: 'all 0.3s ease', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)' 
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}