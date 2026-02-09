module.exports = [
"[project]/lib/gameSession.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Game Session Manager
 * Manages game session state using localStorage for host-player synchronization.
 * In a real app, this would use WebSockets or a backend API.
 */ __turbopack_context__.s([
    "clearCurrentPlayer",
    ()=>clearCurrentPlayer,
    "clearGameSession",
    ()=>clearGameSession,
    "createGameSession",
    ()=>createGameSession,
    "endGameSession",
    ()=>endGameSession,
    "getCurrentPlayer",
    ()=>getCurrentPlayer,
    "getGameSession",
    ()=>getGameSession,
    "getSessionByCode",
    ()=>getSessionByCode,
    "getSessionPlayers",
    ()=>getSessionPlayers,
    "hasGameFinished",
    ()=>hasGameFinished,
    "hasGameStarted",
    ()=>hasGameStarted,
    "joinGameSession",
    ()=>joinGameSession,
    "setCurrentPlayer",
    ()=>setCurrentPlayer,
    "startGameSession",
    ()=>startGameSession,
    "updateGameSession",
    ()=>updateGameSession,
    "updatePlayerProgress",
    ()=>updatePlayerProgress,
    "updatePlayerSpacecraft",
    ()=>updatePlayerSpacecraft,
    "validateGameCode",
    ()=>validateGameCode
]);
// Session storage keys
const SESSION_KEY = 'cosmicquest_game_session';
const PLAYERS_KEY = 'cosmicquest_session_players';
function createGameSession(gameCode, hostName, topicId, topicTitle, selectedQuestions, difficulty) {
    const session = {
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
function getGameSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    try {
        return JSON.parse(sessionData);
    } catch  {
        return null;
    }
}
function updateGameSession(updates) {
    const session = getGameSession();
    if (!session) return null;
    const updatedSession = {
        ...session,
        ...updates
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
}
function startGameSession() {
    return updateGameSession({
        status: 'playing',
        startedAt: Date.now()
    });
}
function endGameSession() {
    return updateGameSession({
        status: 'finished'
    });
}
function clearGameSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PLAYERS_KEY);
}
function validateGameCode(code) {
    const session = getGameSession();
    return session !== null && session.gameCode === code && session.status === 'waiting';
}
function getSessionByCode(code) {
    const session = getGameSession();
    if (session && session.gameCode === code) {
        return session;
    }
    return null;
}
function joinGameSession(gameCode, username, spacecraft) {
    const session = getSessionByCode(gameCode);
    if (!session) return null;
    const players = getSessionPlayers();
    // Check if player already exists
    const existingPlayer = players.find((p)=>p.username === username);
    if (existingPlayer) {
        // Update spacecraft if changed
        existingPlayer.spacecraft = spacecraft;
        saveSessionPlayers(players);
        return existingPlayer;
    }
    const newPlayer = {
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
function getSessionPlayers() {
    const playersData = localStorage.getItem(PLAYERS_KEY);
    if (!playersData) return [];
    try {
        return JSON.parse(playersData);
    } catch  {
        return [];
    }
}
// Save session players
function saveSessionPlayers(players) {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}
function updatePlayerProgress(playerId, progress, questionsAnswered, score) {
    const players = getSessionPlayers();
    const playerIndex = players.findIndex((p)=>p.id === playerId);
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
function updatePlayerSpacecraft(playerId, spacecraft) {
    const players = getSessionPlayers();
    const playerIndex = players.findIndex((p)=>p.id === playerId);
    if (playerIndex !== -1) {
        players[playerIndex].spacecraft = spacecraft;
        saveSessionPlayers(players);
    }
}
function hasGameStarted() {
    const session = getGameSession();
    return session !== null && session.status === 'playing';
}
function hasGameFinished() {
    const session = getGameSession();
    return session !== null && session.status === 'finished';
}
function getCurrentPlayer() {
    const playerData = localStorage.getItem('cosmicquest_current_player');
    if (!playerData) return null;
    try {
        return JSON.parse(playerData);
    } catch  {
        return null;
    }
}
function setCurrentPlayer(player) {
    localStorage.setItem('cosmicquest_current_player', JSON.stringify(player));
}
function clearCurrentPlayer() {
    localStorage.removeItem('cosmicquest_current_player');
}
}),
"[project]/app/join/quiz/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>JoinQuizPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$GameContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/context/GameContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/gameSession.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function JoinQuizPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { gameState, setGameState, showLoading, hideLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$context$2f$GameContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useGame"])();
    const [answeredIndex, setAnsweredIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [correctAnswerIndex, setCorrectAnswerIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [buttonsDisabled, setButtonsDisabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showCountdown, setShowCountdown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [countdownNumber, setCountdownNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(3);
    const [isFreezing, setIsFreezing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false); // Freeze overlay to prevent question leak
    // Redirect if no questions
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!gameState.playerName || gameState.questions.length === 0) {
            router.push('/');
        }
    }, [
        gameState.playerName,
        gameState.questions.length,
        router
    ]);
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const progress = (gameState.currentQuestionIndex + 1) / gameState.selectedQuestions * 100;
    // Calculate score per correct answer based on selected questions
    const getScorePerQuestion = ()=>{
        switch(gameState.selectedQuestions){
            case 5:
                return 20;
            case 10:
                return 10;
            case 20:
                return 5;
            default:
                return 10;
        }
    };
    const scorePerQuestion = getScorePerQuestion();
    // Sync progress to session
    const syncProgress = (questionsAnswered, score)=>{
        const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentPlayer"])();
        if (player) {
            const progressPercent = questionsAnswered / gameState.selectedQuestions * 100;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updatePlayerProgress"])(player.id, progressPercent, questionsAnswered, score);
        }
    };
    const checkAnswer = (selectedIndex)=>{
        if (buttonsDisabled || !currentQuestion) return;
        setButtonsDisabled(true);
        setAnsweredIndex(selectedIndex);
        setCorrectAnswerIndex(currentQuestion.correctAnswer);
        const isCorrect = selectedIndex === currentQuestion.correctAnswer;
        // Calculate new correct count for quiz score sync
        const newCorrectCount = gameState.correctAnswers + (isCorrect ? 1 : 0);
        if (isCorrect) {
            setGameState((prev)=>({
                    ...prev,
                    score: prev.score + scorePerQuestion,
                    correctAnswers: prev.correctAnswers + 1
                }));
        }
        // Move to next question after delay
        setTimeout(()=>{
            const nextIndex = gameState.currentQuestionIndex + 1;
            // Sync quiz score only (not game score)
            const quizScore = newCorrectCount * scorePerQuestion;
            syncProgress(nextIndex, quizScore);
            // Check if we need to show mini game (every 3 questions)
            if (nextIndex % 3 === 0 && nextIndex < gameState.selectedQuestions) {
                // Show countdown immediately BEFORE updating question index
                // The question index will be updated when navigating to game
                showMiniGame(nextIndex);
            } else if (nextIndex >= gameState.selectedQuestions) {
                setGameState((prev)=>({
                        ...prev,
                        currentQuestionIndex: nextIndex
                    }));
                showResults();
            } else {
                setGameState((prev)=>({
                        ...prev,
                        currentQuestionIndex: nextIndex
                    }));
                setAnsweredIndex(null);
                setCorrectAnswerIndex(null);
                setButtonsDisabled(false);
            }
        }, 1500);
    };
    const showMiniGame = (nextIndex)=>{
        // Show countdown immediately - question stays on current one
        setShowCountdown(true);
        setCountdownNumber(3);
        let count = 3;
        const countdownInterval = setInterval(()=>{
            count--;
            if (count > 0) {
                setCountdownNumber(count);
            } else {
                clearInterval(countdownInterval);
                // FREEZE SCREEN: Show freeze overlay BEFORE updating question index
                setShowCountdown(false); // Hide countdown
                setIsFreezing(true); // Show freeze overlay
                // Update question index (component will NOT re-render visible question due to freeze)
                setGameState((prev)=>({
                        ...prev,
                        currentQuestionIndex: nextIndex
                    }));
                // Navigate immediately - freeze overlay covers the screen
                router.push('/join/game');
            }
        }, 1000);
    };
    const showResults = ()=>{
        // Mark player as complete
        const player = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentPlayer"])();
        if (player) {
            // Sync quiz score only (not game score)
            const quizScore = gameState.correctAnswers * scorePerQuestion;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updatePlayerProgress"])(player.id, 100, gameState.selectedQuestions, quizScore);
        }
        showLoading();
        router.push('/join/results');
    };
    if (!currentQuestion) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            showCountdown && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "countdown-overlay",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "countdown-number",
                    children: countdownNumber
                }, void 0, false, {
                    fileName: "[project]/app/join/quiz/page.tsx",
                    lineNumber: 141,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/join/quiz/page.tsx",
                lineNumber: 140,
                columnNumber: 17
            }, this),
            isFreezing && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "freeze-overlay",
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'var(--background-dark, #0a0a1a)',
                    zIndex: 9999
                }
            }, void 0, false, {
                fileName: "[project]/app/join/quiz/page.tsx",
                lineNumber: 147,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                id: "screen-quiz",
                className: "screen active",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "glass-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "quiz-header",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "quiz-info",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "quiz-counter",
                                            children: [
                                                "Question ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    id: "current-question",
                                                    children: gameState.currentQuestionIndex + 1
                                                }, void 0, false, {
                                                    fileName: "[project]/app/join/quiz/page.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 46
                                                }, this),
                                                " / ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    id: "total-questions",
                                                    children: gameState.selectedQuestions
                                                }, void 0, false, {
                                                    fileName: "[project]/app/join/quiz/page.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 120
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/join/quiz/page.tsx",
                                            lineNumber: 163,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/join/quiz/page.tsx",
                                        lineNumber: 162,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "progress-bar",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "progress-fill",
                                            id: "progress-fill",
                                            style: {
                                                width: `${progress}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/join/quiz/page.tsx",
                                            lineNumber: 168,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/join/quiz/page.tsx",
                                        lineNumber: 167,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/join/quiz/page.tsx",
                                lineNumber: 161,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "question-container",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "question-text",
                                        id: "question-text",
                                        children: currentQuestion.question
                                    }, void 0, false, {
                                        fileName: "[project]/app/join/quiz/page.tsx",
                                        lineNumber: 173,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "answers-grid",
                                        id: "answers-grid",
                                        children: currentQuestion.options.map((option, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: `answer-btn ${answeredIndex === index ? index === correctAnswerIndex ? 'correct' : 'incorrect' : ''} ${correctAnswerIndex === index && answeredIndex !== null ? 'correct' : ''}`,
                                                onClick: ()=>checkAnswer(index),
                                                disabled: buttonsDisabled,
                                                children: option
                                            }, index, false, {
                                                fileName: "[project]/app/join/quiz/page.tsx",
                                                lineNumber: 178,
                                                columnNumber: 37
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/join/quiz/page.tsx",
                                        lineNumber: 176,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/join/quiz/page.tsx",
                                lineNumber: 172,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/join/quiz/page.tsx",
                        lineNumber: 160,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/join/quiz/page.tsx",
                    lineNumber: 159,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/join/quiz/page.tsx",
                lineNumber: 158,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
}),
];

//# sourceMappingURL=_3aca9255._.js.map