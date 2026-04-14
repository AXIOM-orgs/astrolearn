/**
 * Game Session Manager
 * Manages game session state using localStorage for host-player synchronization.
 * In a real app, this would use WebSockets or a backend API.
 */

import { Spaceship } from './data';

// Session storage keys
const SESSION_KEY = 'game_session';
const PLAYERS_KEY = 'session_players';

export interface GamePlayer {
    id: string;
    username: string;
    spacecraft: Spaceship | null;
    progress: number; // 0-100
    questionsAnswered: number;
    totalQuestions: number;
    score: number;
    isHost: boolean;
    joinedAt: number;
}

export interface GameSession {
    gameCode: string;
    hostName: string;
    topicId: string | null;
    topicTitle: string;
    selectedQuestions: number;
    difficulty: string;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
    startedAt: number | null;
}

// Create a new game session (Host)
export function createGameSession(
    gameCode: string,
    hostName: string,
    topicId: string | null,
    topicTitle: string,
    selectedQuestions: number,
    difficulty: string
): GameSession {
    const session: GameSession = {
        gameCode,
        hostName,
        topicId,
        topicTitle,
        selectedQuestions,
        difficulty,
        status: 'waiting',
        createdAt: Date.now(),
        startedAt: null
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(PLAYERS_KEY, JSON.stringify([]));

    return session;
}

// Get current game session
export function getGameSession(): GameSession | null {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    try {
        return JSON.parse(sessionData);
    } catch {
        return null;
    }
}

// Update game session
export function updateGameSession(updates: Partial<GameSession>): GameSession | null {
    const session = getGameSession();
    if (!session) return null;

    const updatedSession = { ...session, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
}

// Start the game (Host clicks LAUNCH)
export function startGameSession(): GameSession | null {
    return updateGameSession({
        status: 'playing',
        startedAt: Date.now()
    });
}

// End the game session
export function endGameSession(): GameSession | null {
    return updateGameSession({
        status: 'finished'
    });
}

// Clear game session
export function clearGameSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PLAYERS_KEY);
}

// Validate game code (for joining players)
export function validateGameCode(code: string): boolean {
    const session = getGameSession();
    return session !== null && session.gameCode === code && session.status === 'waiting';
}

// Get session by game code
export function getSessionByCode(code: string): GameSession | null {
    const session = getGameSession();
    if (session && session.gameCode === code) {
        return session;
    }
    return null;
}

// Join a game session (Player)
export function joinGameSession(
    gameCode: string,
    username: string,
    spacecraft: Spaceship | null
): GamePlayer | null {
    const session = getSessionByCode(gameCode);
    if (!session) return null;

    const players = getSessionPlayers();

    // Check if player already exists
    const existingPlayer = players.find(p => p.username === username);
    if (existingPlayer) {
        // Update spacecraft if changed
        existingPlayer.spacecraft = spacecraft;
        saveSessionPlayers(players);
        return existingPlayer;
    }

    const newPlayer: GamePlayer = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username,
        spacecraft,
        progress: 0,
        questionsAnswered: 0,
        totalQuestions: session.selectedQuestions,
        score: 0,
        isHost: false,
        joinedAt: Date.now()
    };

    players.push(newPlayer);
    saveSessionPlayers(players);

    return newPlayer;
}

// Get all players in session
export function getSessionPlayers(): GamePlayer[] {
    const playersData = localStorage.getItem(PLAYERS_KEY);
    if (!playersData) return [];
    try {
        return JSON.parse(playersData);
    } catch {
        return [];
    }
}

// Save session players
function saveSessionPlayers(players: GamePlayer[]): void {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

// Update player progress
export function updatePlayerProgress(
    playerId: string,
    progress: number,
    questionsAnswered: number,
    score: number
): void {
    const players = getSessionPlayers();
    const playerIndex = players.findIndex(p => p.id === playerId);

    if (playerIndex !== -1) {
        players[playerIndex] = {
            ...players[playerIndex],
            progress,
            questionsAnswered,
            score
        };
        saveSessionPlayers(players);
    }
}

// Update player spacecraft
export function updatePlayerSpacecraft(playerId: string, spacecraft: Spaceship): void {
    const players = getSessionPlayers();
    const playerIndex = players.findIndex(p => p.id === playerId);

    if (playerIndex !== -1) {
        players[playerIndex].spacecraft = spacecraft;
        saveSessionPlayers(players);
    }
}

// Check if game has started (for waiting players to poll)
export function hasGameStarted(): boolean {
    const session = getGameSession();
    return session !== null && session.status === 'playing';
}

// Check if game has finished
export function hasGameFinished(): boolean {
    const session = getGameSession();
    return session !== null && session.status === 'finished';
}

// Get current player from localStorage
export function getCurrentPlayer(): GamePlayer | null {
    const playerData = localStorage.getItem('current_player');
    if (!playerData) return null;
    try {
        return JSON.parse(playerData);
    } catch {
        return null;
    }
}

// Set current player
export function setCurrentPlayer(player: GamePlayer): void {
    localStorage.setItem('current_player', JSON.stringify(player));
}

// Clear current player
export function clearCurrentPlayer(): void {
    localStorage.removeItem('current_player');
}
