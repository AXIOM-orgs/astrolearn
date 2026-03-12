'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialog } from '@/context/AlertContext';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';

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
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

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

    const handleLanguageSelect = (locale: string): void => {
        if (locale !== params.locale) {
            router.replace(
                { pathname },
                { locale: locale }
            );
        }
        setIsLanguageDropdownOpen(false);
    };

    const languages = [
        { code: 'en', label: 'EN' },
        { code: 'id', label: 'ID' },
        { code: 'ar', label: 'AR' }
    ];

    const currentLang = languages.find(l => l.code === params.locale) || languages[0];

    const handleSoundClick = (): void => {
        onClose();
        if (onSoundClick) {
            onSoundClick();
        } else {
            showInfo(t('soundSettings'));
        }
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
                style={{ width: '100%', marginBottom: '8px' }}
            >
                <div 
                    className="dropdown-trigger" 
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    style={{ 
                        background: 'rgba(255, 255, 255, 0.05) !important',
                        border: '1px solid rgba(255, 255, 255, 0.1) !important',
                        borderRadius: '10px !important',
                        padding: '0.6rem 1rem !important',
                        minHeight: 'unset !important',
                        fontSize: '0.8rem !important'
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                            <img 
                                src={params.locale === 'en' ? '/assets/flag/us.webp' : params.locale === 'id' ? '/assets/flag/id.webp' : '/assets/flag/arab.jpg'} 
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
                                className={`dropdown-option ${params.locale === lang.code ? 'selected' : ''}`}
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

            <button className="profile-menu-item" onClick={handleSoundClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>{t('sound')}</span>
            </button>

            <button className="profile-menu-item logout" onClick={handleLogoutClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>{t('logout')}</span>
            </button>
        </div>
    );
}
