import { Location, world, Player } from 'mojang-minecraft';
import { ModalFormData, ActionFormData } from 'mojang-minecraft-ui';
import * as GameTest from 'mojang-gametest';
import {PlayerDB, PlayerData, HomeBase} from './PlayerDB';
import { runCommand, getScore, getCurrPlayers, getInventoryItemCounts } from './helpers';
import { itemHandler } from './handlers/ItemHandler';
import { cmdHandler } from './handlers/CommandHandler';

const playerDB: PlayerDB = new PlayerDB();
initDB();

world.events.playerJoin.subscribe(async (data) => {
    const player = data.player;
    const oldData = await playerDB.loadDataToRAM(player.name, world.scoreboard)
    
    if (!player.hasTag('joined')) {
        const newData = new PlayerData(player.name);

        playerDB.addEntry(newData);

        await runCommand(`scoreboard players set ${player} level 1`);
        await runCommand(`scoreboard players add ${player} exp 0`);
        await runCommand(`scoreboard objectives set ${player} perkpoints 20`); 
    }
});

world.events.playerLeave.subscribe(data => {
    const player = data.playerName;

    playerDB.clearFromRAM(player);
});

world.events.beforeChat.subscribe(msg => {
    const playerSent = msg.sender;
    const content = msg.message;

    cmdHandler.handle(content, playerSent, playerDB);
});

world.events.tick.subscribe(async (data) => {
    if (data.currentTick % 5 === 0) {
        for (const p of getCurrPlayers()) {
            const playerData = playerDB.getPlayerData(p.name);
            const expToNextLvl = playerData.nextLvlExpReq - getScore('exp', p.name);
    
            let teamStr = 'Team: ';
            const teamMembers = [...playerData.getTeamMembers()];
            
            if (teamMembers.length < 2) teamStr += 'None';
            else {
                for (const member of teamMembers) {
                    teamStr += `${member} `;
                }
            }

            if (p.hasTag('joined')) {
                runCommand(
                    `titleraw ${p.name} title {"rawtext":[{"text":"§2===== ${p.name} =====\n\n§3${teamStr}"},{"text":"\nLevel: "},{ "score":{"name":"*","objective":"level"}},{"text": "\nExp To Level Up: ${expToNextLvl}"},{"text":"\nMoney: $"},{"score":{"name":"*","objective":"money"}},{"text":"\nDeaths: "},{"score":{"name":"*","objective":"player_deaths"}}]}`
                );
            }
            else {
                runCommand(
                    `titleraw ${p.name} title {"rawtext":[{"text":"§2Build Your Attributes"},{"text":"\n\n§5Points To Spend: "},{"score":{"name":"*","objective":"perkpoints"}},{"text":"\n§5Strength: "},{"score":{"name":"*","objective":"strength"}},{"text":"\n§5Endurance: "},{"score":{"name":"*","objective":"endurance"}},{"text":"\n§5Crafting: "},{"score":{"name":"*","objective":"crafting"}},{"text":"\n§5Alchemy: "},{"score":{"name":"*","objective":"alchemy"}},{"text":"\n§5Charisma: "},{"score":{"name":"*","objective":"charisma"}}]}`
                );
            }
    
            if (await playerData.levelUp()) {
                playerDB.updateEntry(playerData);
                playerDB.savePlayerData(world, playerData.name, world.scoreboard);
            }
            isPlayerNearHome(p, playerData);
            runCommand(`execute @e[name=${p.name},tag=at_home] ~~~ effect ${p.name} regeneration 5 2 true`);
        }
    }
});

world.events.blockPlace.subscribe(async data => {
    const block = data.block;
    const location = data.block.location;
    const playerPlacing = data.player;
    const playerData = playerDB.getPlayerData(playerPlacing.name);

    if (block.id === 'minecraft:campfire') {
        if (await isPlayerNearHome(playerPlacing, playerData)) {
            runCommand(`tellraw ${playerPlacing.name} {"rawtext":[{"text":"§cYou are too close to another home for that!"}]}`);
            return;
        }
        const form = new ModalFormData()
            .title('Create a New Base!')
            .textField('Base Name', 'your new base name');

        form.show(playerPlacing).then(response => {
            const newBase = new HomeBase(response.formValues[0], location);

            runCommand(`tellraw ${playerPlacing.name} {"rawtext":[{"text":"§g${newBase.name} created!"}]}`);
            runCommand(`playsound random.orb ${playerPlacing.name}`);

            playerDB.updateEntry(playerData.addHome(newBase));
            playerDB.savePlayerData(world, playerPlacing.name, world.scoreboard);
        });
    }
});

world.events.blockBreak.subscribe(data => {
    const block = data.brokenBlockPermutation.type;
    const location = data.block.location;
    const playerDestroying = data.player;

    if (block.id == 'minecraft:campfire') {
        const playerData = playerDB.getPlayerData(playerDestroying.name);
        if (!playerData.isHome(location)) return;
        
        const removedData = playerData.removeHome(location);

        runCommand(`tellraw ${playerDestroying.name} {"rawtext":[{"text":"§c${removedData.name} removed!"}]}`);
        runCommand(`playsound note.didgeridoo ${playerDestroying.name}`);
        playerDB.savePlayerData(world, playerDestroying.name, world.scoreboard);
    }
    if (block.id === 'minecraft:diamond_ore') {
        const playerData = playerDB.getPlayerData(playerDestroying.name);

        playerData.addToExp(10);
        playerDB.updateEntry(playerData);
        playerDB.savePlayerData(world, playerDestroying.name, world.scoreboard);
    }
});

world.events.itemUse.subscribe(data => {
    const playerUsing = data.source;
    const itemUsed = data.item.id;

    itemHandler.handle(playerUsing, playerDB, itemUsed);
});

world.events.beforeItemUseOn.subscribe(data => {
    const player = data.source;
    const location = data.blockLocation;
    const block = player.dimension.getBlock(location);
    const item = data.item.id;

    if (!block) return;

    // not working yet
});

async function initDB(): Promise<void> {
    await runCommand('function init');

    for (const player of world.getPlayers()) {
        if (!playerDB.hasEntry(player.name)) {
            const newData = new PlayerData(player.name);
            const oldData = await playerDB.loadDataToRAM(player.name, world.scoreboard);
            
            if (!oldData) {
                playerDB.addEntry(newData);
                return;
            }
        }
    }
}

function isPlayerNearHome(p: Player, playerData: PlayerData): boolean {
    for (const home of playerData.getHomes()) {
        if (p.location.isNear(new Location(home.x, home.y, home.z), 35)) {
            p.addTag('at_home');
            return true;
        }
        p.removeTag('at_home');
    }
    return false;
}