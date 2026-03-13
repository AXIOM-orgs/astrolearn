'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseGame } from '@/lib/supabase';
import { useGame } from '@/context/GameContext';
import { isArabic } from '@/lib/utils';
import type { SettingsInitialData } from '@/lib/supabase-server';

// Utility to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

type Props = {
    roomCode: string;
    initialData: SettingsInitialData;
};

export default function SettingsForm({ roomCode, initialData }: Props) {
    const router = useRouter();
    const { showLoading, hideLoading } = useGame();

    // Initialize state from server data
    const [duration, setDuration] = useState(() =>
        initialData.session?.total_time_minutes
            ? (initialData.session.total_time_minutes * 60).toString()
            : '300'
    );
    const [questionCount, setQuestionCount] = useState(() =>
        initialData.session?.question_limit?.toString() || '5'
    );
    const [selectedDifficulty, setSelectedDifficulty] = useState(() =>
        initialData.session?.difficulty || 'easy'
    );

    const [quiz] = useState(initialData.quiz);
    const [quizDetail] = useState(initialData.quizDetail);
    const [sessData] = useState(initialData.session);

    const [saving, setSaving] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isDurationOpen, setIsDurationOpen] = useState(false);
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
    const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
    const durationRef = useRef<HTMLDivElement>(null);
    const questionsRef = useRef<HTMLDivElement>(null);
    const difficultyRef = useRef<HTMLDivElement>(null);

    // Redirect if error
    useEffect(() => {
        hideLoading();
        if (initialData.error || !initialData.session) {
            router.push('/host');
        }

        // Load sync sound preference
        const savedBgm = localStorage.getItem('cosmicquest_bgm_enabled');
        if (savedBgm !== null) {
            setSoundEnabled(savedBgm === 'true');
        }
    }, [initialData.error, initialData.session, router, hideLoading]);

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        localStorage.setItem('cosmicquest_bgm_enabled', String(newValue));
        // Dispatch event for BackgroundMusic component
        window.dispatchEvent(new CustomEvent('cosmicquest_sound_settings_changed', {
            detail: { type: 'bgm', enabled: newValue }
        }));
    };

    // Question count options based on available questions
    const questionCountOptions = useMemo(() => {
        const totalQuestions = quiz?.questions?.length || 0;
        if (totalQuestions === 0) return [5, 10, 20];
        return [5, 10, 20].filter((count) => count <= totalQuestions);
    }, [quiz]);

    // Set default question count
    useEffect(() => {
        if (!quiz) return;
        const totalQuestions = quiz.questions?.length || 0;
        if (totalQuestions > 0 && questionCountOptions.length > 0) {
            if (questionCountOptions.includes(5)) {
                setQuestionCount('5');
            } else {
                setQuestionCount(Math.min(...questionCountOptions).toString());
            }
        }
    }, [quiz, questionCountOptions]);

    const handleCreateRoom = async () => {
        if (saving || !quiz) return;
        setSaving(true);
        showLoading();

        const settings = {
            total_time_minutes: Math.floor(parseInt(duration) / 60),
            question_limit: parseInt(questionCount),
            difficulty: selectedDifficulty,
            current_questions: shuffleArray(quiz.questions).slice(0, parseInt(questionCount)),
        };

        const { error } = await supabaseGame
            .from('sessions')
            .update(settings)
            .eq('game_pin', roomCode);

        if (error) {
            console.error('Failed to save settings:', error);
            setSaving(false);
            hideLoading();
            return;
        }

        // Also update main database
        await supabase
            .from('game_sessions')
            .update({
                total_time_minutes: settings.total_time_minutes,
                question_limit: settings.question_limit,
                difficulty: settings.difficulty,
            })
            .eq('game_pin', roomCode);

        localStorage.setItem('hostGamePin', roomCode);
        router.push(`/host/${roomCode}/lobby`);
    };

    const handleCancelSession = async () => {
        setIsDeleting(true);
        try {
            await Promise.allSettled([
                supabase.from('game_sessions').delete().eq('game_pin', roomCode),
                supabaseGame.from('sessions').delete().eq('game_pin', roomCode)
            ]);
            localStorage.removeItem('hostGamePin');
            sessionStorage.removeItem('currentHostId');
            router.push('/host');
        } catch (err) {
            console.error('Error deleting session:', err);
            router.push('/host');
        } finally {
            setIsDeleting(false);
            setShowCancelDialog(false);
        }
    };

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (durationRef.current && !durationRef.current.contains(event.target as Node)) {
                setIsDurationOpen(false);
            }
            if (questionsRef.current && !questionsRef.current.contains(event.target as Node)) {
                setIsQuestionsOpen(false);
            }
            if (difficultyRef.current && !difficultyRef.current.contains(event.target as Node)) {
                setIsDifficultyOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!quizDetail || !sessData) {
        return (
            <section id="screen-setup" className="screen active">
                <div className="container">
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--primary-color)' }}>Loading...</p>
                    </div>
                </div>
            </section>
        );
    }

    const isSetupComplete = duration && questionCount && selectedDifficulty;

    return (
        <section id="screen-setup" className="screen active">
            <div className="container">
                <div className="glass-panel">

                    <h2 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Settings</h2>

                    {/* Quiz Info */}
                    <div style={{
                        marginBottom: '1.5rem',
                        textAlign: isArabic(quizDetail.title) ? 'right' : 'center',
                    }}>
                        <p
                            className={`${isArabic(quizDetail.title) ? 'font-arabic' : ''} premium-quiz-title`}
                            dir={isArabic(quizDetail.title) ? 'rtl' : 'ltr'}
                            style={{
                                fontSize: '1.3rem',
                                fontWeight: 'bold',
                                marginBottom: '0.3rem',
                            }}
                        >
                            {quizDetail.title}
                        </p>
                    </div>

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(70, 167, 187, 0.3), transparent)',
                        marginBottom: '2rem'
                    }} />

                    {/* Settings Row 1 & 2: Duration, Questions, Sound, Difficulty (Main Grid) */}
                    <div className="settings-main-grid" style={{
                        display: 'grid',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        {/* Questions */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>Questions</label>
                            <div className={`custom-dropdown ${isQuestionsOpen ? 'open' : ''}`} ref={questionsRef} style={{ width: '100%' }}>
                                <div className="dropdown-trigger" onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}>
                                    <span>{questionCount} QUESTIONS</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isQuestionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                                {isQuestionsOpen && (
                                    <div className="dropdown-options">
                                        {questionCountOptions.map((count) => (
                                            <div key={count} className={`dropdown-option ${questionCount === count.toString() ? 'selected' : ''}`} onClick={() => { setQuestionCount(count.toString()); setIsQuestionsOpen(false); }}>
                                                {count} QUESTIONS
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</label>
                            <div className={`custom-dropdown ${isDurationOpen ? 'open' : ''}`} ref={durationRef} style={{ width: '100%' }}>
                                <div className="dropdown-trigger" onClick={() => setIsDurationOpen(!isDurationOpen)}>
                                    <span>{Math.floor(parseInt(duration) / 60)} MINUTES</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isDurationOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                                {isDurationOpen && (
                                    <div className="dropdown-options">
                                        {[5, 10, 15, 20, 25, 30].map((min) => (
                                            <div key={min} className={`dropdown-option ${duration === (min * 60).toString() ? 'selected' : ''}`} onClick={() => { setDuration((min * 60).toString()); setIsDurationOpen(false); }}>
                                                {min} MINUTES
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Difficulty (Dropdown for Mobile) */}
                        <div className="form-group mobile-only" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>Difficulty</label>
                            <div className={`custom-dropdown ${isDifficultyOpen ? 'open' : ''}`} ref={difficultyRef} style={{ width: '100%' }}>
                                <div className="dropdown-trigger" onClick={() => setIsDifficultyOpen(!isDifficultyOpen)}>
                                    <span style={{ color: selectedDifficulty === 'easy' ? '#22c55e' : selectedDifficulty === 'medium' ? '#f59e0b' : '#ef4444', fontWeight: '900' }}>
                                        {selectedDifficulty.toUpperCase()}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isDifficultyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                                {isDifficultyOpen && (
                                    <div className="dropdown-options">
                                        {[
                                            { value: 'easy', label: 'EASY', color: '#22c55e' },
                                            { value: 'medium', label: 'MEDIUM', color: '#f59e0b' },
                                            { value: 'hard', label: 'HARD', color: '#ef4444' }
                                        ].map((diff) => (
                                            <div
                                                key={diff.value}
                                                className={`dropdown-option ${selectedDifficulty === diff.value ? 'selected' : ''}`}
                                                onClick={() => { setSelectedDifficulty(diff.value); setIsDifficultyOpen(false); }}
                                                style={{ color: diff.color }}
                                            >
                                                {diff.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sound */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left' }}>Sound</label>
                            <div
                                onClick={toggleSound}
                                className="sound-card-wrapper"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    padding: '0.6rem 0.75rem',
                                    background: 'rgba(13, 27, 42, 0.9)',
                                    border: '2px solid var(--primary-color)',
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={!soundEnabled ? '#ef4444' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                                <div style={{ position: 'relative', width: '50px', height: '26px', background: soundEnabled ? 'var(--primary-color)' : '#333', borderRadius: '13px', transition: 'all 0.3s ease', flexShrink: 0 }}>
                                    <div style={{ position: 'absolute', top: '3px', left: soundEnabled ? '27px' : '3px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                                </div>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={soundEnabled ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Difficulty Buttons (Desktop/Tablet Only) */}
                    <div className="desktop-tablet-only" style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>Difficulty</label>
                        <div className="difficulty-grid" style={{ display: 'grid', gap: '0.75rem' }}>
                            {[
                                { value: 'easy', label: 'Easy', color: '#22c55e' },
                                { value: 'medium', label: 'Medium', color: '#f59e0b' },
                                { value: 'hard', label: 'Hard', color: '#ef4444' }
                            ].map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    onClick={() => setSelectedDifficulty(diff.value)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        background: selectedDifficulty === diff.value ? `${diff.color}20` : 'rgba(10, 10, 15, 0.6)',
                                        border: selectedDifficulty === diff.value ? `2px solid ${diff.color}` : '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: selectedDifficulty === diff.value ? diff.color : '#fff',
                                        fontSize: '1rem',
                                        fontWeight: selectedDifficulty === diff.value ? 'bold' : 'normal',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {diff.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn-cyan-style"
                        onClick={handleCreateRoom}
                        disabled={!isSetupComplete || saving}
                    // style={{ maxWidth: '300px', marginInline: 'auto' }}
                    >
                        {saving ? 'Loading...' : 'Continue'}
                    </button>
                </div>
            </div>

            {/* Cancel Dialog */}
            {showCancelDialog && (
                <div className="dialog-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ color: '#ff4757', marginBottom: '1rem' }}>Cancel Session?</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            This will delete the game session and return to the quiz selection.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowCancelDialog(false)}
                                disabled={isDeleting}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--primary-color)',
                                    borderRadius: '8px',
                                    color: 'var(--primary-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                Keep Session
                            </button>
                            <button
                                onClick={handleCancelSession}
                                disabled={isDeleting}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#ff4757',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
