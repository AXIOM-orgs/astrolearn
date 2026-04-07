// Type Definitions

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type WeaponType = 'spread' | 'laser' | 'magnetic';

export interface AnswerOption {
    id: string;
    answer: string;
    image: string | null;
}

export interface QuizQuestion {
    id: string | number; // Support both for backward compatibility
    difficulty?: DifficultyLevel;
    question: string;
    options?: string[]; // Legacy
    answers?: AnswerOption[]; // New structure
    correctAnswer?: number; // Legacy
    correct?: string; // New structure (ID of correct answer)
    image?: string | null;
    type?: string;
}

export interface Spaceship {
    id: number;
    name: string;
    description: string;
    speed: number;
    color: string;
    emoji: string;
    image: string;
    spriteClass: string;
}

// Weapon Configuration
export interface WeaponConfig {
    type: WeaponType;
    fireRate: number; // ms between shots
    bulletSpeed: number;
    bulletWidth: number;
    bulletHeight: number;
    damage: number;
    color: string;
    spreadCount?: number; // for spread shot
    isAutoFire?: boolean; // continuous firing
}

// Difficulty Configuration for Mini-Game
export interface DifficultyConfig {
    weapon: WeaponConfig;
    asteroidHP: number;
    asteroidSize: { min: number; max: number };
    asteroidSpeed: { min: number; max: number };
    asteroidSpawnRate: number; // ms between spawns
    totalAsteroids: number;
    hasBoss: boolean;
    bossHP: number;
    bossSize: number;
    gameDuration: number; // seconds
}

// Difficulty Configurations
export const difficultyConfigs: Record<DifficultyLevel, DifficultyConfig> = {
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
        asteroidSize: { min: 25, max: 35 },
        asteroidSpeed: { min: 1, max: 2 },
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
        asteroidSize: { min: 30, max: 45 },
        asteroidSpeed: { min: 2, max: 3.5 },
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
        asteroidSize: { min: 25, max: 40 },
        asteroidSpeed: { min: 2.5, max: 4.5 },
        asteroidSpawnRate: 500,
        totalAsteroids: 35,
        hasBoss: true,
        bossHP: 85000,
        bossSize: 140,
        gameDuration: 9999
    }
};

export type QuizQuestionsMap = Record<DifficultyLevel, QuizQuestion[]>;

// Quiz Questions Database
export const quizQuestions: QuizQuestionsMap = {
    easy: [
        {
            id: 1,
            difficulty: "easy",
            question: "What is the closest planet to the Sun?",
            options: ["Mercury", "Venus", "Earth", "Mars"],
            correctAnswer: 0
        },
        {
            id: 2,
            difficulty: "easy",
            question: "How many planets are in our solar system?",
            options: ["7", "8", "9", "10"],
            correctAnswer: 1
        },
        {
            id: 3,
            difficulty: "easy",
            question: "What is the largest planet in our solar system?",
            options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
            correctAnswer: 2
        },
        {
            id: 4,
            difficulty: "easy",
            question: "What is Earth's natural satellite called?",
            options: ["The Moon", "Titan", "Europa", "Phobos"],
            correctAnswer: 0
        },
        {
            id: 5,
            difficulty: "easy",
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            correctAnswer: 1
        },
        {
            id: 6,
            difficulty: "easy",
            question: "What is the name of our galaxy?",
            options: ["Andromeda", "Milky Way", "Triangulum", "Whirlpool"],
            correctAnswer: 1
        },
        {
            id: 7,
            difficulty: "easy",
            question: "What is the Sun?",
            options: ["A planet", "A moon", "A star", "An asteroid"],
            correctAnswer: 2
        },
        {
            id: 8,
            difficulty: "easy",
            question: "Which planet has rings?",
            options: ["Mars", "Venus", "Saturn", "Mercury"],
            correctAnswer: 2
        },
        {
            id: 9,
            difficulty: "easy",
            question: "How long does it take Earth to orbit the Sun?",
            options: ["365 days", "30 days", "7 days", "100 days"],
            correctAnswer: 0
        },
        {
            id: 10,
            difficulty: "easy",
            question: "What is the smallest planet in our solar system?",
            options: ["Mars", "Mercury", "Venus", "Pluto"],
            correctAnswer: 1
        },
        {
            id: 11,
            difficulty: "easy",
            question: "Which planet is closest to Earth?",
            options: ["Mars", "Venus", "Mercury", "Jupiter"],
            correctAnswer: 1
        },
        {
            id: 12,
            difficulty: "easy",
            question: "What color is the sunset on Mars?",
            options: ["Red", "Orange", "Blue", "Purple"],
            correctAnswer: 2
        },
        {
            id: 13,
            difficulty: "easy",
            question: "How many moons does Earth have?",
            options: ["0", "1", "2", "3"],
            correctAnswer: 1
        },
        {
            id: 14,
            difficulty: "easy",
            question: "What is the hottest planet in our solar system?",
            options: ["Mercury", "Venus", "Mars", "Jupiter"],
            correctAnswer: 1
        },
        {
            id: 15,
            difficulty: "easy",
            question: "What do we call a person who travels to space?",
            options: ["Pilot", "Astronaut", "Captain", "Navigator"],
            correctAnswer: 1
        }
    ],
    medium: [
        {
            id: 16,
            difficulty: "medium",
            question: "What is the Great Red Spot on Jupiter?",
            options: ["A volcano", "A storm", "A crater", "An ocean"],
            correctAnswer: 1
        },
        {
            id: 17,
            difficulty: "medium",
            question: "Which planet has the most moons?",
            options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
            correctAnswer: 1
        },
        {
            id: 18,
            difficulty: "medium",
            question: "What is the Kuiper Belt?",
            options: ["A region of asteroids", "A region of comets and icy bodies", "A type of galaxy", "A constellation"],
            correctAnswer: 1
        },
        {
            id: 19,
            difficulty: "medium",
            question: "How long is a day on Venus?",
            options: ["24 hours", "243 Earth days", "10 hours", "365 days"],
            correctAnswer: 1
        },
        {
            id: 20,
            difficulty: "medium",
            question: "What is the name of the first artificial satellite?",
            options: ["Apollo 11", "Sputnik 1", "Voyager 1", "Hubble"],
            correctAnswer: 1
        },
        {
            id: 21,
            difficulty: "medium",
            question: "Which planet rotates on its side?",
            options: ["Neptune", "Saturn", "Uranus", "Jupiter"],
            correctAnswer: 2
        },
        {
            id: 22,
            difficulty: "medium",
            question: "What is the asteroid belt located between?",
            options: ["Earth and Mars", "Mars and Jupiter", "Jupiter and Saturn", "Venus and Earth"],
            correctAnswer: 1
        },
        {
            id: 23,
            difficulty: "medium",
            question: "What is the speed of light?",
            options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "100,000 km/s"],
            correctAnswer: 0
        },
        {
            id: 24,
            difficulty: "medium",
            question: "Which moon of Jupiter is the largest in the solar system?",
            options: ["Europa", "Io", "Ganymede", "Callisto"],
            correctAnswer: 2
        },
        {
            id: 25,
            difficulty: "medium",
            question: "What causes the Northern Lights (Aurora Borealis)?",
            options: ["Moonlight reflection", "Solar wind particles", "Meteor showers", "Volcanic ash"],
            correctAnswer: 1
        },
        {
            id: 26,
            difficulty: "medium",
            question: "How many Earth years does it take Neptune to orbit the Sun?",
            options: ["84 years", "165 years", "248 years", "12 years"],
            correctAnswer: 1
        },
        {
            id: 27,
            difficulty: "medium",
            question: "What is a light-year?",
            options: ["A unit of time", "A unit of distance", "A unit of speed", "A unit of mass"],
            correctAnswer: 1
        },
        {
            id: 28,
            difficulty: "medium",
            question: "Which planet has the strongest winds in the solar system?",
            options: ["Jupiter", "Saturn", "Neptune", "Uranus"],
            correctAnswer: 2
        },
        {
            id: 29,
            difficulty: "medium",
            question: "What is the temperature at the core of the Sun?",
            options: ["1 million °C", "15 million °C", "100,000 °C", "50 million °C"],
            correctAnswer: 1
        },
        {
            id: 30,
            difficulty: "medium",
            question: "Which spacecraft was the first to leave our solar system?",
            options: ["Voyager 1", "Pioneer 10", "New Horizons", "Cassini"],
            correctAnswer: 0
        }
    ],
    hard: [
        {
            id: 31,
            difficulty: "hard",
            question: "What is the Schwarzschild radius?",
            options: ["The radius of a star", "The event horizon of a black hole", "The distance to the nearest star", "The size of a galaxy"],
            correctAnswer: 1
        },
        {
            id: 32,
            difficulty: "hard",
            question: "What percentage of the universe is dark matter?",
            options: ["27%", "68%", "5%", "15%"],
            correctAnswer: 0
        },
        {
            id: 33,
            difficulty: "hard",
            question: "What is the Chandrasekhar limit?",
            options: ["Maximum mass of a white dwarf", "Speed of light limit", "Temperature of stars", "Size of galaxies"],
            correctAnswer: 0
        },
        {
            id: 34,
            difficulty: "hard",
            question: "What is gravitational lensing?",
            options: ["Bending of light by gravity", "Formation of galaxies", "Expansion of universe", "Collision of stars"],
            correctAnswer: 0
        },
        {
            id: 35,
            difficulty: "hard",
            question: "What is the Roche limit?",
            options: ["Distance where tidal forces destroy objects", "Maximum speed in space", "Temperature of black holes", "Age of universe"],
            correctAnswer: 0
        },
        {
            id: 36,
            difficulty: "hard",
            question: "What is redshift in astronomy?",
            options: ["Color of Mars", "Light stretched by expansion", "Type of star", "Solar phenomenon"],
            correctAnswer: 1
        },
        {
            id: 37,
            difficulty: "hard",
            question: "What is the Oort Cloud?",
            options: ["A nebula", "A theoretical cloud of comets", "A type of galaxy", "A constellation"],
            correctAnswer: 1
        },
        {
            id: 38,
            difficulty: "hard",
            question: "What is Hawking radiation?",
            options: ["Radiation from the Sun", "Theoretical radiation from black holes", "Cosmic background radiation", "Solar wind"],
            correctAnswer: 1
        },
        {
            id: 39,
            difficulty: "hard",
            question: "What is the cosmic microwave background?",
            options: ["Radiation from stars", "Afterglow of the Big Bang", "Solar radiation", "Galaxy emissions"],
            correctAnswer: 1
        },
        {
            id: 40,
            difficulty: "hard",
            question: "What is a quasar?",
            options: ["A type of star", "An extremely bright active galactic nucleus", "A planet", "A moon"],
            correctAnswer: 1
        },
        {
            id: 41,
            difficulty: "hard",
            question: "What is the Hubble constant?",
            options: ["Age of universe", "Rate of universe expansion", "Speed of light", "Mass of galaxies"],
            correctAnswer: 1
        },
        {
            id: 42,
            difficulty: "hard",
            question: "What are magnetars?",
            options: ["Magnetic planets", "Neutron stars with extreme magnetic fields", "Black holes", "Asteroids"],
            correctAnswer: 1
        },
        {
            id: 43,
            difficulty: "hard",
            question: "What is the Drake equation used for?",
            options: ["Calculating star mass", "Estimating alien civilizations", "Measuring distances", "Predicting eclipses"],
            correctAnswer: 1
        },
        {
            id: 44,
            difficulty: "hard",
            question: "What is a pulsar?",
            options: ["A pulsating star", "A rotating neutron star", "A type of galaxy", "A comet"],
            correctAnswer: 1
        },
        {
            id: 45,
            difficulty: "hard",
            question: "What is the Great Attractor?",
            options: ["A black hole", "A gravitational anomaly pulling galaxies", "A supernova", "A nebula"],
            correctAnswer: 1
        }
    ]
};

// Spaceship Database
export const spaceships: Spaceship[] = [
    {
        id: 1,
        name: "Nebula Striker",
        description: "Fast and agile fighter craft",
        speed: 9,
        color: "#ff9e00",
        emoji: "🚀",
        image: "/assets/images/characters/roket/roket-1.webp",
        spriteClass: "bg-roket-1"
    },
    {
        id: 2,
        name: "Quantum UFO",
        description: "Advanced exploration vessel",
        speed: 7,
        color: "#ff9e00",
        emoji: "🛸",
        image: "/assets/images/characters/roket/roket-2.webp",
        spriteClass: "bg-roket-2"
    },
    {
        id: 3,
        name: "Stellar Phoenix",
        description: "Heavy combat cruiser",
        speed: 6,
        color: "#ff9e00",
        emoji: "🛰️",
        image: "/assets/images/characters/roket/roket-3.webp",
        spriteClass: "bg-roket-3"
    },
    {
        id: 4,
        name: "Cosmic Ranger",
        description: "Balanced all-purpose ship",
        speed: 8,
        color: "#ff9e00",
        emoji: "✨",
        image: "/assets/images/characters/roket/roket-4.webp",
        spriteClass: "bg-roket-4"
    },
    {
        id: 5,
        name: "Void Reaper",
        description: "Stealth reconnaissance craft",
        speed: 10,
        color: "#ff9e00",
        emoji: "🌟",
        image: "/assets/images/characters/roket/roket-5.webp",
        spriteClass: "bg-roket-5"
    },
    {
        id: 6,
        name: "Galaxy Titan",
        description: "Massive flagship carrier",
        speed: 5,
        color: "#ff9e00",
        emoji: "🌠",
        image: "/assets/images/characters/roket/roket-6.webp",
        spriteClass: "bg-roket-6"
    }
];

export const getSpacecraftImage = (filename: string | null): string => {
    if (!filename) return spaceships[0].image;
    const baseName = filename.split('/').pop() || '';
    const ship = spaceships.find(s => s.image.endsWith(baseName));
    return ship ? ship.image : spaceships[0].image;
};

// Convert database filename to CSS sprite class
export const getSpacecraftSpriteClass = (filename: string | null): string => {
    if (!filename) return 'bg-roket-1';
    // Match "roket-1.webp" or "roket-1" → "bg-roket-1"
    const match = filename.match(/roket-(\d+)/);
    if (match) return `bg-roket-${match[1]}`;
    // Fallback: search spaceships array
    const baseName = filename.split('/').pop() || '';
    const ship = spaceships.find(s => s.image.endsWith(baseName));
    return ship?.spriteClass || 'bg-roket-1';
};
