import {world} from 'mojang-minecraft';
import { getScore, runCommand } from "../helpers";
import { MessageFormData, ActionFormData, ModalFormData } from "mojang-minecraft-ui";
import { strengthPerks, endurancePerks, alchemyPerks, craftingPerks, charismaPerks } from '../perks';

const categories = new Map()
    .set(0, {cat: 'strength', list: strengthPerks})
    .set(1, {cat: 'endurance', list: endurancePerks})
    .set(2, {cat: 'alchemy', list: alchemyPerks})
    .set(3, {cat: 'crafting', list: craftingPerks})
    .set(4, {cat: 'charisma', list: charismaPerks});

const attributes = [ 'Strength', 'Endurance', 'Alchemy', 'Crafting', 'Charisma' ];

export default async function paper(origin, db) {
    let playerData = db.getPlayerData(origin.name);
    const perkPoints = getScore('perkpoints', origin.name)
    const form = new MessageFormData()
        .title('Player Progression')
        .body(
            `Current Level: ${getScore('level', origin.name)}\nPerk Points Available: ${perkPoints}\nStrength Level: ${getScore('strength', origin.name)}\nEndurance Level: ${getScore('endurance', origin.name)}\nAlchemy Level: ${getScore('alchemy', origin.name)}\nCrafting Level: ${getScore('crafting', origin.name)}\nCharisma Level: ${getScore('charisma', origin.name)}`
        )
        .button1('See Perks')
        .button2('See Attributes');
    const res = await form.show(origin);
    let { isCanceled, selection } = res;
    if (isCanceled) return;

    if (selection === 0 && !isCanceled) {
        const attributeForm = new ModalFormData()
            .title('Upgrade Attributes')
            .dropdown('Select Attribute', attributes)

        const res = await attributeForm.show(origin);
        if (res.isCanceled) return;
        const [ choice ] = res.formValues;
        const attr = attributes[choice].toLowerCase()
        let score = getScore(attr, origin.name);

        if (perkPoints < 1 || score === 10) {
            const errMsg = perkPoints < 1 ? '§cYou do not have any perk points for that!' : `§g${attr} is already maxxed!`
            runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"${errMsg}"}]}`);
            return; 
        }
        else {
            await runCommand(`scoreboard players add ${origin.name} ${attr} 1`);
            runCommand(`scoreboard players remove ${origin.name} perkpoints 1`);
            runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§g${attr} upgraded to ${score += 1}!"}]}`);
            runCommand(`playsound beacon.activate ${origin.name}`);
            await runCommand(`effect ${origin.name} clear`);
            origin.triggerEvent(`minecraft:${attr}${score}`);
        }
    }

    if (selection === 1) {
        const perkForm = new ActionFormData()
            .title('Perk Viewer')
            .body('Choose perk category')
            .button('Strength')
            .button('Endurance')
            .button('Alchemy')
            .button('Crafting')
            .button('Charisma');

        const perkRes = await perkForm.show(origin);
        if (perkRes.isCanceled) return;
        const {cat, list} = categories.get(perkRes.selection);
        const attrLvl = getScore(cat, origin.name);

        const perks = [...list.getPerks()];
        const res = await list.buildActionForm().show(origin);
        if(res.isCanceled) return;
        const selectedPerk = perks[res.selection];
        const canUpgrade = res.selection <= attrLvl;

        playerData = await selectedPerk.buildForm(origin, playerData, cat, canUpgrade);
        db.updateEntry(playerData);
        db.savePlayerData(world, origin.name, world.scoreboard);
    }
}