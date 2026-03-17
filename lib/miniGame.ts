import { Spaceship, DifficultyLevel, DifficultyConfig, WeaponConfig, WeaponType, difficultyConfigs } from './data';

// ============ TYPE DEFINITIONS ============

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    image: HTMLImageElement;
    dx: number;
    dy: number;
    hp: number;
    maxHp: number;
    tilt: number;
}

interface Bullet {
    id: number;
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    speed: number;
    damage: number;
    color: string;
    type: 'spread' | 'laser' | 'magnetic';
    targetAsteroid?: MovingAsteroid;
    angle?: number;
    isEnemy?: boolean;
    dirX?: number;
    dirY?: number;
    isStationBullet?: boolean;
    isSniperBullet?: boolean;
}



// Moving meteors (to destroy)
interface MovingAsteroid {
    id: number;
    x: number;
    y: number;
    z: number;
    baseSize: number;
    speed: number;
    hp: number;
    maxHp: number;
    isBoss: boolean;
    rotation: number;
    rotationSpeed: number;
    hitFlash: number;
    laneX: number;
}

// Enemy rockets
interface EnemyRocket {
    id: number;
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    speed: number;
    hp: number;
    maxHp: number;
    laneX: number;
    imageVariant?: number; // 0-3 for basic enemy variations

    lastFireTime: number;
    type: 'basic' | 'sniper' | 'spinner';
    state: 'moving' | 'aiming' | 'shooting' | 'cooldown'; // Added 'cooldown' for sniper
    stateTimer: number; // For timing states
    angle: number;      // For spinner movement
    speedX?: number;    // Optional horizontal speed
    speedY?: number;    // Optional vertical speed
    direction?: string; // Optional direction for spawn logic
    targetX?: number;   // For sniper aiming
    targetY?: number;
    enterTime?: number;
    lastShotTime?: number;
    pathType?: 'sine_left' | 'sine_right' | 'cross_left' | 'cross_right' | 'u_turn_left' | 'u_turn_right'; // Added formation types
    initialX?: number;  // Starting X for sine wave calculation
    startX?: number; // Kept for compatibility
    timeOffset?: number; // Time offset for formation spacing
    dirX?: number;
    dirY?: number;
}

// Boss Rocket (for hard difficulty, appears in last 10 seconds)
interface BossRocket {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    hp: number;
    maxHp: number;
    lastFireTime: number;
    // 4 turret positions (2 left, 2 right)
    turrets: { offsetX: number; offsetY: number }[];
    // Phase System
    phase: 1 | 2 | 3;
    minions: {
        x: number;
        y: number;
        width: number;
        height: number;
        hp: number;
        maxHp: number;
        offsetX: number;
        offsetY: number;
        lastFireTime: number;
        state?: 'entering' | 'locked';
    }[];
    laserTimer: number;
    isLaserFiring: boolean;
    laserWarning: boolean;
    invulnerable: boolean;
    laserDamageTick?: number;
    isDying?: boolean;
    dyeStartTime?: number;
}

interface PowerUp {
    id: number;
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    weaponType: WeaponType;
    color: string;
    rotation: number;
    laneX: number;
}

export interface GameStats {
    hits: number;
    asteroidsDestroyed: number;
    bossDestroyed: boolean;
    score: number;
    success: boolean;
    playerHP: number;
    isEliminated: boolean;
}

type MiniGameCallback = (stats: GameStats) => void;
type StateChangeCallback = (lives: number, hp: number) => void;

// ============ GAME STATE ============

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let player: Player | null = null;
let bullets: Bullet[] = [];
let movingAsteroids: MovingAsteroid[] = [];
let enemyRockets: EnemyRocket[] = [];
let enemyBullets: Bullet[] = [];
let bossRocket: BossRocket | null = null;
let powerUps: PowerUp[] = [];
let isGameRunning: boolean = false;
let gameLoop: ReturnType<typeof requestAnimationFrame> | null = null;
let playerSpaceship: Spaceship | null = null;
let handleStateChange: StateChangeCallback | null = null;
let currentBgMode: 'starfield' | 'rocket_seq' | 'portrait_scene' = 'starfield';

// ============ OBJECT POOLING SYSTEM ============

interface ObjectPool<T> {
    pool: T[];
    maxSize: number;
}

// Bullet Pool - Increased maxSize for overlapping bullet streams (Level 3 spread overlap)
const bulletPool: ObjectPool<Bullet> = { pool: [], maxSize: 500 };
const enemyBulletPool: ObjectPool<Bullet> = { pool: [], maxSize: 100 };
const explosionPool: ObjectPool<ExplosionParticle> = { pool: [], maxSize: 50 };
const smokePool: ObjectPool<SmokeParticle> = { pool: [], maxSize: 100 };

function getBulletFromPool(): Bullet {
    if (bulletPool.pool.length > 0) {
        return bulletPool.pool.pop()!;
    }
    return createEmptyBullet();
}

function returnBulletToPool(bullet: Bullet): void {
    if (bulletPool.pool.length < bulletPool.maxSize) {
        bulletPool.pool.push(bullet);
    }
}

function getEnemyBulletFromPool(): Bullet {
    if (enemyBulletPool.pool.length > 0) {
        return enemyBulletPool.pool.pop()!;
    }
    return createEmptyBullet();
}

function returnEnemyBulletToPool(bullet: Bullet): void {
    if (enemyBulletPool.pool.length < enemyBulletPool.maxSize) {
        enemyBulletPool.pool.push(bullet);
    }
}

function createEmptyBullet(): Bullet {
    return {
        id: 0, x: 0, y: 0, z: 0, width: 0, height: 0,
        speed: 0, damage: 0, color: '', type: 'spread'
    };
}

function getExplosionFromPool(): ExplosionParticle {
    if (explosionPool.pool.length > 0) {
        return explosionPool.pool.pop()!;
    }
    return { x: 0, y: 0, scale: 0, alpha: 0, rotation: 0, age: 0 };
}

function returnExplosionToPool(particle: ExplosionParticle): void {
    if (explosionPool.pool.length < explosionPool.maxSize) {
        explosionPool.pool.push(particle);
    }
}

function getSmokeFromPool(): SmokeParticle {
    if (smokePool.pool.length > 0) {
        return smokePool.pool.pop()!;
    }
    return { x: 0, y: 0, alpha: 0, scale: 0, age: 0, vx: 0, vy: 0 };
}

function returnSmokeToPool(particle: SmokeParticle): void {
    if (smokePool.pool.length < smokePool.maxSize) {
        smokePool.pool.push(particle);
    }
}

// ============ SPATIAL GRID FOR COLLISION OPTIMIZATION ============
// Divides the screen into cells to reduce collision checks

const GRID_CELL_SIZE = 100; // pixels
let spatialGrid: Map<string, (MovingAsteroid | EnemyRocket)[]> = new Map();

function getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / GRID_CELL_SIZE);
    const cellY = Math.floor(y / GRID_CELL_SIZE);
    return `${cellX},${cellY}`;
}

function updateSpatialGrid(): void {
    spatialGrid.clear();

    // Add asteroids to grid
    for (const asteroid of movingAsteroids) {
        const key = getCellKey(asteroid.x, asteroid.y);
        if (!spatialGrid.has(key)) {
            spatialGrid.set(key, []);
        }
        spatialGrid.get(key)!.push(asteroid);
    }

    // Add enemy rockets to grid
    for (const enemy of enemyRockets) {
        const key = getCellKey(enemy.x, enemy.y);
        if (!spatialGrid.has(key)) {
            spatialGrid.set(key, []);
        }
        spatialGrid.get(key)!.push(enemy);
    }
}

function getNearbyObjects(x: number, y: number): (MovingAsteroid | EnemyRocket)[] {
    const nearby: (MovingAsteroid | EnemyRocket)[] = [];

    // Check 3x3 grid cells around the position
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const cellX = Math.floor(x / GRID_CELL_SIZE) + dx;
            const cellY = Math.floor(y / GRID_CELL_SIZE) + dy;
            const key = `${cellX},${cellY}`;
            const objects = spatialGrid.get(key);
            if (objects) {
                nearby.push(...objects);
            }
        }
    }

    return nearby;
}

// ============ MOBILE PERFORMANCE SETTINGS ============
// Detect mobile and adjust visual quality for better performance

let isMobile: boolean = false;
let enableShadows: boolean = true;
let particleMultiplier: number = 1; // 1 = full, 0.5 = half

function detectMobileAndSetPerformance(): void {
    // Detect mobile by screen width (under 768px is typically mobile)
    isMobile = window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        enableShadows = false;      // Disable expensive shadow effects
        particleMultiplier = 0.5;   // Reduce particle count by 50%
        console.log('[Performance] Mobile detected - shadows disabled, particles reduced');
    } else {
        enableShadows = true;
        particleMultiplier = 1;
        console.log('[Performance] Desktop detected - full quality');
    }
}

// Game config
let difficultyConfig: DifficultyConfig | null = null;
let weaponConfig: WeaponConfig | null = null;
let currentWeapon: WeaponType | null = null;
let hasWeapon: boolean = false;
let meteorImage: HTMLImageElement | null = null;
let currentDifficulty: DifficultyLevel = 'easy';

// Dual weapon system: spread is always base weapon, secondary is from power-up
let secondaryWeapon: WeaponType | null = null;
let secondaryWeaponConfig: WeaponConfig | null = null;
let activeUpgradeWeapons: { type: WeaponType, config: WeaponConfig }[] = [];
let playerWeaponLevel: number = 1; // 1, 2, or 3
let lastPowerUpDropTime: number = 0;

// Background scrolling (3-image loop)
let backgroundImages: HTMLImageElement[] = [];
let bgPanelY: number[] = []; // Y positions for each panel
let backgroundScrollSpeed: number = 4;

// Booster decorations
let boosterImage: HTMLImageElement | null = null;
interface BoosterDecor { x: number; y: number; scale: number; rotation: number; rotationSpeed: number; }
let boosterDecors: BoosterDecor[] = [];

// Smoke particles
let smokeImage: HTMLImageElement | null = null;
interface SmokeParticle { x: number; y: number; alpha: number; scale: number; age: number; vx: number; vy: number; }
let smokeParticles: SmokeParticle[] = [];
let lastSmokeSpawnTime: number = 0;

// Enemy rocket images
let enemyRocketImage: HTMLImageElement | null = null;
let enemyBasicImages: HTMLImageElement[] = []; // Array for basic enemy variants
let enemySniperImage: HTMLImageElement | null = null;
let enemySpinnerImage: HTMLImageElement | null = null;

// Visual Effects State
let screenShakeUntil: number = 0;
let screenShakeIntensity: number = 0;
let shakeX: number = 0;
let shakeY: number = 0;
let muzzleFlashUntil: number = 0;

// Explosion particles
let explosionImage: HTMLImageElement | null = null;
interface ExplosionParticle { x: number; y: number; scale: number; alpha: number; rotation: number; age: number; }
let explosionParticles: ExplosionParticle[] = [];

// Boss Death Visuals
let bossExplosionImage: HTMLImageElement | null = null;
let fireRingImage: HTMLImageElement | null = null;
let bossDeathEffect = {
    active: false,
    startTime: 0,
    x: 0,
    y: 0
};

// Bullet images
let bulletSpreadImage: HTMLImageElement | null = null;  // bullet_25.png
let bulletMagneticImage: HTMLImageElement | null = null; // bullet_73_5.png
let bulletLaserImage: HTMLImageElement | null = null;    // bullet_68.png

// Boss rocket image
let bossRocketImage: HTMLImageElement | null = null;
let bossBulletImage: HTMLImageElement | null = null; // bullet_4_2_0.png
let laserBeamImage: HTMLImageElement | null = null; // laser_6.png
let weaponPowerUpImage: HTMLImageElement | null = null;
let stationBulletImage: HTMLImageElement | null = null; // bullet_1_1_4.png
let loveImage: HTMLImageElement | null = null;
let barHpImage: HTMLImageElement | null = null;
let enemySniperBulletImage: HTMLImageElement | null = null;

// Additional scrolling decorations
let spaceStation1Image: HTMLImageElement | null = null;
let spaceStation2Image: HTMLImageElement | null = null;
let rockImage: HTMLImageElement | null = null;
interface ScrollingDecor { x: number; y: number; scale: number; rotation: number; rotationSpeed: number; type: 'station1' | 'station2' | 'rock'; lastFireTime?: number; fireRate?: number; hp?: number; maxHp?: number; hitFlash?: number; }
let scrollingDecors: ScrollingDecor[] = [];

// Crosshair position
let crosshairX: number = 0;
let crosshairY: number = 0;

// Smooth follow movement
let targetX: number = 0;
let targetY: number = 0;
const LERP_SPEED: number = 0.12;
const MAX_TILT: number = 25;
let lastPlayerX: number = 0;

// 3D Perspective settings
const HORIZON_Y = 0.2;
const PERSPECTIVE_SCALE = 2.5;

// Power-up system
const DODGE_PHASE_DURATION = 5000;
let powerUpsSpawned: boolean = false;
let powerUpIdCounter: number = 0;

// Counters
let asteroidIdCounter: number = 0;
let bulletIdCounter: number = 0;
let enemyIdCounter: number = 0;
let asteroidsSpawned: number = 0;
let enemiesSpawned: number = 0;
let bossSpawned: boolean = false;
let bossEscaped: boolean = false;
let lastFireTime: number = 0;
let lastSpawnTime: number = 0;
let lastEnemySpawnTime: number = 0;
let lastSquadronType: string = ''; // Track last squadron pattern
let gameStartTime: number = 0;
let showBossWarning: boolean = false;
let bossWarningStartTime: number = 0;


// Weapon settings (obsolete duration)

// Lives system
const PLAYER_MAX_LIVES = 10;
const LIFE_MAX_HP = 100;
const IMMUNITY_DURATION = 3000; // 3 seconds immunity after losing a life
let playerLives: number = 3;
let playerLifeHP: number = 10;
let isImmune: boolean = false;
let immuneEndTime: number = 0;

// More moving asteroids based on difficulty
const MOVING_ASTEROID_COUNT = {
    easy: 8,
    medium: 15,
    hard: 25
};

// ============ WAVE CONFIGURATION ============
const WAVE_CONFIGS = {
    easy: { spinner: 6, sniper: 2, basic: 0 },
    medium: { basic: 9, sniper: 3, spinner: 3 },
    hard: { basic: 15, sniper: 5, spinner: 5 }
};

let enemySpawnQueue: string[] = []; // Current wave queue

// Stats
let gameStats: GameStats = {
    hits: 0,
    asteroidsDestroyed: 0,
    bossDestroyed: false,
    score: 0,
    success: false,
    playerHP: 0,
    isEliminated: false
};

// Controls
let isFiring: boolean = false;
let keys: { [key: string]: boolean } = {};

// Event handlers
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
let keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
let mouseDownHandler: ((e: MouseEvent) => void) | null = null;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

function handleResize(): void {
    if (!canvas || !player) return;

    // Update canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Reposition background panels to avoid gaps immediately
    // Ideally we'd scale them, but resetting them stack-wise is safer to prevent gaps
    // We only reset if they are completely desynchronized, but for now let's just update player
    // effectively, the background loop usually checks canvas.height so it might self-correct
    // but let's ensure the player stays on screen.

    // Update player position
    player.y = canvas.height - 100;

    // Clamp player X
    const margin = player.width / 2;
    if (player.x < margin) player.x = margin;
    if (player.x > canvas.width - margin) player.x = canvas.width - margin;

    // Update target to ensure it's not off-screen
    targetX = Math.max(margin, Math.min(canvas.width - margin, targetX));
    targetY = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, targetY));

    // Re-init scrolling decors if needed or let them flow. 
    // They are 3D perspective so getScreenPosition uses canvas.height/width dynamic
    // so they should adjust automatically on next frame.
}

// ============ AUDIO SYSTEM ============

type SoundType = 'spread' | 'laserBiru' | 'laserMagnet' | 'bossLaser' | 'destroy' | 'powerup' | 'bossDead';

class AudioManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = true; // Default muted per request
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeSources: AudioBufferSourceNode[] = [];
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmGain: GainNode | null = null;
    private isLoaded: boolean = false;

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not available');
        }
    }

    async loadSounds(): Promise<void> {
        if (!this.audioContext || this.isLoaded) return;

        const soundFiles: { [key: string]: string } = {
            'spread': '/assets/audio/game/spread.mp3',
            'laserBiru': '/assets/audio/game/blue_laser.mp3',
            'laserMagnet': '/assets/audio/game/magnetic_laser.mp3',
            'bossLaser': '/assets/audio/game/big_laser_beam.mp3',
            'destroy': '/assets/audio/game/explosion.mp3',
            'bgm': '/assets/audio/game/game_bgm.mp3',
            'bossDead': '/assets/audio/game/boss_dead.mp3'
        };

        const loadPromises = Object.entries(soundFiles).map(async ([key, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
                this.audioBuffers.set(key, audioBuffer);
            } catch (e) {
                console.log(`Failed to load sound: ${key}`, e);
            }
        });

        await Promise.all(loadPromises);
        this.isLoaded = true;
        console.log('All sounds loaded');
    }

    playSound(type: SoundType, volume: number = 0.5): void {
        if (!this.audioContext || this.isMuted) return;

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        let bufferKey = type as string;
        let offset = 0;
        let duration: number | undefined = undefined;
        let playbackRate = 1.0;

        // Special handling for specific sounds
        // Special handling for specific sounds
        if (type === 'bossLaser') {
            playbackRate = 2.0; // 2x speed
        }

        const buffer = this.audioBuffers.get(bufferKey);
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Track active sources for cleanup
        this.activeSources.push(source);
        source.onended = () => {
            const index = this.activeSources.indexOf(source);
            if (index > -1) this.activeSources.splice(index, 1);
        };

        if (duration !== undefined) {
            source.start(0, offset, duration);
        } else {
            source.start(0, offset);
        }
    }

    startBGM(volume: number = 0.5): void {
        if (!this.audioContext || this.isMuted || this.bgmSource) return;

        const buffer = this.audioBuffers.get('bgm');
        if (!buffer) return;

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.bgmSource = this.audioContext.createBufferSource();
        this.bgmGain = this.audioContext.createGain();

        this.bgmSource.buffer = buffer;
        this.bgmSource.loop = true;
        this.bgmGain.gain.value = volume;

        this.bgmSource.connect(this.bgmGain);
        this.bgmGain.connect(this.audioContext.destination);

        this.bgmSource.start(0);
    }

    stopBGM(): void {
        if (this.bgmSource) {
            try {
                this.bgmSource.stop();
            } catch (e) {
                // Already stopped
            }
            this.bgmSource = null;
            this.bgmGain = null;
        }
    }

    stopAllSounds(): void {
        // Stop all active sound effects
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        this.activeSources = [];

        // Stop background music
        this.stopBGM();
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            this.stopAllSounds();
        } else {
            // Unmute: only start BGM if game is running (managed by caller or just start it)
            // But usually we want BGM to resume if unmuted
            this.startBGM(0.5);
        }

        return this.isMuted;
    }

    getMuted(): boolean {
        return this.isMuted;
    }

    // Legacy method for compatibility (uses oscillator fallback)
    playSoundEffect(type: 'spread' | 'laser' | 'magnetic' | 'hit' | 'powerup' | 'explosion'): void {
        // Map legacy types to new sound system
        if (type === 'spread') {
            this.playSound('spread', 0.15); // Reduced volume
        } else if (type === 'laser') {
            this.playSound('laserBiru', 0.35); // Balanced with other lasers
        } else if (type === 'magnetic') {
            this.playSound('laserMagnet', 0.35); // Balanced with other lasers
        } else if (type === 'explosion') {
            this.playSound('destroy', 0.50);
        }
        // hit and powerup use oscillator fallback
        else if (this.audioContext) {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            if (type === 'hit') {
                osc.frequency.value = 150;
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'powerup') {
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        }
    }
}

let audioManager = new AudioManager();

// ============ 3D PERSPECTIVE HELPERS ============

function getScreenPosition(laneX: number, z: number): { x: number; y: number; scale: number } {
    if (!canvas) return { x: 0, y: 0, scale: 1 };

    const horizonY = canvas.height * HORIZON_Y;
    const playerY = canvas.height - 100;
    const centerX = canvas.width / 2;

    const screenY = horizonY + (playerY - horizonY) * z;
    const spreadFactor = z * 0.85 + 0.15;
    const screenX = centerX + (laneX * canvas.width * 0.45 * spreadFactor);
    const scale = 0.2 + z * 0.8;

    return { x: screenX, y: screenY, scale };
}

// ============ MAIN FUNCTIONS ============
let onComplete: ((stats: GameStats) => void) | null = null;
let callbackCalled = false;
let gameTranslations: any = null;

export function startMiniGame(
    spaceship: Spaceship,
    difficulty: DifficultyLevel,
    completeCallback: (stats: GameStats) => void,
    initialLives?: number,
    initialHP?: number,
    onStateChange?: (lives: number, hp: number) => void,
    translations?: any
): void {
    if (isGameRunning) return;
    
    playerSpaceship = spaceship;
    currentDifficulty = difficulty;
    onComplete = completeCallback;
    callbackCalled = false;
    handleStateChange = onStateChange || null;
    gameTranslations = translations;
    // CRITICAL: Ensure any existing game is fully stopped before starting a new one
    cleanupMiniGame();

    currentDifficulty = difficulty;

    canvas = document.getElementById('minigame-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas not found');
        if (onComplete) {
            onComplete({ hits: 0, asteroidsDestroyed: 0, bossDestroyed: false, score: 0, success: false, playerHP: 0, isEliminated: false });
        }
        return;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        if (onComplete) {
            onComplete({ hits: 0, asteroidsDestroyed: 0, bossDestroyed: false, score: 0, success: false, playerHP: 0, isEliminated: false });
        }
        return;
    }

    // Detect mobile and set performance settings
    detectMobileAndSetPerformance();

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Get difficulty config
    difficultyConfig = difficultyConfigs[difficulty];

    // Initialize Wave Queue based on difficulty (Generate & Shuffle)
    const config = WAVE_CONFIGS[difficulty];
    let queue: string[] = [];

    // Fill queue
    for (let i = 0; i < config.basic; i++) queue.push('basic');
    for (let i = 0; i < config.sniper; i++) queue.push('sniper');
    for (let i = 0; i < config.spinner; i++) queue.push('spinner');

    // Shuffle queue (Fisher-Yates)
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    enemySpawnQueue = queue;
    enemiesSpawned = 0;


    // Initialize spread as base weapon from the start
    currentWeapon = 'spread';
    hasWeapon = true;
    weaponConfig = {
        type: 'spread',
        fireRate: 180,
        bulletSpeed: 14,
        bulletWidth: 6,
        bulletHeight: 15,
        damage: 80,
        color: '#ff6b6b',
        spreadCount: 3,
        isAutoFire: true
    };

    // Reset secondary weapon (from power-up)
    secondaryWeapon = null;
    secondaryWeaponConfig = null;
    playerWeaponLevel = 1;
    activeUpgradeWeapons = [];
    lastPowerUpDropTime = 0;

    // Reset power-up system
    powerUpsSpawned = false;
    powerUps = [];
    powerUpIdCounter = 0;

    // Reset game state
    bullets = [];
    movingAsteroids = [];
    enemyRockets = [];
    enemyBullets = [];
    asteroidsSpawned = 0;
    enemiesSpawned = 0;
    bossSpawned = false;
    bossEscaped = false;
    bossRocket = null; // Reset boss rocket
    asteroidIdCounter = 0;
    bulletIdCounter = 0;
    enemyIdCounter = 0;
    lastFireTime = 0;
    lastSpawnTime = 0;
    lastEnemySpawnTime = 0;
    gameStartTime = Date.now();
    isGameRunning = true;
    isFiring = true; // Auto-fire enabled with base weapon

    // Reset visual effect timers and shaking
    muzzleFlashUntil = 0;
    screenShakeUntil = 0;
    shakeX = 0;
    shakeY = 0;

    // Initialize lives system
    playerLives = (initialLives !== undefined) ? initialLives : PLAYER_MAX_LIVES;
    playerLifeHP = (initialHP !== undefined) ? initialHP : LIFE_MAX_HP;
    isImmune = false;
    immuneEndTime = 0;
    keys = {};

    // Reset stats
    gameStats = {
        hits: 0,
        asteroidsDestroyed: 0,
        bossDestroyed: false,
        score: 0,
        success: false,
        playerHP: 0,
        isEliminated: false
    };

    // Load meteor image
    meteorImage = new Image();
    meteorImage.src = '/assets/meteor.png';

    // Randomly select between 3 background modes
    const bgRand = Math.floor(Math.random() * 3);
    backgroundImages = [];

    if (bgRand === 0) {
        currentBgMode = 'starfield';
        const src = '/assets/images/backgrounds/background_5.jpg';
        for (let i = 0; i < 4; i++) {
            const img = new Image();
            img.src = src;
            backgroundImages.push(img);
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2, -canvas.height * 3];
    } else if (bgRand === 1) {
        currentBgMode = 'rocket_seq';
        const sources = ['/assets/images/backgrounds/background_1.jpg', '/assets/images/backgrounds/background_4.jpg', '/assets/images/backgrounds/background_2.jpg'];
        for (const src of sources) {
            const img = new Image();
            img.src = src;
            backgroundImages.push(img);
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2];
    } else {
        currentBgMode = 'portrait_scene';
        const src = '/assets/images/backgrounds/background_3.png';
        for (let i = 0; i < 4; i++) {
            const img = new Image();
            img.src = src;
            backgroundImages.push(img);
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2, -canvas.height * 3]; // Initial guess, drawBackground will adjust
    }

    // Set difficulty-based scroll speed
    const scrollSpeeds = { easy: 3, medium: 5, hard: 7 };
    backgroundScrollSpeed = scrollSpeeds[difficulty];

    // Load smoke texture
    smokeImage = new Image();
    smokeImage.src = '/assets/Smoke Texture.png';
    smokeParticles = [];
    lastSmokeSpawnTime = 0;

    // Load enemy rocket images
    enemyRocketImage = new Image();
    enemyRocketImage.src = '/assets/roket_musuh.png';

    // Load 4 variants for Basic Enemy
    enemyBasicImages = [];
    const basicSources = [
        '/assets/var_enemy1.png',
        '/assets/var_enemy2.png',
        '/assets/var_enemy4.png',
        '/assets/var_enemy5.png'
    ];
    for (const src of basicSources) {
        const img = new Image();
        img.src = src;
        enemyBasicImages.push(img);
    }

    enemySniperImage = new Image();
    enemySniperImage.src = '/assets/sub_7_2.png'; // New Sniper Asset
    enemySpinnerImage = new Image();
    enemySpinnerImage.src = '/assets/enemy_small_w1_1.png'; // New Spinner (Squadron) Asset

    // Load explosion image
    explosionImage = new Image();
    explosionImage.src = '/assets/bullet_16.png';
    explosionParticles = [];

    // Load boss death visuals
    bossExplosionImage = new Image();
    bossExplosionImage.src = '/assets/explosion02.png';
    fireRingImage = new Image();
    fireRingImage.src = '/assets/fire_ring.png';
    bossDeathEffect = { active: false, startTime: 0, x: 0, y: 0 };

    // Load bullet images
    bulletSpreadImage = new Image();
    bulletSpreadImage.src = '/assets/bullet_25.png';
    bulletMagneticImage = new Image();
    bulletMagneticImage.src = '/assets/bullet_73_5.png';
    bulletLaserImage = new Image();
    bulletLaserImage.src = '/assets/bullet_68.png';

    // Load boss rocket image
    bossRocketImage = new Image();
    bossRocketImage.src = '/assets/bos.png';
    bossBulletImage = new Image();
    bossBulletImage.src = '/assets/bullet_4_2_0.png';
    laserBeamImage = new Image();
    laserBeamImage.src = '/assets/laser_6.png';
    weaponPowerUpImage = new Image();
    weaponPowerUpImage.src = '/assets/upweapnew.png';
    loveImage = new Image();
    loveImage.src = '/assets/love.png';
    // barHpImage removed - file doesn't exist and is not used in any drawImage call
    stationBulletImage = new Image();
    stationBulletImage.src = '/assets/bullet_1_1_4.png';
    enemySniperBulletImage = new Image();
    enemySniperBulletImage.src = '/assets/bullet_2_3_2.png';

    // musuh hiasan
    spaceStation1Image = new Image();
    spaceStation1Image.src = '/assets/spaceStation_8.1.png';
    spaceStation2Image = new Image();
    spaceStation2Image.src = '/assets/var_enemy3.png';
    rockImage = new Image();
    rockImage.src = '/assets/batu.png';
    initScrollingDecors(canvas);

    // Load spaceship image
    const spaceshipImg = new Image();
    spaceshipImg.src = spaceship.image;

    // Initialize player at bottom center (no HP with base weapon)
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 90,
        height: 90,
        speed: 10,
        image: spaceshipImg,
        dx: 0,
        dy: 0,
        hp: 0, // No HP with base weapon (invincible)
        maxHp: 0,
        tilt: 0
    };

    // Initialize crosshair and target
    crosshairX = canvas.width / 2;
    crosshairY = canvas.height / 2;
    targetX = player.x;
    targetY = player.y;
    lastPlayerX = player.x;
    player.tilt = 0;
    player.dx = 0;
    player.dy = 0;

    // Update UI
    updateUI();

    // Setup controls
    setupControls();

    // Setup resize handler
    resizeHandler = handleResize;
    window.addEventListener('resize', resizeHandler);

    // Load sounds and start BGM
    audioManager.loadSounds().then(() => {
        audioManager.startBGM(0.5); // BGM louder than effects
    });

    // Start game loop
    gameLoop = requestAnimationFrame(update);
}



function drawMuteButton(): void {
    if (!ctx || !canvas) return;

    const btnRadius = 22;
    const padding = 25;
    const btnX = canvas.width - btnRadius - padding;
    const btnY = canvas.height - btnRadius - padding;

    const isMuted = audioManager.getMuted();

    // Draw Button Background
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Speaker Icon
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = btnX;
    const cy = btnY;

    // Speaker Body
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx - 9, cy - 5);
    ctx.lineTo(cx - 9, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.lineTo(cx + 1, cy + 10);
    ctx.lineTo(cx + 1, cy - 10);
    ctx.closePath();
    ctx.fill();

    if (isMuted) {
        // X mark
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 3);
        ctx.lineTo(cx + 11, cy + 3);
        ctx.moveTo(cx + 11, cy - 3);
        ctx.lineTo(cx + 5, cy + 3);
        ctx.stroke();
    } else {
        // Sound Waves
        ctx.beginPath();
        ctx.arc(cx, cy, 6, -Math.PI / 5, Math.PI / 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 10, -Math.PI / 5, Math.PI / 5);
        ctx.stroke();
    }
}

function setupControls(): void {
    if (!canvas) return;

    const updateTargetPosition = (clientX: number, clientY: number): void => {
        if (!isGameRunning || !player || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        crosshairX = clientX - rect.left;
        crosshairY = clientY - rect.top;

        // Player can move freely to all corners of the canvas
        targetX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, crosshairX));
        targetY = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, crosshairY));
    };

    mouseMoveHandler = (e: MouseEvent): void => {
        updateTargetPosition(e.clientX, e.clientY);
    };
    document.addEventListener('mousemove', mouseMoveHandler);

    touchMoveHandler = (e: TouchEvent): void => {
        e.preventDefault();
        if (e.touches.length > 0) {
            updateTargetPosition(e.touches[0].clientX, e.touches[0].clientY);
        }
    };
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });

    keyDownHandler = (e: KeyboardEvent): void => {
        if (!isGameRunning || !player) return;
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.code === 'Space') isFiring = true;
    };
    keyUpHandler = (e: KeyboardEvent): void => {
        if (!player) return;
        keys[e.key.toLowerCase()] = false;
        if (e.key === ' ' || e.code === 'Space') isFiring = false;
    };
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    mouseDownHandler = (e: MouseEvent): void => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check Mute Button Click
        const btnRadius = 22;
        const padding = 25;
        const btnX = canvas.width - btnRadius - padding;
        const btnY = canvas.height - btnRadius - padding;

        if (Math.hypot(clickX - btnX, clickY - btnY) < btnRadius + 5) {
            audioManager.toggleMute();
            return;
        }

        isFiring = true;
    };
    mouseUpHandler = (): void => { isFiring = false; };
    document.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mouseup', mouseUpHandler);

    // Touch events for mobile firing
    const touchStartHandler = (e: TouchEvent): void => {
        if (!canvas) return;
        e.preventDefault();

        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.touches[0].clientX - rect.left;
            const clickY = e.touches[0].clientY - rect.top;

            // Check Mute Button Click
            const btnRadius = 22;
            const padding = 25;
            const btnX = canvas.width - btnRadius - padding;
            const btnY = canvas.height - btnRadius - padding;

            if (Math.hypot(clickX - btnX, clickY - btnY) < btnRadius + 10) { // +10 hit area
                audioManager.toggleMute();
                return;
            }
        }

        isFiring = true;
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            crosshairX = e.touches[0].clientX - rect.left;
            crosshairY = e.touches[0].clientY - rect.top;
            if (player && canvas) {
                targetX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, crosshairX));
                targetY = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, crosshairY));
            }
        }
    };
    const touchEndHandler = (): void => {
        // Keep firing on mobile (auto-fire)
    };
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    canvas.addEventListener('touchend', touchEndHandler, { passive: false });
}

// ============ GAME LOOP ============

function update(): void {
    if (!isGameRunning || !ctx || !canvas || !player || !difficultyConfig) {
        return;
    }

    // CRITICAL: Full Canvas Clear at the start of the frame.
    // We reset the transform to identity to ensure we clear the ENTIRE canvas area
    // regardless of any translations or rotations set in previous frames or during shake.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000'; // Base black fill
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const elapsed = now - gameStartTime;
    const isInDodgePhase = elapsed < DODGE_PHASE_DURATION;

    // Screen Shake Logic
    if (now < screenShakeUntil) {
        shakeX = (Math.random() - 0.5) * screenShakeIntensity;
        shakeY = (Math.random() - 0.5) * screenShakeIntensity;
    } else {
        shakeX = 0;
        shakeY = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Draw background
    drawBackground();

    // Handle keyboard movement
    if (keys['arrowleft'] || keys['a']) {
        targetX = Math.max(player.width / 2, targetX - player.speed);
    }
    if (keys['arrowright'] || keys['d']) {
        targetX = Math.min(canvas.width - player.width / 2, targetX + player.speed);
    }
    if (keys['arrowup'] || keys['w']) {
        targetY = Math.max(player.height / 2, targetY - player.speed);
    }
    if (keys['arrowdown'] || keys['s']) {
        targetY = Math.min(canvas.height - player.height / 2, targetY + player.speed);
    }

    // Smooth follow movement
    player.x += (targetX - player.x) * LERP_SPEED;
    player.y += (targetY - player.y) * LERP_SPEED;

    // Calculate swing/tilt animation
    const moveDirection = player.x - lastPlayerX;
    const targetTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, moveDirection * 3));
    player.tilt += (targetTilt - player.tilt) * 0.15;
    lastPlayerX = player.x;

    // Spawn power-ups after dodge phase (Periodic every 6 seconds)
    if (!isInDodgePhase) {
        if (now - lastPowerUpDropTime > 6000) {
            spawnWeaponUpgrade();
            lastPowerUpDropTime = now;
        }
    }
    updatePowerUps();

    // Firing - bullets go STRAIGHT UP
    // Can only fire if NOT immune
    if (hasWeapon && weaponConfig && isFiring && !isImmune && now - lastFireTime >= weaponConfig.fireRate) {
        fireBullets();
        lastFireTime = now;
    }

    // Spawn moving asteroids
    if (asteroidsSpawned < difficultyConfig.totalAsteroids &&
        now - lastSpawnTime >= difficultyConfig.asteroidSpawnRate) {
        spawnMovingAsteroid(false);
        lastSpawnTime = now;
    }

    // Spawn Enemy Wave
    if (enemySpawnQueue.length > 0 && now - lastEnemySpawnTime >= 2000) { // 2s delay between spawns
        spawnEnemyRocket();
        lastEnemySpawnTime = now;
    }

    // Spawn Boss when Wave is Cleared
    if (enemySpawnQueue.length === 0 && enemyRockets.length === 0 && !bossSpawned && !bossRocket) {
        if (!showBossWarning) {
            showBossWarning = true;
            bossWarningStartTime = now;
        } else if (now - bossWarningStartTime > 3000) {
            spawnBossRocket();
            bossSpawned = true;
            showBossWarning = false;
        }
    }

    // Update boss rocket if present
    if (bossRocket) {
        updateBossRocket(now);
    }

    // Update game objects (sorted by y for depth)
    movingAsteroids.sort((a, b) => a.y - b.y);

    updateMovingAsteroids();
    updateEnemyRockets(now);
    updateEnemyBullets();

    // Update spatial grid for optimized collision detection
    updateSpatialGrid();
    updateBullets();

    // Update and draw smoke particles
    updateSmokeParticles();

    // Update and draw explosion particles
    updateExplosionParticles();

    // Draw player
    drawPlayer();

    // Draw Boss Death Effect (On top of player but below UI)
    drawBossDeathEffect();

    // Draw crosshair
    drawCrosshair();

    // Draw UI overlay
    ctx.restore(); // Restore context (stop shaking for UI)
    drawUI(isInDodgePhase, elapsed);
    drawMuteButton();

    // Check conditions
    if (checkWinCondition()) {
        gameStats.success = true;
        endGame();
        return;
    }

    // Check if player is out of lives
    if (playerLives <= 0) {
        gameStats.success = false;
        gameStats.isEliminated = true;
        endGame();
        return;
    }

    // Check immunity expiry
    if (isImmune && Date.now() > immuneEndTime) {
        isImmune = false;
    }

    // Weapon timer removal (secondary weapon now permanent until hit)

    // Collision damage checks (only if not immune)
    if (!isImmune) {
        // Check collision with moving asteroids (3 HP damage)
        if (checkMovingAsteroidCollision()) {
            applyDamage(3);
        }

        // Check collision with enemy rockets (2 HP damage)
        if (checkEnemyRocketCollision()) {
            applyDamage(2);
        }
    }

    gameLoop = requestAnimationFrame(update);
}

// ============ DAMAGE SYSTEM ============

function applyDamage(amount: number): void {
    // Skip if immune
    if (isImmune) return;

    // Reduce HP
    playerLifeHP -= amount;
    audioManager.playSoundEffect('hit');

    // Weapon levels no longer decrement on regular hits

    // Check if life is lost
    if (playerLifeHP <= 0) {
        playerLives--;

        if (playerLives > 0) {
            // Respawn with full HP and immunity
            playerLifeHP = LIFE_MAX_HP;
            isImmune = true;
            immuneEndTime = Date.now() + IMMUNITY_DURATION;

            // Upgrade weapon rule: reset level to 1 ONLY on life loss
            playerWeaponLevel = 1;
            activeUpgradeWeapons = [];
            secondaryWeapon = null;
            secondaryWeaponConfig = null;
        } else {
            // No lives left - game over handled in update loop
            playerLifeHP = 0;
        }
    }

    // Trigger state change callback
    if (handleStateChange) {
        handleStateChange(playerLives, playerLifeHP);
    }
}

// ============ BACKGROUND ============

function initBoosterDecors(canvasRef: HTMLCanvasElement): void {
    boosterDecors = [];
    const count = 8 + Math.floor(Math.random() * 5); // 8-12 boosters
    for (let i = 0; i < count; i++) {
        boosterDecors.push({
            x: Math.random() * canvasRef.width,
            y: Math.random() * canvasRef.height * 2 - canvasRef.height, // Spread across 2x height
            scale: 0.4 + Math.random() * 0.6,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02
        });
    }
}

function updateBoosterDecors(): void {
    if (!canvas) return;

    for (const booster of boosterDecors) {
        booster.y += backgroundScrollSpeed * 0.8;
        booster.rotation += booster.rotationSpeed;

        // Reset to top when scrolled past bottom
        if (booster.y > canvas.height + 50) {
            booster.y = -100 - Math.random() * 200;
            booster.x = Math.random() * canvas.width;
            booster.scale = 0.4 + Math.random() * 0.6;
        }
    }
}

function drawBoosterDecors(): void {
    if (!ctx || !canvas || !boosterImage || !boosterImage.complete) return;

    ctx.save();
    for (const booster of boosterDecors) {
        const size = 60 * booster.scale;
        ctx.save();
        ctx.translate(booster.x, booster.y);
        ctx.rotate(booster.rotation);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(boosterImage, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
    ctx.restore();
}

function initScrollingDecors(canvasRef: HTMLCanvasElement): void {
    scrollingDecors = [];
    const counts = { easy: 7, medium: 9, hard: 11 };
    const baseCount = counts[currentDifficulty || 'easy'];
    const count = baseCount + Math.floor(Math.random() * 2);
    const types: ('station1' | 'station2' | 'rock')[] = ['station1', 'station2', 'rock'];

    // Difficulty based fire rates for station1 (shooter)
    const fireRates = { easy: 5000, medium: 4000, hard: 3000 };
    const baseFireRate = fireRates[currentDifficulty || 'easy'];

    // Difficulty based HP for stations
    const stationHP = {
        easy: { station1: 100, station2: 80 },
        medium: { station1: 200, station2: 150 },
        hard: { station1: 350, station2: 250 }
    };
    const currentHP = stationHP[currentDifficulty || 'easy'];

    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const hp = type === 'station1' ? currentHP.station1 : (type === 'station2' ? currentHP.station2 : undefined);
        scrollingDecors.push({
            x: Math.random() * canvasRef.width,
            y: Math.random() * canvasRef.height * 2 - canvasRef.height,
            scale: 0.3 + Math.random() * 0.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            type: type,
            // Only station1 shoots
            fireRate: type === 'station1' ? baseFireRate + Math.random() * 2000 : undefined,
            lastFireTime: type === 'station1' ? Date.now() + Math.random() * 5000 : undefined,
            hp: hp,
            maxHp: hp,
            hitFlash: 0
        });
    }
}

function spawnStationBullet(decor: ScrollingDecor): void {
    if (!player || !canvas) return;

    const dx = player.x - decor.x;
    const dy = player.y - decor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        enemyBullets.push({
            id: bulletIdCounter++,
            x: decor.x,
            y: decor.y,
            z: 0.8, // Match approximate depth
            width: 30, // Increased size
            height: 60, // Increased size
            speed: 6,
            damage: 1,
            color: '#ffffff',
            type: 'spread',
            isEnemy: true,
            // @ts-ignore
            dirX: dx / dist,
            dirY: dy / dist,
            isStationBullet: true // Custom flag for rendering
        } as any);
    }
}

function updateScrollingDecors(): void {
    if (!canvas || !player) return;

    const now = Date.now();
    const kamikazeSpeeds = { easy: 0.5, medium: 1.2, hard: 2.2 };
    const chaseSpeed = kamikazeSpeeds[currentDifficulty || 'easy'];

    for (let i = scrollingDecors.length - 1; i >= 0; i--) {
        const decor = scrollingDecors[i];

        // Decrement hit flash
        if (decor.hitFlash && decor.hitFlash > 0) decor.hitFlash -= 0.1;

        // Base scrolling
        decor.y += backgroundScrollSpeed * 0.6;
        decor.rotation += decor.rotationSpeed;

        // Death Logic
        if ((decor.type === 'station1' || decor.type === 'station2') && (decor.hp !== undefined && decor.hp <= 0)) {
            spawnExplosion(decor.x, decor.y, 1.5);
            // playSound('explosion'); // Assuming playSound exists or just use visual

            // Reset decor
            decor.y = -200 - Math.random() * 500;
            decor.x = Math.random() * canvas.width;
            decor.hp = decor.maxHp;
            decor.hitFlash = 0;
            continue;
        }

        // KAMIKAZE (Station 2)
        if (decor.type === 'station2' && decor.y > 0 && decor.y < canvas.height) {
            const dx = player.x - decor.x;
            const dy = player.y - decor.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                decor.x += (dx / dist) * chaseSpeed;
                decor.y += (dy / dist) * chaseSpeed;
            }

            // Check Collision
            const collDist = Math.sqrt(Math.pow(player.x - decor.x, 2) + Math.pow(player.y - decor.y, 2));
            if (collDist < (player.width / 2 + 35) * 0.7) {
                applyDamage(2);
                spawnExplosion(decor.x, decor.y, 1.2);
                // Reset decor instead of splicing to preserve count
                decor.y = -150 - Math.random() * 300;
                decor.x = Math.random() * canvas.width;
                continue;
            }
        }

        // SHOOTING (Station 1)
        if (decor.type === 'station1' && decor.y > 0 && decor.y < canvas.height * 0.8) {
            if (decor.fireRate && now - (decor.lastFireTime || 0) > decor.fireRate) {
                spawnStationBullet(decor);
                decor.lastFireTime = now;
            }
        }

        // Reset to top when scrolled past bottom
        if (decor.y > canvas.height + 150) {
            decor.y = -150 - Math.random() * 300;
            decor.x = Math.random() * canvas.width;
            decor.scale = 0.3 + Math.random() * 0.5;
            if (decor.type === 'station1') {
                decor.lastFireTime = now + Math.random() * 2000;
            }
        }
    }
}

function drawScrollingDecors(): void {
    if (!ctx || !canvas) return;

    ctx.save();
    for (const decor of scrollingDecors) {
        let img: HTMLImageElement | null = null;
        let baseSize = 80;

        if (decor.type === 'station1' && spaceStation1Image?.complete) {
            img = spaceStation1Image;
            baseSize = 100;
        } else if (decor.type === 'station2' && spaceStation2Image?.complete) {
            img = spaceStation2Image;
            baseSize = 70;
        } else if (decor.type === 'rock' && rockImage?.complete) {
            img = rockImage;
            baseSize = 50;
        }

        if (img) {
            const size = baseSize * decor.scale;
            ctx.save();
            ctx.translate(decor.x, decor.y);
            ctx.rotate(decor.rotation);
            ctx.globalAlpha = 1;

            // Apply hit flash effect for stations
            if (decor.hitFlash && decor.hitFlash > 0) {
                ctx.filter = `brightness(${1 + decor.hitFlash * 2})`;
            }

            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
        }
    }
    ctx.restore();
}

function spawnSmokeParticle(): void {
    if (!player) return;

    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = player.height / 2 + 10;

    // Use object pool instead of creating new object
    const particle = getSmokeFromPool();
    particle.x = player.x + offsetX;
    particle.y = player.y + offsetY;
    particle.alpha = 0.6 + Math.random() * 0.3;
    particle.scale = 0.3 + Math.random() * 0.3;
    particle.age = 0;
    particle.vx = (Math.random() - 0.5) * 0.8;
    particle.vy = 1.5 + Math.random() * 1;
    smokeParticles.push(particle);
}

function updateSmokeParticles(): void {
    if (!ctx || !canvas || !smokeImage || !smokeImage.complete) return;

    const now = Date.now();

    // Spawn new particles (reduced rate for performance, even more on mobile)
    const smokeSpawnInterval = isMobile ? 200 : 100; // 2x slower on mobile
    if (player && now - lastSmokeSpawnTime > smokeSpawnInterval) {
        spawnSmokeParticle();
        lastSmokeSpawnTime = now;
    }

    // Update and draw particles
    ctx.save();
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const particle = smokeParticles[i];

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.age++;
        particle.alpha -= 0.015;
        particle.scale += 0.008;

        if (particle.alpha <= 0) {
            // Return particle to pool for reuse
            returnSmokeToPool(smokeParticles.splice(i, 1)[0]);
            continue;
        }

        const size = 50 * particle.scale;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.globalAlpha = particle.alpha;
        ctx.drawImage(smokeImage, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
    ctx.restore();

    // Limit particle count
    if (smokeParticles.length > 100) {
        smokeParticles.splice(0, smokeParticles.length - 100);
    }
}

function drawBackground(): void {
    if (!ctx || !canvas) return;

    // Scroll and Reset Panels
    for (let i = 0; i < bgPanelY.length; i++) {
        bgPanelY[i] += backgroundScrollSpeed;

        // Reset panel based on its actual render height (to avoid gaps for tall assets)
        const img = backgroundImages[i];
        const isPortrait = img && img.complete && img.height > img.width;
        const scale = isPortrait ? canvas.width / img.width : 1;
        const panelHeight = isPortrait ? (img.height * scale) : canvas.height;

        if (bgPanelY[i] >= canvas.height) {
            const minY = Math.min(...bgPanelY);
            // Place it exactly above the topmost panel, matching its full height
            bgPanelY[i] = minY - (panelHeight - 4); // -4 for overlap
        }
    }

    // Draw all panels
    for (let i = 0; i < backgroundImages.length; i++) {
        const img = backgroundImages[i];
        if (img && img.complete) {
            // Render Strategy: Dynamic Scaling based on Aspect Ratio and Mode
            const isPortrait = currentBgMode === 'portrait_scene' || (img.height > img.width);

            // 1. Calculate the 'cover' dimensions
            // If portrait scene, scale to fill width. Otherwise, fill both (cover).
            const scale = isPortrait
                ? canvas.width / img.width
                : Math.max(canvas.width / img.width, canvas.height / img.height);

            // 2. Calculate source dimensions
            // For portrait "level" backgrounds, we want the FULL source height
            const sW = img.width - 2;
            const sH = isPortrait ? img.height - 2 : (canvas.height / scale) - 2;
            const sX = 1;
            const sY = isPortrait ? 1 : ((img.height - (canvas.height / scale)) / 2) + 1;

            // Calculate destination dimensions
            const dW = canvas.width;
            const dH = isPortrait ? (img.height * scale) : canvas.height;

            ctx.save();

            // 3. Mirror Tiling: Only for starfield mode
            const useMirror = currentBgMode === 'starfield';

            const isFlipped = useMirror && (i % 2 === 1);
            if (isFlipped) {
                // When flipped, translate to the bottom of the drawn area and scale -1
                ctx.translate(0, Math.floor(bgPanelY[i]) + dH);
                ctx.scale(1, -1);
                ctx.drawImage(img,
                    sX, sY, sW, sH,
                    0, 0, dW, dH + 4
                );
            } else {
                ctx.drawImage(img,
                    sX, sY, sW, sH,
                    0, Math.floor(bgPanelY[i]), dW, dH + 4
                );
            }
            ctx.restore();
        }
    }

    // Fallback if images not loaded
    if (!backgroundImages[0]?.complete) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0015');
        gradient.addColorStop(0.3, '#1a0030');
        gradient.addColorStop(0.7, '#2d0050');
        gradient.addColorStop(1, '#150025');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update and draw booster decorations
    updateBoosterDecors();
    drawBoosterDecors();

    // Update and draw additional scrolling decorations
    updateScrollingDecors();
    drawScrollingDecors();
}

// ============ EXPLOSION PARTICLES ============

function triggerScreenShake(intensity: number, duration: number): void {
    screenShakeIntensity = intensity;
    screenShakeUntil = Date.now() + duration;
}

function spawnExplosion(x: number, y: number, size: number = 1): void {
    // Trigger shake based on explosion size
    if (size >= 2) {
        triggerScreenShake(10, 300); // Big shake for boss
    } else if (size >= 1.2) {
        triggerScreenShake(5, 150); // Medium shake
    }

    // Spawn multiple explosion particles for a more dramatic effect
    // Reduce particle count on mobile using particleMultiplier
    const baseParticleCount = 3 + Math.floor(Math.random() * 3);
    const particleCount = Math.max(1, Math.floor(baseParticleCount * particleMultiplier));
    for (let i = 0; i < particleCount; i++) {
        // Use object pool instead of creating new object
        const particle = getExplosionFromPool();
        particle.x = x + (Math.random() - 0.5) * 30 * size;
        particle.y = y + (Math.random() - 0.5) * 30 * size;
        particle.scale = (0.5 + Math.random() * 0.8) * size;
        particle.alpha = 1;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.age = 0;
        explosionParticles.push(particle);
    }
}

function updateExplosionParticles(): void {
    if (!ctx || !explosionImage || !explosionImage.complete) return;

    ctx.save();
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];

        particle.age++;
        particle.alpha -= 0.03;
        particle.scale += 0.02;
        particle.rotation += 0.05;

        if (particle.alpha <= 0) {
            // Return particle to pool for reuse
            returnExplosionToPool(explosionParticles.splice(i, 1)[0]);
            continue;
        }

        const drawSize = 80 * particle.scale;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.alpha;
        ctx.drawImage(explosionImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
    }
    ctx.restore();

    // Limit particle count
    if (explosionParticles.length > 50) {
        explosionParticles.splice(0, explosionParticles.length - 50);
    }
}

// ============ CROSSHAIR ============

function drawCrosshair(): void {
    if (!ctx || !canvas) return;

    const x = crosshairX;
    const y = crosshairY;

    // Outer circle
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#00ffc8';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cross lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x - 28, y);
    ctx.lineTo(x - 10, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 28, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x, y - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, y + 28);
    ctx.stroke();
}

// ============ UI OVERLAY ============

function drawUI(isInDodgePhase: boolean, elapsed: number): void {
    if (!ctx || !canvas || !player) return;

    // Mobile-responsive scaling
    const isMobile = canvas.width < 768;
    const scale = isMobile ? 1.0 : 1; // Increased for mobile from 0.7 for better readability

    // ===== TOP LEFT: SIMPLE HP BAR (Reference Design) =====
    const barX = 15 * scale;
    const barY = 15 * scale;
    const barWidth = 180 * scale;
    const barHeight = 22 * scale;
    const borderRadius = 4 * scale;

    // Draw bar background (dark with border)
    ctx.fillStyle = 'rgba(0, 30, 50, 0.9)';
    ctx.strokeStyle = '#4ab8c7';
    ctx.lineWidth = 2 * scale;

    // Rounded rectangle for background
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, borderRadius);
    ctx.fill();
    ctx.stroke();

    // Draw HP fill (solid cyan gradient)
    const hpPercent = playerLifeHP / LIFE_MAX_HP;
    const fillWidth = (barWidth - 4 * scale) * hpPercent;

    if (fillWidth > 0) {
        const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        gradient.addColorStop(0, '#5ed4e6');
        gradient.addColorStop(0.5, '#46a7bb');
        gradient.addColorStop(1, '#2d7a8c');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.roundRect(barX + 2 * scale, barY + 2 * scale, fillWidth, barHeight - 4 * scale, borderRadius - 1);
        ctx.fill();
    }

    // ===== LIVES COUNTER: ❤️ x 3 =====
    const livesY = barY + barHeight + 8 * scale;
    const heartSize = 22 * scale;

    // Draw heart icon
    if (loveImage && loveImage.complete) {
        ctx.drawImage(loveImage, barX, livesY, heartSize, heartSize);
    } else {
        ctx.font = `${Math.floor(18 * scale)}px Arial`;
        ctx.fillStyle = '#ff4466';
        ctx.textAlign = 'left';
        ctx.fillText('❤️', barX, livesY + 16 * scale);
    }

    // Draw "x N" text
    ctx.font = `bold ${Math.floor(16 * scale)}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`x ${playerLives}`, barX + heartSize + 5 * scale, livesY + 17 * scale);

    // Immunity indicator (next to lives)
    if (isImmune) {
        const immuneTimeLeft = Math.max(0, (immuneEndTime - Date.now()) / 1000);
        ctx.font = `bold ${Math.floor(12 * scale)}px Orbitron, sans-serif`;
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`🛡️ ${immuneTimeLeft.toFixed(1)}s`, barX + heartSize + 55 * scale, livesY + 17 * scale);
    }

    /* // HIDE TOP RIGHT HUD PER REQUEST
    // ===== TOP RIGHT: STATS =====
    const statsX = canvas.width - 15 * scale;
    ctx.textAlign = 'right';
    ctx.font = `${Math.floor(13 * scale)}px Orbitron, sans-serif`;

    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`🏆 ${gameStats.score}`, statsX, 32 * scale);

    // Boss status indicator
    // Boss status indicator
    if (bossRocket) {
        ctx.fillStyle = '#ff4444';
        const bossHpPercent = Math.round((bossRocket.hp / bossRocket.maxHp) * 100);
        ctx.fillText(`👹 ${bossHpPercent}%`, statsX, 50 * scale);
    } else if (enemySpawnQueue.length > 0 || enemyRockets.length > 0) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillText(`👹 WAVE`, statsX, 50 * scale);
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.fillText(`👹 !!!`, statsX, 50 * scale);
    }

    ctx.fillStyle = '#ff6666';
    ctx.fillText(`🚀 ${enemyRockets.length}`, statsX, 68 * scale);
    */

    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(11 * scale)}px Space Mono, monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const desktopControls = gameTranslations?.desktopControls || 'MOVE: Mouse/WASD  |  ATTACK: Auto-fire';
    const mobileControls = gameTranslations?.mobileControls || '👆 TAP & DRAG TO MOVE';
    const controlsText = isMobile ? mobileControls : desktopControls;
    ctx.fillText(controlsText, canvas.width / 2, canvas.height - 12 * scale);

    // ===== BOSS WARNING OVERLAY =====
    if (showBossWarning) {
        ctx.save();

        // Full-screen red flash for menacing atmosphere (pulsing)
        // This covers the entire screen as requested ("satu layar")
        const flashAlpha = 0.15 + Math.sin(Date.now() / 150) * 0.1;
        ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Warning Text (with pulse)
        ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(Date.now() / 100) * 0.3})`;
        ctx.font = `bold ${Math.floor(48 * scale)}px "Orbitron", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(gameTranslations?.bossWarning || '⚠ WARNING ⚠', canvas.width / 2, canvas.height / 2 - 20 * scale);
        ctx.font = `bold ${Math.floor(24 * scale)}px "Orbitron", sans-serif`;
        ctx.fillText(gameTranslations?.bossApproaching || 'BOSS APPROACHING', canvas.width / 2, canvas.height / 2 + 30 * scale);

        ctx.restore();
    }

    // ===== BOSS PHASE 3 RAGE OVERLAY =====
    if (bossRocket && bossRocket.phase === 3) {
        ctx.save();

        // Pulsing red rage overlay (faster pulse)
        const rageAlpha = 0.08 + Math.sin(Date.now() / 150) * 0.06;
        ctx.fillStyle = `rgba(200, 0, 0, ${rageAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
    }
}





// ============ BOSS ROCKET (HARD DIFFICULTY) ============

function spawnBossRocket(): void {
    if (!canvas) return;

    // Mobile sizing adjustments
    const isMobile = canvas.width < 768;

    bossRocket = {
        x: canvas.width / 2,
        y: -200, // Start above screen
        width: isMobile ? 180 : 250,  // Smaller on mobile
        height: isMobile ? 130 : 180,
        speed: 1,    // Very slow movement
        hp: 5000,
        maxHp: 5000,
        lastFireTime: 0,
        // 4 turret positions (2 left, 2 right) - adjusted for mobile width if needed, but relative offsets scale with resizing usually? 
        // actually offsets are absolute pixels. We should adjust them too.
        turrets: isMobile ? [
            { offsetX: -70, offsetY: 35 },  // Scaled down roughly 0.7
            { offsetX: -40, offsetY: 50 },
            { offsetX: 40, offsetY: 50 },
            { offsetX: 70, offsetY: 35 }
        ] : [
            { offsetX: -100, offsetY: 50 },  // Far left
            { offsetX: -60, offsetY: 70 },   // Near left
            { offsetX: 60, offsetY: 70 },    // Near right
            { offsetX: 100, offsetY: 50 }    // Far right
        ],
        phase: 1,
        minions: [],
        laserTimer: 0,
        isLaserFiring: false,
        laserWarning: false,
        invulnerable: false,
        laserDamageTick: 0
    };
}

function updateBossRocket(now: number): void {
    if (!bossRocket || !ctx || !canvas || !player) return;

    // --- DEATH SEQUENCE ---
    if (bossRocket.isDying) {
        if (!bossRocket.dyeStartTime) bossRocket.dyeStartTime = now;

        // Timer
        const elapsed = now - bossRocket.dyeStartTime;

        // Shake screen continuously
        triggerScreenShake(5, 100);

        // Finish after 3 seconds
        if (elapsed > 3000) {
            // Final destruction (Visual Only first)
            if (!bossDeathEffect.active) {
                bossDeathEffect.active = true;
                bossDeathEffect.startTime = now;
                bossDeathEffect.x = bossRocket.x;
                bossDeathEffect.y = bossRocket.y;
                audioManager.playSound('destroy'); // Final boom
            }

            // Wait duration of effect (approx 1s) before actually ending game
            if (elapsed > 4000) {
                gameStats.bossDestroyed = true;
                gameStats.score += 5000;
                bossRocket = null;
            }
        }

        // Draw boss ONLY during the shaking phase (Before explosion starts)
        // Once explosion starts (3s), boss sprite should disappear
        if (elapsed <= 3000) {
            drawBossRocket();
        }
        return; // Skip normal update
    }

    // Move boss slowly down, stop at 1/3 from top
    const targetY = canvas.height * 0.25;
    const bossInPosition = bossRocket.y >= targetY;

    // Phase 3: Bobbing + Faster Side Movement
    const bobAmount = bossRocket.phase === 3 ? Math.sin(now / 300) * 5 : 0;

    if (bossRocket.y < targetY) {
        bossRocket.y += bossRocket.speed;
    } else {
        bossRocket.y = targetY + bobAmount;

        // After stopping, follow player's horizontal position
        const playerCenterX = player.x + player.width / 2;
        // Phase 2: Slower movement (tanky), Phase 3: 2X SPEED + CRAZY ERRATIC
        const isHard = currentDifficulty === 'hard';
        const bossFollowSpeed = bossRocket.phase === 3 ? (isHard ? 10 : 16) : (bossRocket.phase === 2 ? 1 : 3);

        // Phase 3: INTENSE erratic jitter movement (very hard to hit!)
        if (bossRocket.phase === 3) {
            const isHard = currentDifficulty === 'hard';
            const jitterX = (Math.random() - 0.5) * (isHard ? 15 : 30); // 2x wider jitter
            const jitterY = (Math.random() - 0.5) * (isHard ? 8 : 15); // 2x vertical jitter
            bossRocket.x += jitterX;
            bossRocket.y += jitterY;
            bossRocket.y = Math.max(targetY - 50, Math.min(targetY + 50, bossRocket.y));
        }

        if (Math.abs(bossRocket.x - playerCenterX) > 5) {
            if (bossRocket.x < playerCenterX) {
                bossRocket.x += bossFollowSpeed;
            } else {
                bossRocket.x -= bossFollowSpeed;
            }
        }

        // Keep boss in bounds (Safe margins to keep minions on screen)
        // Applies to Phase 2 (for minions) and Phase 3 (jitter/follow)
        if (bossRocket.phase === 2 || bossRocket.phase === 3) {
            const isMobile = canvas.width < 768;
            let safeBound = isMobile ? 140 : 210; // Phase 2 default (wide for minions)

            if (bossRocket.phase === 3) {
                // In Phase 3, minions are gone, so let boss reach edges
                safeBound = bossRocket.width / 2;
            }

            bossRocket.x = Math.max(safeBound, Math.min(canvas.width - safeBound, bossRocket.x));
        }
    }

    // PHASE TRANSITIONS
    const hpPercent = bossRocket.hp / bossRocket.maxHp;

    // Enter Phase 2 (Minions) at 75% HP
    if (bossRocket.phase === 1 && hpPercent < 0.75) {
        bossRocket.phase = 2;
        bossRocket.invulnerable = true;
        // Spawn 2 Minions
        bossRocket.phase = 2;
        bossRocket.invulnerable = true;

        // Minion sizing for mobile
        const isMobile = canvas.width < 768;
        const mSize = isMobile ? 40 : 60;
        const mOffset = isMobile ? 120 : 180;

        // Spawn 2 Minions - START ABOVE SCREEN
        bossRocket.minions = [
            {
                x: bossRocket.x - mOffset, // Target X (Further out)
                y: -100, // Start High
                width: mSize, height: mSize,
                hp: 400, maxHp: 400,
                offsetX: -mOffset, offsetY: 80, // Position: Outside Shield
                lastFireTime: 0,
                state: 'entering'
            },
            {
                x: bossRocket.x + mOffset,
                y: -100,
                width: mSize, height: mSize,
                hp: 400, maxHp: 400,
                offsetX: mOffset, offsetY: 80, // Position: Outside Shield
                lastFireTime: 0,
                state: 'entering'
            }
        ];
        audioManager.playSoundEffect('powerup');
        triggerScreenShake(5, 500);
    }
    // Enter Phase 3 (Rage/Laser) immediately after minions are killed
    else if (bossRocket.phase === 2 && bossRocket.minions.length === 0) {
        bossRocket.phase = 3;
        bossRocket.laserTimer = 0;
        audioManager.playSoundEffect('explosion'); // Rage sound
        triggerScreenShake(10, 1000); // Big shake transition
    }

    // UPDATE MINIONS (Phase 2)
    if (bossRocket.phase === 2 && bossRocket.minions.length > 0) {
        bossRocket.invulnerable = true;
        for (const minion of bossRocket.minions) {

            const targetX = bossRocket.x + minion.offsetX;
            const targetY = bossRocket.y + minion.offsetY;

            if (minion.state === 'entering') {
                // Fly in from top
                minion.x += (targetX - minion.x) * 0.1;
                minion.y += (targetY - minion.y) * 0.1;

                // Switch to locked if close
                if (Math.abs(minion.y - targetY) < 5) {
                    minion.state = 'locked';
                }
            } else {
                // Locked to boss position
                minion.x = targetX;
                minion.y = targetY;
            }

            // Minion shoots every 2s
            if (now - minion.lastFireTime > 2000) {
                const dx = player.x - minion.x;
                const dy = player.y - minion.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    enemyBullets.push({
                        id: bulletIdCounter++,
                        x: minion.x,
                        y: minion.y,
                        z: 1,
                        width: 10,
                        height: 20,
                        speed: 6,
                        damage: 1,
                        color: '#ff4444',
                        type: 'spread',
                        isEnemy: true,
                        dirX: dx / dist,
                        dirY: dy / dist
                    } as any);
                }
                minion.lastFireTime = now;
            }
        }
    }

    // PHASE 3 ATTACKS (Laser)
    if (bossRocket.phase === 3) {
        bossRocket.laserTimer += 16; // Approx delta time

        // Fast Laser Cycle (Exactly 2s): 0-0.5s Idle -> 0.5s-1s Warning -> 1s-2s Fire -> Reset
        if (bossRocket.laserTimer > 500 && bossRocket.laserTimer < 1000) {
            bossRocket.laserWarning = true;
        } else {
            bossRocket.laserWarning = false;
        }

        if (bossRocket.laserTimer > 1000) {
            bossRocket.isLaserFiring = true;
            // Laser Damage (Interval Based)
            const damageInterval = currentDifficulty === 'hard' ? 150 : (currentDifficulty === 'medium' ? 300 : 500);

            if (now - (bossRocket.laserDamageTick || 0) > damageInterval) {
                // Laser Hitbox Width based on Difficulty
                let laserWidth = 200; // Hard (Default)
                if (currentDifficulty === 'medium') laserWidth = 150;
                else if (currentDifficulty === 'easy') laserWidth = 150;

                if (Math.abs(player.x - bossRocket.x) < laserWidth / 2 + player.width / 2) {
                    // Damage based on difficulty
                    const damage = currentDifficulty === 'hard' ? 3 : (currentDifficulty === 'medium' ? 2 : 1);
                    applyDamage(damage);
                    triggerScreenShake(3, 100);
                }
                bossRocket.laserDamageTick = now;
            }
        } else {
            bossRocket.isLaserFiring = false;
        }

        if (bossRocket.laserTimer > 2000) {
            bossRocket.laserTimer = 0; // Loop (2s cycle)
        }
    }

    // BOSS BARRIER logic (existing)
    if (bossInPosition) {
        // Define barrier zone - player cannot go above this line
        const barrierY = bossRocket.y + bossRocket.height / 2 + 80;
        if (player.y < barrierY) {
            player.y = barrierY;
        }
        drawBossBarrier(barrierY);
    }

    // STANDARD FIRE (Disabled while laser firing)
    if (!bossRocket.isLaserFiring) {
        // Fire rapidly from turrets
        // Phase 1: 200ms, Phase 2: 150ms, Phase 3: 100ms
        const fireRate = bossRocket.phase === 3 ? 100 : (bossRocket.phase === 2 ? 150 : 200);

        if (now - bossRocket.lastFireTime >= fireRate) {
            // In Phase 2, shoot fewer bullets from main body UNLESS minions are dead
            // In Phase 3, standard fire is DISABLED (only laser)
            if (bossRocket.phase !== 3 && (bossRocket.phase !== 2 || bossRocket.minions.length === 0)) {
                for (const turret of bossRocket.turrets) {
                    spawnBossBullet(
                        bossRocket.x + turret.offsetX,
                        bossRocket.y + turret.offsetY
                    );
                }
            }
            bossRocket.lastFireTime = now;
        }
    }

    drawBossRocket();
}

// Invisible barrier when boss is in position (no visual, collision only)
function drawBossBarrier(barrierY: number): void {
    // Barrier is completely transparent - no visual display
}

function spawnBossBullet(x: number, y: number): void {
    if (!player) return;

    // Shoot STRAIGHT DOWN (fast and rapid)
    enemyBullets.push({
        id: bulletIdCounter++,
        x,
        y,
        z: 1,
        width: 20,
        height: 40,
        speed: 12, // Fast bullet speed
        damage: 25,
        color: '#ffcc00', // Yellow for boss bullets
        type: 'laser',
        isEnemy: true,
        angle: Math.PI / 2, // Straight down
        dirX: 0,  // No horizontal movement
        dirY: 1   // Straight down
    } as any);
}

function drawBossRocket(): void {
    if (!bossRocket || !ctx || !canvas) return;

    ctx.save();

    // Red glow for boss
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff0044';

    // DRAW LASER (BEHIND BOSS) - Visual Layer 1
    if (bossRocket.phase === 3 && bossRocket.isLaserFiring) {
        // Visual Width based on Difficulty
        let laserWidth = 500; // Hard (Default)
        if (currentDifficulty === 'medium') laserWidth = 350;
        else if (currentDifficulty === 'easy') laserWidth = 100;

        if (laserBeamImage && laserBeamImage.complete) {
            // Rotate 90 degrees clockwise so the laser points straight down
            ctx.save();
            // Start laser from CENTER of boss (y) to hide the top edge behind the body
            ctx.translate(bossRocket.x, bossRocket.y);
            ctx.rotate(Math.PI / 2); // Rotate 90 degrees clockwise

            const laserLength = canvas.height - bossRocket.y;
            ctx.drawImage(laserBeamImage, 0, -laserWidth / 2, laserLength, laserWidth);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = '#ff0044';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#ff0000';
            // Use calculating width for fallback too
            ctx.fillRect(bossRocket.x - laserWidth / 2 * 0.2, bossRocket.y + 50, laserWidth * 0.2, canvas.height);
        }
    }

    if (bossRocketImage && bossRocketImage.complete) {
        ctx.drawImage(
            bossRocketImage,
            bossRocket.x - bossRocket.width / 2,
            bossRocket.y - bossRocket.height / 2,
            bossRocket.width,
            bossRocket.height
        );
    } else {
        // Fallback shape
        ctx.fillStyle = '#663399';
        ctx.fillRect(
            bossRocket.x - bossRocket.width / 2,
            bossRocket.y - bossRocket.height / 2,
            bossRocket.width,
            bossRocket.height
        );
    }

    // Draw Minions (Phase 2)
    if (bossRocket.phase === 2) {
        for (const minion of bossRocket.minions) {
            // Draw minion (No connection line)

            if (enemyRocketImage && enemyRocketImage.complete) {
                ctx.drawImage(enemyRocketImage, minion.x - minion.width / 2, minion.y - minion.height / 2, minion.width, minion.height);
            } else {
                ctx.fillStyle = '#aa3333';
                ctx.fillRect(minion.x - minion.width / 2, minion.y - minion.height / 2, minion.width, minion.height);
            }

            // Minion HP
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(minion.x - 20, minion.y - 40, 40 * (minion.hp / minion.maxHp), 5);
        }
    }

    // Draw Laser Effects (ON TOP OF BOSS) - Visual Layer 3
    if (bossRocket.phase === 3) {
        if (bossRocket.laserWarning) {
            // Warning Line
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bossRocket.x, bossRocket.y + 50);
            ctx.lineTo(bossRocket.x, canvas.height);
            ctx.stroke();
        }

        if (bossRocket.isLaserFiring) {
            // EMITTER GLOW (Energy Source)
            // Draws a bright ball of energy at the firing point to blend the laser with the ship
            const gradient = ctx.createRadialGradient(bossRocket.x, bossRocket.y + 20, 10, bossRocket.x, bossRocket.y + 20, 80);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Core white
            gradient.addColorStop(0.4, 'rgba(255, 50, 50, 0.9)'); // Inner red
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Fade out

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
            ctx.beginPath();
            ctx.arc(bossRocket.x, bossRocket.y + 20, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Immunity Shield (Phase 2) - Animated Cyan Comet Shield (Particle Trail Method)
    if (bossRocket.invulnerable && bossRocket.phase === 2) {
        const time = Date.now() / 200; // Animation speed
        const radius = bossRocket.width / 2 + 25; // Smaller (tighter fit)

        ctx.save();
        ctx.translate(bossRocket.x, bossRocket.y);

        // 1. Dotted Ring Background (Faint Cyan)
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)'; // Cyan
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]); // Dots
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // 2. Rotating Comet Arcs (Solid Particle Trail)
        // Draw 3 shields
        for (let i = 0; i < 3; i++) {
            const angleOffset = i * (Math.PI * 2 / 3);
            const currentAngle = time + angleOffset;

            // DRAW TAIL (Series of overlapping circles decreasing in size)
            const tailLength = Math.PI * 0.7; // Slightly shorter to fit 3
            const segments = 40; // High count for smoothness

            for (let j = 0; j < segments; j++) {
                const ratio = j / segments; // 0 (near head) to 1 (tail end)

                // Calculate position along arc (behind head)
                const angle = currentAngle - (ratio * tailLength);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                // Tapering Size and Opacity
                const size = 6 * (1 - ratio); // Reduced from 10 to 6 for finer look
                const alpha = (1 - ratio) * 0.8; // Start opaque, fade out

                // Core Color (White-Cyan gradient illusion)
                // R: 50->100, G: 255->255 (keep high for cyan mix), B: 255 (full blue)
                ctx.fillStyle = `rgba(${50 + ratio * 50}, ${212 + ratio * 40}, 255, ${alpha})`;
                ctx.shadowBlur = 10 * (1 - ratio);
                ctx.shadowColor = '#00d4ff'; // Cyan Glow

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // DRAW HEAD (Bright glowing orb)
            const headX = Math.cos(currentAngle) * radius;
            const headY = Math.sin(currentAngle) * radius;

            // Bright Outer Glow
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#00d4ff';
            ctx.fillStyle = '#ccffff'; // Cyan-ish white
            ctx.beginPath();
            ctx.arc(headX, headY, 8, 0, Math.PI * 2); // Reduced from 12 to 8
            ctx.fill();

            // Solid White Core
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(headX, headY, 4, 0, Math.PI * 2); // Reduced from 7 to 4
            ctx.fill();
        }

        ctx.restore();
    }

    // HP bar for boss
    const barWidth = bossRocket.width * 0.8;
    const barHeight = 10;
    const barX = bossRocket.x - barWidth / 2;
    const barY = bossRocket.y + bossRocket.height / 2 + 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = bossRocket.hp / bossRocket.maxHp;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // Boss label
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameTranslations?.bossLabel || 'BOSS', bossRocket.x, barY + 25);

    ctx.restore();
}

// ============ MOVING ASTEROIDS (TO DESTROY) ============

function spawnMovingAsteroid(isBoss: boolean): void {
    if (!canvas || !difficultyConfig) return;

    let size: number;
    let hp: number;
    let speed: number;

    if (isBoss) {
        size = difficultyConfig.bossSize;
        hp = difficultyConfig.bossHP;
        speed = 2; // Slower boss
    } else {
        const { min, max } = difficultyConfig.asteroidSize;
        size = min + Math.random() * (max - min);
        hp = difficultyConfig.asteroidHP;
        speed = 3 + Math.random() * 2; // Pixel speed for straight fall
        asteroidsSpawned++;
    }

    // Spawn at random X position at top of screen
    const spawnX = 50 + Math.random() * (canvas.width - 100);

    movingAsteroids.push({
        id: asteroidIdCounter++,
        x: spawnX,
        y: -size, // Start above screen
        z: 1, // Keep z for compatibility but not used for perspective
        baseSize: size,
        speed,
        hp,
        maxHp: hp,
        isBoss,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        hitFlash: 0,
        laneX: 0 // Not used anymore
    });
}

function updateMovingAsteroids(): void {
    if (!ctx || !canvas) return;

    for (let i = movingAsteroids.length - 1; i >= 0; i--) {
        const asteroid = movingAsteroids[i];

        // Simple straight-down movement
        asteroid.y += asteroid.speed;
        asteroid.rotation += asteroid.rotationSpeed;
        if (asteroid.hitFlash > 0) asteroid.hitFlash--;

        drawMovingAsteroid(asteroid);

        // Remove when off screen at bottom
        if (asteroid.y > canvas.height + asteroid.baseSize) {
            if (asteroid.isBoss) {
                bossEscaped = true;
                gameStats.success = false;
            }
            movingAsteroids.splice(i, 1);
        }
    }
}

function drawMovingAsteroid(asteroid: MovingAsteroid): void {
    if (!ctx) return;

    const size = asteroid.baseSize;

    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);

    if (meteorImage && meteorImage.complete) {
        if (asteroid.hitFlash > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(asteroid.hitFlash * 0.5) * 0.5;
            ctx.filter = 'brightness(2)';
        }

        if (asteroid.isBoss) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff4444';
        } else {
            // White shadow for visibility on regular meteors
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        }

        ctx.drawImage(meteorImage, -size / 2, -size / 2, size, size);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = asteroid.hitFlash > 0 ? '#ffffff' :
            asteroid.isBoss ? '#ff4444' : '#aa6633';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // HP bar
    if (asteroid.maxHp > 1) {
        ctx.rotate(-asteroid.rotation);
        const barWidth = size * 0.8;
        const barHeight = 5;
        const barY = -size / 2 - 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        const hpPercent = asteroid.hp / asteroid.maxHp;
        ctx.fillStyle = asteroid.isBoss ? '#ff0000' : '#06ffa5';
        ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
    }

    ctx.restore();
}

function checkMovingAsteroidCollision(): boolean {
    if (!player || !canvas) return false;

    for (let i = movingAsteroids.length - 1; i >= 0; i--) {
        const asteroid = movingAsteroids[i];
        // Check collision when asteroid is on screen
        if (asteroid.y > -asteroid.baseSize && asteroid.y < canvas.height + asteroid.baseSize) {
            const dist = Math.sqrt(
                Math.pow(player.x - asteroid.x, 2) +
                Math.pow(player.y - asteroid.y, 2)
            );
            const size = asteroid.baseSize;
            if (dist < (player.width / 2 + size / 2) * 0.5) {
                movingAsteroids.splice(i, 1);
                return true;
            }
        }
    }
    return false;
}

// ============ ENEMY ROCKETS ============

// Direction types for enemy rockets
type SpawnDirection = 'top' | 'top-left' | 'top-right' | 'left' | 'right';

function spawnEnemyRocket(): void {
    if (!canvas) return;

    // Check Queue
    if (enemySpawnQueue.length === 0) return;

    const nextType = enemySpawnQueue.shift(); // Get next enemy type

    if (nextType === 'spinner') {
        spawnSquadron();
        return;
    }

    // For Basic and Sniper
    // Basic spawns from any side, Sniper usually top
    let direction: SpawnDirection = 'top';

    if (nextType === 'basic') {
        const directions: SpawnDirection[] = ['top', 'top-left', 'top-right', 'left', 'right'];
        direction = directions[Math.floor(Math.random() * directions.length)];
    } else {
        // Sniper prefers top
        direction = 'top';
    }

    let startX: number;
    let startY: number;
    let speedX: number;
    let speedY: number;

    const isHard = currentDifficulty === 'hard';
    const speedMult = isHard ? 0.5 : 1.0; // Reduce speed to 70% on hard level

    switch (direction) {
        case 'top':
            startX = canvas.width * 0.2 + Math.random() * canvas.width * 0.6;
            startY = -50;
            speedX = (Math.random() - 0.5) * 2 * speedMult;
            speedY = (3 + Math.random() * 2) * speedMult;
            break;
        case 'top-left':
            startX = -50;
            startY = Math.random() * canvas.height * 0.3;
            speedX = (3 + Math.random() * 2) * speedMult;
            speedY = (2 + Math.random() * 1.5) * speedMult;
            break;
        case 'top-right':
            startX = canvas.width + 50;
            startY = Math.random() * canvas.height * 0.3;
            speedX = -(3 + Math.random() * 2) * speedMult;
            speedY = (2 + Math.random() * 1.5) * speedMult;
            break;
        case 'left':
            startX = -50;
            startY = canvas.height * 0.2 + Math.random() * canvas.height * 0.4;
            speedX = (3 + Math.random() * 2) * speedMult;
            speedY = (Math.random() - 0.5) * 2 * speedMult;
            break;
        case 'right':
            startX = canvas.width + 50;
            startY = canvas.height * 0.2 + Math.random() * canvas.height * 0.4;
            speedX = -(3 + Math.random() * 2) * speedMult;
            speedY = (Math.random() - 0.5) * 2 * speedMult;
            break;
    }

    // Create Base Enemy
    const enemy: any = {
        id: enemyIdCounter++,
        x: startX,
        y: startY,
        z: 0.8,
        width: 55,
        height: 65,
        speed: 0.004,
        hp: 50, // Default Basic HP
        maxHp: 50,
        laneX: 0,
        lastFireTime: 0,
        speedX: speedX,
        speedY: speedY,
        direction: direction,
        type: 'basic',
        state: 'moving',
        stateTimer: 0,
        angle: 0,
        imageVariant: Math.floor(Math.random() * 4) // Assign random variant (0-3)
    };

    // Apply Specific Stats
    if (nextType === 'sniper') {
        enemy.type = 'sniper';
        enemy.hp = 80;
        enemy.maxHp = 80;
        enemy.speed = isHard ? 2 : 3;
        enemy.x = Math.random() * (canvas.width - 100) + 50;
        enemy.y = -60;
        enemy.targetY = canvas.height * 0.15 + Math.random() * canvas.height * 0.2; // Stop point
        // Reset speed for movement logic
        enemy.speedX = 0;
        enemy.speedY = isHard ? 2 : 3; // Reduce entry speed
    }

    enemyRockets.push(enemy);
}

function spawnSquadron(): void {
    if (!canvas) return;

    const isHard = currentDifficulty === 'hard';

    // Pattern Selection with Anti-Repeat
    const patterns = ['sine', 'cross', 'u_turn'];
    let selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

    if (selectedPattern === lastSquadronType) {
        // Prevent duplicate pattern check (simple cycle)
        const idx = patterns.indexOf(selectedPattern);
        selectedPattern = patterns[(idx + 1) % patterns.length];
    }
    lastSquadronType = selectedPattern;

    const squadronSize = selectedPattern === 'cross' ? 12 : 6;

    const groupSide = Math.random() < 0.5 ? 'left' : 'right';

    for (let i = 0; i < squadronSize; i++) {
        let pathType: any;
        let startX: number;
        let startY: number = -100;
        let timeOffset = i * 300; // default 150ms gap

        // Configure Pattern
        if (selectedPattern === 'sine') {
            pathType = groupSide === 'left' ? 'sine_left' : 'sine_right';
            startX = groupSide === 'left' ? canvas.width * 0.1 : canvas.width * 0.9;

        } else if (selectedPattern === 'cross') {
            // Split group: First half left, Next half right
            const halfSize = squadronSize / 2;
            if (i < halfSize) {
                pathType = 'cross_left';
                startX = canvas.width * 0.1;
                timeOffset = i * 300;
            } else {
                pathType = 'cross_right';
                startX = canvas.width * 0.9;
                timeOffset = (i - halfSize) * 300; // Sync with first group
            }

        } else { // u_turn
            pathType = groupSide === 'left' ? 'u_turn_left' : 'u_turn_right';
            // U-Turn starts closer to center so they have room to turn out
            startX = groupSide === 'left' ? canvas.width * 0.3 : canvas.width * 0.7;
        }

        enemyRockets.push({
            id: enemyIdCounter++,
            x: startX,
            y: startY,
            z: 0.8,
            width: 50,
            height: 50,
            speed: (isHard ? 2 : 3) * (canvas.width < 768 ? 0.7 : 1),
            hp: 40,
            maxHp: 40,
            laneX: 0,
            lastFireTime: 0,
            // @ts-ignore
            pathType: pathType,
            initialX: startX,
            timeOffset: timeOffset,
            enterTime: Date.now() + timeOffset,

            speedX: 0,
            speedY: 0, // Used for velocity tracking
            direction: 'down',
            type: 'spinner',
            state: 'moving',
            stateTimer: 0,
            angle: Math.PI
        });
    }
}

function updateEnemyRockets(now: number): void {
    if (!ctx || !canvas || !player) return;

    for (let i = enemyRockets.length - 1; i >= 0; i--) {
        const enemy = enemyRockets[i] as any;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // BEHAVIOR BY TYPE
        if (enemy.type === 'sniper') {
            // Sniper: Move -> Stop -> Aim -> Shoot -> Retreat
            if (enemy.state === 'moving') {
                // Move down to target Y
                if (enemy.y < (enemy.targetY || 200)) {
                    enemy.y += enemy.speed;
                } else {
                    enemy.state = 'aiming';
                    enemy.stateTimer = now + 1000; // Aim for 1s
                }
            } else if (enemy.state === 'aiming') {
                // Track player visually (rotation) but don't move
                if (now > enemy.stateTimer) {
                    // Shoot PRECISE shot
                    spawnEnemyBulletStraight(enemy, dx, dy, dist);

                    // Go to Cooldown, not retreat. Stay until killed.
                    enemy.state = 'cooldown';
                    enemy.stateTimer = now + 1500; // Wait 1.5s before aiming again
                }
            } else if (enemy.state === 'cooldown') {
                // Just wait
                if (now > enemy.stateTimer) {
                    enemy.state = 'aiming';
                    enemy.stateTimer = now + 1000; // Aim again
                }
            }

        } else if (enemy.type === 'spinner') {
            // SQUADRON MOVEMENT 

            if (now < (enemy.enterTime || 0)) continue;

            const prevX = enemy.x;
            const prevY = enemy.y;
            const speedScale = canvas.width < 768 ? 0.7 : 1;
            const isHard = currentDifficulty === 'hard';
            const baseSpeed = (isHard ? 2 : 3) * speedScale;

            // --- PATTERN MOVEMENT LOGIC ---

            if (enemy.pathType.startsWith('sine')) {
                // SINE WAVE: Move down, oscillate X
                enemy.y += baseSpeed;

                const frequency = 0.005;
                const amplitude = canvas.width * 0.25;

                if (enemy.pathType === 'sine_left') {
                    const traverseX = enemy.initialX + (enemy.y * 0.2);
                    enemy.x = traverseX + Math.sin(enemy.y * frequency) * amplitude;
                } else {
                    const traverseX = enemy.initialX - (enemy.y * 0.2);
                    enemy.x = traverseX + Math.sin(enemy.y * frequency) * amplitude;
                }

            } else if (enemy.pathType.startsWith('cross')) {
                // CROSS: Move down + Move towards opposite side
                enemy.y += baseSpeed;
                const crossSpeed = baseSpeed * 1.2;

                if (enemy.pathType === 'cross_left') {
                    enemy.x += crossSpeed; // Left -> Right
                } else {
                    enemy.x -= crossSpeed; // Right -> Left
                }

            } else if (enemy.pathType.startsWith('u_turn')) {
                // U-TURN: Dive -> Turn Out -> Fly Up
                const turnStartHeight = canvas.height * 0.4;

                if (enemy.y < turnStartHeight && enemy.speedY >= 0) {
                    // Phase 1: Dive
                    enemy.y += baseSpeed * 1.5;
                    enemy.speedY = baseSpeed * 1.5; // Track speed
                } else {
                    // Phase 2: Turn and Fly Up
                    // Simulating turn physics by modifying velocity
                    enemy.speedY -= 0.15 * speedScale; // Accelerate upwards (gravity reverse)
                    enemy.y += enemy.speedY; // Apply speed

                    const turnOutSpeed = 2 * speedScale;
                    if (enemy.pathType === 'u_turn_left') {
                        enemy.x -= turnOutSpeed; // Curve Left (Out)
                    } else {
                        enemy.x += turnOutSpeed; // Curve Right (Out)
                    }
                }
            }

            // --- END PATTERN LOGIC ---

            // Calculate Angle
            const vx = enemy.x - prevX;
            const vy = enemy.y - prevY;
            if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
                enemy.angle = Math.atan2(vy, vx) + Math.PI / 2;
            }

            // Clean up - remove only if REALLY far off screen (allow U-turns to go up)
            if (enemy.y > canvas.height + 200 || enemy.y < -300 || enemy.x < -300 || enemy.x > canvas.width + 300) {
                enemyRockets.splice(i, 1);
                continue;
            }

        } else {
            // Basic: Chase player (existing logic)
            const isHard = currentDifficulty === 'hard';
            const chaseSpeed = isHard ? 1.8 : 2.5;
            if (dist > 0) {
                enemy.x += (dx / dist) * chaseSpeed;
                enemy.y += (dy / dist) * chaseSpeed;
            }

            // Shoot at player
            if (now - enemy.lastFireTime > 1500) {
                spawnEnemyBulletStraight(enemy, dx, dy, dist);
                enemy.lastFireTime = now;
            }
        }

        // Calculate rotation for non-spinner types
        if (enemy.type !== 'spinner') {
            let angle = Math.PI; // Face down default
            if (enemy.type === 'basic' || (enemy.type === 'sniper' && (enemy.state === 'aiming' || enemy.state === 'cooldown'))) {
                // Face player
                angle = Math.atan2(dy, dx) + Math.PI / 2;
            }
            enemy.angle = angle;
        }

        drawEnemyRocketAtPosition(enemy, enemy.angle);

        // Remove if off screen (for basic/sniper)
        if (enemy.type !== 'spinner' && (enemy.x < -150 || enemy.x > canvas.width + 150 ||
            enemy.y < -150 || enemy.y > canvas.height + 150)) {
            enemyRockets.splice(i, 1);
        }
    }
}

function drawEnemyRocketAtPosition(enemy: any, angle: number): void {
    if (!ctx) return;

    const w = enemy.width;
    const h = enemy.height;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);

    // Select sprite based on type
    let img = enemyRocketImage;

    // Use variant for basic enemy
    if (enemy.type === 'basic' && enemy.imageVariant !== undefined && enemyBasicImages[enemy.imageVariant]) {
        img = enemyBasicImages[enemy.imageVariant];
    }

    if (enemy.type === 'sniper' && enemySniperImage) img = enemySniperImage;
    if (enemy.type === 'spinner' && enemySpinnerImage) img = enemySpinnerImage;

    // Draw enemy rocket image if loaded
    if (img && img.complete) {
        if (enableShadows) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.type === 'spinner' ? '#00ff00' : (enemy.type === 'sniper' ? '#ff8800' : '#ff0000');
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
        // Fallback to canvas drawing
        if (enableShadows) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
        }
        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 3, h / 3);
        ctx.lineTo(-w / 3, h / 3);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(0, 0, w / 5, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        ctx.fillStyle = 'rgba(255, 100, 50, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-w / 5, h / 3);
        ctx.lineTo(0, h / 2 + Math.random() * 5);
        ctx.lineTo(w / 5, h / 3);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();

    // HP bar
    const barWidth = w * 0.8;
    const barHeight = 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - h / 2 - 10, barWidth, barHeight);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - h / 2 - 10, barWidth * (enemy.hp / enemy.maxHp), barHeight);
}

// Spawn straight bullet from enemy in specific direction
function spawnEnemyBulletStraight(enemy: EnemyRocket, dx: number, dy: number, dist: number): void {
    if (!player || dist === 0) return;

    // Calculate direction at spawn time (bullet goes straight, doesn't track)
    const dirX = dx / dist;
    const dirY = dy / dist;

    enemyBullets.push({
        id: bulletIdCounter++,
        x: enemy.x,
        y: enemy.y,
        z: enemy.z,
        width: enemy.type === 'sniper' ? 20 : 6,
        height: enemy.type === 'sniper' ? 40 : 12,
        speed: 8,
        damage: 25,
        color: '#ff4444',
        type: 'spread',
        isEnemy: true,
        isSniperBullet: enemy.type === 'sniper',
        // @ts-ignore - adding direction for straight movement
        dirX: dirX,
        dirY: dirY
    });
}



function spawnEnemyBullet(enemy: EnemyRocket): void {
    if (!player) return;

    // Calculate direction at spawn time
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        spawnEnemyBulletStraight(enemy, dx, dy, dist);
    }
}

function updateEnemyBullets(): void {
    if (!ctx || !canvas || !player) return;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i] as any;

        // Move STRAIGHT in the direction set at spawn (not homing)
        if (bullet.dirX !== undefined && bullet.dirY !== undefined) {
            bullet.x += bullet.dirX * bullet.speed;
            bullet.y += bullet.dirY * bullet.speed;
        } else {
            // Fallback: move straight down
            bullet.y += bullet.speed;
        }

        // Check hit player
        const hitRadius = (player.width / 2) + (bullet.isSniperBullet ? 15 : 0);
        const hitDist = Math.sqrt(
            Math.pow(player.x - bullet.x, 2) +
            Math.pow(player.y - bullet.y, 2)
        );

        if (hitDist < hitRadius) {
            // Apply damage using lives system
            applyDamage(1); // 1 HP damage per bullet
            enemyBullets.splice(i, 1);
            continue;
        }

        // Draw enemy bullet
        ctx.save();
        if (enableShadows) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = bullet.color || '#ff0000';
        }

        // Use boss bullet image for boss bullets (yellow color)
        if (bullet.color === '#ffcc00' && bossBulletImage && bossBulletImage.complete) {
            const imgWidth = bullet.width || 20;
            const imgHeight = bullet.height || 40;
            // Rotate bullet towards movement direction
            if (bullet.angle !== undefined) {
                ctx.translate(bullet.x, bullet.y);
                ctx.rotate(bullet.angle + Math.PI / 2);
                ctx.drawImage(bossBulletImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            } else {
                ctx.drawImage(bossBulletImage, bullet.x - imgWidth / 2, bullet.y - imgHeight / 2, imgWidth, imgHeight);
            }
        } else if (bullet.isStationBullet && stationBulletImage && stationBulletImage.complete) {
            const imgWidth = bullet.width || 30; // Increased
            const imgHeight = bullet.height || 60; // Increased
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            // Rotate towards movement direction
            if (bullet.dirX !== undefined && bullet.dirY !== undefined) {
                const angle = Math.atan2(bullet.dirY, bullet.dirX);
                ctx.rotate(angle + Math.PI / 2);
            }
            ctx.drawImage(stationBulletImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            ctx.restore();
        } else if (bullet.isSniperBullet && enemySniperBulletImage && enemySniperBulletImage.complete) {
            const imgWidth = 50;
            const imgHeight = 100;
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            // Rotate towards movement direction
            if (bullet.dirX !== undefined && bullet.dirY !== undefined) {
                const angle = Math.atan2(bullet.dirY, bullet.dirX);
                ctx.rotate(angle + Math.PI / 2);
            }
            ctx.drawImage(enemySniperBulletImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            ctx.restore();
        } else {
            // Normal enemy bullet (red circle)
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Remove if off screen
        if (bullet.y > canvas.height + 50 || bullet.y < -50 ||
            bullet.x < -50 || bullet.x > canvas.width + 50) {
            enemyBullets.splice(i, 1);
        }
    }
}

function drawEnemyRocket(enemy: EnemyRocket, pos: { x: number; y: number; scale: number }): void {
    if (!ctx) return;

    const w = enemy.width * pos.scale;
    const h = enemy.height * pos.scale;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(enemy.angle || Math.PI); // Use passed angle

    // Select sprite based on type
    let img = enemyRocketImage;
    if (enemy.type === 'sniper' && enemySniperImage) img = enemySniperImage;
    if (enemy.type === 'spinner' && enemySpinnerImage) img = enemySpinnerImage;

    if (img && img.complete) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.type === 'sniper' ? '#ff0000' : (enemy.type === 'spinner' ? '#00ff00' : '#ff4444');

        ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
        // Fallback drawing
        // Body
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 3, h / 3);
        ctx.lineTo(-w / 3, h / 3);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(0, 0, w / 5, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        ctx.fillStyle = 'rgba(255, 100, 50, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-w / 5, h / 3);
        ctx.lineTo(0, h / 2 + Math.random() * 5);
        ctx.lineTo(w / 5, h / 3);
        ctx.closePath();
        ctx.fill();

    }
    ctx.restore();
}

function checkEnemyRocketCollision(): boolean {
    if (!player) return false;

    for (let i = enemyRockets.length - 1; i >= 0; i--) {
        const enemy = enemyRockets[i];
        if (enemy.z > 0.85) {
            const dist = Math.sqrt(
                Math.pow(player.x - enemy.x, 2) +
                Math.pow(player.y - enemy.y, 2)
            );
            const size = enemy.width * (0.2 + enemy.z * 0.8);
            if (dist < (player.width / 2 + size / 2) * 0.6) {
                enemyRockets.splice(i, 1);
                return true;
            }
        }
    }
    return false;
}

// ============ POWER-UP LOGIC ============

function spawnScatteredPowerUps(): void {
    if (!canvas) return;

    // Power-ups spawn from top at different times (staggered)
    const lanePositions = [
        canvas.width * 0.25,   // Left lane
        canvas.width * 0.5,    // Center lane  
        canvas.width * 0.75    // Right lane
    ];
    const weaponTypes: WeaponType[] = ['magnetic', 'spread', 'laser'];
    const colors: Record<WeaponType, string> = {
        'spread': '#ff6b6b',
        'laser': '#00d4ff',
        'magnetic': '#9d4edd'
    };

    // Mobile sizing for powerups
    const isMobile = canvas.width < 768;
    const pSize = isMobile ? 35 : 45;

    weaponTypes.forEach((weaponType, index) => {
        powerUps.push({
            id: powerUpIdCounter++,
            x: lanePositions[index],
            y: -50 - (index * 150), // Start above screen, staggered
            z: 0.1 + (index * 0.1),
            width: pSize,
            height: pSize,
            weaponType,
            color: colors[weaponType],
            rotation: 0,
            laneX: 0
        });
    });
}

function spawnWeaponUpgrade(): void {
    if (!canvas) return;

    // Fixed sequence based on current level: 1->spread, 2->laser, 3->magnetic
    let weaponType: WeaponType | null = null;
    if (playerWeaponLevel === 1) weaponType = 'spread';
    else if (playerWeaponLevel === 2) weaponType = 'laser';
    else if (playerWeaponLevel === 3) weaponType = 'magnetic';

    // If already at max level (4), do not spawn anymore
    if (!weaponType) return;

    const colors: Record<WeaponType, string> = {
        'spread': '#ff6b6b',
        'laser': '#00d4ff',
        'magnetic': '#9d4edd'
    };

    const isMobile = canvas.width < 768;
    const pSize = isMobile ? 35 : 45;

    powerUps.push({
        id: powerUpIdCounter++,
        x: Math.random() * (canvas.width - 100) + 50,
        y: -50,
        z: 0.5,
        width: pSize,
        height: pSize,
        weaponType, // Use deterministic type instead of random
        color: colors[weaponType],
        rotation: 0,
        laneX: 0
    });
}

function updatePowerUps(): void {
    if (!ctx || !canvas || !player) return;

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.rotation += 0.03;

        // Fall from top to bottom (natural drop)
        powerUp.y += 3; // Fall speed

        const dist = Math.sqrt(
            Math.pow(player.x - powerUp.x, 2) +
            Math.pow(player.y - powerUp.y, 2)
        );

        // Collect if close enough
        if (dist < 55) {
            equipWeapon(powerUp.weaponType);
            audioManager.playSoundEffect('powerup');
            powerUps.splice(i, 1); // Only remove THIS power-up
            continue;
        }

        // Remove if fell off screen
        if (powerUp.y > canvas.height + 50) {
            powerUps.splice(i, 1);
            continue;
        }

        // Draw power-up with simple scale
        const scale = 1.0;
        drawPowerUp(powerUp, { x: powerUp.x, y: powerUp.y, scale });
    }
}

function equipWeapon(weaponType: WeaponType): void {
    const weaponConfigs: Record<WeaponType, WeaponConfig> = {
        'magnetic': {
            type: 'magnetic', fireRate: 150, bulletSpeed: 12, bulletWidth: 10, bulletHeight: 20,
            damage: 50, color: '#9d4edd', isAutoFire: true
        },
        'spread': {
            type: 'spread', fireRate: 180, bulletSpeed: 14, bulletWidth: 6, bulletHeight: 15,
            damage: 80, color: '#ff6b6b', spreadCount: 3, isAutoFire: true
        },
        'laser': {
            type: 'laser', fireRate: 50, bulletSpeed: 18, bulletWidth: 8, bulletHeight: 35,
            damage: 100, color: '#00d4ff', isAutoFire: true
        }
    };

    const newConfig = weaponConfigs[weaponType];

    if (playerWeaponLevel < 4) { // Max level is now 4 (Basic + 3 Upgrades)
        playerWeaponLevel++;
        activeUpgradeWeapons.push({ type: weaponType, config: newConfig });
    }

    // Legacy support for single secondary weapon refs
    secondaryWeapon = weaponType;
    secondaryWeaponConfig = newConfig;
    isFiring = true;
}

function drawPowerUp(powerUp: PowerUp, pos: { x: number; y: number; scale: number }): void {
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pos.scale, pos.scale);
    ctx.rotate(powerUp.rotation);

    ctx.shadowBlur = 20;
    ctx.shadowColor = powerUp.color;

    // Use specific image for weapon upgrades if available
    if ((powerUp.weaponType === 'spread' || powerUp.weaponType === 'laser' || powerUp.weaponType === 'magnetic') &&
        weaponPowerUpImage && weaponPowerUpImage.complete && weaponPowerUpImage.naturalWidth > 0) {

        // Preserve aspect ratio to prevent "gepeng" (flattening)
        const aspect = weaponPowerUpImage.naturalWidth / weaponPowerUpImage.naturalHeight;

        // Resize for mobile
        const isMobile = canvas.width < 768;
        const targetHeight = isMobile ? 60 : 100; // Smaller on mobile

        const targetWidth = targetHeight * aspect;

        ctx.drawImage(weaponPowerUpImage, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

    } else {
        // Fallback or other powerups (like lives/shield if any)
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(22, 0);
        ctx.lineTo(0, 22);
        ctx.lineTo(-22, 0);
        ctx.closePath();
        ctx.fill();

        // Inner detail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ============ BULLET LOGIC - STRAIGHT UP ============

function fireBullets(): void {
    if (!player || !canvas || !weaponConfig || !hasWeapon) return;

    const baseX = player.x;
    const baseY = player.y - player.height / 2;

    const spawnBulletStream = (type: WeaponType, config: WeaponConfig, offsetX: number, colorOverride?: string) => {
        if (type === 'spread') {
            const spreadCount = config.spreadCount || 3;
            const angleSpread = 0.15;
            for (let i = 0; i < spreadCount; i++) {
                const angleOffset = (i - (spreadCount - 1) / 2) * angleSpread;
                const bullet = getBulletFromPool();
                bullet.id = bulletIdCounter++;
                bullet.x = baseX + offsetX;
                bullet.y = baseY;
                bullet.z = 1;
                bullet.width = config.bulletWidth;
                bullet.height = config.bulletHeight;
                bullet.speed = config.bulletSpeed;
                bullet.damage = config.damage;
                bullet.color = colorOverride || config.color;
                bullet.type = 'spread';
                bullet.angle = angleOffset;
                bullets.push(bullet);
            }
        } else if (type === 'laser') {
            const bullet = getBulletFromPool();
            bullet.id = bulletIdCounter++;
            bullet.x = baseX + offsetX;
            bullet.y = baseY;
            bullet.z = 1;
            bullet.width = config.bulletWidth;
            bullet.height = config.bulletHeight;
            bullet.speed = config.bulletSpeed;
            bullet.damage = config.damage;
            bullet.color = config.color;
            bullet.type = 'laser';
            bullets.push(bullet);
        } else if (type === 'magnetic') {
            const targetResult = findNearestTarget(baseX + offsetX, baseY);
            const bullet = getBulletFromPool();
            bullet.id = bulletIdCounter++;
            bullet.x = baseX + offsetX;
            bullet.y = baseY;
            bullet.z = 1;
            bullet.width = config.bulletWidth;
            bullet.height = config.bulletHeight;
            bullet.speed = config.bulletSpeed;
            bullet.damage = config.damage;
            bullet.color = config.color;
            bullet.type = 'magnetic';
            bullet.targetAsteroid = targetResult.target as MovingAsteroid || undefined;
            bullet.angle = -Math.PI / 2;
            bullets.push(bullet);
        }
    };

    // --- FIRE PATTERN LOGIC ---
    if (playerWeaponLevel === 1) {
        // Level 1: Only Basic at Center
        spawnBulletStream('spread', weaponConfig, 0);
        audioManager.playSoundEffect('spread');
    }
    else if (playerWeaponLevel === 2) {
        // Level 2: Basic (Left & Right), Spread Upgrade (Center)
        const spreadUpgrade = activeUpgradeWeapons[0];
        spawnBulletStream('spread', weaponConfig, -25);
        spawnBulletStream('spread', weaponConfig, 25);
        if (spreadUpgrade) spawnBulletStream(spreadUpgrade.type, spreadUpgrade.config, 0, '#ffaa00'); // Orange color for upgrade

        audioManager.playSoundEffect('spread');
    }
    else if (playerWeaponLevel === 3) {
        // Level 3: Overlap (Basic + Spread) at Left & Right, Laser (Center)
        const spreadUpgrade = activeUpgradeWeapons[0];
        const laserUpgrade = activeUpgradeWeapons[1];

        // Left Overlap
        spawnBulletStream('spread', weaponConfig, -35);
        if (spreadUpgrade) spawnBulletStream(spreadUpgrade.type, spreadUpgrade.config, -35, '#ffaa00');

        // Right Overlap
        spawnBulletStream('spread', weaponConfig, 35);
        if (spreadUpgrade) spawnBulletStream(spreadUpgrade.type, spreadUpgrade.config, 35, '#ffaa00');

        // Center Laser
        if (laserUpgrade) spawnBulletStream(laserUpgrade.type, laserUpgrade.config, 0);

        audioManager.playSoundEffect('spread');
        audioManager.playSoundEffect('laser');
    }
    else if (playerWeaponLevel === 4) {
        // Level 4: Basic (Left & Right), Magnetic Multiple streams
        const magneticUpgrade = activeUpgradeWeapons[2];

        // Basic Weapon preserved
        spawnBulletStream('spread', weaponConfig, -40);
        spawnBulletStream('spread', weaponConfig, 40);

        // Magnetic Streams (Multiplied for power)
        if (magneticUpgrade) {
            spawnBulletStream(magneticUpgrade.type, magneticUpgrade.config, -20);
            spawnBulletStream(magneticUpgrade.type, magneticUpgrade.config, 0);
            spawnBulletStream(magneticUpgrade.type, magneticUpgrade.config, 20);
        }

        audioManager.playSoundEffect('spread');
        audioManager.playSoundEffect('magnetic');
    }

    muzzleFlashUntil = Date.now() + 50;
}

function findNearestTarget(x: number, y: number): { target: MovingAsteroid | EnemyRocket | null, isRocket: boolean } {
    let nearest: MovingAsteroid | EnemyRocket | null = null;
    let minDist = Infinity;
    let isRocket = false;

    // Check moving asteroids
    for (const asteroid of movingAsteroids) {
        const dx = asteroid.x - x;
        const dy = asteroid.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = asteroid;
            isRocket = false;
        }
    }

    // Check enemy rockets
    for (const enemy of enemyRockets) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
            isRocket = true;
        }
    }

    return { target: nearest, isRocket };
}

function updateBullets(): void {
    if (!ctx || !canvas) return;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Check collision with moving asteroids
        let bulletHit = false;

        // Custom movement for Magnetic Bullets (Smooth Homing)
        if (bullet.type === 'magnetic') {
            // Apply movement based on current angle
            if (bullet.angle === undefined) bullet.angle = -Math.PI / 2;

            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;

            // Homing Logic
            let target: { x: number, y: number, hp: number } | null = bullet.targetAsteroid || null;

            // Include Boss target if in boss phase (and no normal target)
            if (!target && bossRocket && !bossRocket.isDying && !bossRocket.invulnerable) {
                target = bossRocket;
            }

            // If no target or target destroyed, find new one
            if (!target || target.hp <= 0 || (target as any).x === undefined) {
                const result = findNearestTarget(bullet.x, bullet.y);
                if (result.target) {
                    bullet.targetAsteroid = result.target as MovingAsteroid;
                    target = result.target as MovingAsteroid;
                }
            }

            if (target) {
                let targetX = target.x;
                let targetY = target.y;

                // Spread magnetic attacks if the target is the boss
                if (target === bossRocket) {
                    // Seed target offset based on bullet ID to make them hit different parts
                    const offsetSide = (bullet.id % 2 === 0) ? -1 : 1;
                    const spreadDistance = bossRocket.width * 0.4;

                    targetX += offsetSide * spreadDistance;
                    // Slightly aim higher or lower 
                    targetY += (bullet.id % 3 === 0) ? -50 : 20;
                }

                const dx = targetX - bullet.x;
                const dy = targetY - bullet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 600) {
                    const targetAngle = Math.atan2(dy, dx);
                    let angleDiff = targetAngle - bullet.angle;
                    while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    const turnRate = 0.15;
                    if (Math.abs(angleDiff) < turnRate) {
                        bullet.angle = targetAngle;
                    } else {
                        bullet.angle += Math.sign(angleDiff) * turnRate;
                    }
                }
            }
        } else {
            bullet.y -= bullet.speed;
            if (bullet.type === 'spread' && bullet.angle !== undefined) {
                bullet.x += Math.sin(bullet.angle) * bullet.speed * 0.4;
            }
        }

        bullet.z -= 0.02;

        // Boundary checks
        if (bullet.y < -100 || bullet.y > canvas.height + 100 || bullet.x < -100 || bullet.x > canvas.width + 100 || bullet.z < 0.05) {
            bulletHit = true;
        }

        if (!bulletHit) {
            const nearbyObjects = getNearbyObjects(bullet.x, bullet.y);
            for (const obj of nearbyObjects) {
                if ('baseSize' in obj) {
                    const asteroid = obj as MovingAsteroid;
                    const dx = bullet.x - asteroid.x;
                    const dy = bullet.y - asteroid.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < asteroid.baseSize) {
                        asteroid.hp -= bullet.damage;
                        asteroid.hitFlash = 10;
                        gameStats.hits++;
                        if (hasWeapon) gameStats.score += 100;
                        updateUI();
                        if (asteroid.hp <= 0) {
                            gameStats.asteroidsDestroyed++;
                            if (asteroid.isBoss) gameStats.bossDestroyed = true;
                            spawnExplosion(asteroid.x, asteroid.y, asteroid.isBoss ? 2 : 1);
                            const idx = movingAsteroids.indexOf(asteroid);
                            if (idx > -1) movingAsteroids.splice(idx, 1);
                            audioManager.playSoundEffect('explosion');
                        }
                        bulletHit = true;
                        break;
                    }
                } else if ('lastFireTime' in obj) {
                    const enemy = obj as EnemyRocket;
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < enemy.width) {
                        enemy.hp -= bullet.damage;
                        gameStats.hits++;
                        if (hasWeapon) gameStats.score += 150;
                        updateUI();
                        if (enemy.hp <= 0) {
                            spawnExplosion(enemy.x, enemy.y, 1.2);
                            const idx = enemyRockets.indexOf(enemy);
                            if (idx > -1) enemyRockets.splice(idx, 1);
                            audioManager.playSoundEffect('explosion');
                        }
                        bulletHit = true;
                        break;
                    }
                }
            }
        }

        // Check hit scrolling decorations (Stations)
        if (!bulletHit) {
            for (const decor of scrollingDecors) {
                if (decor.type !== 'rock' && decor.hp !== undefined) {
                    const dx = bullet.x - decor.x;
                    const dy = bullet.y - decor.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 50 * decor.scale) {
                        decor.hp -= bullet.damage;
                        decor.hitFlash = 1.0;
                        bulletHit = true;
                        gameStats.hits++;
                        break;
                    }
                }
            }
        }

        // Check collision with boss minions (Phase 2)
        if (!bulletHit && bossRocket && bossRocket.phase === 2 && bossRocket.minions.length > 0) {
            for (let m = bossRocket.minions.length - 1; m >= 0; m--) {
                const minion = bossRocket.minions[m];
                const dx = bullet.x - minion.x;
                const dy = bullet.y - minion.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minion.width / 2) {
                    minion.hp -= bullet.damage;
                    gameStats.hits++;
                    gameStats.score += 50;

                    if (minion.hp <= 0) {
                        spawnExplosion(minion.x, minion.y, 1.5);
                        bossRocket.minions.splice(m, 1);
                        audioManager.playSoundEffect('explosion');
                        gameStats.score += 1000;
                    }

                    bulletHit = true;
                    // Check if all minions dead -> Remove immunity
                    if (bossRocket.minions.length === 0) {
                        bossRocket.invulnerable = false;
                        audioManager.playSoundEffect('powerup');
                    }
                    break;
                }
            }
        }

        // Boss Logic
        if (!bulletHit && bossRocket) {
            const dx = bullet.x - bossRocket.x;
            const dy = bullet.y - bossRocket.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bossRocket.width * 0.4) {
                if (bossRocket.invulnerable) {
                    bulletHit = true;
                } else {
                    bossRocket.hp -= bullet.damage;
                    gameStats.hits++;
                    if (hasWeapon) gameStats.score += 500;
                    updateUI();
                    if (bossRocket.hp <= 0 && !bossRocket.isDying) {
                        bossRocket.isDying = true;
                        bossRocket.dyeStartTime = Date.now();
                        bossRocket.hp = 0;
                        bossRocket.isLaserFiring = false;
                        bossRocket.invulnerable = true;
                        audioManager.playSound('bossDead', 1.0);
                    }
                    bulletHit = true;
                }
            }
        }

        if (bulletHit) {
            returnBulletToPool(bullets[i]);
            bullets.splice(i, 1);
        } else {
            drawBullet(bullet);
        }
    }
}

const bulletGradientCache: Record<string, CanvasGradient> = {};

function getCachedGradient(ctx: CanvasRenderingContext2D, color: string, length: number): CanvasGradient {
    const key = `${color}-${length}`;
    if (!bulletGradientCache[key]) {
        const gradient = ctx.createLinearGradient(0, 0, 0, length);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        bulletGradientCache[key] = gradient;
    }
    return bulletGradientCache[key];
}

function drawBullet(bullet: Bullet): void {
    if (!ctx) return;
    ctx.save();

    // High performance mode: Drop shadow is disabled when there are too many bullets on screen
    const isHeavyLoad = bullets.length > 80;

    if (bullet.type === 'magnetic') {
        const drawWidth = bullet.width * 3;
        const drawHeight = bullet.height * 2;

        // Save context for rotation
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        // Rotate to match movement (add PI/2 because sprite points up)
        ctx.rotate((bullet.angle || -Math.PI / 2) + Math.PI / 2);

        // Draw Trail (Relative to rotated context)
        const trailLength = 40;
        ctx.strokeStyle = getCachedGradient(ctx, bullet.color, trailLength);
        ctx.lineWidth = bullet.width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, trailLength);
        ctx.stroke();

        // Draw Bullet Image
        if (bulletMagneticImage && bulletMagneticImage.complete) {
            ctx.drawImage(bulletMagneticImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Return early since we handled drawing fully
        ctx.restore();
        return;
    }

    // Standard drawing for non-magnetic bullets
    ctx.translate(bullet.x, bullet.y);

    if (bullet.type === 'spread' && bullet.angle !== undefined) {
        // Rotate spread bullets based on their angle. Note: angle is horizontal offset, need to point inwards slightly.
        ctx.rotate(bullet.angle);
    }

    // Bullet Trail (Gradient)
    const trailLength = 30;
    ctx.strokeStyle = getCachedGradient(ctx, bullet.color, trailLength);
    ctx.lineWidth = bullet.width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, trailLength);
    ctx.stroke();

    // Only apply shadow effects on desktop and if load is not completely overwhelming
    if (enableShadows && !isHeavyLoad) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = bullet.color;
    }

    // Larger bullet sizes (3x width, 2x height)
    const drawWidth = bullet.width * 3;
    const drawHeight = bullet.height * 2;

    if (bullet.type === 'laser') {
        // Blue laser bullet image
        if (bulletLaserImage && bulletLaserImage.complete) {
            ctx.drawImage(bulletLaserImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = bullet.color;
            ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
        }
    } else {
        // Orange spread bullet image
        if (bulletSpreadImage && bulletSpreadImage.complete) {
            ctx.drawImage(bulletSpreadImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = bullet.color;
            ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
        }
    }

    ctx.restore();
}

// ============ PLAYER ============

function drawPlayer(): void {
    if (!ctx || !player) return;

    ctx.save();

    // Flashing effect when immune
    if (isImmune) {
        const flashRate = Math.floor(Date.now() / 100) % 2;
        if (flashRate === 0) {
            ctx.globalAlpha = 0.4;
        }
        // Cyan glow for immunity (only on desktop)
        if (enableShadows) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ffff';
        }
    }

    // Draw rocket first
    if (player.image.complete) {
        ctx.translate(player.x, player.y);
        ctx.rotate(player.tilt * Math.PI / 180);

        if (!isImmune && enableShadows) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = hasWeapon && weaponConfig ? weaponConfig.color : '#00d4ff';
        }

        ctx.drawImage(
            player.image,
            -player.width / 2,
            -player.height / 2,
            player.width,
            player.height
        );
    }

    ctx.restore();

    // Muzzle Flash - Radial Blur Glow Effect (drawn AFTER rocket so it appears on top)
    if (Date.now() < muzzleFlashUntil) {
        const flashX = player.x;
        const flashY = player.y - player.height / 2 + 15; // Position slightly inside rocket body
        const flashSize = 35;

        // Calculate fade based on remaining time (for smooth fade out)
        const flashDuration = 80; // ms
        const elapsed = flashDuration - (muzzleFlashUntil - Date.now());
        const fadeProgress = Math.min(1, elapsed / flashDuration);
        const alpha = 1 - fadeProgress * 0.5; // Fade from 1 to 0.5

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending

        // Create radial gradient for blur effect
        const gradient = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, flashSize);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.95})`);        // White core
        gradient.addColorStop(0.2, `rgba(255, 255, 200, ${alpha * 0.85})`);      // Light yellow
        gradient.addColorStop(0.4, `rgba(255, 230, 120, ${alpha * 0.6})`);       // Yellow
        gradient.addColorStop(0.65, `rgba(255, 200, 80, ${alpha * 0.3})`);       // Golden
        gradient.addColorStop(0.85, `rgba(255, 150, 50, ${alpha * 0.1})`);       // Orange tint
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');                        // Fade out

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(flashX, flashY, flashSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ============ WIN CONDITION ============

function checkWinCondition(): boolean {
    // Win condition: Boss must be destroyed (bossSpawned but bossRocket is null means destroyed)
    if (!bossSpawned) {
        // Boss hasn't spawned yet, keep playing
        return false;
    }

    // Boss was spawned and destroyed (bossRocket is null after being spawned)
    if (bossRocket === null) {
        // Boss destroyed! Player wins
        return true;
    }

    // Boss still alive, keep fighting
    return false;
}

// ============ UI ============

function updateUI(): void {
    const scoreEl = document.getElementById('game-score');
    const hpEl = document.getElementById('player-hp-text');

    if (scoreEl) scoreEl.textContent = String(gameStats.score);
    if (hpEl && player) hpEl.textContent = `${player.hp}/${player.maxHp}`;
}

// ============ END GAME ============

function endGame(): void {
    isGameRunning = false;

    // Stop all sounds
    audioManager.stopAllSounds();

    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }

    if (mouseMoveHandler) document.removeEventListener('mousemove', mouseMoveHandler);
    if (keyDownHandler) document.removeEventListener('keydown', keyDownHandler);
    if (keyUpHandler) document.removeEventListener('keyup', keyUpHandler);
    if (mouseDownHandler) document.removeEventListener('mousedown', mouseDownHandler);
    if (mouseDownHandler) document.removeEventListener('mousedown', mouseDownHandler);
    if (mouseUpHandler) document.removeEventListener('mouseup', mouseUpHandler);
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);

    if (!ctx || !canvas) {
        if (onComplete && !callbackCalled) {
            callbackCalled = true;
            onComplete(gameStats);
        }
        return;
    }

    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 55px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (gameStats.success) {
        ctx.fillStyle = '#06ffa5';
        ctx.fillText(gameTranslations?.victory || 'VICTORY!', canvas.width / 2, canvas.height / 2 - 55);
    } else {
        ctx.fillStyle = '#ff006e';
        ctx.fillText(gameTranslations?.gameOver || 'GAME OVER', canvas.width / 2, canvas.height / 2 - 55);
    }

    /* // HIDE STATS ON END SCREEN PER REQUEST
    ctx.font = '26px Space Mono, monospace';
    ctx.fillStyle = '#b8c1ec';
    ctx.fillText(`Score: ${gameStats.score}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillText(`Destroyed: ${gameStats.asteroidsDestroyed}`, canvas.width / 2, canvas.height / 2 + 50);
    */

    ctx.font = '26px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b8c1ec';
    ctx.fillText(gameTranslations?.continuing || 'Continuing...', canvas.width / 2, canvas.height / 2 + 50);

    setTimeout(() => {
        if (onComplete && !callbackCalled) {
            callbackCalled = true;
            onComplete(gameStats);
        }
    }, 3000);
}

export function cleanupMiniGame(): void {
    isGameRunning = false;

    // Stop all sounds
    audioManager.stopAllSounds();

    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }

    if (mouseMoveHandler) document.removeEventListener('mousemove', mouseMoveHandler);
    if (keyDownHandler) document.removeEventListener('keydown', keyDownHandler);
    if (keyUpHandler) document.removeEventListener('keyup', keyUpHandler);
    if (mouseDownHandler) document.removeEventListener('mousedown', mouseDownHandler);
    if (mouseDownHandler) document.removeEventListener('mousedown', mouseDownHandler);
    if (mouseUpHandler) document.removeEventListener('mouseup', mouseUpHandler);
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
}

function drawBossDeathEffect(): void {
    if (!bossDeathEffect.active || !canvas || !ctx) return;

    const now = Date.now();
    const elapsed = now - bossDeathEffect.startTime;
    const maxDuration = 1000; // 1 second animation

    if (elapsed > maxDuration) {
        bossDeathEffect.active = false;
        return;
    }

    // Render Logic
    const progress = elapsed / maxDuration;

    // 1. Fire Ring (Shockwave)
    // Starts small, grows fast
    if (fireRingImage && fireRingImage.complete) {
        ctx.save();
        ctx.translate(bossDeathEffect.x, bossDeathEffect.y);
        ctx.globalAlpha = Math.max(0, 1 - progress); // Fade out
        const ringSize = progress * canvas.width * 1.5; // Grow to 1.5x screen width
        ctx.drawImage(fireRingImage, -ringSize / 2, -ringSize / 2, ringSize, ringSize);
        ctx.restore();
    }

    // 2. Main Explosion
    // Starts huge, fades out
    if (bossExplosionImage && bossExplosionImage.complete) {
        ctx.save();
        ctx.translate(bossDeathEffect.x, bossDeathEffect.y);
        const explosionScale = 2 + progress * 0.5; // Slight grow
        // Fade out in second half (after 0.2s)
        ctx.globalAlpha = progress < 0.2 ? 1 : Math.max(0, 1 - progress);
        const size = 600 * explosionScale;
        ctx.drawImage(bossExplosionImage, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
}
