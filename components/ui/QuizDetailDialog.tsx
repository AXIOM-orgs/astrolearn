'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { isArabic } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface QuizDetail {
    id: string;
    title: string;
    description: string;
    category: string;
    language: string;
    played: number;
    questions: unknown[];
    favorite: string[] | null;
}

interface QuizDetailDialogProps {
    quizId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onStart: (quizId: string) => void;
}

function getCategoryBadgeClass(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('tech') || cat.includes('prog')) return 'badge-technology';
    if (cat.includes('science') || cat.includes('alam')) return 'badge-science';
    if (cat.includes('math') || cat.includes('hitung') || cat.includes('penjumlahan')) return 'badge-math';
    if (cat.includes('history') || cat.includes('sejarah') || cat.includes('umum')) return 'badge-history';
    if (cat.includes('business') || cat.includes('ekonomi') || cat.includes('bisnis')) return 'badge-business';
    if (cat.includes('sport') || cat.includes('olahraga')) return 'badge-sports';
    if (cat.includes('language') || cat.includes('bahasa')) return 'badge-language';
    return 'badge-general';
}

export function QuizDetailDialog({ quizId, isOpen, onClose, onStart }: QuizDetailDialogProps): React.JSX.Element | null {
    const tCat = useTranslations('Categories');
    const t = useTranslations('QuizDetail');
    const locale = useLocale();
    const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch quiz detail when opened
    useEffect(() => {
        if (!isOpen || !quizId) {
            setQuizDetail(null);
            return;
        }

        const fetchDetail = async () => {
            setIsLoading(true);
            setQuizDetail(null);

            try {
                const { data, error } = await supabase
                    .from('quizzes')
                    .select('id, title, description, category, language, played, questions, favorite')
                    .eq('id', quizId)
                    .single();

                if (error) {
                    console.error('Error fetching quiz detail:', error);
                    onClose();
                } else {
                    setQuizDetail(data as QuizDetail);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                onClose();
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [isOpen, quizId]);

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="quiz-detail-overlay" onClick={handleOverlayClick}>
            <div className="quiz-detail-modal">
                {/* Close Button */}
                <button className="quiz-detail-close" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {isLoading ? (
                    <div className="quiz-detail-loading">
                        <div className="quiz-detail-spinner"></div>
                        <span>{t('loading')}</span>
                    </div>
                ) : quizDetail ? (
                    <>
                        {/* Top Badges */}
                        <div className="quiz-detail-badges">
                            {quizDetail.category && (
                                <span title={t('categoryTitle')} className={`category-badge ${getCategoryBadgeClass(quizDetail.category)}`}>
                                    {tCat.has(quizDetail.category.toLowerCase())
                                        ? tCat(quizDetail.category.toLowerCase())
                                        : quizDetail.category.charAt(0).toUpperCase() + quizDetail.category.slice(1)
                                    }
                                </span>
                            )}
                            {quizDetail.language && (
                                <span title={t('languageTitle')} className="quiz-detail-lang-badge">
                                    🌐 {quizDetail.language}
                                </span>
                            )}
                            <span title={t('favoritedTitle')} className="quiz-detail-badge-fav">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                <span>{Array.isArray(quizDetail.favorite) ? quizDetail.favorite.length : 0}</span>
                            </span>
                        </div>

                        {/* Title */}
                        <h2
                            className={`quiz-detail-title ${isArabic(quizDetail.title) ? 'font-arabic' : ''}`}
                            dir={isArabic(quizDetail.title) ? 'rtl' : 'ltr'}
                        >
                            {quizDetail.title}
                        </h2>

                        {/* Description */}
                        {quizDetail.description && (
                            <p
                                className={`quiz-detail-description ${isArabic(quizDetail.description) ? 'font-arabic' : ''}`}
                                dir={isArabic(quizDetail.description) ? 'rtl' : 'ltr'}
                            >
                                {quizDetail.description}
                            </p>
                        )}

                        {/* Stats */}
                        <div className="quiz-detail-stats" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                            <div className="quiz-detail-stat">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                                <span className={locale === 'ar' ? 'font-arabic' : ''}>
                                    {t.rich('questions', { 
                                        count: Array.isArray(quizDetail.questions) ? quizDetail.questions.length : 0,
                                        orbitron: (chunks) => <span dir="ltr" style={{ fontFamily: 'var(--font-orbitron)', letterSpacing: '2px', margin: '0 4px', display: 'inline-block' }}>{chunks}</span>
                                    })}
                                </span>
                            </div>
                            <div className="quiz-detail-stat">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span className={locale === 'ar' ? 'font-arabic' : ''}>
                                    {t.rich('played', { 
                                        count: quizDetail.played || 0,
                                        orbitron: (chunks) => <span dir="ltr" style={{ fontFamily: 'var(--font-orbitron)', letterSpacing: '3px', display: 'inline-block' }}>{chunks}</span>
                                    })}
                                </span>
                            </div>   
                        </div>

                        {/* Actions */}
                        <div className="quiz-detail-actions" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                            <button
                                className="btn-detail-start"
                                onClick={() => {
                                    onClose();
                                    onStart(quizDetail.id);
                                }}
                            >
                                <span className={locale === 'ar' ? 'font-arabic' : ''}>{t('start')}</span>
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
