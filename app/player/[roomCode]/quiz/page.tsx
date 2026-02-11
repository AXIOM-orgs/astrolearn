'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame, GameState, initialGameState } from '@/context/GameContext';
import { supabaseGame } from '@/lib/supabase';
import Image from 'next/image';
import { generateXID } from '@/lib/id-generator';
import { QuizQuestion } from '@/lib/data';

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
                        width={1200}
                        height={900}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        unoptimized
                    />
                </div>
            )}

            {/* Countdown Overlay */}
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

            <section id="screen-quiz" className="screen active">
                <div className="container">
                    <div className="glass-panel">
                        <div className="quiz-header flex justify-between">
                            <div className="quiz-info">
                                <span className="quiz-counter text-xl md:text-2xl font-bold text-primary flex items-baseline">
                                    Questions&nbsp;<span id="current-question" className="text-2xl">{gameState.currentQuestionIndex + 1}</span>
                                    <span className="text-gray-400 text-lg mx-1">/</span>
                                    <span id="total-questions" className="text-lg">{gameState.selectedQuestions}</span>
                                </span>
                            </div>
                            <div className="quiz-timer">
                                <div className={`flex items-center gap-2 text-xl md:text-2xl font-mono ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(6, 255, 165, 0.3), transparent)',
                            marginBottom: '1rem'
                        }} />

                        <div className="question-container">
                            {/* Question Image */}
                            {currentQuestion.image && (
                                <div className="mb-6 flex justify-center">
                                    <Image
                                        src={currentQuestion.image}
                                        alt="Question"
                                        width={600}
                                        height={400}
                                        className="rounded-lg max-h-80 object-contain cursor-pointer shadow-lg"
                                        unoptimized
                                        onClick={() => setZoomedImage(currentQuestion.image!)}
                                    />
                                </div>
                            )}

                            <h3 className="question-text text-left text-xl md:text-2xl mb-8" id="question-text">
                                {currentQuestion.question}
                            </h3>

                            <div className="answers-grid grid grid-cols-1 md:grid-cols-2 gap-4" id="answers-grid">
                                {(currentQuestion.answers || []).map((ans: any, index: number) => (
                                    <button
                                        key={index}
                                        className={`answer-btn relative flex items-center gap-4 p-4 text-left transition-all hover:bg-white/10 ${answeredIndex === index
                                            ? index === correctIndex
                                                ? 'correct !bg-green-500/20 !border-green-500' // Selected & Correct
                                                : 'incorrect !bg-red-500/20 !border-red-500'   // Selected & Incorrect
                                            : ''
                                            }`}
                                        onClick={() => checkAnswer(index)}
                                        disabled={buttonsDisabled}
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary/20 text-primary font-bold rounded-lg border border-primary/30">
                                            {String.fromCharCode(65 + index)}
                                        </div>

                                        <div className="flex-grow">
                                            {ans.image && (
                                                <div className="mb-2">
                                                    <Image
                                                        src={ans.image}
                                                        alt={`Option ${String.fromCharCode(65 + index)}`}
                                                        width={200}
                                                        height={150}
                                                        className="rounded-md max-h-32 object-contain cursor-pointer"
                                                        unoptimized
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setZoomedImage(ans.image);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <span className="text-lg">{ans.answer}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

