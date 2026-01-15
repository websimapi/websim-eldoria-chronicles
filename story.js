import { State, Utils, Audio } from './engine.js';
import { updateUI, renderCombat } from './main.js';

// Story Data Structure
const Scenes = {
    'start': {
        text: "## Welcome to Eldoria\n\nThe realm is in chaos. Ancient beasts wake from their slumber, and the King calls for champions. Who are you?\n\nChoose your path:",
        location: "Creation",
        image: "dungeon_entrance.png",
        choices: [
            { text: "Warrior (High HP, Strong Attacks)", emoji: "⚔️", action: () => initClass('warrior') },
            { text: "Mage (High MP, Powerful Spells)", emoji: "🔮", action: () => initClass('mage') },
            { text: "Rogue (High Crits, Evasive)", emoji: "🗡️", action: () => initClass('rogue') }
        ]
    },
    'town_center': {
        text: "## Shadowfall Outpost\n\nYou stand in the muddy center of the outpost. Rain drizzles down. The Captain of the Guard looks worried, and the local blacksmith is hammering away.\n\nWhat do you do?",
        location: "Shadowfall",
        image: "dungeon_entrance.png",
        choices: [
            { text: "Talk to the Captain", emoji: "💬", action: 'captain_dialogue' },
            { text: "Visit Blacksmith", emoji: "🛒", action: 'shop_blacksmith' },
            { text: "Enter the Dark Forest", emoji: "🌲", action: 'forest_entry' },
            { text: "Rest at Inn (10 Gold)", emoji: "🛏️", action: 'inn_rest' }
        ]
    },
    'captain_dialogue': {
        text: "**Captain Valerius:** 'Thank the gods you're here. A Goblin Warlord has taken over the northern ruins. He's gathering an army. I need you to deal with his scouts first.'\n\n**Quest:** Defeat 3 Goblin Scouts.",
        location: "Shadowfall",
        choices: [
            { text: "I'll handle it.", emoji: "✅", action: () => { State.flags['scout_quest'] = true; return 'town_center'; } },
            { text: "Not my problem.", emoji: "❌", action: 'town_center' }
        ]
    },
    'shop_blacksmith': {
        text: "The Blacksmith grunts. 'Got steel? If not, I've got goods for coin.'\n\n**Wares:**\n- Iron Sword (+5 Dmg) [50g]\n- Health Potion [20g]",
        location: "Smithy",
        choices: [
            { text: "Buy Potion (20g)", emoji: "🧪", action: () => buyItem('potion', 20) },
            { text: "Back to Town", emoji: "🔙", action: 'town_center' }
        ]
    },
    'inn_rest': {
        action: () => {
            if(State.hero.gold >= 10) {
                State.hero.gold -= 10;
                Utils.heal(1000);
                Utils.restoreMp(1000);
                return 'inn_rested';
            } else {
                return 'inn_poor';
            }
        }
    },
    'inn_rested': {
        text: "You sleep soundly. Your HP and MP are fully restored.",
        location: "The Rusty Mug",
        choices: [
            { text: "Wake up and leave", emoji: "☀️", action: 'town_center' }
        ]
    },
    'inn_poor': {
        text: "The innkeeper shoos you away. 'No coin, no bed!'",
        location: "The Rusty Mug",
        choices: [
            { text: "Leave", emoji: "🚪", action: 'town_center' }
        ]
    },
    'forest_entry': {
        text: "The trees are thick and block out most of the light. You hear twigs snapping nearby.",
        location: "Dark Forest",
        choices: [
            { text: "Search for enemies", emoji: "🔍", action: () => startCombat('goblin_scout') },
            { text: "Return to Town", emoji: "🏃", action: 'town_center' }
        ]
    },
    'death': {
        text: "## YOU DIED\n\nYour vision fades to black. The world continues without you... for a moment. Then, you gasp for air at the town shrine.",
        location: "Limbo",
        choices: [
            { text: "Respawn (Lose 10% Gold)", emoji: "⛪", action: () => respawn() }
        ]
    }
};

// Enemy Database
const Enemies = {
    'goblin_scout': { name: "Goblin Scout", hp: 30, maxHp: 30, dmg: 4, xp: 20, gold: 5 },
    'wolf': { name: "Dire Wolf", hp: 45, maxHp: 45, dmg: 6, xp: 35, gold: 0 },
    'warlord': { name: "Goblin Warlord", hp: 100, maxHp: 100, dmg: 10, xp: 150, gold: 100 }
};

// Helper Functions
function initClass(className) {
    State.hero.class = className;
    State.hero.location = "Shadowfall";
    if (className === 'warrior') {
        State.hero.stats.str = 15;
        State.hero.stats.vit = 14;
        State.hero.maxHp = 120;
        State.hero.hp = 120;
    } else if (className === 'mage') {
        State.hero.stats.int = 16;
        State.hero.maxMp = 80;
        State.hero.mp = 80;
    } else { // Rogue
        State.hero.stats.agi = 16;
        State.hero.stats.str = 12;
    }
    return 'town_center';
}

function buyItem(item, cost) {
    if (State.hero.gold >= cost) {
        State.hero.gold -= cost;
        if (item === 'potion') {
            State.hero.inventory.push({ name: "Health Potion", type: "consumable", value: 30 });
            alert("Bought Health Potion!");
        }
        return 'shop_blacksmith'; // Reload shop to update UI
    }
    alert("Not enough gold!");
    return 'shop_blacksmith';
}

function startCombat(enemyId) {
    const template = Enemies[enemyId];
    State.currentEnemy = { ...template }; // Clone
    State.inCombat = true;
    renderCombat("You encounter a " + State.currentEnemy.name + "!");
}

function respawn() {
    State.hero.hp = Math.floor(State.hero.maxHp * 0.5);
    State.hero.gold = Math.floor(State.hero.gold * 0.9);
    State.inCombat = false;
    State.currentEnemy = null;
    return 'town_center';
}

export function getScene(id) {
    return Scenes[id];
}

export function resolveCombatAction(actionType) {
    const hero = State.hero;
    const enemy = State.currentEnemy;
    let log = [];
    
    // Player Turn
    let playerDmg = 0;
    let mpCost = 0;
    
    if (actionType === 'attack') {
        playerDmg = Math.floor(hero.stats.str / 2) + Utils.rng(1, 4);
        Audio.play('hit');
        log.push(`You hit ${enemy.name} for ${playerDmg} dmg.`);
    } else if (actionType === 'heavy') {
        if (hero.mp >= 5) {
            mpCost = 5;
            playerDmg = Math.floor(hero.stats.str) + Utils.rng(2, 6);
            Audio.play('hit');
            log.push(`Heavy Strike hits ${enemy.name} for ${playerDmg} dmg!`);
        } else {
            log.push(`Not enough MP! You fumble.`);
        }
    } else if (actionType === 'fireball') {
        if (hero.mp >= 10) {
            mpCost = 10;
            playerDmg = hero.stats.int + Utils.rng(5, 10);
            Audio.play('magic');
            log.push(`Fireball scorches ${enemy.name} for ${playerDmg} dmg!`);
        } else {
            log.push(`Not enough MP!`);
        }
    } else if (actionType === 'heal') {
        if (hero.mp >= 8) {
            mpCost = 8;
            let healAmt = hero.stats.int + 10;
            Utils.heal(healAmt);
            Audio.play('magic');
            log.push(`You heal yourself for ${healAmt} HP.`);
        } else {
            log.push(`Not enough MP!`);
        }
    } else if (actionType === 'flee') {
        if (Utils.rng(1, 20) + hero.stats.agi > 15) {
            State.inCombat = false;
            State.currentEnemy = null;
            return {
                text: "You escaped successfully!",
                choices: [{ text: "Catch breath", emoji: "😮‍💨", action: 'town_center' }]
            };
        } else {
            log.push("Failed to escape!");
        }
    }

    hero.mp -= mpCost;
    enemy.hp -= playerDmg;

    // Check Enemy Death
    if (enemy.hp <= 0) {
        State.inCombat = false;
        const goldGain = enemy.gold + Utils.rng(1, 5);
        hero.gold += goldGain;
        const leveled = Utils.awardXp(enemy.xp);
        
        Audio.play('win');

        let resultText = `**Victory!**\n\nYou defeated the ${enemy.name}.\nGained: ${enemy.xp} XP and ${goldGain} Gold.`;
        if (leveled) resultText += "\n\n**LEVEL UP!** Stats increased.";

        return {
            text: resultText,
            choices: [{ text: "Continue", emoji: "👉", action: 'town_center' }]
        };
    }

    // Enemy Turn
    const enemyDmg = Math.max(0, enemy.dmg - Utils.rng(0, 2)); // minimal defense logic
    hero.hp -= enemyDmg;
    log.push(`${enemy.name} attacks you for ${enemyDmg} dmg.`);

    // Check Player Death
    if (hero.hp <= 0) {
        State.inCombat = false;
        return getScene('death');
    }

    return {
        isCombat: true,
        log: log,
        text: `**${enemy.name}**\nHP: ${enemy.hp}/${enemy.maxHp}\n\n**${hero.name}**\nHP: ${hero.hp}/${hero.maxHp} | MP: ${hero.mp}/${hero.maxMp}`,
    };
}