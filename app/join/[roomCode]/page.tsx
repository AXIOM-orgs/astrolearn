"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseGame } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { X } from "lucide-react";

// Error messages mapping
const ERROR_MESSAGES = {
    duplicate: {
        title: "Duplicate Nickname",
        message: "This nickname is already taken in this room. Please change your nickname."
    },
    roomNotFound: {
        title: "Room Not Found",
        message: "The game code you entered does not exist. Please check the code."
    },
    sessionLocked: {
        title: "Session Locked",
        message: "This game session has already started or ended."
    },
    roomFull: {
        title: "Room Full",
        message: "This room has reached its maximum capacity."
    },
    general: {
        title: "Join Error",
        message: "Failed to join the game. Please try again later."
    }
};

export default function AutoJoinPage() {
    const router = useRouter();
    const params = useParams();
    const roomCode = (params.roomCode as string)?.toUpperCase();
    const { user, profile, loading: authLoading } = useAuth();
    const { showLoading, hideLoading } = useGame();

    const [showAlert, setShowAlert] = useState(false);
    const [alertReason, setAlertReason] = useState<keyof typeof ERROR_MESSAGES | "">("");
    const hasAttempted = useRef(false);

    const closeAlert = () => {
        setShowAlert(false);
        setAlertReason("");
        hideLoading();
        router.replace("/");
    };

    useEffect(() => {
        // Show global loading immediately on mount
        showLoading();

        return () => {
            // Cleanup: hide loading if component unmounts without completing
            // But don't hide if we're navigating to lobby (success case)
        };
    }, []);

    useEffect(() => {
        if (!roomCode || authLoading || hasAttempted.current) return;

        // Jika belum login, redirect ke login dengan pending code
        if (!user) {
            localStorage.setItem("pendingRoomCode", roomCode);
            hideLoading(); // Hide before redirect so login page can show its own UI
            router.replace("/login");
            return;
        }

        // Tunggu profile loaded
        if (!profile?.id) return;

        hasAttempted.current = true;

        const autoJoin = async () => {
            try {
                // Generate nickname: priority nickname > fullname > username > email
                const nickname =
                    profile.nickname?.trim() ||
                    profile.fullname?.trim() ||
                    profile.username?.trim() ||
                    user.email?.split("@")[0] ||
                    "Player";

                // Call join_game RPC
                const { data, error } = await supabaseGame.rpc("join_game", {
                    p_room_code: roomCode,
                    p_user_id: profile.id,
                    p_nickname: nickname,
                });

                if (error) {
                    console.error("Join RPC error:", error);
                    setAlertReason("general");
                    setShowAlert(true);
                    hideLoading();
                    return;
                }

                // Handle specific errors from RPC
                if (data.error) {
                    switch (data.error) {
                        case "duplicate_nickname":
                            setAlertReason("duplicate");
                            break;
                        case "room_not_found":
                        case "room_not_exist": // Handle potential variations
                            setAlertReason("roomNotFound");
                            break;
                        case "session_locked":
                            setAlertReason("sessionLocked");
                            break;
                        case "room_full":
                            setAlertReason("roomFull");
                            break;
                        default:
                            setAlertReason("general");
                    }
                    setShowAlert(true);
                    hideLoading();
                    return;
                }

                // Success! Save data and redirect to lobby
                // Keep global loading visible during navigation!
                localStorage.setItem("cosmicquest_player_name", data.nickname);
                localStorage.setItem("cosmicquest_participant_id", data.participant_id);
                localStorage.setItem("cosmicquest_joined_game_code", roomCode);
                localStorage.setItem('cosmicquest_session_id', data.session_id);
                localStorage.setItem('cosmicquest_spacecraft', data.spacecraft || '');
                localStorage.removeItem("pendingRoomCode");

                // Navigate to waiting room (lobby)
                router.replace(`/player/${roomCode}/waiting`);
            } catch (err) {
                console.error("Auto-join error:", err);
                setAlertReason("general");
                setShowAlert(true);
                hideLoading();
            }
        };

        autoJoin();
    }, [roomCode, user, profile, authLoading, router, showLoading, hideLoading]);

    const errorDetails = alertReason ? ERROR_MESSAGES[alertReason] : ERROR_MESSAGES.general;

    // Return empty div - global loading is shown via context
    // Alert Modal rendered if showAlert is true
    return (
        <>
            {/* Alert Modal */}
            {showAlert && (
                <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
                        {/* <div className="mb-4">
                            {/* Uses a generic error icon or image if available, otherwise just text 
                            <div className="text-6xl mb-2">⚠️</div>
                        </div> */}
                        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                            {errorDetails.title}
                        </h2>
                        <p className="subtitle" style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '2rem' }}>
                            {errorDetails.message}
                        </p>
                        <button
                            onClick={closeAlert}
                            className="btn-primary"
                        >
                            <span>CLOSE</span>
                            <div className="btn-glow"></div>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
