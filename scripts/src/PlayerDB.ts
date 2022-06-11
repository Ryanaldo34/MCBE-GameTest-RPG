import { BlockLocation, Scoreboard, World } from "mojang-minecraft";
import { runCommand, getScore } from "./helpers";
import { TradeProposal } from './trades';

type PlayerName = string;
type PerkCategory = 'strength' | 'endurance' | 'alchemy' | 'crafting' | 'charisma';

interface HomeJSONData {
    name: string;
    location: number[];
}

export class HomeBase {
    name: string;
    readonly location: Array<number>;

    constructor(name: string, location: BlockLocation) {
        this.location = [location.x, location.y, location.z];
        this.name = name;
    }
    public changeName(newName: string) {
        this.name = newName;
    }
    public get x() {
        return this.location[0];
    }
    public get y() {
        return this.location[1];
    }
    public get z() {
        return this.location[2];
    }
    toJSON(): HomeJSONData {
        return {
            name: this.name,
            location: this.location
        }
    }
}

interface PlayerJSONData {
    name: PlayerName;
    homes: Array<HomeJSONData>;
    team: PlayerName[];
    perks: {
        strength: string[];
        endurance: string[];
        alchemy: string[];
        crafting: string[];
        charisma: string[];
    };
}

interface PerkData {
    'strength': string[],
    'endurance': string[],
    'alchemy': string[],
    'crafting': string[],
    'charisma': string[]
}

 export class PlayerData {
    name: PlayerName;
    homes: Array<HomeBase>;
    team: Array<PlayerName>;
    pendingInvites: Array<PlayerName>;
    tradeOffers: Array<TradeProposal>;
    tradesOffered: Array<TradeProposal>;
    perks: PerkData;
    nextLvlExpReq: number;

    constructor(name: string) {
        this.name = name;
        this.homes = new Array();
        this.team = [this.name];
        this.pendingInvites = new Array();
        this.tradeOffers = new Array();
        this.tradesOffered = new Array();
        this.perks = {
            'strength': [],
            'endurance': [],
            'alchemy': [],
            'crafting': [],
            'charisma': []
        };
        this.nextLvlExpReq = this.calcNextLvlReq();
    }

    private calcNextLvlReq(): number {
        const lvl = getScore('level', this.name);

        return 50 * (lvl - 1) + 25;
    }

    async levelUp(): Promise<boolean> {
        const currExp = getScore('exp', this.name);
        const newExp = currExp - this.nextLvlExpReq;

        if (newExp < 0) return false;

        await runCommand(`scoreboard players add ${this.name} level 1`);
        await runCommand(`scoreboard players add ${this.name} perkpoints 1`);
        runCommand(`playsound beacon.activate ${this.name}`);
        runCommand(`tellraw ${this.name} {"rawtext":[{"text":"§gLEVEL UP!"}]}`);
        await runCommand(`scoreboard players set ${this.name} exp ${newExp}`);
        this.nextLvlExpReq = this.calcNextLvlReq(); // update data in database

        return true;
    }

    addToExp(amount: number) {
        runCommand(`scoreboard players add ${this.name} exp ${amount}`);
    }

    addHome(newHome: HomeBase): PlayerData {
        this.homes.push(newHome);
        return this;
    }

    addToTeam(newMember: PlayerName) {
        this.team.push(newMember)
    }

    addPerk(category: PerkCategory, perk: string) {
        this.perks[category].push(perk);
    }

    addTradeOffered(tradeOffer: TradeProposal) {
        this.tradesOffered.push(tradeOffer);
    }

    addTradeOffer(tradeOffer: TradeProposal) {
        this.tradeOffers.push(tradeOffer);
    }

    joinTeam(newTeam: Array<PlayerName>, inviter: PlayerName) {
        this.team = newTeam;
        this.pendingInvites.splice(this.pendingInvites.findIndex(p => p === inviter), 1);
    }

    hasTeamMember(teamMember: PlayerName): boolean {
        return this.team.includes(teamMember);
    }

    hasPerk(category: PerkCategory, perk: string): boolean {
        return this.perks[category].includes(perk);
    }

    *getTeamMembers(): Generator<PlayerName> {
        for (const member of this.team) {
            yield member;
        }
    }
    /**
     * @remarks the player leaves their current team
     */
    leaveTeam() {
        this.team = [this.name];
    }

    isInTeam(): boolean {
        return this.team.length > 1;
    }

    addPendingInvite(playerInvited: PlayerName) {
        this.pendingInvites.push(playerInvited);
    }

    public hasInviteFrom(playerName: PlayerName): boolean {
        return this.pendingInvites.includes(playerName);
    }

    public hasTradeOfferFrom(playerName: PlayerName): boolean {
        let hasOffer = false;
        
        if (this.tradeOffers.find( offer => offer.offerer.name === playerName )) {
            hasOffer = true;
        }

        return hasOffer;
    }

    public removeHome(target: BlockLocation): HomeBase {
        const i = this.homes.findIndex(home => home.x === target.x && home.y === target.y && home.z === target.z)
        const removed = this.homes[i];
        this.homes.splice(i, 1);
        return removed;
    }

    public removeTradeOfferedTo(pRecievingName: PlayerName) {
        this.tradesOffered.splice(this.tradesOffered.findIndex(offer => offer.offerer.name === pRecievingName), 1);
    }

    public removeTradeOfferFrom(pOfferedName: PlayerName) {
        this.tradeOffers.splice(this.tradeOffers.findIndex(offer => offer.offerer.name === pOfferedName), 1);
    }

    public getTradeOfferFrom(offererName: PlayerName): TradeProposal {
        if (!this.hasTradeOfferFrom(offererName)) return;

        return this.tradeOffers.find(offer => offer.offerer.name === offererName);
    }

    public isHome(target: BlockLocation): boolean {
        const valid = this.homes.filter(home => home.x === target.x && home.y === target.y && home.z === target.z);
            
        return true ? valid.length > 0 : false;
    }

    public *getHomes() {
        for (const home of this.homes) {
            yield home;
        }
    }
    public *getTradeOffers() {
        for (const offer of this.tradeOffers) {
            yield offer;
        }
    }
    toJSON(): PlayerJSONData {
        return {
            name: this.name,
            homes: this.homes,
            team: this.team,
            perks: {
                strength: this.perks['strength'],
                endurance: this.perks['endurance'],
                alchemy: this.perks['alchemy'],
                crafting: this.perks['crafting'],
                charisma: this.perks['charisma']
            }
        }
    }
}

type BinaryString = string;

export class PlayerDB {
    entries: Array<PlayerData>

    constructor() {
        this.entries = [];
    }

    private textToBinary(str: string): BinaryString {
        return str.split('').map(char => char.charCodeAt(0).toString(2)).join('_');
    }

    private binaryToText(code: BinaryString): string {
        return code.split('_').map(char => String.fromCharCode(parseInt(char, 2))).join('');
    }

    private getOldData(playerName: PlayerName, scoreboard: Scoreboard): PlayerJSONData {
        const data = scoreboard.getObjective('db').getParticipants()
            .map(data => data.displayName.trim())
            .find(data => JSON.parse(this.binaryToText(data)).name === playerName);

        const parsedData = JSON.parse(this.binaryToText(data))! as PlayerJSONData;

        return parsedData;
    }

    public async loadDataToRAM(playerName: PlayerName, scoreboard: Scoreboard): Promise<PlayerData> {
        let data = this.getOldData(playerName, scoreboard);

        if(!data) return null;
        
        const newData = new PlayerData(data.name);

        for (let i = 0; i < data.homes.length; i++) {
            const home = data.homes[i];
            const [x, y, z] = home.location;
            const location = new BlockLocation(x, y, z);
            const newHome = new HomeBase(home.name, location);
            newData.addHome(newHome);
        }
        newData.team = data.team;
        newData.perks['strength'] = data.perks.strength;
        newData.perks['endurance'] = data.perks.endurance;
        newData.perks['alchemy'] = data.perks.alchemy;
        newData.perks['crafting'] = data.perks.crafting;
        newData.perks['charisma'] = data.perks.charisma;
        this.addEntry(newData);
        runCommand(`say loaded ${JSON.stringify(newData)}`);

        return newData;
    }

    public clearFromRAM(playerName: string) {
        const data = this.getPlayerData(playerName);
        this.entries.splice(this.entries.findIndex(p => p.name === data.name), 1);
    }

    public getPlayerData(target: PlayerName): PlayerData {
        return this.entries.find(data => data.name === target)
    }

    public addEntry(data: PlayerData) {
        this.entries.push(data);
    }

    public hasEntry(target: PlayerName): boolean {
        for (const player of this.entries) {
            if (player.name === target) {
                return true;
            }
        }
        return false;
    }

    public updateEntry(newData: PlayerData) {
        const location = this.entries.findIndex(data => data.name === newData.name);
        this.entries[location] = newData;
    }

    /**
     * @remarks Saves player data to the world scoreboard
     */
    public savePlayerData(world: World, playerName: PlayerName, scoreboard: Scoreboard) {
        // all players are the json string data of a player
        const oldData = scoreboard.getObjective('db').getParticipants()
            .map(data => data.displayName.trim())
            .find(data => JSON.parse(this.binaryToText(data)).name === playerName);
        const newData = this.getPlayerData(playerName);
        const jsonObj = this.textToBinary(JSON.stringify(newData));

        // if the player has not yet been saved to the world data
        if (!oldData) {
            world.getDimension('overworld').runCommand(`scoreboard players set "${jsonObj}" db 0`);
            return;
        }
        world.getDimension('overworld').runCommand(`scoreboard players set "${jsonObj}" db 0`);
        world.getDimension('overworld').runCommand(`scoreboard players reset "${oldData}" db`);
    }
}