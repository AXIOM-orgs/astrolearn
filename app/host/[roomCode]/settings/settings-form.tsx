'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseGame } from '@/lib/supabase';
import { useGame } from '@/context/GameContext';
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

    // Redirect if error
    useEffect(() => {
        hideLoading();
        if (initialData.error || !initialData.session) {
            router.push('/host');
        }
    }, [initialData.error, initialData.session, router, hideLoading]);

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

    if (!quizDetail || !sessData) {
        return (
            <section id="screen-setup" className="screen active">
                <div className="container">
                    <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#06ffa5' }}>Loading...</p>
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
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: '#06ffa5', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                            {quizDetail.title}
                        </p>
                    </div>

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(6, 255, 165, 0.3), transparent)',
                        marginBottom: '2rem'
                    }} />

                    {/* Settings Row 1: Duration, Questions, Sound */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        {/* Duration */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#06ffa5',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>Duration</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'rgba(10, 10, 15, 0.6)',
                                    border: '1px solid rgba(6, 255, 165, 0.3)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#06ffa5'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(6, 255, 165, 0.3)'}
                            >
                                {[5, 10, 15, 20, 25, 30].map((min) => (
                                    <option key={min} value={(min * 60).toString()}>
                                        {min} Minutes
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Questions */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#06ffa5',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>Questions</label>
                            <select
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'rgba(10, 10, 15, 0.6)',
                                    border: '1px solid rgba(6, 255, 165, 0.3)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#06ffa5'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(6, 255, 165, 0.3)'}
                            >
                                {questionCountOptions.map((count) => (
                                    <option key={count} value={count.toString()}>
                                        {count} Questions
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sound Toggle Switch */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#06ffa5',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                textAlign: 'center'
                            }}>Sound</label>
                            <div
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'rgba(10, 10, 15, 0.6)',
                                    border: '1px solid rgba(6, 255, 165, 0.3)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Mute Icon (Left) */}
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={!soundEnabled ? '#ef4444' : 'rgba(255,255,255,0.4)'}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>

                                {/* Toggle Switch */}
                                <div style={{
                                    position: 'relative',
                                    width: '50px',
                                    height: '26px',
                                    background: soundEnabled ? '#06ffa5' : '#333',
                                    borderRadius: '13px',
                                    transition: 'all 0.3s ease',
                                    flexShrink: 0
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: soundEnabled ? '27px' : '3px',
                                        width: '20px',
                                        height: '20px',
                                        background: '#fff',
                                        borderRadius: '50%',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }} />
                                </div>

                                {/* Unmute Icon (Right) */}
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={soundEnabled ? '#06ffa5' : 'rgba(255,255,255,0.4)'}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Settings Row 2: Difficulty Buttons */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.9rem',
                            color: '#06ffa5',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>Difficulty</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.75rem'
                        }}>
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
                                        background: selectedDifficulty === diff.value
                                            ? `${diff.color}20`
                                            : 'rgba(10, 10, 15, 0.6)',
                                        border: selectedDifficulty === diff.value
                                            ? `2px solid ${diff.color}`
                                            : '1px solid rgba(255, 255, 255, 0.2)',
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
                        className="btn-primary"
                        onClick={handleCreateRoom}
                        disabled={!isSetupComplete || saving}
                    >
                        <span>{saving ? 'Loading...' : 'Continue'}</span>
                        <div className="btn-glow"></div>
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
                                    border: '1px solid #06ffa5',
                                    borderRadius: '8px',
                                    color: '#06ffa5',
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
