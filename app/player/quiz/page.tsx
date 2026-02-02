'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { getCurrentPlayer, updatePlayerProgress } from '@/lib/gameSession';

export default function JoinQuizPage(): React.JSX.Element | null {
    const router = useRouter();
    const { gameState, setGameState, showLoading, hideLoading } = useGame();
    const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false);
    const [showCountdown, setShowCountdown] = useState<boolean>(false);
    const [countdownNumber, setCountdownNumber] = useState<number>(3);
    const [isFreezing, setIsFreezing] = useState<boolean>(false); // Freeze overlay to prevent question leak

    // Redirect if no questions
    useEffect(() => {
        if (!gameState.playerName || gameState.questions.length === 0) {
            router.push('/');
        }
    }, [gameState.playerName, gameState.questions.length, router]);

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const progress = ((gameState.currentQuestionIndex + 1) / gameState.selectedQuestions) * 100;

    // Calculate score per correct answer based on selected questions
    const getScorePerQuestion = (): number => {
        switch (gameState.selectedQuestions) {
            case 5: return 20;
            case 10: return 10;
            case 20: return 5;
            default: return 10;
        }
    };

    const scorePerQuestion = getScorePerQuestion();

    // Sync progress to session
    const syncProgress = (questionsAnswered: number, score: number) => {
        const player = getCurrentPlayer();
        if (player) {
            const progressPercent = (questionsAnswered / gameState.selectedQuestions) * 100;
            updatePlayerProgress(player.id, progressPercent, questionsAnswered, score);
        }
    };

    const checkAnswer = (selectedIndex: number): void => {
        if (buttonsDisabled || !currentQuestion) return;

        setButtonsDisabled(true);
        setAnsweredIndex(selectedIndex);
        setCorrectAnswerIndex(currentQuestion.correctAnswer);

        const isCorrect = selectedIndex === currentQuestion.correctAnswer;
        let newScore = gameState.score;

        if (isCorrect) {
            newScore = gameState.score + scorePerQuestion;
            setGameState(prev => ({
                ...prev,
                score: prev.score + scorePerQuestion,
                correctAnswers: prev.correctAnswers + 1
            }));
        }

        // Move to next question after delay
        setTimeout(() => {
            const nextIndex = gameState.currentQuestionIndex + 1;

            // Sync progress to session
            syncProgress(nextIndex, newScore);

            // Check if we need to show mini game (every 3 questions)
            if (nextIndex % 3 === 0 && nextIndex < gameState.selectedQuestions) {
                // Show countdown immediately BEFORE updating question index
                // The question index will be updated when navigating to game
                showMiniGame(nextIndex);
            } else if (nextIndex >= gameState.selectedQuestions) {
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
                showResults();
            } else {
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
                setAnsweredIndex(null);
                setCorrectAnswerIndex(null);
                setButtonsDisabled(false);
            }
        }, 1500);
    };

    const showMiniGame = (nextIndex: number): void => {
        // Show countdown immediately - question stays on current one
        setShowCountdown(true);
        setCountdownNumber(3);

        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdownNumber(count);
            } else {
                clearInterval(countdownInterval);
                // FREEZE SCREEN: Show freeze overlay BEFORE updating question index
                setShowCountdown(false); // Hide countdown
                setIsFreezing(true); // Show freeze overlay

                // Update question index (component will NOT re-render visible question due to freeze)
                setGameState(prev => ({ ...prev, currentQuestionIndex: nextIndex }));

                // Navigate immediately - freeze overlay covers the screen
                router.push('/join/game');
            }
        }, 1000);
    };

    const showResults = (): void => {
        // Mark player as complete
        const player = getCurrentPlayer();
        if (player) {
            updatePlayerProgress(player.id, 100, gameState.selectedQuestions, gameState.score);
        }

        showLoading();
        router.push('/join/results');
    };

    if (!currentQuestion) {
        return null;
    }

    return (
        <>
            {/* Countdown Overlay */}
            {showCountdown && (
                <div className="countdown-overlay">
                    <div className="countdown-number">{countdownNumber}</div>
                </div>
            )}

            {/* Freeze Overlay - prevents next question from being visible during transition */}
            {isFreezing && (
                <div className="freeze-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'var(--background-dark, #0a0a1a)',
                    zIndex: 9999
                }} />
            )}

            <section id="screen-quiz" className="screen active">
                <div className="container">
                    <div className="glass-panel">
                        <div className="quiz-header">
                            <div className="quiz-info">
                                <span className="quiz-counter">
                                    Question <span id="current-question">{gameState.currentQuestionIndex + 1}</span> / <span id="total-questions">{gameState.selectedQuestions}</span>
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" id="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        <div className="question-container">
                            <h3 className="question-text" id="question-text">
                                {currentQuestion.question}
                            </h3>
                            <div className="answers-grid" id="answers-grid">
                                {currentQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        className={`answer-btn ${answeredIndex === index ? (index === correctAnswerIndex ? 'correct' : 'incorrect') : ''} ${correctAnswerIndex === index && answeredIndex !== null ? 'correct' : ''}`}
                                        onClick={() => checkAnswer(index)}
                                        disabled={buttonsDisabled}
                                    >
                                        {option}
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
