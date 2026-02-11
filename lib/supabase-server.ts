import { supabase, supabaseGame } from './supabase';

export type SettingsInitialData = {
    session: {
        id: string;
        quiz_id: string;
        host_id: string;
        game_pin: string;
        total_time_minutes: number;
        question_limit: number;
        difficulty: string;
    } | null;
    quizDetail: {
        title: string;
        description: string;
    } | null;
    quiz: {
        questions: any[];
    } | null;
    error: string | null;
};

export async function getSessionSettings(roomCode: string): Promise<SettingsInitialData> {
    try {
        // Fetch session from game database
        const { data: session, error: sessionError } = await supabaseGame
            .from('sessions')
            .select('id, quiz_id, host_id, game_pin, total_time_minutes, question_limit, difficulty')
            .eq('game_pin', roomCode)
            .single();

        if (sessionError || !session) {
            return { session: null, quizDetail: null, quiz: null, error: 'Session not found' };
        }

        // Fetch quiz with questions (questions stored as JSON string in quizzes table)
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .select('title, description, questions')
            .eq('id', session.quiz_id)
            .single();

        if (quizError) {
            console.error('Error fetching quiz:', quizError);
            return { session, quizDetail: null, quiz: null, error: 'Quiz not found' };
        }

        // Parse questions from JSON string
        let questions: any[] = [];
        if (quizData?.questions) {
            try {
                questions = typeof quizData.questions === 'string'
                    ? JSON.parse(quizData.questions)
                    : quizData.questions;
            } catch (e) {
                console.error('Error parsing questions:', e);
            }
        }

        return {
            session,
            quizDetail: {
                title: quizData?.title || 'Unknown Quiz',
                description: quizData?.description || ''
            },
            quiz: { questions },
            error: null
        };
    } catch (err) {
        console.error('getSessionSettings error:', err);
        return { session: null, quizDetail: null, quiz: null, error: 'Failed to fetch session data' };
    }
}

// Lobby data types
export type LobbyInitialData = {
    session: {
        id: string;
        quiz_id: string;
        host_id: string;
        game_pin: string;
        status: string;
        total_time_minutes: number;
        question_limit: number;
        difficulty: string;
        countdown_started_at: string | null;
    } | null;
    quizDetail: {
        title: string;
        description: string;
    } | null;
    participants: {
        id: string;
        nickname: string;
        spacecraft: string | null;
        joined_at: string;
    }[];
    totalCount: number;
    error: string | null;
};

export async function getLobbyData(roomCode: string): Promise<LobbyInitialData> {
    try {
        // Fetch session from game database
        const { data: session, error: sessionError } = await supabaseGame
            .from('sessions')
            .select('id, quiz_id, host_id, game_pin, status, total_time_minutes, question_limit, difficulty, countdown_started_at')
            .eq('game_pin', roomCode)
            .single();

        if (sessionError || !session) {
            return { session: null, quizDetail: null, participants: [], totalCount: 0, error: 'Session not found' };
        }

        // Fetch quiz details
        const { data: quizData } = await supabase
            .from('quizzes')
            .select('title, description')
            .eq('id', session.quiz_id)
            .single();

        // Fetch initial participants (first 30)
        const { data: participants, count } = await supabaseGame
            .from('participants')
            .select('id, nickname, spacecraft, joined_at', { count: 'exact' })
            .eq('session_id', session.id)
            .order('joined_at', { ascending: true })
            .limit(30);

        return {
            session,
            quizDetail: quizData ? {
                title: quizData.title || 'Unknown Quiz',
                description: quizData.description || ''
            } : null,
            participants: participants || [],
            totalCount: count || 0,
            error: null
        };
    } catch (err) {
        console.error('getLobbyData error:', err);
        return { session: null, quizDetail: null, participants: [], totalCount: 0, error: 'Failed to fetch lobby data' };
    }
}
