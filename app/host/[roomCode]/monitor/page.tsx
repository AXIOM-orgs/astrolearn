'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useDialog } from '@/context/AlertContext'; // Import AlertContext
import { supabaseGame } from '@/lib/supabase'; // pastikan path sesuai supabase.ts kamu
import { Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EndGameConfirmationDialog } from '@/app/components/ui/EndGameConfirmationDialog';

interface Participant {
    id: string;
    nickname: string;
    spacecraft: string; // contoh: "galaksi2.webp"
    answers: any; // JSON string array
    current_question?: number;
    finished_at: string | null;
    joined_at: string;
    score?: number;
}

interface Session {
    id: string;
    game_pin: string;
    status: string;
    question_limit: number;
    total_time_minutes: number;
    started_at: string;
    current_questions?: any[];
}

export default function HostMonitorPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const gamePin = params.roomCode as string;
    const { showLoading, hideLoading } = useGame();
    const { showError } = useDialog(); // Use Dialog Hook

    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [totalQuestions, setTotalQuestions] = useState<number>(5);
    const [timeRemaining, setTimeRemaining] = useState<number>(300);
    const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);

    // Hitung progress & status completed
    const processedPlayers = useMemo(() => {
        return participants.map(p => {
            // Handle JSONB: sudah array, atau null/undefined/other
            const answersArray = Array.isArray(p.answers) ? p.answers : [];

            const questionsAnswered = answersArray.length;

            // Alternatif lebih akurat: pakai current_question jika ada (karena kadang lebih up-to-date)
            // const questionsAnswered = p.current_question ?? answersArray.length;

            const progress = totalQuestions > 0
                ? (questionsAnswered / totalQuestions) * 100
                : 0;

            const isCompleted = !!p.finished_at;

            return {
                ...p,
                questionsAnswered,
                progress,
                isCompleted,
            };
        });
    }, [participants, totalQuestions]);

    // Sorting: selesai dulu, lalu progress terbanyak, lalu join paling awal
    const sortedPlayers = useMemo(() => {
        return [...processedPlayers].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return b.isCompleted ? 1 : -1;
            if (a.questionsAnswered !== b.questionsAnswered) return b.questionsAnswered - a.questionsAnswered;
            return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        });
    }, [processedPlayers]);

    // Timer akurat berbasis server time
    useEffect(() => {
        if (!session?.started_at) return;

        const interval = setInterval(() => {
            const start = new Date(session.started_at).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, session.total_time_minutes * 60 - elapsedSeconds);
            setTimeRemaining(remaining);

            // Auto end jika waktu habis
            if (remaining <= 0 && session.status === 'active') {
                handleEndGame();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session]);

    // Auto end jika semua pemain selesai
    useEffect(() => {
        const allDone = sortedPlayers.length > 0 && sortedPlayers.every(p => p.isCompleted);
        if (allDone && session?.status === 'active') {
            handleEndGame();
        }
    }, [sortedPlayers, session]);

    // Fetch initial session + participants
    useEffect(() => {
        if (!gamePin) return;

        const init = async () => {
            // Fetch session
            const { data: sess, error } = await supabaseGame
                .from('sessions')
                .select('*')
                .eq('game_pin', gamePin)
                .single();

            if (error || !sess) {
                console.error('Session tidak ditemukan', error);
                router.push('/host');
                return;
            }

            setSession(sess);
            setTotalQuestions(sess.question_limit || 5);

            // Fetch participants
            const { data: parts } = await supabaseGame
                .from('participants')
                .select('id, nickname, spacecraft, answers, current_question, finished_at, joined_at, score')
                .eq('session_id', sess.id)
                .order('joined_at', { ascending: true });

            if (parts) setParticipants(parts);

            hideLoading();
        };

        init();
    }, [gamePin, router]);

    // Realtime session
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabaseGame
            .channel(`host-session-${gamePin}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `game_pin=eq.${gamePin}` },
                payload => {
                    setSession(payload.new as Session);
                    if (payload.new.status === 'finished') {
                        setTimeout(() => router.push('/host/leaderboard'), 1500);
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [session?.id, gamePin, router]);

    // Realtime participants
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabaseGame
            .channel(`host-participants-${gamePin}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
                payload => {
                    if (payload.eventType === 'INSERT') {
                        const newP = payload.new as Participant;
                        setParticipants(prev => [...prev, newP]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Participant;
                        setParticipants(prev =>
                            prev.map(p => (p.id === updated.id ? updated : p))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [session?.id, gamePin]);

    const handleEndGame = async () => {
        if (!session) return;
        showLoading();

        try {
            // Update session
            const { error: sessError } = await supabaseGame
                .from('sessions')
                .update({
                    status: 'finished',
                    ended_at: new Date().toISOString(),
                })
                .eq('id', session.id);

            if (sessError) throw sessError;

            // Force semua participant yang belum selesai jadi finished
            const { error: partError } = await supabaseGame
                .from('participants')
                .update({
                    finished_at: new Date().toISOString(),
                })
                .eq('session_id', session.id)
                .is('finished_at', null);

            if (partError) throw partError;

            router.push('/host/leaderboard');
        } catch (err) {
            hideLoading();
            console.error('Gagal mengakhiri game:', err);
            showError('Gagal mengakhiri game. Coba lagi.');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <section className="host-monitor-screen">
            {/* Header */}
            <header className="monitor-header">
                <div className="monitor-brand">
                    <img
                        src="/assets/logo2.webp"
                        alt="Astro Learning"
                        className="brand-logo-image"
                        style={{ height: 'auto', width: '300px', objectFit: 'contain' }}
                    />
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo"
                />
            </header>

            {/* Title */}
            {/* <div className="monitor-title-section">
                <h2 className="monitor-title">MONITOR</h2>
            </div> */}

            {/* Monitor Info Bar */}
            <div className="monitor-info-bar">
                <div className="info-item completion-status">
                    <Users />
                    <span className="info-value">{participants.length}</span>
                </div>

                <div className="info-item timer-central">
                    <div className="timer-display">
                        <span className={`timer-value ${timeRemaining <= 30 ? 'text-red-500 animate-pulse' : ''}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>
                </div>

                <div className="info-item actions">
                    <button className="btn-end-game" onClick={() => setIsEndConfirmOpen(true)}>
                        <span>End Game</span>
                    </button>
                </div>
            </div>

            <EndGameConfirmationDialog
                isOpen={isEndConfirmOpen}
                onClose={() => setIsEndConfirmOpen(false)}
                onConfirm={() => {
                    setIsEndConfirmOpen(false);
                    handleEndGame();
                }}
            />

            {/* Player Progress Grid */}
            <div className="progress-grid">
                {sortedPlayers.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No players have joined yet.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {sortedPlayers.map((player) => {
                            const isActive = !player.isCompleted && player.questionsAnswered > 0;

                            return (
                                <motion.div
                                    key={player.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    whileHover={{ scale: 1.05 }}
                                    className={`progress-card ${player.isCompleted ? 'completed' : ''} ${isActive ? 'animate-pulse-glow' : ''}`}
                                >
                                    <div className="progress-card-header">
                                        <div className="progress-bar-container">
                                            <div
                                                className={`progress-bar-fill ${player.isCompleted ? 'complete' : ''}`}
                                                style={{ width: `${player.progress}%` }}
                                            />
                                        </div>
                                        <span className="progress-indicator">
                                            {player.questionsAnswered}/{totalQuestions}
                                            {player.isCompleted && <Check className="inline w-4 h-4 ml-1 text-green-400" />}
                                        </span>
                                    </div>
                                    <div className="progress-card-body">
                                        {player.spacecraft ? (
                                            <img
                                                src={`/assets/${player.spacecraft}`}
                                                alt="spacecraft"
                                                className={`progress-spacecraft ${!player.isCompleted ? 'animate-float' : ''}`}
                                            />
                                        ) : (
                                            <div className="progress-icon">🚀</div>
                                        )}
                                        <span className="progress-player-name">{player.nickname}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* CSS tambahan untuk animasi yang diminta */}
            <style jsx>{`
        .progress-card.completed {
          border: 3px solid #00ff00;
          box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
        }
        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #00ff00, #00cc00);
        }
        .animate-pulse-glow {
          animation: glowPulse 2s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </section>
    );
}