'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseGame } from '@/lib/supabase';
import { generateXID } from '@/lib/id-generator';
import { useGame } from '@/context/GameContext';

// Generate game PIN
function generateGamePin(length = 6): string {
    const digits = '0123456789';
    return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
}

const DESKTOP_CARDS_PER_PAGE = 12;
const MOBILE_CARDS_PER_PAGE = 4;

interface Quiz {
    id: string;
    title: string;
    description: string;
    category: string;
    question_count: number;
    creator_id?: string;
    total_count?: number;
}

export default function SelectQuizPage(): React.JSX.Element {
    const router = useRouter();
    const { profile } = useAuth();
    const { showLoading, hideLoading } = useGame();

    // UI States
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showMyQuizOnly, setShowMyQuizOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsPerPage, setCardsPerPage] = useState(DESKTOP_CARDS_PER_PAGE);

    // Data States
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [categories, setCategories] = useState<string[]>(['All']);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [creating, setCreating] = useState(false);
    const [creatingQuizId, setCreatingQuizId] = useState<string | null>(null);

    const totalPages = Math.ceil(totalCount / cardsPerPage);

    // Responsive cards per page
    useEffect(() => {
        const handleResize = () => {
            setCardsPerPage(window.innerWidth <= 768 ? MOBILE_CARDS_PER_PAGE : DESKTOP_CARDS_PER_PAGE);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch profile favorites
    useEffect(() => {
        const fetchProfile = async () => {
            if (!profile?.id) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('favorite_quiz')
                .eq('id', profile.id)
                .single();

            if (profileData?.favorite_quiz) {
                try {
                    const parsed = typeof profileData.favorite_quiz === 'string'
                        ? JSON.parse(profileData.favorite_quiz)
                        : profileData.favorite_quiz;
                    setFavorites(parsed.favorites || []);
                } catch {
                    setFavorites([]);
                }
            }
        };
        fetchProfile();
        hideLoading(); // Hide global loading
    }, [profile?.id]);

    // Fetch categories once
    useEffect(() => {
        const fetchCategories = async () => {
            if (!profile?.id) return;

            const { data } = await supabase
                .from('quizzes')
                .select('category')
                .or(`is_public.eq.true,creator_id.eq.${profile.id}`);

            if (data) {
                const uniqueCats = ['All', ...new Set(data.map(q => q.category).filter(Boolean))];
                setCategories(uniqueCats);
            }
        };
        fetchCategories();
    }, [profile?.id]);

    // Fetch quizzes via RPC (server-side pagination)
    useEffect(() => {
        const fetchQuizzes = async () => {
            if (!profile?.id) return;
            setIsFetching(true);

            try {
                const offset = (currentPage - 1) * cardsPerPage;

                const { data, error } = await supabase
                    .rpc('get_quizzes_paginated', {
                        p_user_id: profile.id,
                        p_search_query: searchQuery || null,
                        p_category_filter: selectedCategory === 'All' ? null : selectedCategory,
                        p_favorites_filter: showFavoritesOnly ? favorites : null,
                        p_creator_filter: showMyQuizOnly ? profile.id : null,
                        p_limit: cardsPerPage,
                        p_offset: offset
                    });

                if (error) {
                    console.error('Error fetching quizzes:', error);
                } else {
                    setQuizzes(data || []);
                    if (data && data.length > 0) {
                        setTotalCount(Number(data[0].total_count) || 0);
                    } else {
                        setTotalCount(0);
                    }
                }
            } catch (error) {
                console.error('Unexpected error:', error);
            } finally {
                setLoading(false);
                setIsFetching(false);
            }
        };

        fetchQuizzes();
    }, [profile?.id, currentPage, searchQuery, selectedCategory, showFavoritesOnly, showMyQuizOnly, favorites, cardsPerPage, showLoading, hideLoading]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, showFavoritesOnly, showMyQuizOnly]);

    // Toggle favorite
    const toggleFavorite = async (quizId: string) => {
        if (!profile?.id) return;

        const isFavoriting = !favorites.includes(quizId);
        const newFavorites = isFavoriting
            ? [...favorites, quizId]
            : favorites.filter(id => id !== quizId);

        // Optimistic update
        setFavorites(newFavorites);

        try {
            // Update profiles.favorite_quiz
            await supabase
                .from('profiles')
                .update({ favorite_quiz: { favorites: newFavorites } })
                .eq('id', profile.id);

            // Update quizzes.favorite
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('favorite')
                .eq('id', quizId)
                .single();

            let quizFavorites: string[] = [];
            if (quizData?.favorite) {
                quizFavorites = typeof quizData.favorite === 'string'
                    ? JSON.parse(quizData.favorite)
                    : quizData.favorite;
            }

            if (isFavoriting) {
                if (!quizFavorites.includes(profile.id)) {
                    quizFavorites.push(profile.id);
                }
            } else {
                quizFavorites = quizFavorites.filter(id => id !== profile.id);
            }

            await supabase
                .from('quizzes')
                .update({ favorite: quizFavorites })
                .eq('id', quizId);

        } catch (error) {
            console.error('Error updating favorites:', error);
            setFavorites(favorites); // Revert
        }
    };

    const handleStartQuiz = async (quizId: string) => {
        if (creating) return;
        showLoading();
        setCreating(true);
        setCreatingQuizId(quizId);

        const gamePin = generateGamePin();
        const sessId = generateXID();
        const hostId = profile?.id;

        const primarySession = {
            id: sessId,
            quiz_id: quizId,
            host_id: hostId,
            game_pin: gamePin,
            total_time_minutes: 5,
            question_limit: 5,
            difficulty: 'easy',
            current_questions: [],
            status: 'waiting',
        };

        const newMainSession = {
            ...primarySession,
            game_end_mode: 'manual',
            allow_join_after_start: false,
            participants: [],
            responses: [],
            application: 'astrolearn'
        };

        try {
            // Insert to both databases in parallel
            const [mainResult, gameResult] = await Promise.allSettled([
                supabase.from('game_sessions').insert(newMainSession),
                supabaseGame.from('sessions').insert(primarySession)
            ]);

            const mainError = mainResult.status === 'rejected' ? mainResult.reason : mainResult.value.error;
            const gameError = gameResult.status === 'rejected' ? gameResult.reason : gameResult.value.error;

            if (mainError) {
                console.error('Error creating session (main):', mainError);
                if (!gameError) {
                    await supabaseGame.from('sessions').delete().eq('id', sessId);
                }
                setCreating(false);
                setCreatingQuizId(null);
                hideLoading();
                return;
            }

            if (gameError) {
                console.error('Error creating session (game):', gameError);
                await supabase.from('game_sessions').delete().eq('id', sessId);
                setCreating(false);
                setCreatingQuizId(null);
                hideLoading();
                return;
            }

            // Store in localStorage
            localStorage.setItem('hostGamePin', gamePin);
            sessionStorage.setItem('currentHostId', hostId || '');

            // Navigate to settings
            router.replace(`/host/${gamePin}/settings`);

        } catch (err) {
            console.error('Unexpected error:', err);
            setCreating(false);
            setCreatingQuizId(null);
            hideLoading();
        }
    };

    const handleBack = () => router.push('/');
    const handleSearch = () => setSearchQuery(searchInput);
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const getEmptyStateMessage = () => {
        if (showFavoritesOnly && favorites.length === 0) {
            return { title: 'No favorites yet', subtitle: 'Add quizzes to favorites by clicking the heart icon' };
        }
        if (showMyQuizOnly) {
            return { title: 'No quizzes found', subtitle: 'You haven\'t created any quiz yet' };
        }
        return { title: 'No quizzes found', subtitle: 'Try adjusting your search or filter' };
    };

    return (
        <section className="select-quiz-page">
            {/* Navigation Bar */}
            <nav className="quiz-nav-bar">
                <div className="nav-left">
                    <button className="back-btn" onClick={handleBack}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="quiz-page-title desktop-title">SELECT QUIZ</h1>
                </div>

                {/* Mobile Title - shown only on mobile */}
                <h1 className="quiz-page-title mobile-title">SELECT QUIZ</h1>

                <div className="nav-center">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <button className="search-btn" onClick={handleSearch} title="Search">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                    </div>

                    <div className="filter-dropdown">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>

                <div className="nav-right">
                    <button
                        className={`favorite-icon-btn ${showFavoritesOnly ? 'active' : ''}`}
                        onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setShowMyQuizOnly(false); }}
                        title={showFavoritesOnly ? 'Show all quizzes' : 'Show favorites only'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={showFavoritesOnly ? '#ff4757' : 'none'} stroke="#ff4757" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                    <button
                        className={`my-quiz-btn ${showMyQuizOnly ? 'active' : ''}`}
                        onClick={() => { setShowMyQuizOnly(!showMyQuizOnly); setShowFavoritesOnly(false); }}
                    >
                        MY QUIZ
                    </button>
                </div>
            </nav>

            {/* Quiz Grid */}
            {quizzes.length > 0 ? (
                <>
                    <div className={`quiz-grid ${isFetching ? 'fetching' : ''}`}>
                        {quizzes.map((quiz) => {
                            const isFavorite = favorites.includes(quiz.id);
                            const isThisQuizCreating = creatingQuizId === quiz.id;
                            return (
                                <div
                                    key={quiz.id}
                                    className={`quiz-card ${isThisQuizCreating ? 'creating' : ''} ${creating && !isThisQuizCreating ? 'disabled' : ''}`}
                                    onClick={() => !creating && handleStartQuiz(quiz.id)}
                                    style={{ cursor: creating ? (isThisQuizCreating ? 'wait' : 'not-allowed') : 'pointer' }}
                                >
                                    <div className="quiz-card-content justify-between">
                                        <div className="quiz-card-header">
                                            <h3 className="quiz-card-title line-clamp-3">{quiz.title}</h3>
                                            <button
                                                className={`card-favorite-btn ${isFavorite ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(quiz.id); }}
                                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? '#ff4757' : 'none'} stroke="#ff4757" strokeWidth="2">
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="quiz-card-footer">
                                            {quiz.category && (
                                                <span className="category-label">
                                                    {quiz.category.charAt(0).toUpperCase() + quiz.category.slice(1)}
                                                </span>
                                            )}
                                            <span className="question-count">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                                </svg>
                                                {quiz.question_count || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                                Previous
                            </button>
                            <span className="pagination-info">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <h3 className="empty-state-title">{getEmptyStateMessage().title}</h3>
                    <p className="empty-state-subtitle">{getEmptyStateMessage().subtitle}</p>
                </div>
            )}
        </section>
    );
}
