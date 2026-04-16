'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { QuizQuestion, Spaceship, DifficultyLevel } from '@/lib/data';

// Game State Interface
export interface GameStats {
    hits: number;
    asteroidsDestroyed: number;
    gameScore: number;
    bossDestroyed: boolean;
    success: boolean;
}

export interface GameState {
    playerName: string;
    selectedTopicId: string | null;
    topicTitle: string;
    selectedQuestions: number;
    selectedDifficulty: DifficultyLevel;
    selectedSpaceship: Spaceship | null;
    currentQuestionIndex: number;
    score: number;
    correctAnswers: number;
    questions: QuizQuestion[];
    miniGamesCompleted: number;
    gameStats: GameStats;
    isEliminated: boolean;
    duration: number | null;
}

// Context Interface
export interface GameContextType {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    isLoading: boolean;
    showLoading: () => void;
    hideLoading: () => void;
    resetGame: () => void;
}

// Initial State
const initialGameState: GameState = {
    playerName: '',
    selectedTopicId: null,
    topicTitle: '',
    selectedQuestions: 10,
    selectedDifficulty: 'easy',
    selectedSpaceship: null,
    currentQuestionIndex: 0,
    score: 0,
    correctAnswers: 0,
    questions: [],
    miniGamesCompleted: 0,
    gameStats: {
        hits: 0,
        asteroidsDestroyed: 0,
        gameScore: 0,
        bossDestroyed: false,
        success: false
    },
    isEliminated: false,
    duration: null
};

// Create Context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider Component
interface GameProviderProps {
    children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps): React.JSX.Element {
    const [gameState, setGameState] = useState<GameState>(initialGameState);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showLoading = useCallback((): void => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback((): void => {
        hideTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            hideTimeoutRef.current = null;
        }, 300);
    }, []);

    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    const resetGame = useCallback((): void => {
        setGameState(initialGameState);
    }, []);

    const value: GameContextType = {
        gameState,
        setGameState,
        isLoading,
        showLoading,
        hideLoading,
        resetGame
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

// Custom Hook
export function useGame(): GameContextType {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

export { initialGameState };
