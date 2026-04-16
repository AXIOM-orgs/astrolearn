'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialog } from '@/context/AlertContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    onLogoutClick?: () => void;
    onSoundClick?: () => void;
}

export function ProfileMenu({ isOpen, onClose, username, onLogoutClick, onSoundClick }: ProfileMenuProps): React.JSX.Element {
    const menuRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const { showInfo } = useDialog();
    const t = useTranslations('ProfileSidebar');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const router = useRouter();

    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Initial sound state
    useEffect(() => {
        const savedBgm = localStorage.getItem('bgm_enabled');
        const savedSfx = localStorage.getItem('sfx_enabled');
        
        if (savedBgm !== null) {
            setSoundEnabled(savedBgm === 'true');
        } else if (savedSfx !== null) {
            setSoundEnabled(savedSfx === 'true');
        } else {
            setSoundEnabled(false);
        }

        const handleSoundChange = (e: any) => {
            if (e.detail?.type === 'bgm' || e.detail?.type === 'sfx') {
                setSoundEnabled(e.detail.enabled);
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'bgm_enabled' || e.key === 'sfx_enabled') {
                setSoundEnabled(e.newValue === 'true');
            }
        };

        window.addEventListener('sound_settings_changed', handleSoundChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('sound_settings_changed', handleSoundChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            // Check if click is outside main menu
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                const profileBtn = document.querySelector('.profile-indicator');
                if (profileBtn && profileBtn.contains(event.target as Node)) {
                    return;
                }
                onClose();
            }
            
            // Check if click is outside language dropdown
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleLanguageSelect = (newLocale: string): void => {
        if (newLocale !== locale) {
            document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
            router.refresh();
        }
        setIsLanguageDropdownOpen(false);
    };

    const languages = [
        { code: 'en', label: 'EN' },
        { code: 'id', label: 'ID' },
        { code: 'ar', label: 'AR' }
    ];

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    const handleToggleSound = (e: React.MouseEvent): void => {
        e.stopPropagation(); // Prevent closing menu on some devices if menu-item click is handled differently
        
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        
        localStorage.setItem('bgm_enabled', newValue.toString());
        localStorage.setItem('sfx_enabled', newValue.toString());
        
        window.dispatchEvent(new CustomEvent('sound_settings_changed', { 
            detail: { type: 'bgm', enabled: newValue }
        }));
        window.dispatchEvent(new CustomEvent('sound_settings_changed', { 
            detail: { type: 'sfx', enabled: newValue }
        }));
    };

    const handleLogoutClick = (): void => {
        onClose();
        if (onLogoutClick) {
            onLogoutClick();
        }
    };

    if (!isOpen) return <></>;

    return (
        <div ref={menuRef} className="profile-menu">
            {/* Language Selection Dropdown */}
            <div 
                className={`custom-dropdown profile-lang-dropdown ${isLanguageDropdownOpen ? 'open' : ''}`} 
                ref={langDropdownRef}
                style={{ width: '100%', marginBottom: '12px' }}
            >
                <div 
                    className="dropdown-trigger" 
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                            <img 
                                src={locale === 'en' ? '/assets/flag/us.webp' : locale === 'id' ? '/assets/flag/id.webp' : '/assets/flag/arab.jpg'} 
                                alt="Flag" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span style={{ letterSpacing: '1px' }}>{t('language')} ({currentLang.label})</span>
                    </div>
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        style={{ 
                            transform: isLanguageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.3s ease',
                            color: 'var(--primary-color)'
                        }}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
                {isLanguageDropdownOpen && (
                    <div className="dropdown-options" style={{ background: '#0a0e27', border: '1px solid var(--primary-color)' }}>
                        {languages.map(lang => (
                            <div
                                key={lang.code}
                                className={`dropdown-option ${locale === lang.code ? 'selected' : ''}`}
                                onClick={() => handleLanguageSelect(lang.code)}
                                style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <div className="w-4 h-4 rounded-full overflow-hidden border border-white/10 shrink-0">
                                    <img 
                                        src={lang.code === 'en' ? '/assets/flag/us.webp' : lang.code === 'id' ? '/assets/flag/id.webp' : '/assets/flag/arab.jpg'} 
                                        alt={lang.label} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span>{lang.label} ({lang.code === 'en' ? t('english') : lang.code === 'id' ? t('indonesian') : t('arabic')})</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sound Toggle Item */}
            <div 
                className="profile-menu-item" 
                onClick={handleToggleSound} 
                dir={isRtl ? 'rtl' : 'ltr'}
                style={{ justifyContent: 'space-between', cursor: 'pointer' }}
            >
                <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={soundEnabled ? 'var(--primary-color)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }}>
                        {soundEnabled ? (
                            <>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </>
                        ) : (
                            <>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </>
                        )}
                    </svg>
                    <span>{t('sound')}</span>
                </div>
                
                {/* Switch UI */}
                <div style={{ 
                    position: 'relative', 
                    width: '36px', 
                    height: '18px', 
                    background: soundEnabled ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    transition: 'all 0.3s ease', 
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ 
                        position: 'absolute', 
                        top: '2px', 
                        left: soundEnabled ? '20px' : '2px', 
                        width: '12px', 
                        height: '12px', 
                        background: '#fff', 
                        borderRadius: '50%', 
                        transition: 'all 0.3s ease', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)' 
                    }} />
                </div>
            </div>

            <button className="profile-menu-item logout" onClick={handleLogoutClick} dir={isRtl ? 'rtl' : 'ltr'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>{t('logout')}</span>
            </button>
        </div>
    );
}
