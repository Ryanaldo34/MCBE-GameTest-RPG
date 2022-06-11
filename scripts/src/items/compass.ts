import { ActionFormData } from 'mojang-minecraft-ui';
import { runCommand } from '../helpers';

export default async function compass(origin, db) {
    const tpForm = new ActionFormData().title('Base Teleport Selector');
    const playerData = db.getPlayerData(origin.nameTag);
    const playerHomes = [...playerData.getHomes()];
    
    for (const home of playerHomes) {
        tpForm.button(home.name);
    }

    if (playerHomes.length > 0) {
        const res = await tpForm.show(origin);
        if (res.isCanceled) return;
        const base = playerHomes[res.selection];
        
        runCommand(`tp ${origin.name} ${base.x + 1} ${base.y} ${base.z}`);
    }
    else {
        runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§dYou have no bases to TP to!"}]}`);
    }
}