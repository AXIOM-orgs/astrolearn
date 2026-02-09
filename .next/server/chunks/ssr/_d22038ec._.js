module.exports = [
"[project]/lib/data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Type Definitions
__turbopack_context__.s([
    "difficultyConfigs",
    ()=>difficultyConfigs,
    "quizQuestions",
    ()=>quizQuestions,
    "spaceships",
    ()=>spaceships
]);
const difficultyConfigs = {
    easy: {
        weapon: {
            type: 'spread',
            fireRate: 200,
            bulletSpeed: 10,
            bulletWidth: 6,
            bulletHeight: 15,
            damage: 80,
            color: '#ff6b6b',
            spreadCount: 3,
            isAutoFire: true
        },
        asteroidHP: 1,
        asteroidSize: {
            min: 25,
            max: 35
        },
        asteroidSpeed: {
            min: 1,
            max: 2
        },
        asteroidSpawnRate: 1500,
        totalAsteroids: 12,
        hasBoss: true,
        bossHP: 25000,
        bossSize: 100,
        gameDuration: 9999
    },
    medium: {
        weapon: {
            type: 'laser',
            fireRate: 50,
            bulletSpeed: 15,
            bulletWidth: 8,
            bulletHeight: 40,
            damage: 100,
            color: '#00d4ff',
            isAutoFire: true
        },
        asteroidHP: 2,
        asteroidSize: {
            min: 30,
            max: 45
        },
        asteroidSpeed: {
            min: 2,
            max: 3.5
        },
        asteroidSpawnRate: 900,
        totalAsteroids: 20,
        hasBoss: true,
        bossHP: 35000,
        bossSize: 120,
        gameDuration: 9999
    },
    hard: {
        weapon: {
            type: 'magnetic',
            fireRate: 150,
            bulletSpeed: 8,
            bulletWidth: 10,
            bulletHeight: 20,
            damage: 50,
            color: '#9d4edd',
            isAutoFire: true
        },
        asteroidHP: 2,
        asteroidSize: {
            min: 25,
            max: 40
        },
        asteroidSpeed: {
            min: 2.5,
            max: 4.5
        },
        asteroidSpawnRate: 500,
        totalAsteroids: 35,
        hasBoss: true,
        bossHP: 85000,
        bossSize: 140,
        gameDuration: 9999
    }
};
const quizQuestions = {
    easy: [
        {
            id: 1,
            difficulty: "easy",
            question: "What is the closest planet to the Sun?",
            options: [
                "Mercury",
                "Venus",
                "Earth",
                "Mars"
            ],
            correctAnswer: 0
        },
        {
            id: 2,
            difficulty: "easy",
            question: "How many planets are in our solar system?",
            options: [
                "7",
                "8",
                "9",
                "10"
            ],
            correctAnswer: 1
        },
        {
            id: 3,
            difficulty: "easy",
            question: "What is the largest planet in our solar system?",
            options: [
                "Saturn",
                "Neptune",
                "Jupiter",
                "Uranus"
            ],
            correctAnswer: 2
        },
        {
            id: 4,
            difficulty: "easy",
            question: "What is Earth's natural satellite called?",
            options: [
                "The Moon",
                "Titan",
                "Europa",
                "Phobos"
            ],
            correctAnswer: 0
        },
        {
            id: 5,
            difficulty: "easy",
            question: "Which planet is known as the Red Planet?",
            options: [
                "Venus",
                "Mars",
                "Jupiter",
                "Saturn"
            ],
            correctAnswer: 1
        },
        {
            id: 6,
            difficulty: "easy",
            question: "What is the name of our galaxy?",
            options: [
                "Andromeda",
                "Milky Way",
                "Triangulum",
                "Whirlpool"
            ],
            correctAnswer: 1
        },
        {
            id: 7,
            difficulty: "easy",
            question: "What is the Sun?",
            options: [
                "A planet",
                "A moon",
                "A star",
                "An asteroid"
            ],
            correctAnswer: 2
        },
        {
            id: 8,
            difficulty: "easy",
            question: "Which planet has rings?",
            options: [
                "Mars",
                "Venus",
                "Saturn",
                "Mercury"
            ],
            correctAnswer: 2
        },
        {
            id: 9,
            difficulty: "easy",
            question: "How long does it take Earth to orbit the Sun?",
            options: [
                "365 days",
                "30 days",
                "7 days",
                "100 days"
            ],
            correctAnswer: 0
        },
        {
            id: 10,
            difficulty: "easy",
            question: "What is the smallest planet in our solar system?",
            options: [
                "Mars",
                "Mercury",
                "Venus",
                "Pluto"
            ],
            correctAnswer: 1
        },
        {
            id: 11,
            difficulty: "easy",
            question: "Which planet is closest to Earth?",
            options: [
                "Mars",
                "Venus",
                "Mercury",
                "Jupiter"
            ],
            correctAnswer: 1
        },
        {
            id: 12,
            difficulty: "easy",
            question: "What color is the sunset on Mars?",
            options: [
                "Red",
                "Orange",
                "Blue",
                "Purple"
            ],
            correctAnswer: 2
        },
        {
            id: 13,
            difficulty: "easy",
            question: "How many moons does Earth have?",
            options: [
                "0",
                "1",
                "2",
                "3"
            ],
            correctAnswer: 1
        },
        {
            id: 14,
            difficulty: "easy",
            question: "What is the hottest planet in our solar system?",
            options: [
                "Mercury",
                "Venus",
                "Mars",
                "Jupiter"
            ],
            correctAnswer: 1
        },
        {
            id: 15,
            difficulty: "easy",
            question: "What do we call a person who travels to space?",
            options: [
                "Pilot",
                "Astronaut",
                "Captain",
                "Navigator"
            ],
            correctAnswer: 1
        }
    ],
    medium: [
        {
            id: 16,
            difficulty: "medium",
            question: "What is the Great Red Spot on Jupiter?",
            options: [
                "A volcano",
                "A storm",
                "A crater",
                "An ocean"
            ],
            correctAnswer: 1
        },
        {
            id: 17,
            difficulty: "medium",
            question: "Which planet has the most moons?",
            options: [
                "Jupiter",
                "Saturn",
                "Uranus",
                "Neptune"
            ],
            correctAnswer: 1
        },
        {
            id: 18,
            difficulty: "medium",
            question: "What is the Kuiper Belt?",
            options: [
                "A region of asteroids",
                "A region of comets and icy bodies",
                "A type of galaxy",
                "A constellation"
            ],
            correctAnswer: 1
        },
        {
            id: 19,
            difficulty: "medium",
            question: "How long is a day on Venus?",
            options: [
                "24 hours",
                "243 Earth days",
                "10 hours",
                "365 days"
            ],
            correctAnswer: 1
        },
        {
            id: 20,
            difficulty: "medium",
            question: "What is the name of the first artificial satellite?",
            options: [
                "Apollo 11",
                "Sputnik 1",
                "Voyager 1",
                "Hubble"
            ],
            correctAnswer: 1
        },
        {
            id: 21,
            difficulty: "medium",
            question: "Which planet rotates on its side?",
            options: [
                "Neptune",
                "Saturn",
                "Uranus",
                "Jupiter"
            ],
            correctAnswer: 2
        },
        {
            id: 22,
            difficulty: "medium",
            question: "What is the asteroid belt located between?",
            options: [
                "Earth and Mars",
                "Mars and Jupiter",
                "Jupiter and Saturn",
                "Venus and Earth"
            ],
            correctAnswer: 1
        },
        {
            id: 23,
            difficulty: "medium",
            question: "What is the speed of light?",
            options: [
                "300,000 km/s",
                "150,000 km/s",
                "500,000 km/s",
                "100,000 km/s"
            ],
            correctAnswer: 0
        },
        {
            id: 24,
            difficulty: "medium",
            question: "Which moon of Jupiter is the largest in the solar system?",
            options: [
                "Europa",
                "Io",
                "Ganymede",
                "Callisto"
            ],
            correctAnswer: 2
        },
        {
            id: 25,
            difficulty: "medium",
            question: "What causes the Northern Lights (Aurora Borealis)?",
            options: [
                "Moonlight reflection",
                "Solar wind particles",
                "Meteor showers",
                "Volcanic ash"
            ],
            correctAnswer: 1
        },
        {
            id: 26,
            difficulty: "medium",
            question: "How many Earth years does it take Neptune to orbit the Sun?",
            options: [
                "84 years",
                "165 years",
                "248 years",
                "12 years"
            ],
            correctAnswer: 1
        },
        {
            id: 27,
            difficulty: "medium",
            question: "What is a light-year?",
            options: [
                "A unit of time",
                "A unit of distance",
                "A unit of speed",
                "A unit of mass"
            ],
            correctAnswer: 1
        },
        {
            id: 28,
            difficulty: "medium",
            question: "Which planet has the strongest winds in the solar system?",
            options: [
                "Jupiter",
                "Saturn",
                "Neptune",
                "Uranus"
            ],
            correctAnswer: 2
        },
        {
            id: 29,
            difficulty: "medium",
            question: "What is the temperature at the core of the Sun?",
            options: [
                "1 million °C",
                "15 million °C",
                "100,000 °C",
                "50 million °C"
            ],
            correctAnswer: 1
        },
        {
            id: 30,
            difficulty: "medium",
            question: "Which spacecraft was the first to leave our solar system?",
            options: [
                "Voyager 1",
                "Pioneer 10",
                "New Horizons",
                "Cassini"
            ],
            correctAnswer: 0
        }
    ],
    hard: [
        {
            id: 31,
            difficulty: "hard",
            question: "What is the Schwarzschild radius?",
            options: [
                "The radius of a star",
                "The event horizon of a black hole",
                "The distance to the nearest star",
                "The size of a galaxy"
            ],
            correctAnswer: 1
        },
        {
            id: 32,
            difficulty: "hard",
            question: "What percentage of the universe is dark matter?",
            options: [
                "27%",
                "68%",
                "5%",
                "15%"
            ],
            correctAnswer: 0
        },
        {
            id: 33,
            difficulty: "hard",
            question: "What is the Chandrasekhar limit?",
            options: [
                "Maximum mass of a white dwarf",
                "Speed of light limit",
                "Temperature of stars",
                "Size of galaxies"
            ],
            correctAnswer: 0
        },
        {
            id: 34,
            difficulty: "hard",
            question: "What is gravitational lensing?",
            options: [
                "Bending of light by gravity",
                "Formation of galaxies",
                "Expansion of universe",
                "Collision of stars"
            ],
            correctAnswer: 0
        },
        {
            id: 35,
            difficulty: "hard",
            question: "What is the Roche limit?",
            options: [
                "Distance where tidal forces destroy objects",
                "Maximum speed in space",
                "Temperature of black holes",
                "Age of universe"
            ],
            correctAnswer: 0
        },
        {
            id: 36,
            difficulty: "hard",
            question: "What is redshift in astronomy?",
            options: [
                "Color of Mars",
                "Light stretched by expansion",
                "Type of star",
                "Solar phenomenon"
            ],
            correctAnswer: 1
        },
        {
            id: 37,
            difficulty: "hard",
            question: "What is the Oort Cloud?",
            options: [
                "A nebula",
                "A theoretical cloud of comets",
                "A type of galaxy",
                "A constellation"
            ],
            correctAnswer: 1
        },
        {
            id: 38,
            difficulty: "hard",
            question: "What is Hawking radiation?",
            options: [
                "Radiation from the Sun",
                "Theoretical radiation from black holes",
                "Cosmic background radiation",
                "Solar wind"
            ],
            correctAnswer: 1
        },
        {
            id: 39,
            difficulty: "hard",
            question: "What is the cosmic microwave background?",
            options: [
                "Radiation from stars",
                "Afterglow of the Big Bang",
                "Solar radiation",
                "Galaxy emissions"
            ],
            correctAnswer: 1
        },
        {
            id: 40,
            difficulty: "hard",
            question: "What is a quasar?",
            options: [
                "A type of star",
                "An extremely bright active galactic nucleus",
                "A planet",
                "A moon"
            ],
            correctAnswer: 1
        },
        {
            id: 41,
            difficulty: "hard",
            question: "What is the Hubble constant?",
            options: [
                "Age of universe",
                "Rate of universe expansion",
                "Speed of light",
                "Mass of galaxies"
            ],
            correctAnswer: 1
        },
        {
            id: 42,
            difficulty: "hard",
            question: "What are magnetars?",
            options: [
                "Magnetic planets",
                "Neutron stars with extreme magnetic fields",
                "Black holes",
                "Asteroids"
            ],
            correctAnswer: 1
        },
        {
            id: 43,
            difficulty: "hard",
            question: "What is the Drake equation used for?",
            options: [
                "Calculating star mass",
                "Estimating alien civilizations",
                "Measuring distances",
                "Predicting eclipses"
            ],
            correctAnswer: 1
        },
        {
            id: 44,
            difficulty: "hard",
            question: "What is a pulsar?",
            options: [
                "A pulsating star",
                "A rotating neutron star",
                "A type of galaxy",
                "A comet"
            ],
            correctAnswer: 1
        },
        {
            id: 45,
            difficulty: "hard",
            question: "What is the Great Attractor?",
            options: [
                "A black hole",
                "A gravitational anomaly pulling galaxies",
                "A supernova",
                "A nebula"
            ],
            correctAnswer: 1
        }
    ]
};
const spaceships = [
    {
        id: 1,
        name: "Nebula Striker",
        description: "Fast and agile fighter craft",
        speed: 9,
        color: "#0026ffff",
        emoji: "🚀",
        image: "/assets/main_4_2_2.png"
    },
    {
        id: 2,
        name: "Quantum UFO",
        description: "Advanced exploration vessel",
        speed: 7,
        color: "#9d4edd",
        emoji: "🛸",
        image: "/assets/galaksi2.webp"
    },
    {
        id: 3,
        name: "Stellar Phoenix",
        description: "Heavy combat cruiser",
        speed: 6,
        color: "#ff006e",
        emoji: "🛰️",
        image: "/assets/galaksi3.webp"
    },
    {
        id: 4,
        name: "Cosmic Ranger",
        description: "Balanced all-purpose ship",
        speed: 8,
        color: "#1A5D1A",
        emoji: "✨",
        image: "/assets/galaksi4.webp"
    },
    {
        id: 5,
        name: "Void Reaper",
        description: "Stealth reconnaissance craft",
        speed: 10,
        color: "#ff9e00",
        emoji: "🌟",
        image: "/assets/galaksi5.gif"
    },
    {
        id: 6,
        name: "Galaxy Titan",
        description: "Massive flagship carrier",
        speed: 5,
        color: "#FF4646",
        emoji: "🌠",
        image: "/assets/galaksi6.png"
    }
];
}),
"[project]/lib/mockPlayers.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateGameCode",
    ()=>generateGameCode,
    "generateMockLeaderboard",
    ()=>generateMockLeaderboard,
    "generateMockPlayers",
    ()=>generateMockPlayers,
    "generateMockPlayersWithProgress",
    ()=>generateMockPlayersWithProgress,
    "getRankTitle",
    ()=>getRankTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-ssr] (ecmascript)");
;
// Player icons for variety
const playerIcons = [
    '🚀',
    '🛸',
    '🛰️',
    '✨',
    '🌟',
    '🌠',
    '💫',
    '⭐',
    '🔮',
    '🌙',
    '☄️',
    '🪐',
    '🌍',
    '🌌',
    '🎮'
];
// Player username prefixes and suffixes
const namePrefixes = [
    'COMMANDER',
    'ORION',
    'AEGIS',
    'VOYAGER',
    'XENO',
    'ASTRO',
    'ZENITH',
    'GLOBE',
    'NOVA',
    'STELLAR',
    'COSMIC',
    'NEBULA',
    'QUANTUM',
    'VORTEX',
    'ECLIPSE'
];
const nameSuffixes = [
    'PRIME',
    'X',
    'ALPHA',
    'SEEKER',
    'TECH',
    'KID',
    'FLIGHT',
    'TROT',
    'WAVE',
    'STORM'
];
// Color palette for player icons
const iconColors = [
    '#00d4ff',
    '#ff6b6b',
    '#06ffa5',
    '#ffd93d',
    '#9d4edd',
    '#ff006e',
    '#00b4d8',
    '#ff9e00'
];
// Generate a random username
function generateUsername() {
    const prefix = namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
    const suffix = nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];
    return `${prefix}_${suffix}`;
}
function generateMockPlayers(count = 8, includeCurrentUser = false) {
    const players = [];
    const usedNames = new Set();
    for(let i = 0; i < count; i++){
        let username = generateUsername();
        while(usedNames.has(username)){
            username = generateUsername();
        }
        usedNames.add(username);
        const spacecraft = i < __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spaceships"].length ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spaceships"][i % __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spaceships"].length] : null;
        players.push({
            id: `player-${i + 1}`,
            username: username.length > 12 ? username.substring(0, 12) + '..' : username,
            icon: playerIcons[i % playerIcons.length],
            iconColor: iconColors[i % iconColors.length],
            spacecraft,
            progress: 0,
            questionsAnswered: 0,
            totalQuestions: 10,
            score: 0,
            isCurrentUser: includeCurrentUser && i === 0
        });
    }
    return players;
}
function generateMockPlayersWithProgress(count = 8) {
    const players = generateMockPlayers(count);
    return players.map((player)=>{
        const questionsAnswered = Math.floor(Math.random() * player.totalQuestions);
        const progress = questionsAnswered / player.totalQuestions * 100;
        const score = questionsAnswered * Math.floor(Math.random() * 1000 + 500);
        return {
            ...player,
            questionsAnswered,
            progress,
            score
        };
    });
}
function generateMockLeaderboard(count = 15) {
    const players = generateMockPlayers(count);
    const scoredPlayers = players.map((player)=>({
            ...player,
            questionsAnswered: player.totalQuestions,
            progress: 100,
            score: Math.floor(Math.random() * 150000 + 50000)
        }));
    // Sort by score descending
    scoredPlayers.sort((a, b)=>b.score - a.score);
    return scoredPlayers;
}
function getRankTitle(rank) {
    switch(rank){
        case 1:
            return 'FLEET COMMANDER';
        case 2:
            return 'ELITE PILOT';
        case 3:
            return 'VETERAN PILOT';
        default:
            return 'PILOT';
    }
}
function generateGameCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
}),
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
"[project]/app/host/leaderboard/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HostLeaderboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockPlayers$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mockPlayers.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/gameSession.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function HostLeaderboardPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [players, setPlayers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Load players and sort by score
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const sessionPlayers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSessionPlayers"])();
        // Sort by score descending
        const sorted = [
            ...sessionPlayers
        ].sort((a, b)=>b.score - a.score);
        setPlayers(sorted);
    }, []);
    const handleExit = ()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$gameSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearGameSession"])();
        router.push('/');
    };
    const formatScore = (score)=>{
        return score.toLocaleString();
    };
    const top3 = players.slice(0, 3);
    const remaining = players.slice(3);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "leaderboard-screen",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "leaderboard-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "leaderboard-brand",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "brand-title",
                            children: "ASTRO LEARNING"
                        }, void 0, false, {
                            fileName: "[project]/app/host/leaderboard/page.tsx",
                            lineNumber: 37,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 36,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "header-actions",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "btn-exit",
                            onClick: handleExit,
                            children: "EXIT"
                        }, void 0, false, {
                            fileName: "[project]/app/host/leaderboard/page.tsx",
                            lineNumber: 41,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 40,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/host/leaderboard/page.tsx",
                lineNumber: 35,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "vanguard-section",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "vanguard-title",
                        children: "THE WINNER"
                    }, void 0, false, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 47,
                        columnNumber: 17
                    }, this),
                    players.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            padding: '3rem',
                            color: 'var(--text-secondary)'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "No players participated in this game."
                        }, void 0, false, {
                            fileName: "[project]/app/host/leaderboard/page.tsx",
                            lineNumber: 51,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 50,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "podium-container",
                        children: [
                            top3[1] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "podium-card silver",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rank-badge",
                                        children: "#2"
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 58,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-image",
                                        children: top3[1].spacecraft ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: top3[1].spacecraft.image,
                                            alt: top3[1].spacecraft.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 61,
                                            columnNumber: 41
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '3rem'
                                            },
                                            children: "🚀"
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 63,
                                            columnNumber: 41
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 59,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "podium-name",
                                        children: top3[1].username
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 66,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-score",
                                        children: formatScore(top3[1].score)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 67,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "podium-title",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockPlayers$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRankTitle"])(2)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 68,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 57,
                                columnNumber: 29
                            }, this),
                            top3[0] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "podium-card gold center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rank-badge",
                                        children: "#1"
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 75,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-image",
                                        children: top3[0].spacecraft ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: top3[0].spacecraft.image,
                                            alt: top3[0].spacecraft.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 78,
                                            columnNumber: 41
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '3.5rem'
                                            },
                                            children: "🚀"
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 80,
                                            columnNumber: 41
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 76,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "podium-name",
                                        children: top3[0].username
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 83,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-score",
                                        children: formatScore(top3[0].score)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 84,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "podium-title gold-title",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockPlayers$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRankTitle"])(1)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 85,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 74,
                                columnNumber: 29
                            }, this),
                            top3[2] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "podium-card bronze",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rank-badge",
                                        children: "#3"
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 92,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-image",
                                        children: top3[2].spacecraft ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: top3[2].spacecraft.image,
                                            alt: top3[2].spacecraft.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 95,
                                            columnNumber: 41
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                fontSize: '2.5rem'
                                            },
                                            children: "🚀"
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 97,
                                            columnNumber: 41
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 93,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "podium-name",
                                        children: top3[2].username
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 100,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "podium-score",
                                        children: formatScore(top3[2].score)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 101,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "podium-title",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mockPlayers$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRankTitle"])(3)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 102,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 91,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 54,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/host/leaderboard/page.tsx",
                lineNumber: 46,
                columnNumber: 13
            }, this),
            remaining.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rankings-section",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rankings-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "rankings-title",
                                children: "GLOBAL FLEET RANKINGS"
                            }, void 0, false, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 113,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rankings-range",
                                children: [
                                    "RANKS 4 - ",
                                    players.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 114,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 112,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rankings-grid",
                        children: remaining.map((player, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "ranking-card",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ranking-position",
                                        children: [
                                            "#",
                                            index + 4
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 120,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "ranking-icon",
                                        children: player.spacecraft ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: player.spacecraft.image,
                                            alt: player.spacecraft.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 123,
                                            columnNumber: 41
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "🚀"
                                        }, void 0, false, {
                                            fileName: "[project]/app/host/leaderboard/page.tsx",
                                            lineNumber: 125,
                                            columnNumber: 41
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 121,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ranking-name",
                                        children: player.username
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 128,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ranking-score",
                                        children: formatScore(player.score)
                                    }, void 0, false, {
                                        fileName: "[project]/app/host/leaderboard/page.tsx",
                                        lineNumber: 129,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, player.id, true, {
                                fileName: "[project]/app/host/leaderboard/page.tsx",
                                lineNumber: 119,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/host/leaderboard/page.tsx",
                        lineNumber: 117,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/host/leaderboard/page.tsx",
                lineNumber: 111,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/host/leaderboard/page.tsx",
        lineNumber: 33,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=_d22038ec._.js.map