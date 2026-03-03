'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Home, RotateCw, BarChart3 } from 'lucide-react';
import { supabaseGame, supabase } from '@/lib/supabase'; // pastikan path sesuai
import { useGame } from '@/context/GameContext'; // pastikan path sesuai
import { generateXID } from '@/lib/id-generator';

// Helper: Generate game PIN
function generateGamePin(length = 6): string {
  const digits = '0123456789';
  return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
}

// Helper: Shuffle Array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface Participant {
  id: string;
  nickname: string;
  spacecraft: string;
  score: number;
  duration: number | null;
  finished_at: string | null;
  joined_at: string;
  eliminated?: boolean;
}

export default function HostLeaderboardPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const gamePin = params.roomCode as string;
  const { showLoading, hideLoading } = useGame();

  const [players, setPlayers] = useState<Participant[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visibleRanks, setVisibleRanks] = useState<number[]>([]);
  const [isRestarting, setIsRestarting] = useState(false);



  const handleHome = () => {
    router.push('/');
  };

  const handleRestart = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    showLoading();

    try {
      // 1. Ambil session lama
      const { data: oldSess, error: oldSessErr } = await supabaseGame
        .from("sessions")
        .select("quiz_id, host_id, question_limit, total_time_minutes, difficulty, current_questions")
        .eq("game_pin", gamePin)
        .single();

      if (oldSessErr || !oldSess) throw new Error("Session lama tidak ditemukan");

      // 2. Persiapkan data baru
      const questions = oldSess.current_questions || [];
      const shuffled = shuffleArray(questions);
      const limit = oldSess.question_limit || 5;
      const sliced = shuffled.slice(0, limit);

      const newPin = generateGamePin(6);
      const newSessionId = generateXID();

      const sessionData = {
        id: newSessionId,
        game_pin: newPin,
        quiz_id: oldSess.quiz_id,
        host_id: oldSess.host_id,
        status: "waiting",
        question_limit: limit,
        total_time_minutes: oldSess.total_time_minutes,
        difficulty: oldSess.difficulty,
        current_questions: sliced,
      };

      // 3. Insert ke supabaseGame (gameplay)
      const { error: gameError } = await supabaseGame
        .from("sessions")
        .insert(sessionData);

      if (gameError) throw gameError;

      // 4. Insert ke supabase utama (join functionality)
      const mainSessionData = {
        ...sessionData,
        application: "axiom",
        participants: [],
        responses: [],
        // Convert numbers/arrays to strings if needed by main DB schema, 
        // but usually main DB schema matches if standardized.
        // Check previous implementation: main DB might expect string for question_limit?
        // In settings-form it was sent as number. Let's assume number is fine or handled.
        // Actually checking settings-form again... 
        // supabase.from('game_sessions').insert(newMainSession) where inputs are from state.
        // Let's stick to the object structure.
      };

      const { error: mainError } = await supabase
        .from("game_sessions")
        .insert(mainSessionData);

      if (mainError) {
        // Cleanup game session if main fails
        await supabaseGame.from("sessions").delete().eq("id", newSessionId);
        throw mainError;
      }

      // 5. Success -> Redirect
      console.log("Restart successful. New PIN:", newPin);
      router.push(`/host/${newPin}/lobby`);

    } catch (err: any) {
      console.error("Restart failed:", err);
      alert("Gagal merestart game: " + err.message);
      setIsRestarting(false);
      hideLoading();
    }
  };
  // Fetch data with new logic
  useEffect(() => {
    if (!gamePin) return;

    const fetchData = async () => {
      try {
        showLoading();

        // 1. Ambil session untuk dapatkan ID & Status
        const { data: sess, error: sessErr } = await supabaseGame
          .from('sessions')
          .select('id, status, question_limit, current_questions')
          .eq('game_pin', gamePin)
          .single();

        if (sessErr || !sess) {
          console.error("Session tidak ditemukan");
          router.push('/host');
          return;
        }

        // Guard: Redirect jika status belum finished
        if (sess.status === 'waiting') {
          router.replace(`/host/${gamePin}/lobby`);
          return;
        }
        if (sess.status === 'active') {
          router.replace(`/host/${gamePin}/monitor`);
          return;
        }

        setSessionId(sess.id);

        // 2. Ambil semua participant yang finished (finished_at IS NOT NULL)
        const { data: participants, error: partErr } = await supabaseGame
          .from('participants')
          .select('id, nickname, spacecraft, score, duration, finished_at, joined_at, eliminated')
          .eq('session_id', sess.id)
          .not('finished_at', 'is', null);

        if (partErr || !participants || participants.length === 0) {
          setPlayers([]);
          hideLoading();
          return;
        }

        // 3. Proses data (handle null duration, formatting, etc if needed)
        const processed = participants.map(p => {
          // Jika duration null/0, anggap sangat lama (misal 999999) agar di urutan bawah
          // Tapi karena query .not('finished_at', 'is', null), seharusnya duration ada.
          // Jaga-jaga:
          const safeDuration = p.duration || 999999;

          return {
            ...p,
            duration: safeDuration
          };
        });

        // 4. Urutkan client-side: Eliminated (False) -> Score (DESC) -> Duration (ASC) -> Joined at -> id
        const sorted = processed.sort((a, b) => {
          // 1. Not eliminated first
          if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;

          // 2. Higher score first
          if (b.score !== a.score) return b.score - a.score;

          // 3. Lower duration first
          const durA = a.duration ?? 999999;
          const durB = b.duration ?? 999999;
          if (durA !== durB) return durA - durB;

          // 4. Earlier join first (biar konsisten)
          const joinA = new Date(a.joined_at).getTime();
          const joinB = new Date(b.joined_at).getTime();
          if (joinA !== joinB) return joinA - joinB;

          // 5. Final fallback (biar gak random)
          return a.id.localeCompare(b.id);
        });


        setPlayers(sorted);

      } catch (err: any) {
        console.error("Error load leaderboard:", err);
      } finally {
        hideLoading();
      }
    };

    fetchData();
  }, [gamePin, router, showLoading, hideLoading]);

  // Realtime update participants (jika ada yang baru selesai setelah leaderboard dibuka)
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabaseGame
      .channel(`leaderboard-${gamePin}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new as Participant;
            if (p.finished_at) {
              setPlayers(prev => {
                const filtered = prev.filter(x => x.id !== p.id);
                const updated = [...filtered, p];
                return updated.sort((a, b) => {
                  // 1. Prioritize Valid Players (Not Eliminated)
                  if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;

                  if (b.score !== a.score) return b.score - a.score;
                  const durA = a.duration || 999999;
                  const durB = b.duration || 999999;
                  return durA - durB;
                });
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(x => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseGame.removeChannel(channel);
    };
  }, [sessionId, gamePin]);

  // Sequential reveal podium (tetap sama)
  useEffect(() => {
    if (players.length > 0) {
      setVisibleRanks([]);

      const timers: NodeJS.Timeout[] = [];

      if (players.length >= 3) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 3]), 500));
      }
      if (players.length >= 2) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 2]), 750));
      }
      if (players.length >= 1) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 1]), 1000));
      }

      return () => timers.forEach(clearTimeout);
    }
  }, [players]);



  const formatScore = (score: number): string => score.toLocaleString();

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateName = (name: string): { display: string; full: string; isTruncated: boolean } => {
    const trimmed = name.trim();
    if (trimmed.length > 8) {
      const words = trimmed.split(' ');
      if (words.length > 1) {
        // If multiple words, take first word but cap it if it's too long
        const first = words[0];
        return {
          display: first.length > 8 ? `${first.substring(0, 8)}...` : `${first}...`,
          full: name,
          isTruncated: true
        };
      } else {
        // If single long word, truncate by length
        return { display: `${trimmed.substring(0, 8)}...`, full: name, isTruncated: true };
      }
    }
    return { display: trimmed, full: name, isTruncated: false };
  };

  const sortedPlayers = [...players].sort((a, b) => {
    // 1. Prioritize Valid Players (Not Eliminated)
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;

    if (b.score !== a.score) return b.score - a.score;
    const durA = a.duration || 999999;
    const durB = b.duration || 999999;
    return durA - durB;
  });
  const top3 = sortedPlayers.slice(0, 3);

  return (
    <>
      <section className="leaderboard-screen">
        {/* Header - tetap sama */}
        <header className="leaderboard-header">
          <div className="leaderboard-brand">
            <img src="/assets/logoal.webp" alt="Astro Learning" className="brand-logo-image" />
          </div>
          <img src="/assets/logo.webp" alt="Gameforsmart Logo" className="header-logo" />
        </header>

        {/* Floating Buttons */}
        <div className="left-floating-group">
          <button className="floating-btn home-btn" onClick={handleHome} title="Home">
            <Home size={28} />
          </button>
          <button className="floating-btn restart-btn" onClick={handleRestart} title="Restart" disabled={isRestarting}>
            <RotateCw size={28} className={isRestarting ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Statistics Button (Right Side) */}
        {sessionId && (
          <a
            href={`https://gameforsmart2026.vercel.app/results/${sessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-btn statistics-btn"
            title="See Statistics"
          >
            <BarChart3 size={28} />
          </a>
        )}

        {/* Podium - tetap sama, tanpa duration */}
        <div className="vanguard-section">
          {players.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>No players participated in this game.</p>
            </div>
          ) : (
            <div className="podium-container">
              {/* 2nd Place */}
              {top3[1] && (
                <div className={`podium-card silver ${visibleRanks.includes(2) ? 'visible' : 'hidden'}`}>
                  <div className="rank-badge">#2</div>
                  <div className="podium-image">
                    {top3[1].spacecraft ? (
                      <img src={`/assets/${top3[1].spacecraft}`} alt="spacecraft" />
                    ) : (
                      <span style={{ fontSize: '3rem' }}></span>
                    )}
                  </div>
                  <h3 className="podium-name has-tooltip" data-tooltip={top3[1].nickname}>
                    {truncateName(top3[1].nickname).display}
                  </h3>
                  <div className="podium-score">{formatScore(top3[1].score)}</div>
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div className={`podium-card gold center ${visibleRanks.includes(1) ? 'visible' : 'hidden'}`}>
                  <div className="rank-badge">#1</div>
                  <div className="podium-image">
                    {top3[0].spacecraft ? (
                      <img src={`/assets/${top3[0].spacecraft}`} alt="spacecraft" />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}></span>
                    )}
                  </div>
                  <h3 className="podium-name has-tooltip" data-tooltip={top3[0].nickname}>
                    {truncateName(top3[0].nickname).display}
                  </h3>
                  <div className="podium-score">{formatScore(top3[0].score)}</div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className={`podium-card bronze ${visibleRanks.includes(3) ? 'visible' : 'hidden'}`}>
                  <div className="rank-badge">#3</div>
                  <div className="podium-image">
                    {top3[2].spacecraft ? (
                      <img src={`/assets/${top3[2].spacecraft}`} alt="spacecraft" />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>🚀</span>
                    )}
                  </div>
                  <h3 className="podium-name has-tooltip" data-tooltip={top3[2].nickname}>
                    {truncateName(top3[2].nickname).display}
                  </h3>
                  <div className="podium-score">{formatScore(top3[2].score)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rankings Table - Split into Header and Scrollable Body */}
        {sortedPlayers.length > 0 && (
          <div className="rankings-table-container">
            {/* Header part */}
            <div className="table-header-wrapper">
              <table className="rankings-table header-only">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Scrollable Body part */}
            <div className="table-body-scroll">
              <table className="rankings-table body-only">
                <tbody>
                  {sortedPlayers.map((player, index) => (
                    <tr key={player.id} className={player.eliminated ? 'row-eliminated' : 'row-winner'}>
                      <td className="rank-cell">#{index + 1}</td>
                      <td className="player-cell">{player.nickname}</td>
                      <td className="score-cell">{formatScore(player.score)}</td>
                      <td className="time-cell">{formatDuration(player.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Mobile Actions - Outside Table Container */}
        {sortedPlayers.length > 0 && (
          <div className="leaderboard-mobile-actions">
            <button className="btn-result-mobile home" onClick={handleHome}>
              <Home size={20} />
              <span>Home</span>
            </button>

            <button className="btn-result-mobile restart" onClick={handleRestart} disabled={isRestarting}>
              <RotateCw size={20} className={isRestarting ? 'animate-spin' : ''} />
              <span>Restart</span>
            </button>

            {sessionId && (
              <a
                href={`https://gameforsmart2026.vercel.app/results/${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-result-mobile stats"
              >
                <BarChart3 size={20} />
                <span>Statistics</span>
              </a>
            )}
          </div>
        )}
      </section>
      <style jsx>{`
    .rankings-table {
  table-layout: fixed;
  width: 100%; 
}

.rankings-table th:nth-child(1),
.rankings-table td:nth-child(1) {
  width: 15%;
  text-align: left;
}

.rankings-table th:nth-child(2),
.rankings-table td:nth-child(2) {
  width: 50%;   
  text-align: left;
}

.rankings-table th:nth-child(3),
.rankings-table td:nth-child(3) {
  width: 20%;
  text-align: center;
}

.rankings-table th:nth-child(4),
.rankings-table td:nth-child(4) {
  width: 15%;
  text-align: center;
}

.left-floating-group {
  position: fixed;
  left: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 100;
}

.left-floating-group .floating-btn {
  position: static;
  transform: none;
}

.left-floating-group .floating-btn:hover {
  transform: scale(1.1);
}

.left-floating-group .floating-btn:active {
  transform: scale(0.95);
}

.statistics-btn {
  right: 30px;
}
    `}</style>
    </>
  );
}
