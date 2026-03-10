'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { clearCurrentPlayer } from '@/lib/gameSession';
import { supabaseGame } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Home, BarChart2, BarChart3 } from 'lucide-react';

interface ParticipantData {
    id: string;
    score: number;
    duration: number; // in seconds
    correct: number;
    nickname: string;
    user_id: string;
    spacecraft?: string;
    eliminated?: boolean;
}

export default function JoinResultsPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const { user, profile } = useAuth();
    const { resetGame, showLoading, hideLoading } = useGame();

    // State for DB data
    const [myRank, setMyRank] = useState<number | string>('?');
    const [myStats, setMyStats] = useState<ParticipantData | null>(null);
    const [isSessionFinished, setIsSessionFinished] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [totalQuestions, setTotalQuestions] = useState(0);

    // Hide loading overlay when results page loads
    useEffect(() => {
        hideLoading();
    }, [hideLoading]);

    // Main Logic: Fetch Session -> Fetch My Participant Data -> Calculate Rank (if finished)
    useEffect(() => {
        const roomCode = params?.roomCode as string;

        // Wait for auth to load.
        if (!roomCode || !user) return;

        const fetchData = async () => {
            try {
                setLoadingData(true);
                console.log('Fetching result data for room:', roomCode);

                // 1. Get Session Status & Details
                const { data: sessionData, error: sessionError } = await supabaseGame
                    .from('sessions')
                    .select('id, status, question_limit')
                    .eq('game_pin', roomCode)
                    .maybeSingle();

                if (sessionError || !sessionData) {
                    console.error('Error fetching session:', sessionError);
                    setLoadingData(false);
                    return;
                }

                setTotalQuestions(sessionData.question_limit || 0);
                const sessionId = sessionData.id;
                setSessionId(sessionId);

                // 2. Fetch My Participant Data from DB
                let myData: ParticipantData | null = null;

                if (profile?.id) {
                    const userIdToMatch = profile?.id;
                    const { data: pData, error: pError } = await supabaseGame
                        .from('participants')
                        .select('id, score, duration, correct, nickname, user_id, spacecraft, eliminated')
                        .eq('session_id', sessionId)
                        .eq('user_id', userIdToMatch)
                        .maybeSingle();

                    if (pData) {
                        myData = pData;
                    } else {
                        console.warn('Participant not found for user_id:', userIdToMatch);
                    }
                }

                if (myData) {
                    setMyStats(myData);
                }

                // 3. Status & Rank Logic
                const handleStatusChange = async (status: string) => {
                    if (status === 'finished') {
                        setIsSessionFinished(true);
                        if (sessionId && myData?.id) {
                            await calculateRank(sessionId, myData.id);
                        }
                    } else {
                        setIsSessionFinished(false);
                        setMyRank('?');
                    }
                };

                await handleStatusChange(sessionData.status);

                // Real-time subscription
                const channel = supabaseGame.channel(`session_updates_${roomCode}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'sessions',
                            filter: `id=eq.${sessionId}`
                        },
                        async (payload) => {
                            const newStatus = (payload.new as any).status;
                            await handleStatusChange(newStatus);
                        }
                    )
                    .subscribe();

                return () => {
                    supabaseGame.removeChannel(channel);
                };

            } catch (err) {
                console.error('Error in fetchData:', err);
            } finally {
                setLoadingData(false);
            }
        };

        // Helper to calculate rank
        const calculateRank = async (sessionId: string, myParticipantId: string) => {
            const { data: participants, error: partError } = await supabaseGame
                .from('participants')
                .select('id, score, duration, eliminated, joined_at')
                .eq('session_id', sessionId);

            if (partError || !participants) return;

            // normalize data biar aman
            const processed = participants.map(p => ({
                ...p,
                duration: p.duration ?? 999999
            }));

            // sorting rules sama persis kayak leaderboard host
            const sorted = processed.sort((a, b) => {
                // 1. Not eliminated first
                if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;

                // 2. Higher score first
                if (b.score !== a.score) return b.score - a.score;

                // 3. Lower duration first
                if (a.duration !== b.duration) return a.duration - b.duration;

                // 4. Earlier joined first
                const joinA = new Date(a.joined_at).getTime();
                const joinB = new Date(b.joined_at).getTime();
                if (joinA !== joinB) return joinA - joinB;

                // 5. Final fallback biar gak random
                return a.id.localeCompare(b.id);
            });

            const rankIndex = sorted.findIndex(p => p.id === myParticipantId);
            if (rankIndex !== -1) {
                setMyRank(rankIndex + 1);
            }
        };

        fetchData();

    }, [params?.roomCode, user, profile, user?.id]);

    const handleRestart = (): void => {
        clearCurrentPlayer();
        localStorage.removeItem('cosmicquest_joined_game_code');
        resetGame();
        showLoading();
        setTimeout(() => {
            router.push('/');
            hideLoading();
        }, 500);
    };

    // Get ordinal suffix for rank
    const getOrdinal = (n: number | string): string => {
        if (typeof n === 'string') return '';
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    // Format duration mm:ss from SECONDS
    const formatDuration = (seconds: number | undefined | null): string => {
        if (seconds === undefined || seconds === null) return '--:--';
        // Ensure we treat it as seconds.
        const totalSeconds = Math.floor(Number(seconds));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to get image path:
    const getSpacecraftImage = (sc: string | undefined) => {
        if (!sc) return null;
        if (sc.startsWith('/') || sc.startsWith('http')) return sc;
        // Check if user confirmed assets are in public/assets. 
        // Logic: if filename only, prepend /assets/
        return `/assets/${sc}`;
    };

    return (
        <section id="screen-results" className="result-screen">
            {/* Header */}
            <header className="results-header w-full">
                <div className="results-brand">
                    <img
                        src="/assets/logo2new.webp"
                        alt="Axiom"
                        className="brand-logo-image"
                    />
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo"
                />
            </header>

            {/* Navigation Buttons */}
            <button className="floating-btn home-btn" onClick={handleRestart} title="Home">
                <Home size={28} />
            </button>

            {/* Tombol Statistik */}
            {isSessionFinished && sessionId && myStats?.id ? (
                <a
                    href={`https://gameforsmartnewui.vercel.app/stat/${sessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="floating-btn statistics-btn"
                    title="See Statistics"
                >
                    <BarChart3 size={28} />
                </a>
            ) : (
                <button
                    disabled
                    className="floating-btn statistics-btn"
                    style={{ opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' }}
                    title="Waiting for host to finish game"
                >
                    <BarChart3 size={28} />
                </button>
            )}

            <div className="results-wrapper">
                {/* Top Card: Spacecraft Image */}
                <div className="result-top-card">
                    {/* Elimination Message */}
                    {myStats?.eliminated && (
                        <div className="eliminated-badge">
                            ELIMINATED
                        </div>
                    )}
                    {/* Display Spacecraft Image */}
                    {myStats?.spacecraft ? (
                        <img
                            src={`/assets/images/characters/players/${myStats.spacecraft}`}
                            alt="Spacecraft"
                            id="result-character-img"
                            className="result-spaceship-img"
                            // Remove borderRadius: 50% because spaceships are usually ships, not round avatars.
                            style={{ objectFit: 'contain', width: '120px', height: '120px' }}
                        />
                    ) : (
                        <div className="result-spaceship-placeholder" style={{ fontSize: '4rem' }}>🚀</div>
                    )}
                    <div className="result-top-info">
                        <p className="result-pilot-name" id="result-name-display">
                            {myStats?.nickname || profile?.nickname || profile?.username || 'Pilot'}
                        </p>
                    </div>
                </div>

                <div className="result-stats-row">
                    {/* Rank Card */}
                    <div className="result-stat-card rank-card">
                        <div className="rank-display">
                            <span className="trophy-icon">🏆</span>
                            <span className="result-stat-value rank-value">
                                {myRank}
                                {typeof myRank === 'number' && <sup>{getOrdinal(myRank)}</sup>}
                            </span>
                        </div>
                        <span className="result-stat-label">
                            {isSessionFinished ? 'Rank' : 'Waiting...'}
                        </span>
                    </div>

                    {/* Score Card - FROM DB */}
                    <div className="result-stat-card">
                        <span className="result-stat-value" id="result-score">
                            {myStats?.score ?? '-'}
                        </span>
                        <span className="result-stat-label">Score</span>
                    </div>

                    {/* Correct Card - FROM DB */}
                    <div className="result-stat-card">
                        <span className="result-stat-value">
                            <span id="result-correct">{myStats?.correct ?? '-'}</span>
                            /<span id="result-total">{totalQuestions}</span>
                        </span>
                        <span className="result-stat-label">Correct</span>
                    </div>

                    {/* Duration Card - FROM DB */}
                    <div className="result-stat-card">
                        <span className="result-stat-value">
                            {formatDuration(myStats?.duration)}
                        </span>
                        <span className="result-stat-label">Time</span>
                    </div>
                </div>

                {/* Mobile Specific Actions */}
                <div className="result-mobile-actions">
                    <button className="btn-result-mobile home" onClick={handleRestart}>
                        <Home size={20} />
                        <span>Home</span>
                    </button>

                    {isSessionFinished && sessionId && myStats?.id ? (
                        <a
                            href={`https://gameforsmartnewui.vercel.app/stat/${sessionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-result-mobile stats"
                        >
                            <BarChart3 size={20} />
                            <span>Statistics</span>
                        </a>
                    ) : (
                        <button className="btn-result-mobile stats disabled" disabled>
                            <BarChart3 size={20} />
                            <span>Statistics</span>
                        </button>
                    )}
                </div>

                {/* Home Button */}
                {/* <button className="btn-home" onClick={handleRestart}>
                    <span>HOME</span>
                </button> */}
            </div>
        </section>
    );
}
