// Game Engine Logic (State, Audio, Helper functions)

export const State = {
    hero: {
        name: "Traveler",
        class: null,
        level: 1,
        xp: 0,
        xpToNext: 100,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        gold: 0,
        inventory: [],
        equipment: {
            weapon: "Fists",
            armor: "Rags"
        },
        stats: {
            str: 10,
            agi: 10,
            int: 10,
            vit: 10
        }
    },
    location: "Unknown",
    flags: {}, // For quest tracking
    inCombat: false,
    currentEnemy: null
};

// Simple Audio Manager
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buffer);
        sounds[name] = decoded;
    } catch (e) {
        console.warn(`Failed to load sound ${name}`);
    }
}

export const Audio = {
    init: () => {
        loadSound('click', 'ui_click.mp3');
        loadSound('hit', 'sword_hit.mp3');
        loadSound('magic', 'magic_cast.mp3');
        loadSound('win', 'victory.mp3');
    },
    play: (name) => {
        if (sounds[name]) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds[name];
            source.connect(audioCtx.destination);
            source.start(0);
        }
    }
};

export const Utils = {
    rng: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    awardXp: (amount) => {
        State.hero.xp += amount;
        if (State.hero.xp >= State.hero.xpToNext) {
            State.hero.level++;
            State.hero.xp -= State.hero.xpToNext;
            State.hero.xpToNext = Math.floor(State.hero.xpToNext * 1.5);
            State.hero.maxHp += 10 + State.hero.stats.vit;
            State.hero.maxMp += 5 + State.hero.stats.int;
            State.hero.hp = State.hero.maxHp;
            State.hero.mp = State.hero.maxMp;
            return true; // Leveled up
        }
        return false;
    },

    heal: (amount) => {
        State.hero.hp = Math.min(State.hero.hp + amount, State.hero.maxHp);
    },

    restoreMp: (amount) => {
        State.hero.mp = Math.min(State.hero.mp + amount, State.hero.maxMp);
    }
};