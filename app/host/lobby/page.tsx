'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '@/context/GameContext';
import { generateGameCode } from '@/lib/mockPlayers';
import { GameCodeDialog } from '@/app/components/ui/GameCodeDialog';
import {
    createGameSession,
    getSessionPlayers,
    startGameSession,
    clearGameSession,
    GamePlayer
} from '@/lib/gameSession';

export default function HostLobbyPage(): React.JSX.Element {
    const router = useRouter();
    const { gameState } = useGame();
    const [gameCode, setGameCode] = useState<string>('');
    const [players, setPlayers] = useState<GamePlayer[]>([]);
    const [showQRDialog, setShowQRDialog] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [joinUrl, setJoinUrl] = useState<string>('');
    const prevPlayerCount = useRef<number>(0);

    // Set joinUrl on client side only
    useEffect(() => {
        setJoinUrl(`${window.location.origin}/?code=${gameCode}`);
    }, [gameCode]);

    // Create game session on mount
    useEffect(() => {
        const code = generateGameCode();
        setGameCode(code);

        // Create the game session
        createGameSession(
            code,
            gameState.playerName || 'Host',
            gameState.selectedTopicId,
            gameState.topicTitle || 'Quiz',
            gameState.selectedQuestions || 10,
            gameState.selectedDifficulty || 'medium'
        );

        // Cleanup on unmount
        return () => {
            // Note: Don't clear session here as we might be navigating to monitor
        };
    }, [gameState]);

    // Poll for players joining
    useEffect(() => {
        const pollInterval = setInterval(() => {
            const sessionPlayers = getSessionPlayers();

            // Play sound when new player joins
            if (sessionPlayers.length > prevPlayerCount.current) {
                const audio = new Audio('/sounds/join.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => { }); // Ignore errors if sound doesn't exist
            }
            prevPlayerCount.current = sessionPlayers.length;

            setPlayers(sessionPlayers);
        }, 1000); // Poll every second

        return () => clearInterval(pollInterval);
    }, []);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(gameCode);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Astro Learning',
                    text: `Join my Astro Learning game with code: ${gameCode}`,
                    url: joinUrl
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            handleCopyCode();
        }
    };

    const handleEndSession = () => {
        if (confirm('Are you sure you want to end this session?')) {
            clearGameSession();
            router.push('/');
        }
    };

    const handleLaunch = () => {
        if (players.length === 0) {
            return; // Button is disabled, but double check
        }

        // Start the game session
        startGameSession();
        router.push('/host/monitor');
    };

    return (
        <section className="host-lobby-screen">
            {/* Header */}
            <header className="host-header">
                <div className="host-brand">
                    <img
                        src="/assets/logo2.png"
                        alt="Astro Learning"
                        className="brand-logo-image"
                    />
                </div>
                <img
                    src="/assets/logo.png"
                    alt="Gameforsmart Logo"
                    className="header-logo"
                />
            </header>

            {/* Main Content */}
            <div className="host-lobby-content">
                {/* Left Panel - Game Code & QR (Formerly Right) */}
                <div className="host-right-panel">
                    <div className="game-code-section">
                        <div className="game-code-display">
                            <span className="game-code">{gameCode}</span>
                        </div>
                        <div className="code-actions">
                            <button
                                className="btn-code-action mobile-view"
                                onClick={() => setShowQRDialog(true)}
                            >
                                <span>QR CODE</span>
                            </button>
                        </div>
                    </div>

                    {/* Desktop QR Section */}
                    <div className="qr-section desktop-view">
                        <div className="qr-container" onClick={() => setShowQRDialog(true)}>
                            <div className="qr-frame">
                                <div className="qr-corner top-left"></div>
                                <div className="qr-corner top-right"></div>
                                <div className="qr-corner bottom-left"></div>
                                <div className="qr-corner bottom-right"></div>
                                <QRCodeSVG
                                    value={joinUrl}
                                    size={160}
                                    bgColor="transparent"
                                    fgColor="#46a7bb"
                                    level="H"
                                />
                            </div>
                        </div>
                    </div>

                    {/* URL Card Panel */}
                    <div className="url-card-panel">
                        <div className="url-card compact">
                            <span className="url-text">
                                {joinUrl.replace('join?pin=', '').length > 30
                                    ? `${joinUrl.replace('join?pin=', '').substring(0, 30)}...`
                                    : joinUrl.replace('join?pin=', '')}
                            </span>
                            <button
                                className="url-copy-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(joinUrl);
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                }}
                                title="Copy link"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="lobby-action-bar right-panel-actions">
                        <button className="btn-end-session" onClick={handleEndSession}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                            <span>EXIT</span>
                        </button>
                        <button
                            className={`btn-launch ${players.length === 0 ? 'disabled' : ''}`}
                            onClick={handleLaunch}
                            disabled={players.length === 0}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>START</span>
                        </button>
                    </div>
                </div>

                {/* Right Panel - Player Grid (Formerly Left) */}
                <div className="host-left-panel">
                    {/* Player Count Badge */}
                    <div className="player-count-header">
                        <div className="player-count-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Players ({players.length})</span>
                        </div>
                    </div>

                    {/* Player Grid Container - Scrollable */}
                    <div className="player-grid-container">
                        {players.length === 0 ? (
                            /* Waiting Animation */
                            <div className="waiting-animation">
                                <div className="waiting-icon">
                                    <img
                                        src="/assets/waitplayer.png"
                                        alt="Waiting for players"
                                        className="waiting-astronaut"
                                    />
                                </div>
                                <p className="waiting-text">Waiting for players to join...</p>
                                <div className="waiting-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        ) : (
                            /* Player Cards */
                            <div className="player-grid">
                                {players.map((player) => (
                                    <div key={player.id} className="player-card">
                                        <div className="player-icon">
                                            {player.spacecraft ? (
                                                <img
                                                    src={player.spacecraft.image}
                                                    alt={player.spacecraft.name}
                                                    style={{ width: '40px', height: '30px', objectFit: 'contain' }}
                                                />
                                            ) : '🚀'}
                                        </div>
                                        <span className="player-name">{player.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QR Dialog */}
            <GameCodeDialog
                isOpen={showQRDialog}
                onClose={() => setShowQRDialog(false)}
                gameCode={gameCode}
                joinUrl={joinUrl}
            />
        </section >
    );
}
