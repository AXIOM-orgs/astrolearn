'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { quizTopics, quizCategories, getCategoryById } from '@/lib/quizData';

const FAVORITES_KEY = 'cosmicquest_favorites';
const DESKTOP_CARDS_PER_PAGE = 8;
const MOBILE_CARDS_PER_PAGE = 4;

export default function SelectQuizPage(): React.JSX.Element {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showMyQuizModal, setShowMyQuizModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [cardsPerPage, setCardsPerPage] = useState(DESKTOP_CARDS_PER_PAGE);

    // Handle responsive cards per page
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setCardsPerPage(MOBILE_CARDS_PER_PAGE);
            } else {
                setCardsPerPage(DESKTOP_CARDS_PER_PAGE);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load favorites from localStorage
    useEffect(() => {
        const savedFavorites = localStorage.getItem(FAVORITES_KEY);
        if (savedFavorites) {
            setFavorites(JSON.parse(savedFavorites));
        }
    }, []);

    // Save favorites to localStorage
    const saveFavorites = (newFavorites: string[]) => {
        setFavorites(newFavorites);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    };

    // Toggle favorite
    const toggleFavorite = (topicId: string) => {
        if (favorites.includes(topicId)) {
            saveFavorites(favorites.filter(id => id !== topicId));
        } else {
            saveFavorites([...favorites, topicId]);
        }
    };

    // Filter topics based on search, category, and favorites
    const filteredTopics = useMemo(() => {
        return quizTopics.filter(topic => {
            const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                topic.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || topic.categoryId === selectedCategory;
            const matchesFavorites = !showFavoritesOnly || favorites.includes(topic.id);
            return matchesSearch && matchesCategory && matchesFavorites;
        });
    }, [searchQuery, selectedCategory, showFavoritesOnly, favorites]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, showFavoritesOnly, cardsPerPage]);

    // Pagination
    const totalPages = Math.ceil(filteredTopics.length / cardsPerPage);
    const paginatedTopics = useMemo(() => {
        const startIndex = (currentPage - 1) * cardsPerPage;
        return filteredTopics.slice(startIndex, startIndex + cardsPerPage);
    }, [filteredTopics, currentPage, cardsPerPage]);

    const handleStartQuiz = (topicId: string) => {
        localStorage.setItem('cosmicquest_selected_topic', topicId);
        router.push('/host/setup');
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleFavoriteFilter = () => {
        setShowFavoritesOnly(!showFavoritesOnly);
    };

    const handleSearch = () => {
        setSearchQuery(searchInput);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    // Get empty state message
    const getEmptyStateMessage = () => {
        if (showFavoritesOnly && favorites.length === 0) {
            return {
                title: 'No favorites yet',
                subtitle: 'Add quizzes to favorites by clicking the heart icon'
            };
        }
        return {
            title: 'No quizzes found',
            subtitle: 'Try adjusting your search or filter'
        };
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
                            <option value="all">All Categories</option>
                            {quizCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                        onClick={handleFavoriteFilter}
                        title={showFavoritesOnly ? 'Show all quizzes' : 'Show favorites only'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={showFavoritesOnly ? '#ff4757' : 'none'} stroke="#ff4757" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                    <button className="my-quiz-btn" onClick={() => setShowMyQuizModal(true)}>
                        MY QUIZ
                    </button>
                </div>
            </nav>

            {/* Quiz Grid */}
            {paginatedTopics.length > 0 ? (
                <>
                    <div className="quiz-grid">
                        {paginatedTopics.map((topic) => {
                            const category = getCategoryById(topic.categoryId);
                            const isFavorite = favorites.includes(topic.id);
                            return (
                                <div key={topic.id} className="quiz-card" onClick={() => handleStartQuiz(topic.id)}>
                                    <div className="quiz-card-content">
                                        <div className="quiz-card-header">
                                            <h3 className="quiz-card-title">{topic.title.toUpperCase()}</h3>
                                            <button
                                                className={`card-favorite-btn ${isFavorite ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(topic.id); }}
                                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? '#ff4757' : 'none'} stroke="#ff4757" strokeWidth="2">
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="quiz-card-description">{topic.description}</p>
                                        <div className="quiz-card-footer">
                                            <div className="quiz-card-meta">
                                                <span className="category-badge" style={{ background: category?.color || 'var(--primary-color)' }}>
                                                    {category?.name || 'General'}
                                                </span>
                                                <span className="question-count">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                                    </svg>
                                                    {topic.questionCount}
                                                </span>
                                            </div>
                                            <button className="start-quiz-btn" onClick={(e) => { e.stopPropagation(); handleStartQuiz(topic.id); }}>
                                                START
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </button>
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
                                onClick={handlePrevPage}
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
                                onClick={handleNextPage}
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

            {/* My Quiz Modal */}
            {showMyQuizModal && (
                <div className="modal-overlay" onClick={() => setShowMyQuizModal(false)}>
                    <div className="my-quiz-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowMyQuizModal(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="my-quiz-modal-content">
                            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <h3 className="my-quiz-modal-title">MY QUIZ</h3>
                            <p className="my-quiz-modal-text">No quizzes found</p>
                            <p className="my-quiz-modal-subtext">You haven&apos;t created any quiz yet</p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}



