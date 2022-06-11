import { ActionFormData } from "mojang-minecraft-ui";
import { Player } from "mojang-minecraft";
import { getScore, runCommand } from "./helpers";
import { PlayerData } from "PlayerDB";

type PerkCategory = 'strength' | 'endurance' | 'alchemy' | 'crafting' | 'charisma';

class Perk {
    readonly name: string;
    readonly description: string;
    nextPerk: any;

    constructor(name: string, description: string, nextPerk: any = null) {
        this.name = name;
        this.description = description;
        this.nextPerk = nextPerk;
    }

    async buildForm(origin: Player, playerData: PlayerData, category: PerkCategory, canUpgrade: boolean): Promise<PlayerData> {
        const form = new ActionFormData().title(this.name).body(this.description);
        const unlockable = (!playerData.hasPerk(category, this.name)) && (getScore('perkpoints', origin.name) > 0) && canUpgrade;

        unlockable ? form.button('Unlock') : form.button('Cancel');

        const res = await form.show(origin);
        const {selection, isCanceled} = res;
        if (isCanceled) return playerData;

        if (unlockable) {
            runCommand(`scoreboard players remove ${origin.name} perkpoints 1`);
            playerData.addPerk(category, this.name);
            runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§g${this.name} Unlocked!"}]}`);
            runCommand(`playsound beacon.activate ${origin.name}`);
        }
        return playerData;
    }
}

class PerkList {
    readonly listName: string;
    firstPerk: Perk;

    constructor(listName: string, firstPerk: Perk) {
        this.listName = listName;
        this.firstPerk = firstPerk;
    }

    addPerk(name: string, description: string) {
        const newPerk = new Perk(name, description, this.firstPerk);

        this.firstPerk = newPerk;
    }
    *getPerks() {
        let currPerk = this.firstPerk;
        while(currPerk) {
            yield currPerk;
            currPerk = currPerk.nextPerk;
        }
    }

    buildActionForm(): ActionFormData {
        const form = new ActionFormData()
            .title(this.listName);
        
        for (const perk of this.getPerks()) {
            const {name} = perk;
            form.button(name);
        }

        return form;
    }
    static createPerkList(listName: string, perksList: Array<any>): PerkList {
        const [firstPerk] = perksList.slice(0, 1); 
        const perkList = new PerkList(listName, new Perk(firstPerk.name, firstPerk.description));

        for (const perk of perksList) {
            perkList.addPerk(perk.name, perk.description);
        }

        return perkList;
    }
}

const rawStrengthPerks = [
    {
        name: 'Iron Belly',
        description: 'Raw meats no longer poison you'
    },
    {
        name: 'Undying',
        description: 'When at critical health, you gain 5 seconds of invincibility'
    },
    {
        name: 'Bulletproof',
        description: 'You take 15% less damage from projectile attacks'
    }, 
    {
        name: 'Strongman',
        description: 'Increases carrying capacity by 5%'
    },
    {
        name: 'Pack-a-Punch',
        description: 'Damage given from melee attacks increased by 10%'
    }
]
const rawEndurancePerks = [
    {
        name: 'test',
        description: 'This is a test'
    }
];
const rawAlchemyPerks = [{}];
const rawCraftingPerks = [{}];
const rawCharismaPerks = [{}];

export const strengthPerks = PerkList.createPerkList('Strength Perks', rawStrengthPerks);
export const endurancePerks = PerkList.createPerkList('Endurance Perks', rawEndurancePerks);
export const alchemyPerks = PerkList.createPerkList('Alchemy Perks', rawAlchemyPerks);
export const craftingPerks = PerkList.createPerkList('Crafting Perks', rawCraftingPerks);
export const charismaPerks = PerkList.createPerkList('Charisma Perks', rawCharismaPerks);
