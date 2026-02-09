'use client';

import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { DifficultyLevel } from '@/lib/data';
import { getTopicById } from '@/lib/quizData';
import { useEffect, useState } from 'react';

export default function SetupPage(): React.JSX.Element {
    const router = useRouter();
    const { gameState, setGameState, showLoading, hideLoading } = useGame();
    const [selectedTopicName, setSelectedTopicName] = useState<string>('');

    // Redirect if no player name
    useEffect(() => {
        if (!gameState.playerName) {
            router.push('/');
        }
    }, [gameState.playerName, router]);

    // Load selected topic info from localStorage
    useEffect(() => {
        const savedTopicId = localStorage.getItem('cosmicquest_selected_topic');
        if (savedTopicId) {
            const topic = getTopicById(savedTopicId);
            if (topic) {
                setSelectedTopicName(topic.title);
                setGameState(prev => ({ ...prev, selectedTopicId: savedTopicId, topicTitle: topic.title }));
            }
        }
    }, [setGameState]);

    const selectQuestions = (count: number): void => {
        setGameState(prev => ({ ...prev, selectedQuestions: count }));
    };

    const selectDifficulty = (difficulty: DifficultyLevel): void => {
        setGameState(prev => ({ ...prev, selectedDifficulty: difficulty }));
    };

    const goToLobby = (): void => {
        showLoading();
        setTimeout(() => {
            router.push('/host/lobby');
            hideLoading();
        }, 500);
    };

    const isSetupComplete = gameState.selectedQuestions && gameState.selectedDifficulty;

    return (
        <section id="screen-setup" className="screen active">
            <div className="container">
                <div className="glass-panel">
                    <h2 className="section-title">Mission Configuration</h2>
                    <p className="pilot-name-display">Host: <span id="display-name">{gameState.playerName}</span></p>
                    {selectedTopicName && (
                        <p className="mission-name-display" style={{ marginBottom: '1.5rem', color: '#06ffa5', fontSize: '0.95rem' }}>
                            Quiz: <span style={{ fontWeight: 'bold' }}>{selectedTopicName}</span>
                        </p>
                    )}

                    <div className="form-group">
                        <label>Mission</label>
                        <div className="option-grid mission-grid">
                            <button
                                className={`option-btn ${gameState.selectedQuestions === 5 ? 'selected' : ''}`}
                                data-questions="5"
                                onClick={() => selectQuestions(5)}
                            >
                                <span className="option-number">5</span>
                                <span className="option-label">Quick Mission</span>
                            </button>
                            <button
                                className={`option-btn ${gameState.selectedQuestions === 10 ? 'selected' : ''}`}
                                data-questions="10"
                                onClick={() => selectQuestions(10)}
                            >
                                <span className="option-number">10</span>
                                <span className="option-label">Standard Mission</span>
                            </button>
                            <button
                                className={`option-btn ${gameState.selectedQuestions === 20 ? 'selected' : ''}`}
                                data-questions="20"
                                onClick={() => selectQuestions(20)}
                            >
                                <span className="option-number">20</span>
                                <span className="option-label">Full Mission</span>
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Difficulty</label>
                        <div className="option-grid">
                            <button
                                className={`option-btn difficulty-btn ${gameState.selectedDifficulty === 'easy' ? 'selected' : ''}`}
                                data-difficulty="easy"
                                onClick={() => selectDifficulty('easy')}
                            >
                                <span className="option-label-lvl">Easy</span>
                            </button>
                            <button
                                className={`option-btn difficulty-btn ${gameState.selectedDifficulty === 'medium' ? 'selected' : ''}`}
                                data-difficulty="medium"
                                onClick={() => selectDifficulty('medium')}
                            >
                                <span className="option-label-lvl">Medium</span>
                            </button>
                            <button
                                className={`option-btn difficulty-btn ${gameState.selectedDifficulty === 'hard' ? 'selected' : ''}`}
                                data-difficulty="hard"
                                onClick={() => selectDifficulty('hard')}
                            >
                                <span className="option-label-lvl">Hard</span>
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        id="btn-to-hangar"
                        onClick={goToLobby}
                        disabled={!isSetupComplete}
                    >
                        <span>Next</span>
                        <div className="btn-glow"></div>
                    </button>
                </div>
            </div>
        </section>
    );
}
