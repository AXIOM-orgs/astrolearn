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
    hitFlash: number;
    upgradeFlash: number;
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
    isSpinnerBullet?: boolean;
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
let isLoadingAssets: boolean = false;
const imageCache: Map<string, HTMLImageElement> = new Map();

// ============ PHASED PRELOAD SYSTEM ============
// Assets are split into 3 phases to spread download across pages:
// Phase 1 (waiting room): backgrounds, meteor, smoke — biggest files
// Phase 2 (quiz page): enemies, bullets, boss, decorations
// Phase 3 (game page): player spaceship + audio

let _phase1Done = false;
let _phase1Running = false;
let _phase2Done = false;
let _phase2Running = false;
let _phase3Done = false;
let _phase3Running = false;

const PHASE1_URLS = [
    '/assets/images/backgrounds/background_5.jpg',
    '/assets/images/backgrounds/background_1.jpg',
    '/assets/images/backgrounds/background_4.jpg',
    '/assets/images/backgrounds/background_2.jpg',
    '/assets/images/backgrounds/background_3.png',
    '/assets/images/hiasan/meteor.webp',
    '/assets/Smoke Texture.png',
];

const PHASE2_URLS = [
    '/assets/roket_musuh.png',
    '/assets/var_enemy1.png',
    '/assets/var_enemy2.png',
    '/assets/var_enemy4.png',
    '/assets/var_enemy5.png',
    '/assets/images/enemy/enemy-sniper.webp',
    '/assets/images/enemy/enemy-spiral.webp',
    '/assets/bullet_16.png',
    '/assets/explosion02.png',
    '/assets/fire_ring.png',
    '/assets/bullet_25.png',
    '/assets/bullet_73_5.png',
    '/assets/bullet_68.png',
    '/assets/bos.png',
    '/assets/images/enemy/anakan-bos.webp',
    '/assets/bullet_4_2_0.png',
    '/assets/laser_6.png',
    '/assets/images/hiasan/upweapon.webp',
    '/assets/images/hiasan/love.webp',
    '/assets/bullet_1_1_4.png',
    '/assets/bullet_2_3_2.png',
    '/assets/images/peluru/orange.webp',
    '/assets/images/hiasan/dec_dmg.webp',
    '/assets/var_enemy3.png',
    '/assets/images/hiasan/batu.webp',
];

/** Helper: preload a list of image URLs in chunks */
async function preloadImageChunks(urls: string[], chunkSize: number = 5): Promise<void> {
    for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const promises = chunk.map(url => new Promise<void>((resolve) => {
            if (imageCache.has(url)) {
                resolve();
                return;
            }
            const img = new Image();
            img.onload = () => {
                imageCache.set(url, img);
                resolve();
            };
            img.onerror = () => {
                console.warn(`[Preload] Failed to load: ${url}`);
                resolve(); // Don't block on failed images
            };
            img.src = url;
        }));
        await Promise.all(promises);
    }
}

/**
 * Phase 1: Background images, meteor, smoke texture.
 * Call from waiting room page for early download of largest assets.
 * Idempotent — safe to call multiple times.
 */
export async function preloadPhase1(): Promise<void> {
    if (_phase1Done || _phase1Running) return;
    _phase1Running = true;
    console.log('[Preload] Phase 1 starting (backgrounds)...');
    await preloadImageChunks(PHASE1_URLS);
    _phase1Done = true;
    _phase1Running = false;
    console.log('[Preload] Phase 1 complete');
}

/**
 * Phase 2: Enemy images, bullet images, boss, decorations.
 * Call from quiz page. Also triggers Phase 1 as fallback.
 * Idempotent — safe to call multiple times.
 */
export async function preloadPhase2(): Promise<void> {
    if (_phase2Done || _phase2Running) return;
    // Ensure Phase 1 is done first (fallback if player skipped waiting room)
    if (!_phase1Done && !_phase1Running) {
        await preloadPhase1();
    }
    _phase2Running = true;
    console.log('[Preload] Phase 2 starting (enemies/bullets)...');
    await preloadImageChunks(PHASE2_URLS);
    _phase2Done = true;
    _phase2Running = false;
    console.log('[Preload] Phase 2 complete');
}

/**
 * Phase 3: Player spaceship + audio.
 * Call from game page right before starting the game.
 * Triggers Phase 1+2 as fallback if not yet done.
 */
export async function preloadPhase3(spaceshipImageUrl: string): Promise<void> {
    if (_phase3Done || _phase3Running) return;
    // Ensure earlier phases started
    if (!_phase1Done && !_phase1Running) preloadPhase1();
    if (!_phase2Done && !_phase2Running) preloadPhase2();
    _phase3Running = true;
    console.log('[Preload] Phase 3 starting (spaceship + audio)...');
    // Load spaceship image
    await preloadImageChunks([spaceshipImageUrl]);
    // Load audio
    await audioManager.resumeContext();
    await audioManager.loadSounds();
    _phase3Done = true;
    _phase3Running = false;
    console.log('[Preload] Phase 3 complete');
    // Wait for any still-running earlier phases
    while (_phase1Running || _phase2Running) {
        await new Promise(r => setTimeout(r, 50));
    }
}

/** Check if all preload phases are complete */
export function isAllPreloaded(): boolean {
    return _phase1Done && _phase2Done && _phase3Done;
}

function getCachedImage(src: string): HTMLImageElement {
    let img = imageCache.get(src);
    if (!img) {
        img = new Image();
        img.src = src;
        imageCache.set(src, img);
    }
    return img;
}

let dtMultiplier: number = 1;
let lastTimeObj: number = 0;
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
    return {
        x: 0, y: 0, scale: 0, alpha: 0, rotation: 0, age: 0,
        maxAge: 30, type: 'standard'
    };
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
interface ExplosionParticle {
    x: number;
    y: number;
    scale: number;
    alpha: number;
    rotation: number;
    age: number;
    maxAge: number;
    type: 'standard' | 'ring' | 'core';
}
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
let bossMinionImage: HTMLImageElement | null = null; // anakan-bos.webp
let bossBulletImage: HTMLImageElement | null = null; // bullet_4_2_0.png
let laserBeamImage: HTMLImageElement | null = null; // laser_6.png
let weaponPowerUpImage: HTMLImageElement | null = null;
let stationBulletImage: HTMLImageElement | null = null; // bullet_1_1_4.png
let loveImage: HTMLImageElement | null = null;
let barHpImage: HTMLImageElement | null = null;
let enemySniperBulletImage: HTMLImageElement | null = null;
let enemySpinnerBulletImage: HTMLImageElement | null = null;

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
const PLAYER_MAX_LIVES = 3;
const LIFE_MAX_HP = 10;
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
    easy: { spinner: 3, sniper: 2, basic: 0 },
    medium: { basic: 9, sniper: 3, spinner: 3 },
    hard: { basic: 10, sniper: 5, spinner: 5 }
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
    private isMuted: boolean = true;
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeSources: AudioBufferSourceNode[] = [];
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmGain: GainNode | null = null;
    private isLoaded: boolean = false;
    private masterGain: GainNode | null = null;
    private masterVolume: number = 0.7;

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // Unify with global sound settings
            const savedBgm = localStorage.getItem('bgm_enabled');
            const savedSfx = localStorage.getItem('sfx_enabled');

            // If either is true, we consider sound enabled, but we follow the "unified" approach
            this.isMuted = savedBgm === 'false' || (savedBgm === null && savedSfx === 'false');

            // To be more robust: explicitly OFF if either says false, default OFF
            if (savedBgm === null && savedSfx === null) {
                this.isMuted = true; // Default OFF
            } else {
                this.isMuted = savedBgm !== 'true';
            }

            const savedVolume = localStorage.getItem('master_volume');
            if (savedVolume !== null) {
                this.masterVolume = parseFloat(savedVolume);
            }

            if (this.masterGain) {
                this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
            }

            // Sync with global events
            const updateMuteState = (enabled: boolean) => {
                this.isMuted = !enabled;
                if (this.masterGain) {
                    this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
                }

                if (this.isMuted) {
                    this.stopBGM();
                    this.stopAllSounds();
                } else if (!this.bgmSource && isGameRunning) {
                    this.startBGM(0.5);
                }
            };

            window.addEventListener('sound_settings_changed', (e: any) => {
                // Since they are unified, we can react to either
                updateMuteState(e.detail.enabled);
            });

            window.addEventListener('storage', (e: StorageEvent) => {
                if (e.key === 'bgm_enabled' || e.key === 'sfx_enabled') {
                    updateMuteState(e.newValue === 'true');
                }
            });

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
        if (!this.audioContext || this.isMuted || !this.masterGain) return;

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        let bufferKey = type as string;
        let offset = 0;
        let duration: number | undefined = undefined;
        let playbackRate = 1.0;

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
        gainNode.connect(this.masterGain);

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
        if (!this.audioContext || this.bgmSource) return;

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
        // BGM volume is controlled by its own gain AND masterGain
        this.bgmGain.gain.value = volume;

        // Route BGM through masterGain so master volume controls it
        this.bgmSource.connect(this.bgmGain);
        this.bgmGain.connect(this.masterGain!);

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
        const newValue = !this.isMuted;

        localStorage.setItem('bgm_enabled', newValue.toString());
        localStorage.setItem('sfx_enabled', newValue.toString());

        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
        }

        // Notify other components
        window.dispatchEvent(new CustomEvent('sound_settings_changed', {
            detail: { type: 'bgm', enabled: newValue }
        }));
        window.dispatchEvent(new CustomEvent('sound_settings_changed', {
            detail: { type: 'sfx', enabled: newValue }
        }));

        // Start BGM if unmuting and not already playing
        if (!this.isMuted && !this.bgmSource) {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
            this.startBGM(0.5);
        }

        return this.isMuted;
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume)); // clamp 0-1
        localStorage.setItem('master_volume', this.masterVolume.toString());

        // Auto-mute at 0, auto-unmute above 0
        if (this.masterVolume === 0) {
            this.isMuted = true;
            localStorage.setItem('bgm_enabled', 'false');
            localStorage.setItem('sfx_enabled', 'false');
        } else if (this.isMuted && this.masterVolume > 0) {
            this.isMuted = false;
            localStorage.setItem('bgm_enabled', 'true');
            localStorage.setItem('sfx_enabled', 'true');
        }

        // Apply volume to masterGain
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
        }

        // Start BGM if it wasn't playing yet
        if (!this.isMuted && !this.bgmSource) {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
            this.startBGM(0.5);
        }
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    getMuted(): boolean {
        return this.isMuted;
    }

    async resumeContext(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Legacy method for compatibility (uses oscillator fallback)
    playSoundEffect(type: 'spread' | 'laser' | 'magnetic' | 'hit' | 'powerup' | 'explosion'): void {
        // Map legacy types to new sound system
        if (type === 'spread') {
            this.playSound('spread', 0.15);
        } else if (type === 'laser') {
            this.playSound('laserBiru', 0.35);
        } else if (type === 'magnetic') {
            this.playSound('laserMagnet', 0.35);
        } else if (type === 'explosion') {
            this.playSound('destroy', 0.50);
        }
        // hit and powerup use oscillator fallback - route through masterGain
        else if (this.audioContext && !this.isMuted && this.masterGain) {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain); // Route through masterGain instead of destination

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
let handleGameOver: (() => void) | null = null;

export function startMiniGame(
    spaceship: Spaceship,
    difficulty: DifficultyLevel,
    completeCallback: (stats: GameStats) => void,
    initialLives?: number,
    initialHP?: number,
    onStateChange?: (lives: number, hp: number) => void,
    translations?: any,
    onGameOver?: () => void
): void {
    if (isGameRunning) return;

    playerSpaceship = spaceship;
    currentDifficulty = difficulty;
    onComplete = completeCallback;
    callbackCalled = false;
    handleStateChange = onStateChange || null;
    gameTranslations = translations;
    handleGameOver = onGameOver || null;
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
    const livesPerDifficulty = { easy: 3, medium: 3, hard: 5 };
    const defaultLives = livesPerDifficulty[difficulty] || 3;
    playerLives = (initialLives !== undefined) ? initialLives : defaultLives;
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

    // All assets should be pre-cached by phased preload (phases 1-3).
    // getCachedImage() returns instantly from imageCache.
    // No async loading needed here — game starts immediately.

    // Load meteor image
    meteorImage = getCachedImage('/assets/images/hiasan/meteor.webp');

    // Randomly select between 3 background modes
    const bgRand = Math.floor(Math.random() * 3);
    backgroundImages = [];

    if (bgRand === 0) {
        currentBgMode = 'starfield';
        const src = '/assets/images/backgrounds/background_5.jpg';
        for (let i = 0; i < 4; i++) {
            backgroundImages.push(getCachedImage(src));
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2, -canvas.height * 3];
    } else if (bgRand === 1) {
        currentBgMode = 'rocket_seq';
        const sources = ['/assets/images/backgrounds/background_1.jpg', '/assets/images/backgrounds/background_4.jpg', '/assets/images/backgrounds/background_2.jpg'];
        for (const src of sources) {
            backgroundImages.push(getCachedImage(src));
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2];
    } else {
        currentBgMode = 'portrait_scene';
        const src = '/assets/images/backgrounds/background_3.png';
        for (let i = 0; i < 4; i++) {
            backgroundImages.push(getCachedImage(src));
        }
        bgPanelY = [0, -canvas.height, -canvas.height * 2, -canvas.height * 3];
    }

    // Set difficulty-based scroll speed
    const scrollSpeeds = { easy: 3, medium: 3, hard: 3 };
    backgroundScrollSpeed = scrollSpeeds[difficulty];

    // Load smoke texture
    smokeImage = getCachedImage('/assets/Smoke Texture.png');
    smokeParticles = [];
    lastSmokeSpawnTime = 0;

    // Load enemy rocket images
    enemyRocketImage = getCachedImage('/assets/roket_musuh.png');

    // Load 4 variants for Basic Enemy
    enemyBasicImages = [];
    const basicSources = [
        '/assets/var_enemy1.png',
        '/assets/var_enemy2.png',
        '/assets/var_enemy4.png',
        '/assets/var_enemy5.png'
    ];
    for (const src of basicSources) {
        enemyBasicImages.push(getCachedImage(src));
    }

    enemySniperImage = getCachedImage('/assets/images/enemy/enemy-sniper.webp');
    enemySpinnerImage = getCachedImage('/assets/images/enemy/enemy-spiral.webp');

    // Load explosion image
    explosionImage = getCachedImage('/assets/bullet_16.png');
    explosionParticles = [];

    // Load boss death visuals
    bossExplosionImage = getCachedImage('/assets/explosion02.png');
    fireRingImage = getCachedImage('/assets/fire_ring.png');
    bossDeathEffect = { active: false, startTime: 0, x: 0, y: 0 };

    // Load bullet images
    bulletSpreadImage = getCachedImage('/assets/bullet_25.png');
    bulletMagneticImage = getCachedImage('/assets/bullet_73_5.png');
    bulletLaserImage = getCachedImage('/assets/bullet_68.png');

    // Load boss rocket image
    bossRocketImage = getCachedImage('/assets/bos.png');
    bossMinionImage = getCachedImage('/assets/images/enemy/anakan-bos.webp');
    bossBulletImage = getCachedImage('/assets/bullet_4_2_0.png');
    laserBeamImage = getCachedImage('/assets/laser_6.png');
    weaponPowerUpImage = getCachedImage('/assets/images/hiasan/upweapon.webp');
    loveImage = getCachedImage('/assets/images/hiasan/love.webp');
    stationBulletImage = getCachedImage('/assets/bullet_1_1_4.png');
    enemySniperBulletImage = getCachedImage('/assets/bullet_2_3_2.png');
    enemySpinnerBulletImage = getCachedImage('/assets/images/peluru/orange.webp');

    // musuh hiasan
    spaceStation1Image = getCachedImage('/assets/images/hiasan/dec_dmg.webp');
    spaceStation2Image = getCachedImage('/assets/var_enemy3.png');
    rockImage = getCachedImage('/assets/images/hiasan/batu.webp');
    initScrollingDecors(canvas);

    // Load spaceship image
    const spaceshipImg = getCachedImage(spaceship.image);
    const playerSpeeds: Record<string, number> = { easy: 3, medium: 3, hard: 3 };

    // Initialize player at bottom center (no HP with base weapon)
    player = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 90,
        height: 90,
        speed: playerSpeeds[difficulty] || 10,
        image: spaceshipImg,
        dx: 0,
        dy: 0,
        hp: 0,
        maxHp: 0,
        tilt: 0,
        hitFlash: 0,
        upgradeFlash: 0
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

    // Setup controls and resize handler
    setupControls();
    resizeHandler = handleResize;
    window.addEventListener('resize', resizeHandler);

    // Start BGM and game loop immediately
    audioManager.startBGM(0.5);
    gameStartTime = Date.now();
    gameLoop = requestAnimationFrame(update);
}





// ============ GUI STATE ============
let isVolumeSliderOpen = false;
let isDraggingVolume = false;
let volumeChangedWhileOpen = false; // Track if volume was changed while slider was open

/**
 * Common metrics for the mute button and volume slider.
 * Ensures hit detection and drawing match perfectly.
 */
function getMuteButtonMetrics() {
    // Gunakan isMobile global untuk konsistensi deteksi di semua bagian game
    const currentIsMobile = isMobile || (canvas ? canvas.width < 768 : false);
    const btnRadius = 22; // Ukuran dikembalikan ke awal sesuai permintaan

    // paddingX diatur kecil (25px) agar tetap di pojok (corner)
    const paddingX = 18;
    // paddingY ditingkatkan di mobile (85px) agar naik ke atas menghindari nav bar HP
    const paddingY = currentIsMobile ? 70 : 25;

    return {
        radius: btnRadius,
        paddingX: paddingX,
        paddingY: paddingY,
        x: canvas ? canvas.width - btnRadius - paddingX : 0,
        y: canvas ? canvas.height - btnRadius - paddingY : 0
    };
}

function drawMuteButton(): void {
    if (!ctx || !canvas) return;

    const { radius: btnRadius, x: btnX, y: btnY } = getMuteButtonMetrics();

    const isMuted = audioManager.getMuted();
    const currentVol = audioManager.getMasterVolume();

    // Draw Master Volume Slider (if open)
    if (isVolumeSliderOpen) {
        const sliderWidth = 12;
        const sliderHeight = 100;
        const sliderX = btnX - sliderWidth / 2;
        const sliderY = btnY - btnRadius - 40 - sliderHeight; // Increased gap to button

        // Background track
        ctx.fillStyle = 'rgba(0, 30, 50, 0.8)';
        ctx.beginPath();
        // Expanded vertical padding for percentage text spacing
        ctx.roundRect(sliderX - 14, sliderY - 42, sliderWidth + 28, sliderHeight + 68, 32);
        ctx.fill();
        ctx.strokeStyle = '#4ab8c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Track line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(sliderX, sliderY, sliderWidth, sliderHeight, 6);
        ctx.fill();

        // Fill line based on volume (show actual volume even when muted)
        const displayVol = isMuted ? 0 : currentVol;
        const fillHeight = sliderHeight * displayVol;
        const fillY = sliderY + sliderHeight - fillHeight;

        // Gradient based on volume level
        const gradient = ctx.createLinearGradient(0, sliderY + sliderHeight, 0, sliderY);
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(1, '#00ffa3');
        ctx.fillStyle = gradient;

        if (fillHeight > 0) {
            ctx.beginPath();
            ctx.roundRect(sliderX, fillY, sliderWidth, fillHeight, 6);
            ctx.fill();
        }

        // Handle knob
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sliderX + sliderWidth / 2, fillY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ab8c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Volume percentage text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(displayVol * 100)}%`, sliderX + sliderWidth / 2, sliderY - 22);
    }

    // Draw Button Background
    ctx.beginPath();
    ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = (isMuted || currentVol === 0) ? '#ff4444' : '#10b981';
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

    if (isMuted || currentVol === 0) {
        // X mark
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 3);
        ctx.lineTo(cx + 11, cy + 3);
        ctx.moveTo(cx + 11, cy - 3);
        ctx.lineTo(cx + 5, cy + 3);
        ctx.stroke();
    } else {
        // Sound Waves depending on volume level
        ctx.beginPath();
        ctx.arc(cx, cy, 6, -Math.PI / 5, Math.PI / 5);
        ctx.stroke();

        if (currentVol > 0.5) {
            ctx.beginPath();
            ctx.arc(cx, cy, 10, -Math.PI / 5, Math.PI / 5);
            ctx.stroke();
        }
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

    const handleDragVolume = (clickX: number, clickY: number): boolean => {
        if (!isVolumeSliderOpen || !canvas) return false;

        const { radius: btnRadius, x: btnX, y: btnY } = getMuteButtonMetrics();

        const sliderWidth = 12;
        const sliderHeight = 100;
        const sliderX = btnX - sliderWidth / 2;
        const sliderY = btnY - btnRadius - 40 - sliderHeight; // Match the visual drawing

        // Check if inside slider bounding box + margin
        if (clickX > sliderX - 25 && clickX < sliderX + sliderWidth + 25 &&
            clickY > sliderY - 25 && clickY < sliderY + sliderHeight + 25) {

            // Calculate 0.0 to 1.0 volume
            let vol = 1.0 - ((clickY - sliderY) / sliderHeight);
            vol = Math.max(0, Math.min(1, vol));
            audioManager.setMasterVolume(vol);
            return true;
        }
        return false;
    };

    mouseMoveHandler = (e: MouseEvent): void => {
        if (isDraggingVolume && canvas) {
            const rect = canvas.getBoundingClientRect();
            handleDragVolume(e.clientX - rect.left, e.clientY - rect.top);
            return; // Don't move player while dragging volume
        }
        updateTargetPosition(e.clientX, e.clientY);
    };
    document.addEventListener('mousemove', mouseMoveHandler);

    touchMoveHandler = (e: TouchEvent): void => {
        e.preventDefault();
        if (isDraggingVolume && canvas && e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            handleDragVolume(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
            return;
        }
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

        const { radius: btnRadius, x: btnX, y: btnY } = getMuteButtonMetrics();

        // Check Mute Button Click First
        if (Math.hypot(clickX - btnX, clickY - btnY) < btnRadius + 5) {
            if (isVolumeSliderOpen) {
                // If slider is open, clicking speaker toggles mute
                audioManager.toggleMute();
            } else {
                // If slider is closed, open the slider
                isVolumeSliderOpen = true;
                volumeChangedWhileOpen = false;
            }
            return;
        }

        // Check Drag Slider
        if (isVolumeSliderOpen) {
            if (handleDragVolume(clickX, clickY)) {
                isDraggingVolume = true;
                volumeChangedWhileOpen = true;
                return;
            } else {
                // Clicked outside slider - close it
                isVolumeSliderOpen = false;
                volumeChangedWhileOpen = false;
            }
        }

        isFiring = true;
    };
    mouseUpHandler = (): void => {
        isFiring = false;
        isDraggingVolume = false;
    };
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

            const { radius: btnRadius, x: btnX, y: btnY } = getMuteButtonMetrics();

            if (Math.hypot(clickX - btnX, clickY - btnY) < btnRadius + 10) {
                if (isVolumeSliderOpen) {
                    // If slider is open, tapping speaker toggles mute
                    audioManager.toggleMute();
                } else {
                    // If slider is closed, open the slider
                    isVolumeSliderOpen = true;
                    volumeChangedWhileOpen = false;
                }
                return;
            }

            if (isVolumeSliderOpen) {
                if (handleDragVolume(clickX, clickY)) {
                    isDraggingVolume = true;
                    volumeChangedWhileOpen = true;
                    return; // Prevent firing while dragging slider
                } else {
                    isVolumeSliderOpen = false;
                    volumeChangedWhileOpen = false;
                }
            }
        }

        isFiring = true;
        if (e.touches.length > 0 && !isDraggingVolume) {
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
        isDraggingVolume = false;
        // Keep firing on mobile (auto-fire)
    };
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    canvas.addEventListener('touchend', touchEndHandler, { passive: false });
}

// ============ GAME LOOP ============

function update(): void {
    if (!isGameRunning || !ctx || !canvas || !difficultyConfig) {
        return;
    }




    if (!player) return;

    // CRITICAL: Clear the canvas area for the next frame.
    // We reset the transform to identity to ensure we fill the ENTIRE canvas area
    // regardless of any translations or rotations set in previous frames or during shake.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        targetX = Math.max(player.width / 2, targetX - player.speed * dtMultiplier);
    }
    if (keys['arrowright'] || keys['d']) {
        targetX = Math.min(canvas.width - player.width / 2, targetX + player.speed * dtMultiplier);
    }
    if (keys['arrowup'] || keys['w']) {
        targetY = Math.max(player.height / 2, targetY - player.speed * dtMultiplier);
    }
    if (keys['arrowdown'] || keys['s']) {
        targetY = Math.min(canvas.height - player.height / 2, targetY + player.speed * dtMultiplier);
    }

    // Smooth follow movement
    player.x += (targetX - player.x) * LERP_SPEED * dtMultiplier;
    player.y += (targetY - player.y) * LERP_SPEED * dtMultiplier;

    // Calculate swing/tilt animation
    const moveDirection = player.x - lastPlayerX;
    const targetTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, moveDirection * 3));
    player.tilt += (targetTilt - player.tilt) * 0.15;
    lastPlayerX = player.x;

    // Update flash effects
    if (player.hitFlash > 0) player.hitFlash -= 1;
    if (player.upgradeFlash > 0) player.upgradeFlash -= 1;

    // Spawn power-ups after dodge phase (Periodic every 6 seconds)
    if (!isInDodgePhase) {
        if (now - lastPowerUpDropTime > 6000) {
            spawnWeaponUpgrade();
            lastPowerUpDropTime = now;
        }
    }
    updatePowerUps();

    // Firing - bullets go STRAIGHT UP
    // Can only fire if NOT immune. Respects isAutoFire from weapon config if present.
    const canFire = hasWeapon && weaponConfig && (weaponConfig.isAutoFire || isFiring) && !isImmune;

    if (canFire && now - lastFireTime >= (weaponConfig?.fireRate || 200)) {
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
        gameStats.isEliminated = false; // No longer eliminated on life-loss
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
    if (player) {
        player.hitFlash = 40; // 40 frames = 4 phases of 10 frames (2 blinks)
        spawnExplosion(player.x, player.y, 0.5);
    }
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
        booster.y += backgroundScrollSpeed * 0.8 * dtMultiplier;
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
    ctx.globalAlpha = 0.7; // Constant for all boosters
    for (const booster of boosterDecors) {
        const size = 60 * booster.scale;
        ctx.save();
        ctx.translate(booster.x, booster.y);
        ctx.rotate(booster.rotation);
        ctx.drawImage(boosterImage, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
    ctx.restore();
}

function initScrollingDecors(canvasRef: HTMLCanvasElement): void {
    scrollingDecors = [];
    const counts = { easy: 5, medium: 7, hard: 8 };
    const baseCount = counts[currentDifficulty || 'easy'];
    const count = baseCount + Math.floor(Math.random() * 2);

    let types: ('station1' | 'station2' | 'rock')[] = ['station1', 'station2', 'rock'];

    // Probability adjustment for Hard difficulty (Less Kamikazes)
    if (currentDifficulty === 'hard') {
        types = ['station1', 'station1', 'station2', 'rock', 'rock', 'rock']; // station2 probability reduced from 33% to 16%
    }

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
        decor.y += backgroundScrollSpeed * 0.6 * dtMultiplier;
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
                decor.x += (dx / dist) * chaseSpeed * dtMultiplier;
                decor.y += (dy / dist) * chaseSpeed * dtMultiplier;
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
    const smokeSpawnInterval = isMobile ? 300 : 150; // FURTHER REDUCED (was 200:100)
    if (player && now - lastSmokeSpawnTime > smokeSpawnInterval) {
        spawnSmokeParticle();
        lastSmokeSpawnTime = now;
    }

    // Update and draw particles
    ctx.save();
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const particle = smokeParticles[i];

        particle.x += particle.vx * dtMultiplier;
        particle.y += particle.vy * dtMultiplier;
        particle.alpha -= 0.015;
        particle.scale += 0.008;

        if (particle.alpha <= 0) {
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

    // Limit particle count (Reduced from 100 to 50 for performance)
    if (smokeParticles.length > 50) {
        smokeParticles.splice(0, smokeParticles.length - 50);
    }
}

function drawBackground(): void {
    if (!ctx || !canvas) return;

    // Ensure panels are perfectly arranged end-to-end once images are loaded
    if (!(bgPanelY as any).isArranged) {
        let allLoaded = true;
        for (let j = 0; j < backgroundImages.length; j++) {
            if (!backgroundImages[j] || !backgroundImages[j].complete || backgroundImages[j].width === 0) {
                allLoaded = false;
                break;
            }
        }
        if (allLoaded && backgroundImages.length > 0) {
            let currentY = bgPanelY[0];
            for (let j = 0; j < bgPanelY.length; j++) {
                bgPanelY[j] = currentY;
                const img = backgroundImages[j];
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                currentY -= (img.height * scale - 4);
            }
            (bgPanelY as any).isArranged = true;
        }
    }

    // Scroll and Reset Panels
    for (let i = 0; i < bgPanelY.length; i++) {
        bgPanelY[i] += backgroundScrollSpeed;

        const img = backgroundImages[i];
        let panelHeight = canvas.height;
        if (img && img.complete && img.width > 0) {
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            panelHeight = img.height * scale;
        }

        if (bgPanelY[i] >= canvas.height) {
            const minY = Math.min(...bgPanelY);
            bgPanelY[i] = minY - (panelHeight - 4); // -4 for overlap
        }
    }

    // Draw all panels
    for (let i = 0; i < backgroundImages.length; i++) {
        const img = backgroundImages[i];
        if (img && img.complete && img.width > 0) {
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);

            const cropW = canvas.width / scale;
            const cropH = img.height;
            const sX = (img.width - cropW) / 2;
            const sY = 0;
            const sW = cropW;
            const sH = cropH;

            const dX = 0;
            const dY = Math.floor(bgPanelY[i]);
            const dW = canvas.width;
            const dH = cropH * scale;

            ctx.save();
            const useMirror = currentBgMode === 'starfield';
            const isFlipped = useMirror && (i % 2 === 1);
            if (isFlipped) {
                ctx.translate(0, dY + dH);
                ctx.scale(1, -1);
                ctx.drawImage(img, sX, sY, sW, sH, dX, 0, dW, dH + 4);
            } else {
                ctx.drawImage(img, sX, sY, sW, sH, dX, dY, dW, dH + 4);
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

    if (size >= 1) {
        // --- DESTRUCTION EXPLOSION ---
        // 1. Core Explosion
        const core = getExplosionFromPool();
        core.x = x;
        core.y = y;
        core.type = 'core';
        core.scale = size * 0.8;
        core.alpha = 1;
        core.age = 0;
        core.maxAge = 40;
        explosionParticles.push(core);

        // 2. Fire Ring
        const ring = getExplosionFromPool();
        ring.x = x;
        ring.y = y;
        ring.type = 'ring';
        ring.scale = 0.1; // Starts small
        ring.alpha = 1;
        ring.age = 0;
        ring.maxAge = 35;
        explosionParticles.push(ring);
    } else {
        // --- HIT SPARKLES ---
        // Reduced density: was Math.max(1, Math.floor((2 + Math.random() * 2) * particleMultiplier))
        const particleCount = Math.max(1, Math.floor((1 + Math.random() * 1.5) * particleMultiplier));
        for (let i = 0; i < particleCount; i++) {
            const particle = getExplosionFromPool();
            particle.x = x + (Math.random() - 0.5) * 15 * size;
            particle.y = y + (Math.random() - 0.5) * 15 * size;
            particle.type = 'standard';
            particle.scale = (0.2 + Math.random() * 0.4) * size;
            particle.alpha = 1;
            particle.rotation = Math.random() * Math.PI * 2;
            particle.age = 0;
            particle.maxAge = 15; // Shorter life (was 20)
            explosionParticles.push(particle);
        }
    }
}

function updateExplosionParticles(): void {
    if (!ctx) return;

    // Optimization: Group by image to reduce state changes if possible, 
    // but since we need transform/alpha per particle, we keep basic save/restore
    // however we can reduce max count further.

    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.age++;

        // Determine which image to use
        let img = explosionImage;
        if (p.type === 'ring') img = fireRingImage;
        else if (p.type === 'core') img = bossExplosionImage;

        // Skip if image not loaded yet
        if (!img || !img.complete) {
            if (p.age > p.maxAge) {
                explosionParticles.splice(i, 1);
                returnExplosionToPool(p);
            }
            continue;
        }

        // Update properties based on type
        if (p.type === 'ring') {
            p.scale += 0.05 * p.scale;
            p.alpha = 1 - (p.age / p.maxAge);
        } else if (p.type === 'core') {
            p.scale += 0.01;
            p.alpha = 1 - (p.age / p.maxAge);
        } else {
            p.alpha -= 0.05; // Fades faster (was 0.035)
            p.scale -= 0.01;
        }

        if (p.alpha <= 0 || p.age > p.maxAge) {
            explosionParticles.splice(i, 1);
            returnExplosionToPool(p);
            continue;
        }

        const drawSize = 100 * p.scale;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
    }

    // Limit particle count (Reduced from 50 to 30)
    if (explosionParticles.length > 30) {
        explosionParticles.splice(0, explosionParticles.length - 30);
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
    const scale = isMobile ? 0.65 : 1; // Scaled down to match desktop layout

    // ===== TOP RIGHT: SIMPLE HP BAR (Reference Design) =====
    const barWidth = 180 * scale;
    const barX = canvas.width - barWidth - (15 * scale);
    const barY = 15 * scale;
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
    const rightEdgeX = barX + barWidth;

    // Set font first to measure text width accurately
    ctx.font = `bold ${Math.floor(16 * scale)}px Orbitron, sans-serif`;
    const textWidth = ctx.measureText(`x ${playerLives}`).width;
    const heartX = rightEdgeX - textWidth - heartSize - (5 * scale);

    // Draw "x N" text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`x ${playerLives}`, rightEdgeX, livesY + 17 * scale);

    // Draw heart icon
    if (loveImage && loveImage.complete) {
        ctx.drawImage(loveImage, heartX, livesY, heartSize, heartSize);
    } else {
        ctx.font = `${Math.floor(18 * scale)}px Arial`;
        ctx.fillStyle = '#ff4466';
        ctx.textAlign = 'right';
        ctx.fillText('❤️', rightEdgeX - textWidth - (5 * scale), livesY + 16 * scale);
    }

    // Immunity indicator (left of heart)
    if (isImmune) {
        const immuneTimeLeft = Math.max(0, (immuneEndTime - Date.now()) / 1000);
        ctx.font = `bold ${Math.floor(12 * scale)}px Orbitron, sans-serif`;
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'right';
        ctx.fillText(`🛡️ ${immuneTimeLeft.toFixed(1)}s`, heartX - (15 * scale), livesY + 17 * scale);
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
        bossRocket.y += bossRocket.speed * dtMultiplier;
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
                bossRocket.x += bossFollowSpeed * dtMultiplier;
            } else {
                bossRocket.x -= bossFollowSpeed * dtMultiplier;
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

    /* 
    // DISABLE GLOBAL BOSS SHADOW FOR PERFORMANCE
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff0044';
    */

    // DRAW LASER (BEHIND BOSS) - Visual Layer 1
    const bossInPosition = bossRocket.y >= (canvas?.height || 0) * 0.24; // Use 0.24 to account for bobbing
    if (bossInPosition && bossRocket.phase === 3 && bossRocket.isLaserFiring) {
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
            // Fallback (Very rare, but keep it light)
            ctx.fillStyle = '#ff0044';
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
            let mImg = bossMinionImage || enemyRocketImage;

            if (mImg && mImg.complete) {
                ctx.drawImage(mImg, minion.x - minion.width / 2, minion.y - minion.height / 2, minion.width, minion.height);
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
            // Caching gradient by using relative translation
            ctx.save();
            ctx.translate(bossRocket.x, bossRocket.y + 20);

            // Optimization: Create gradient only if not already cached (basic check)
            const glowGradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Core white
            glowGradient.addColorStop(0.4, 'rgba(255, 50, 50, 0.9)'); // Inner red
            glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Fade out

            ctx.fillStyle = glowGradient;
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
            ctx.beginPath();
            ctx.arc(0, 0, 80, 0, Math.PI * 2);
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
            const segments = 12; // REDUCED FROM 40 FOR PERFORMANCE

            // Set shadow once for the whole arc if enabled
            if (enableShadows) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00d4ff';
            }

            for (let j = 0; j < segments; j++) {
                const ratio = j / segments; // 0 (near head) to 1 (tail end)

                // Calculate position along arc (behind head)
                const angle = currentAngle - (ratio * tailLength);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                // Tapering Size and Opacity
                const size = 6 * (1 - ratio);
                const alpha = (1 - ratio) * 0.8;

                // Core Color (White-Cyan gradient illusion)
                ctx.fillStyle = `rgba(${50 + ratio * 50}, ${212 + ratio * 40}, 255, ${alpha})`;

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Reset shadow after arc to prevent spillover
            if (enableShadows) {
                ctx.shadowBlur = 0;
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
        speed = 1; // Slower boss
    } else {
        const { min, max } = difficultyConfig.asteroidSize;
        size = min + Math.random() * (max - min);
        hp = difficultyConfig.asteroidHP;
        speed = 1.5 + Math.random() * 1.5; // Pixel speed for straight fall
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
        asteroid.y += asteroid.speed * dtMultiplier;
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
            speedX = (Math.random() - 0.5) * 1 * speedMult;
            speedY = (1.5 + Math.random() * 1.5) * speedMult;
            break;
        case 'top-left':
            startX = -50;
            startY = Math.random() * canvas.height * 0.3;
            speedX = (1.5 + Math.random() * 1.5) * speedMult;
            speedY = (1 + Math.random() * 1) * speedMult;
            break;
        case 'top-right':
            startX = canvas.width + 50;
            startY = Math.random() * canvas.height * 0.3;
            speedX = -(1.5 + Math.random() * 1.5) * speedMult;
            speedY = (1 + Math.random() * 1) * speedMult;
            break;
        case 'left':
            startX = -50;
            startY = canvas.height * 0.2 + Math.random() * canvas.height * 0.4;
            speedX = (1.5 + Math.random() * 1.5) * speedMult;
            speedY = (Math.random() - 0.5) * 1 * speedMult;
            break;
        case 'right':
            startX = canvas.width + 50;
            startY = canvas.height * 0.2 + Math.random() * canvas.height * 0.4;
            speedX = -(1.5 + Math.random() * 1.5) * speedMult;
            speedY = (Math.random() - 0.5) * 1 * speedMult;
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
        enemy.speed = isHard ? 1 : 1.5;
        enemy.x = Math.random() * (canvas.width - 100) + 50;
        enemy.y = -60;
        enemy.targetY = canvas.height * 0.15 + Math.random() * canvas.height * 0.2; // Stop point
        // Reset speed for movement logic
        enemy.speedX = 0;
        enemy.speedY = isHard ? 1 : 1.5; // Reduce entry speed
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
            speed: (isHard ? 0.8 : 1.2) * (canvas.width < 768 ? 0.7 : 1),
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
                    enemy.y += enemy.speed * dtMultiplier;
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
            const baseSpeed = (isHard ? 0.8 : 1.2) * speedScale;

            // --- PATTERN MOVEMENT LOGIC ---

            if (enemy.pathType.startsWith('sine')) {
                // SINE WAVE: Move down, oscillate X
                enemy.y += baseSpeed * dtMultiplier;;

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
                enemy.y += baseSpeed * dtMultiplier;;
                const crossSpeed = baseSpeed * 1.2;

                if (enemy.pathType === 'cross_left') {
                    enemy.x += crossSpeed * dtMultiplier; // Left -> Right
                } else {
                    enemy.x -= crossSpeed * dtMultiplier; // Right -> Left
                }

            } else if (enemy.pathType.startsWith('u_turn')) {
                // U-TURN: Dive -> Turn Out -> Fly Up
                const turnStartHeight = canvas.height * 0.4;

                if (enemy.y < turnStartHeight && enemy.speedY >= 0) {
                    // Phase 1: Dive
                    enemy.y += baseSpeed * 1.5 * dtMultiplier;
                    enemy.speedY = baseSpeed * 1.5; // Track speed
                } else {
                    // Phase 2: Turn and Fly Up
                    // Simulating turn physics by modifying velocity
                    enemy.speedY -= 0.15 * speedScale * dtMultiplier; // Accelerate upwards (gravity reverse)
                    enemy.y += enemy.speedY * dtMultiplier; // Apply speed

                    const turnOutSpeed = 2 * speedScale;
                    if (enemy.pathType === 'u_turn_left') {
                        enemy.x -= turnOutSpeed * dtMultiplier; // Curve Left (Out)
                    } else {
                        enemy.x += turnOutSpeed * dtMultiplier; // Curve Right (Out)
                    }
                }
            }

            // --- SPINNER FIRING LOGIC ---
            // Only fire if on screen (y > 0)
            if (enemy.y > 0 && enemy.y < canvas.height && now - (enemy.lastFireTime || 0) > 2000) {
                spawnEnemyBulletStraight(enemy, dx, dy, dist, 1, true); // Damage 1, isSpinner true
                enemy.lastFireTime = now;
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
            const chaseSpeed = isHard ? 1.0 : 1.5;
            if (dist > 0) {
                enemy.x += (dx / dist) * chaseSpeed * dtMultiplier;
                enemy.y += (dy / dist) * chaseSpeed * dtMultiplier;
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
            ctx.shadowColor = enemy.type === 'spinner' ? '#ff8800' : (enemy.type === 'sniper' ? '#00ff00' : '#ff0000');
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
function spawnEnemyBulletStraight(enemy: EnemyRocket, dx: number, dy: number, dist: number, damage: number = 25, isSpinner: boolean = false): void {
    if (!player || dist === 0) return;

    // Calculate direction at spawn time (bullet goes straight, doesn't track)
    const dirX = dx / dist;
    const dirY = dy / dist;

    enemyBullets.push({
        id: bulletIdCounter++,
        x: enemy.x,
        y: enemy.y,
        z: enemy.z,
        width: enemy.type === 'sniper' ? 20 : 10,
        height: enemy.type === 'sniper' ? 40 : 20,
        speed: 8,
        damage: damage, // Use dynamic damage
        color: isSpinner ? '#ff8800' : '#ff4444', // Orange for spinner
        type: 'spread',
        isEnemy: true,
        isSniperBullet: enemy.type === 'sniper',
        isSpinnerBullet: isSpinner,
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
            bullet.x += bullet.dirX * bullet.speed * dtMultiplier;
            bullet.y += bullet.dirY * bullet.speed * dtMultiplier;
        } else {
            // Fallback: move straight down
            bullet.y += bullet.speed * dtMultiplier;
        }

        // Check hit player
        const hitRadius = (player.width / 2) + (bullet.isSniperBullet ? 15 : 0);
        const hitDist = Math.sqrt(
            Math.pow(player.x - bullet.x, 2) +
            Math.pow(player.y - bullet.y, 2)
        );

        if (hitDist < hitRadius) {
            // Apply damage using lives system
            applyDamage(bullet.damage || 1); // Use bullet's damage property
            enemyBullets.splice(i, 1);
            continue;
        }

        // Draw enemy bullet
        ctx.save();
        if (enableShadows) {
            ctx.shadowBlur = 10;
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
        } else if (bullet.isSpinnerBullet && enemySpinnerBulletImage && enemySpinnerBulletImage.complete) {
            const imgWidth = bullet.width || 25;
            const imgHeight = bullet.height || 50;
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            // Rotate towards movement direction
            if (bullet.dirX !== undefined && bullet.dirY !== undefined) {
                const angle = Math.atan2(bullet.dirY, bullet.dirX);
                ctx.rotate(angle + Math.PI / 2);
            }
            ctx.drawImage(enemySpinnerBulletImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
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
        // Optimization: Reduce shadow quality on enemies for performance
        if (enableShadows && enemyRockets.length < 15) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = enemy.type === 'sniper' ? '#00ff00' : (enemy.type === 'spinner' ? '#ff8800' : '#ff4444');
        } else {
            ctx.shadowBlur = 0;
        }

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
        powerUp.y += 3 * dtMultiplier; // Fall speed

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

            bullet.x += Math.cos(bullet.angle) * bullet.speed * dtMultiplier;;
            bullet.y += Math.sin(bullet.angle) * bullet.speed * dtMultiplier;;

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
            bullet.y -= bullet.speed * dtMultiplier;
            if (bullet.type === 'spread' && bullet.angle !== undefined) {
                bullet.x += Math.sin(bullet.angle) * bullet.speed * 0.4 * dtMultiplier;
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
                        spawnExplosion(bullet.x, bullet.y, 0.3);
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
                        spawnExplosion(bullet.x, bullet.y, 0.4);
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
                        spawnExplosion(bullet.x, bullet.y, 0.3);
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
                    spawnExplosion(bullet.x, bullet.y, 0.4);
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

/**
 * Replaced with direct color assignment in drawBullet for performance.
 * Keeping template for future reference or removing to save space.
 */
// const bulletGradientCache: Record<string, CanvasGradient> = {};


function drawBullet(bullet: Bullet): void {
    if (!ctx) return;
    ctx.save();

    // High performance mode not needed for shadows if shadows are disabled for bullets
    // const isHeavyLoad = bullets.length > 80;


    if (bullet.type === 'magnetic') {
        const drawWidth = bullet.width * 3;
        const drawHeight = bullet.height * 2;

        // Save context for rotation
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        // Rotate to match movement (add PI/2 because sprite points up)
        ctx.rotate((bullet.angle || -Math.PI / 2) + Math.PI / 2);

        // Draw Simple Trail (Solid line instead of gradient for performance)
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = bullet.width;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 40);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

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

    // Simple Bullet Trail (Solid line instead of expensive gradient)
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = bullet.width;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    /* 
    // DISABLED FOR PERFORMANCE - Shadows on many small bullets are very expensive in Canvas
    if (enableShadows && !isHeavyLoad) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = bullet.color;
    }
    */

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
            // Default: No shadow
            let sBlur = 0;
            let sColor = 'transparent';

            // 1. Hit Flash Priority (Red - 2 blinks)
            if (player.hitFlash > 0) {
                // Blink pattern: ON (40-31), OFF (30-21), ON (20-11), OFF (10-0)
                const isBlinkOn = Math.floor(player.hitFlash / 10) % 2 === 1;
                if (isBlinkOn) {
                    sColor = '#ff4444';
                    sBlur = 45;
                }
            }
            // 2. Continuous Upgrade Flash (Yellow)
            else if (playerWeaponLevel > 1) {
                // Blink pattern: 250ms periodic
                const isBlinkOn = Math.floor(Date.now() / 250) % 2 === 0;
                if (isBlinkOn) {
                    sColor = '#ffff00';
                    sBlur = 45;
                }
            }

            ctx.shadowBlur = sBlur;
            ctx.shadowColor = sColor;
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

    if (handleGameOver) {
        handleGameOver();
    }

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
    } else if (gameStats.isEliminated) {
        ctx.fillStyle = '#ff006e';
        ctx.fillText(gameTranslations?.gameOver || 'GAME OVER', canvas.width / 2, canvas.height / 2 - 55);
    } else {
        // Player failed but not eliminated (life loss retry)
        ctx.fillStyle = '#ffa500'; // Orange for retry
        ctx.fillText(gameTranslations?.tryAgain || 'TRY AGAIN', canvas.width / 2, canvas.height / 2 - 55);
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
    isLoadingAssets = false;
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
