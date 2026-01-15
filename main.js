import { State, Audio } from './engine.js';
import { getScene, resolveCombatAction } from './story.js';
import { marked } from 'https://esm.sh/marked';

// DOM Elements
const els = {
    name: document.getElementById('char-name'),
    level: document.getElementById('stat-level'),
    hp: document.getElementById('stat-hp'),
    maxHp: document.getElementById('stat-max-hp'),
    mp: document.getElementById('stat-mp'),
    maxMp: document.getElementById('stat-max-mp'),
    gold: document.getElementById('stat-gold'),
    loc: document.getElementById('stat-loc'),
    hpBar: document.getElementById('bar-hp'),
    mpBar: document.getElementById('bar-mp'),
    text: document.getElementById('story-text'),
    log: document.getElementById('combat-log'),
    choices: document.getElementById('choices-container'),
    img: document.getElementById('scene-img')
};

// Main render function
function renderScene(sceneData) {
    if (!sceneData) return;

    // Update Text
    els.text.innerHTML = marked.parse(sceneData.text || "");
    
    // Update Location
    if (sceneData.location) State.location = sceneData.location;
    
    // Update Image (if changed)
    // In a real app, we'd handle loading states, but here we just swap
    // if (sceneData.image) els.img.src = sceneData.image; 

    // Render Choices
    els.choices.innerHTML = '';
    
    if (sceneData.choices) {
        sceneData.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `<span class="choice-emoji">${choice.emoji}</span> ${choice.text}`;
            btn.onclick = () => handleChoice(choice);
            els.choices.appendChild(btn);
        });
    }

    updateUI();
}

export function updateUI() {
    const h = State.hero;
    els.name.innerText = h.name;
    els.level.innerText = h.level;
    els.hp.innerText = h.hp;
    els.maxHp.innerText = h.maxHp;
    els.mp.innerText = h.mp;
    els.maxMp.innerText = h.maxMp;
    els.gold.innerText = h.gold;
    els.loc.innerText = State.location;

    const hpPct = Math.max(0, (h.hp / h.maxHp) * 100);
    const mpPct = Math.max(0, (h.mp / h.maxMp) * 100);
    
    els.hpBar.style.width = `${hpPct}%`;
    els.mpBar.style.width = `${mpPct}%`;
}

function handleChoice(choice) {
    Audio.play('click');

    let result = null;

    if (typeof choice.action === 'function') {
        // Action returns the ID of the next scene or a scene object
        result = choice.action();
    } else if (typeof choice.action === 'string') {
        result = choice.action;
    }

    if (typeof result === 'string') {
        // It's a scene ID
        els.log.classList.add('hidden');
        renderScene(getScene(result));
    } else if (result && typeof result === 'object') {
        // It's a dynamic scene object (like combat result)
        renderScene(result);
    }
}

// Exposed for story.js to call back
export function renderCombat(flavorText, logs = []) {
    els.log.classList.remove('hidden');
    if (logs.length > 0) {
        els.log.innerHTML = logs.join('<br>');
    } else {
        els.log.innerHTML = "Combat Started!";
    }

    const enemy = State.currentEnemy;
    
    const combatScene = {
        text: flavorText || `**${enemy.name}** glares at you.`,
        location: "Combat",
        choices: [
            { text: "Attack", emoji: "⚔️", action: () => handleCombatTurn('attack') },
            { text: "Heavy Strike (5 MP)", emoji: "🔨", action: () => handleCombatTurn('heavy') },
            { text: "Fireball (10 MP)", emoji: "🔥", action: () => handleCombatTurn('fireball') },
            { text: "Heal (8 MP)", emoji: "💚", action: () => handleCombatTurn('heal') },
            { text: "Flee", emoji: "🏃", action: () => handleCombatTurn('flee') }
        ]
    };
    
    renderScene(combatScene);
}

function handleCombatTurn(actionType) {
    const result = resolveCombatAction(actionType);
    
    if (result.isCombat) {
        renderCombat(result.text, result.log);
    } else if (typeof result === 'string') {
        // Scene ID
        els.log.classList.add('hidden');
        renderScene(getScene(result));
    } else {
        // Victory/Defeat Scene Object
        els.log.classList.add('hidden');
        renderScene(result);
    }
}

// Init
Audio.init();
renderScene(getScene('start'));
updateUI();