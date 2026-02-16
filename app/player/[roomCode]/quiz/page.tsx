'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame, GameState, initialGameState } from '@/context/GameContext';
import { supabaseGame } from '@/lib/supabase';
import { isArabic } from '@/lib/utils';
import Image from 'next/image';
import { generateXID } from '@/lib/id-generator';
import { QuizQuestion } from '@/lib/data';
import { CountdownOverlay } from '@/app/components/ui/CountdownOverlay';

interface AnswerEntry {
    id: string;
    correct: boolean;
    answer_id: string;
    question_id: string;
}

export default function JoinQuizPage(): React.JSX.Element | null {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { gameState, setGameState, showLoading, hideLoading } = useGame();

    const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
    const [correctIndex, setCorrectIndex] = useState<number | null>(null);
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false);
    const [showCountdown, setShowCountdown] = useState<boolean>(false);
    const [countdownNumber, setCountdownNumber] = useState<number>(3);
    const [isFreezing, setIsFreezing] = useState<boolean>(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(0); // Seconds remaining
    const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [sessionData, setSessionData] = useState<any>(null); // Store full session data for countdown checks

    // Memoize target date to prevent blinking
    const countdownTargetDate = useState<string | undefined>(undefined);
    const [targetDate, setTargetDate] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (sessionData?.countdown_started_at) {
            const date = new Date(new Date(sessionData.countdown_started_at).getTime() + 10000).toISOString();
            setTargetDate(date);
        } else {
            setTargetDate(undefined);
        }
    }, [sessionData?.countdown_started_at]);

    const hasBootstrapped = useRef(false);

    // Bootstrap: Fetch session & restore state
    useEffect(() => {
        if (hasBootstrapped.current || !roomCode) return;
        hasBootstrapped.current = true;

        const bootstrap = async () => {
            try {
                setLoading(true);
                const participantId = localStorage.getItem('cosmicquest_participant_id');

                if (!participantId) {
                    router.replace('/');
                    return;
                }

                // Fetch Session and Participant in parallel
                const [sessionResult, participantResult] = await Promise.all([
                    supabaseGame
                        .from('sessions')
                        .select('*')
                        .eq('game_pin', roomCode)
                        .single(),
                    supabaseGame
                        .from('participants')
                        .select('*')
                        .eq('id', participantId)
                        .single()
                ]);

                if (sessionResult.error || !sessionResult.data) {
                    console.error('Session not found');
                    router.replace('/');
                    return;
                }

                if (participantResult.error || !participantResult.data) {
                    console.error('Participant not found');
                    router.replace('/');
                    return;
                }

                const session = sessionResult.data;
                const participant = participantResult.data;
                setSessionData(session); // Store for Updates

                // Parse questions from session
                let questions: QuizQuestion[] = [];
                try {
                    questions = typeof session.current_questions === 'string'
                        ? JSON.parse(session.current_questions)
                        : session.current_questions;
                } catch (e) {
                    console.error('Error parsing questions:', e);
                }

                // Initialize GameState
                setGameState(prev => ({
                    ...prev,
                    playerName: participant.nickname,
                    questions: questions,
                    selectedQuestions: questions.length,
                    currentQuestionIndex: participant.current_question || 0,
                    score: participant.score || 0,
                    correctAnswers: participant.correct || 0,
                    // Restore spaceship if needed, though mostly visual
                }));

                // Calculate Session End Time
                if (session.started_at && session.total_time_minutes) {
                    const startTime = new Date(session.started_at).getTime();
                    const durationMs = session.total_time_minutes * 60 * 1000;
                    const endTime = startTime + durationMs;
                    setSessionEndTime(endTime);
                    setStartTime(startTime);
                } else if (session.status === 'waiting' && session.countdown_started_at && session.total_time_minutes) {
                    // Pre-set time left to total duration so it doesn't show 0
                    setTimeLeft(session.total_time_minutes * 60);
                }

                // Check if game already finished for this player
                if ((participant.current_question || 0) >= questions.length) {
                    router.replace(`/player/${roomCode}/result`);
                    return;
                }

                setLoading(false);
                hideLoading();

            } catch (err) {
                console.error('Error bootstrapping quiz:', err);
                setLoading(false);
            }
        };

        bootstrap();

        // Realtime Session Subscription
        const channel = supabaseGame
            .channel(`quiz-session-${roomCode}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `game_pin=eq.${roomCode}` },
                (payload) => {
                    const newSession = payload.new;
                    setSessionData(newSession);

                    // If game just started (became active)
                    if (newSession.status === 'active' && newSession.started_at) {
                        const start = new Date(newSession.started_at).getTime();
                        setStartTime(start);
                        if (newSession.total_time_minutes) {
                            setSessionEndTime(start + newSession.total_time_minutes * 60 * 1000);
                        }
                    }

                    // If game finished (Host ended it or time ran out)
                    if (newSession.status === 'finished') {
                        router.replace(`/player/${roomCode}/result`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };

    }, [roomCode, router, setGameState, hideLoading]);

    const finishGame = useCallback(async (): Promise<void> => {
        const participantId = localStorage.getItem('cosmicquest_participant_id');
        if (participantId) {
            // Mark as finished
            await supabaseGame
                .from('participants')
                .update({ finished_at: new Date().toISOString() })
                .eq('id', participantId);
        }

        // Calculate duration if start time is known
        const endTs = Date.now();
        const durationSec = startTime ? Math.floor((endTs - startTime) / 1000) : null;

        setGameState(prev => ({
            ...prev,
            duration: durationSec
        }));

        showLoading();
        router.push(`/player/${roomCode}/result`);
    }, [roomCode, router, showLoading, startTime, setGameState]);

    // Timer Logic
    useEffect(() => {
        if (!sessionEndTime) return;

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((sessionEndTime - now) / 1000));

            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(timerInterval);
                finishGame();
            }
        }, 1000);

        // Initial update
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((sessionEndTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
            finishGame();
        }

        return () => clearInterval(timerInterval);
    }, [sessionEndTime, finishGame]);


    // Derived state
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    // const progress = ((gameState.currentQuestionIndex + 1) / gameState.selectedQuestions) * 100; // Unused variable

    const getScorePerQuestion = (): number => {
        const total = gameState.selectedQuestions || 10; // Default to 10 if 0
        if (total === 5) return 20;
        if (total === 10) return 10;
        if (total === 20) return 5;
        return Math.floor(100 / total);
    };

    const scorePerQuestion = getScorePerQuestion();

    // Determine correct answer index
    useEffect(() => {
        if (currentQuestion && currentQuestion.answers) {
            const correctIdx = currentQuestion.answers.findIndex(
                (ans: any) => ans.id === currentQuestion.correct
            );
            setCorrectIndex(correctIdx);
        }
    }, [currentQuestion]);

    const submitAnswerToSupabase = async (selectedIndex: number, isCorrect: boolean) => {
        const participantId = localStorage.getItem('cosmicquest_participant_id');
        if (!participantId || !currentQuestion || !currentQuestion.answers) return;

        try {
            const newEntry: AnswerEntry = {
                id: generateXID(),
                correct: isCorrect,
                answer_id: currentQuestion.answers[selectedIndex].id,
                question_id: String(currentQuestion.id),
            };

            // We need to fetch current answers first to append securely, 
            // or trust local state if we want to be faster but riskier.
            // Let's fetch to be safe as per user request for "realtime" data integrity.
            const { data: currentData } = await supabaseGame
                .from('participants')
                .select('answers, correct, score, current_question')
                .eq('id', participantId)
                .single();

            if (!currentData) return;

            let currentAnswers: AnswerEntry[] = [];
            if (currentData.answers) {
                currentAnswers = typeof currentData.answers === 'string'
                    ? JSON.parse(currentData.answers)
                    : currentData.answers;
            }

            const updatedAnswers = [...currentAnswers, newEntry];
            const updatedCorrect = (currentData.correct || 0) + (isCorrect ? 1 : 0);
            const updatedScore = updatedCorrect * scorePerQuestion;
            const nextQuestionIndex = gameState.currentQuestionIndex + 1;

            const { error } = await supabaseGame
                .from('participants')
                .update({
                    answers: updatedAnswers, // Supabase handles JSON array automatically if column is JSONB
                    correct: updatedCorrect,
                    score: updatedScore,
                    current_question: nextQuestionIndex,
                })
                .eq('id', participantId);

            if (error) throw error;

            // Update Context
            setGameState(prev => ({
                ...prev,
                score: updatedScore,
                correctAnswers: updatedCorrect,
            }));

        } catch (error) {
            console.error('Failed to save answer:', error);
        }
    };

    const checkAnswer = async (selectedIndex: number): Promise<void> => {
        if (buttonsDisabled || !currentQuestion || correctIndex === null) return;

        setButtonsDisabled(true);
        setAnsweredIndex(selectedIndex);

        const isCorrect = selectedIndex === correctIndex;

        if (isCorrect) {
            setGameState(prev => ({
                ...prev,
                correctAnswers: prev.correctAnswers + 1,
            }));
        }

        // Submit to Supabase
        await submitAnswerToSupabase(selectedIndex, isCorrect);

        // Delay for visual feedback
        setTimeout(() => {
            const nextIndex = gameState.currentQuestionIndex + 1;

            // MiniGame Check: Every 3 questions, but not after the last one
            if (nextIndex % 3 === 0 && nextIndex < gameState.selectedQuestions) {
                showMiniGame(nextIndex);
            } else if (nextIndex >= gameState.selectedQuestions) {
                // Game Finished
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
                finishGame();
            } else {
                // Next Question
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
                setAnsweredIndex(null);
                setCorrectIndex(null);
                setButtonsDisabled(false);
            }
        }, 1500);
    };

    const showMiniGame = async (nextIndex: number): Promise<void> => {
        setShowCountdown(true);
        setCountdownNumber(3);

        const participantId = localStorage.getItem('cosmicquest_participant_id');
        if (participantId) {
            // Validate and set minigame status to true in DB
            await supabaseGame
                .from('participants')
                .update({ minigame: true })
                .eq('id', participantId);
        }

        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdownNumber(count);
            } else {
                clearInterval(countdownInterval);
                setShowCountdown(false);
                setIsFreezing(true);

                // Update index locally so when they return they are on next question
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));

                // Navigate to MiniGame
                router.push(`/player/${roomCode}/game`);
            }
        }, 1000);
    };

    // Format time mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Loading State
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
                <div className="loading-spinner text-primary" />
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0e27] text-white">
                <p>No questions found.</p>
            </div>
        );
    }

    return (
        <>
            {/* Zoom Modal */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setZoomedImage(null)}
                >
                    <Image
                        src={zoomedImage}
                        alt="Zoomed"
                        width={500}
                        height={400}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        unoptimized
                    />
                </div>
            )}

            {/* Global Countdown Overlay (Start Game) */}
            <CountdownOverlay
                isActive={!!sessionData?.countdown_started_at && sessionData?.status === 'waiting'}
                targetDate={targetDate}
            />

            {/* Minigame Countdown Overlay */}
            {showCountdown && (
                <div className="countdown-overlay">
                    <div className="countdown-number">{countdownNumber}</div>
                </div>
            )}

            {/* Freeze Overlay */}
            {isFreezing && (
                <div
                    className="fixed inset-0 bg-[#0a0a1a] z-[9999]"
                />
            )}

            <section id="screen-quiz" className="screen active" style={{ justifyContent: 'flex-start', paddingTop: 0 }}>
                {/* Logos Header Moved Outside Container */}
                <header className="waiting-header w-full pt-4 mt-5">
                    <div className="waiting-brand">
                        <Image
                            src="/assets/logoal.webp"
                            alt="Logo Left"
                            width={150}
                            height={50}
                            className="brand-logo-image"
                            unoptimized
                        />
                    </div>
                    <Image
                        src="/assets/logo.webp"
                        alt="Logo Right"
                        width={150}
                        height={50}
                        className="header-logo"
                        unoptimized
                    />
                </header>

                <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
                    <div className="container" style={{ maxWidth: '850px', zIndex: 2 }}>

                        <div className="glass-panel">

                            {/* Header: Question Count | Timer | Score */}
                            <div className="quiz-header-grid">
                                <div className="quiz-info-left">
                                    <span className="text-xl md:text-md font-bold text-white font-orbitron">
                                        Question <span className="text-primary">{gameState.currentQuestionIndex + 1}</span><span className="text-gray-500 text-lg">/{gameState.selectedQuestions}</span>
                                    </span>
                                </div>

                                <div className={`timer-pill ${timeLeft < 10 ? 'urgent' : ''}`}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    <span>{formatTime(timeLeft)}</span>
                                </div>

                                <div className="quiz-info-right">
                                    Score: <span className="text-yellow-400">{gameState.score}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="quiz-progress-container">
                                <div
                                    className="quiz-progress-bar"
                                    style={{ width: `${((gameState.currentQuestionIndex + 1) / gameState.selectedQuestions) * 100}%` }}
                                />
                            </div>

                            <div className="question-container">
                                {/* Question Image */}
                                {currentQuestion.image && (
                                    <div className="mb-6 flex justify-center">
                                        <Image
                                            src={currentQuestion.image}
                                            alt="Question"
                                            width={300}
                                            height={400}
                                            className="rounded-lg max-h-80 object-contain cursor-pointer shadow-lg hover:scale-105 transition-transform duration-300"
                                            unoptimized
                                            onClick={() => setZoomedImage(currentQuestion.image!)}
                                        />
                                    </div>
                                )}

                                {/* Centered Question Text */}
                                <h3
                                    className={`${isArabic(currentQuestion.question) ? 'font-arabic question-text-right' : 'question-text-left'} whitespace-pre-wrap`}
                                    dir={isArabic(currentQuestion.question) ? 'rtl' : 'ltr'}
                                >
                                    {currentQuestion.question}
                                </h3>

                                {/* New Answer Grid */}
                                <div className="answers-grid-new">
                                    {(currentQuestion.answers || []).map((ans: any, index: number) => {
                                        const letter = String.fromCharCode(65 + index); // A, B, C, D

                                        // Determine button state class
                                        let stateClass = '';
                                        if (answeredIndex === index) {
                                            stateClass = 'selected';
                                            if (correctIndex !== null) {
                                                stateClass = index === correctIndex ? 'correct' : 'incorrect';
                                            }
                                        }

                                        return (
                                            <button
                                                key={index}
                                                className={`answer-card ${buttonsDisabled ? 'disabled' : ''} ${stateClass}`}
                                                onClick={() => checkAnswer(index)}
                                                disabled={buttonsDisabled}
                                            >
                                                <div className="option-letter-box">
                                                    {letter}
                                                </div>

                                                <div className="answer-content">
                                                    {ans.image ? (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <div className="h-32 relative w-full">
                                                                <Image
                                                                    src={ans.image}
                                                                    alt={`Option ${letter}`}
                                                                    fill
                                                                    className="object-contain rounded-md"
                                                                    unoptimized
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setZoomedImage(ans.image);
                                                                    }}
                                                                />
                                                            </div>
                                                            <span
                                                                className={`w-full ${isArabic(ans.answer) ? 'font-arabic text-right' : 'text-center'}`}
                                                                dir={isArabic(ans.answer) ? 'rtl' : 'ltr'}
                                                            >
                                                                {ans.answer}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className={`w-full ${isArabic(ans.answer) ? 'font-arabic text-right block' : 'text-center'}`}
                                                            dir={isArabic(ans.answer) ? 'rtl' : 'ltr'}
                                                        >
                                                            {ans.answer}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

