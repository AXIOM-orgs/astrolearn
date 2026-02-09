'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { getRandomSciFiName } from '@/lib/randomNames';
import { FullscreenToggle } from './components/FullscreenToggle';
import { ProfileMenu } from './components/ProfileSidebar';
import { getSessionByCode, joinGameSession, setCurrentPlayer } from '@/lib/gameSession'; // Added joinGameSession, setCurrentPlayer
import { spaceships, quizQuestions } from '@/lib/data'; // Added spaceships, quizQuestions
import { getQuestionsByTopicAndCount } from '@/lib/quizData'; // Added getQuestionsByTopicAndCount

const PLAYER_NAME_KEY = 'cosmicquest_player_name';
const USERNAME_KEY = 'cosmicquest_username';
const GAME_CODE_KEY = 'cosmicquest_joined_game_code';

export default function LandingPage(): React.JSX.Element {
    const router = useRouter();
    const { setGameState, showLoading, hideLoading } = useGame();

    const [sectorCode, setSectorCode] = useState('');
    const [username, setUsername] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const usernameInputRef = useRef<HTMLInputElement>(null);

    // Load saved username from localStorage on mount
    useEffect(() => {
        const savedUsername = localStorage.getItem(USERNAME_KEY);
        if (savedUsername) {
            setUsername(savedUsername);
        }

        // Check for game code in URL query parameters
        const params = new URLSearchParams(window.location.search);
        const codeFromUrl = params.get('code');
        if (codeFromUrl) {
            setSectorCode(codeFromUrl.toUpperCase());
        }
    }, []);

    // Save username to localStorage whenever it changes
    const handleUsernameChange = (value: string): void => {
        setUsername(value);
        localStorage.setItem(USERNAME_KEY, value);
    };

    const handleRandomizeName = (): void => {
        const randomName = getRandomSciFiName();
        handleUsernameChange(randomName);
        if (usernameInputRef.current) {
            usernameInputRef.current.focus();
        }
    };

    const handleCreateRoom = (): void => {
        if (!username.trim()) {
            alert('Please enter a username first!');
            return;
        }

        // Save to game state and localStorage
        localStorage.setItem(PLAYER_NAME_KEY, username);
        setGameState(prev => ({ ...prev, playerName: username }));

        showLoading();
        setTimeout(() => {
            router.push('/host/select-quiz');
            hideLoading();
        }, 500);
    };

    const handleLaunchMission = (): void => {
        if (!sectorCode.trim()) {
            alert('Please enter a game code!');
            return;
        }
        if (!username.trim()) {
            alert('Please enter a username!');
            return;
        }

        // Validate game code
        const session = getSessionByCode(sectorCode.trim());
        if (!session) {
            alert('Invalid game code! Please check and try again.');
            return;
        }

        if (session.status !== 'waiting') {
            alert('This game has already started or ended.');
            return;
        }

        // Helper to pick random spaceship
        const randomSpaceship = spaceships[Math.floor(Math.random() * spaceships.length)];

        // Join the game session immediately
        const player = joinGameSession(
            sectorCode.trim(),
            username,
            randomSpaceship
        );

        if (!player) {
            alert('Failed to join game. The session may have ended or is full.');
            return;
        }

        // Save current player
        setCurrentPlayer(player);

        // Prepare questions for when game starts
        let questions;
        if (session.topicId) {
            const topicQuestions = getQuestionsByTopicAndCount(
                session.topicId,
                session.selectedQuestions
            );
            questions = topicQuestions
                .map(q => ({
                    ...q,
                    difficulty: session.difficulty as 'easy' | 'medium' | 'hard'
                }))
                .sort(() => Math.random() - 0.5);
        } else {
            // Fallback if no topic (shouldn't happen in valid flow but good for safety)
            const allQuestions = quizQuestions[session.difficulty as 'easy' | 'medium' | 'hard'];
            const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
            questions = shuffled.slice(0, session.selectedQuestions);
        }

        // Save to game state and localStorage
        // Save to game state and localStorage
        localStorage.setItem(PLAYER_NAME_KEY, username);
        localStorage.setItem(GAME_CODE_KEY, sectorCode.trim());

        setGameState(prev => ({
            ...prev,
            playerName: username,
            selectedTopicId: session.topicId,
            topicTitle: session.topicTitle,
            selectedQuestions: session.selectedQuestions,
            selectedDifficulty: session.difficulty as 'easy' | 'medium' | 'hard',
            selectedSpaceship: randomSpaceship, // Set the random spaceship
            questions, // Set the prepared questions
            currentQuestionIndex: 0,
            score: 0,
            correctAnswers: 0,
            miniGamesCompleted: 0
        }));

        showLoading();
        setTimeout(() => {
            // Navigate directly to waiting room (Skipping Hangar)
            router.push('/join/waiting');
            hideLoading();
        }, 500);
    };

    const toggleSidebar = (): void => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <section className="landing-page">
            {/* Profile Indicator */}
            <button className="profile-indicator" onClick={toggleSidebar}>
                <div className="profile-info">
                    <span className="profile-name">{username || 'Aluna Kynan'}</span>
                    <div className="profile-avatar">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M12 14c-6 0-8 3-8 6v1h16v-1c0-3-2-6-8-6z" />
                        </svg>
                    </div>
                </div>
                <svg className="profile-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {/* Profile Menu */}
            <ProfileMenu
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                username={username}
            />

            {/* Main Content */}
            <div className="landing-content">
                {/* Header */}
                <header className="landing-header">
                    <h1 className="cosmic-title">ASTRO LEARNING</h1>
                    <p className="cosmic-subtitle">ENTER THE COSMIC ARENA</p>
                </header>

                {/* Cards Container */}
                <div className="landing-cards">
                    {/* Host Game Card */}
                    <div className="landing-card host-card">
                        <div className="card-icon host-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5l5 3.1v6.8l-5 3.1-5-3.1V7.6l5-3.1z" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                        </div>
                        <h2 className="card-title">HOST GAME</h2>
                        <p className="card-description card-description-host">
                            Create Your Space and Invite Other Pilots.
                        </p>
                        <button className="btn-create-room" onClick={handleCreateRoom}>
                            CREATE ROOM
                        </button>
                    </div>

                    {/* Join Race Card */}
                    <div className="landing-card join-card">
                        <div className="card-icon join-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                            </svg>
                        </div>
                        <h2 className="card-title">JOIN</h2>
                        <p className="card-description">
                            Enter a game code to join.
                        </p>

                        <div className="input-group">
                            <input
                                type="text"
                                className="landing-input"
                                placeholder="Game Code"
                                value={sectorCode}
                                onChange={(e) => setSectorCode(e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                        </div>

                        <div className="input-group">
                            <input
                                ref={usernameInputRef}
                                type="text"
                                className="landing-input"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                maxLength={20}
                            />
                            <button
                                className="input-icon randomize-btn"
                                onClick={handleRandomizeName}
                                title="Generate random name"
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                                </svg>
                            </button>
                        </div>

                        <button className="btn-launch-mission" onClick={handleLaunchMission}>
                            GO MISSION
                        </button>
                    </div>
                </div>
            </div>
            {/* Fullscreen Toggle */}
            <FullscreenToggle />
        </section>
    );
}
