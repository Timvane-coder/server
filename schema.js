// Solution 1: Convert to CommonJS (Most Compatible)
// schema.js - CommonJS version
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');

// Get __dirname for CommonJS
const __dirname = path.dirname(require.main.filename);

// Path to the JSON file for storing user data
const dataFile = path.join(__dirname, 'users.json');

// Initialize default user RPG data
const defaultRpgData = {
    health: 100,
    money: 0,
    potion: 10,
    trash: 0,
    wood: 0,
    rock: 0,
    string: 0,
    emerald: 0,
    diamond: 0,
    gold: 0,
    iron: 0,
    common: 0,
    uncommon: 0,
    mythic: 0,
    legendary: 0,
    pet: 0,
    horse: 0,
    horseexp: 0,
    cat: 0,
    catexp: 0,
    fox: 0,
    foxexp: 0,
    dog: 0,
    dogexp: 0,
    armor: 0,
    armordurability: 0,
    sword: 0,
    sworddurability: 0,
    pickaxe: 0,
    pickaxedurability: 0,
    fishingrod: false,
    fishingroddurability: 0,
    lastadventure: 0,
    lastfishing: 0,
    level: 1,
    experience: 0,
    eventProgress: {},
    eventDeficit: {},
    achievements: [],
    total_adventures: 0,
    energy: 100
};

// Initialize default user data
const defaultUserData = {
    exp: 0,
    level: 1,
    cash: 0,
    limit: 30,
};

// Read data from JSON file
async function readData() {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(dataFile, JSON.stringify({ users: {}, rpg: {} }));
            return { users: {}, rpg: {} };
        }
        throw err;
    }
}

// Write data to JSON file
async function writeData(data) {
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

// Find or create RPG user
async function findUserRpg(user_id) {
    console.log('=== DEBUG findUserRpg ===');
    console.log('user_id:', user_id);
    console.log('user_id type:', typeof user_id);
    console.log('user_id length:', user_id ? user_id.length : 'N/A');
    console.log('user_id includes @:', user_id ? user_id.includes('@') : 'N/A');
    console.log('========================');

    if (!user_id) {
        console.log('ERROR: user_id is falsy');
        throw new Error('Invalid id/sender - user_id is empty');
    }

    if (typeof user_id !== 'string') {
        console.log('ERROR: user_id is not a string, it is:', typeof user_id);
        throw new Error('Invalid id/sender - user_id is not a string');
    }

    const data = await readData();
    if (!data.rpg[user_id]) {
        console.log('Creating new RPG user for:', user_id);
        data.rpg[user_id] = { id: user_id, rpg: { ...defaultRpgData } };
        await writeData(data);
    }
    return data.rpg[user_id];
}

// Update RPG user
async function editRpg(user_id, edit) {
    console.log('=== DEBUG editRpg ===');
    console.log('user_id:', user_id);
    console.log('edit:', edit);
    console.log('===================');

    if (!user_id || typeof user_id !== 'string') {
        throw new Error('Invalid id/sender');
    }
    if (!edit) throw new Error('Enter what needs to be edited!');

    const data = await readData();
    if (!data.rpg[user_id]) {
        data.rpg[user_id] = { id: user_id, rpg: { ...defaultRpgData } };
    }
    data.rpg[user_id].rpg = { ...data.rpg[user_id].rpg, ...edit.rpg };
    await writeData(data);
    return data.rpg[user_id];
}

// Find or create user
async function findUser(sender) {
    console.log('=== DEBUG findUser ===');
    console.log('sender:', sender);
    console.log('sender type:', typeof sender);
    console.log('===================');

    if (!sender || typeof sender !== 'string') {
        throw new Error('Invalid id/sender');
    }

    const data = await readData();
    if (!data.users[sender]) {                             
        data.users[sender] = { sender, ...defaultUserData };
        await writeData(data);
        console.log(chalk.whiteBright('├'), chalk.cyan('[ NEW USER ]'), sender.split('@')[0], 'on', chalk.yellowBright(moment.tz('Africa/Johannesburg').format('hh:mm:ss')));
    }
    return data.users[sender];
}

// Update user experience and level
async function expUpdate(sender, expToAdd) {
    const data = await readData();
    const user = data.users[sender];
    if (!user) throw new Error('User not found');

    user.exp += expToAdd;
    const neededXP = user.level * user.level * 100;
    let levelUpMsg = '';                                   
    if (user.exp >= neededXP) {
        user.level += 1;                                   
        user.exp -= neededXP;
        levelUpMsg = `Congratulations, you leveled up to level ${user.level}!`;
    }

    await writeData(data);
    return levelUpMsg;
}

// CommonJS exports
module.exports = { findUserRpg, editRpg, findUser, expUpdate };

// =============================================================================
// Solution 2: Mixed CommonJS/ESM Detection (Auto-adapts)
// =============================================================================

/*
// schema.js - Auto-detection version
let fs, path, chalk, moment, __dirname;

// Detect if we're in CommonJS or ESM environment
const isESM = typeof require === 'undefined';

if (isESM) {
    // ESM imports
    const fsModule = await import('fs');
    fs = fsModule.promises;
    const pathModule = await import('path');
    path = pathModule.default;
    const chalkModule = await import('chalk');
    chalk = chalkModule.default;
    const momentModule = await import('moment-timezone');
    moment = momentModule.default;
    
    // ESM __dirname equivalent
    import { fileURLToPath } from 'url';
    const __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
} else {
    // CommonJS requires
    fs = require('fs').promises;
    path = require('path');
    chalk = require('chalk');
    moment = require('moment-timezone');
    __dirname = path.dirname(require.main.filename);
}

// Rest of your code stays the same...
*/

// =============================================================================
// Solution 3: Dynamic Import Version (For ESM with fallback)
// =============================================================================

/*
// schema.js - Dynamic import version
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let fs, path, chalk, moment, __dirname;

try {
    // Try ESM imports first
    const fsModule = await import('fs');
    fs = fsModule.promises;
    path = (await import('path')).default;
    chalk = (await import('chalk')).default;
    moment = (await import('moment-timezone')).default;
    
    import { fileURLToPath } from 'url';
    const __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
} catch (error) {
    // Fallback to CommonJS
    fs = require('fs').promises;
    path = require('path');
    chalk = require('chalk');
    moment = require('moment-timezone');
    __dirname = path.dirname(require.main.filename);
}

// Rest of your code...
*/
