import { Player, Container } from 'mojang-minecraft';
import { ActionFormData, ModalFormData } from 'mojang-minecraft-ui';
import { findItemSlot, getInventoryItemCounts, runCommand, getCurrPlayers } from './helpers';
import { PlayerData, PlayerDB } from './PlayerDB';

interface ItemData {
    name: string;
    amount: number;
    data: number; 
    displayName?: string;
}

class TradeItem {
    itemName: string;
    amount: number;
    data: number;

    constructor(itemName: string, amount: number, data: number) {
        this.itemName = itemName;
        this.amount = amount;
        this.data = data;
    }
    stringify(): string {
        const name = this.itemName.split(':')
        return `- ${this.amount} ${name[1]}\n`;
    }
};

class TradeOffer {
    offered: Array<TradeItem>
    receiving: Array<TradeItem>

    constructor(itemsOffered: Array<TradeItem>, itemsReceiving: Array<TradeItem>) {
        this.offered = itemsOffered;
        this.receiving = itemsReceiving;
    }
    stringify(): string {
        let output = 'You Get:\n';

        this.offered.forEach(offer => {
            output = output.concat(offer.stringify());
        });
        output = output.concat('You Trade:\n');
        this.receiving.forEach(offer => {
            output = output.concat(offer.stringify());
        })

        return output;
    }
};

export class TradeProposal {
    offerer: Player;
    receiver: Player;
    offer: TradeOffer;

    constructor(offerer: Player, receiver: Player) {
        this.offerer = offerer;
        this.receiver = receiver;
        this.offer;
    }
    /**
     * @remarks creates the offer for a trade on construction
     */
    public async createOffer(db: PlayerDB, offererData: PlayerData, receiverData: PlayerData) {
        const offererInventory = this.offerer.getComponent('inventory').container; // container class
        const receiverInventory = this.receiver.getComponent('inventory').container;
        const offererItemCounts = getInventoryItemCounts(offererInventory);
        const receiverItemCounts = getInventoryItemCounts(receiverInventory);
        const offererItems: ItemData[] = Object.values(offererItemCounts);
        const receiverItems: ItemData[] = Object.values(receiverItemCounts);
        const offeredItems = new Array();
        const itemsReceiving = new Array();
        let offers = 0;
        let received = 0;
        
        while(true) {
            if (offers === 5) break;

            const offerForm = new ModalFormData()
                .title(`Items You Are Offering ${this.receiver.name}`)
                .dropdown('Your Offered Item', offererItems.map(i => i.name));
            const { isCanceled, formValues } = await offerForm.show(this.offerer);

            if (isCanceled) {
                break;
            }

            const [ index ] = formValues;
            const [ offeredItem ] = offererItems.splice(index, 1);
            const amountPrompt = new ModalFormData()
                .title(`Select Amount for ${offeredItem.name}`)
                .slider('Amount', 1, offeredItem.amount < 65 ? offeredItem.amount : 64, 1, 1);
            const amount = (await amountPrompt.show(this.offerer)).formValues[0];

            offeredItems.push(new TradeItem(offeredItem.name, amount, offeredItem.data));
            offers++;
        }

        while(true) {
            if (received === 5) break;

            const receivableForm = new ModalFormData()
                .title(`Items Receiving From ${this.receiver.name}`)
                .dropdown('You Receive', receiverItems.map(i => i.name));
            let { isCanceled, formValues } = await receivableForm.show(this.offerer);

            if (isCanceled) {
                break;
            }
            const [ index ] = formValues;
            const [ receiveItem ] = receiverItems.splice(index, 1);
            const amountPrompt = new ModalFormData()
                .title(`Select Amount for ${receiveItem.name}`)
                .slider('Amount', 1, receiveItem.amount, 1, 1);
            ({ isCanceled, formValues } = await amountPrompt.show(this.offerer));

            if (isCanceled) break;
            const amount = formValues[0];

            itemsReceiving.push(new TradeItem(receiveItem.name, amount, receiveItem.data));
            received++;
        }

        this.offer = new TradeOffer(offeredItems, itemsReceiving);

        runCommand(`tellraw ${this.receiver.name} {"rawtext":[{"text":"§gNEW Trade offer from §l${this.offerer.name}"}]}`);
        runCommand(`tellraw ${this.offerer.name} {"rawtext":[{"text":"§gTrade offer sent to §l${this.receiver.name}"}]}`);
        runCommand(`playsound beacon.activate ${this.offerer.name}`);

        offererData.addTradeOffered(this);
        receiverData.addTradeOffer(this);

        db.updateEntry(offererData);
        db.updateEntry(receiverData);
    }
    public async acceptOffer(): Promise<boolean> {
        const offererInventory = this.offerer.getComponent('inventory').container; // container class
        const receiverInventory = this.receiver.getComponent('inventory').container;
        const itemsTrading = this.offer.receiving;
        const itemsGetting = this.offer.offered;

        if (offererInventory.emptySlotsCount < itemsTrading.length || receiverInventory.emptySlotsCount < itemsGetting.length) {
            runCommand(`tellraw ${this.receiver.name} {"rawtext":[{"text":"§cThe trade cannot be completed at this time."}]}`);
            return false;
        }

        itemsTrading.forEach(item => {
            let { itemName, amount, data } = item;

            if (itemName.startsWith('minecraft:')) itemName = itemName.replace('minecraft:', '');
            itemName = itemName.split(' ')[0];
            runCommand(`say ${itemName}`);

            runCommand(`give ${this.offerer.name} ${itemName} ${amount} ${data}`);
            runCommand(`clear ${this.receiver.name} ${itemName} ${data} ${amount}`);
        });
        itemsGetting.forEach(item => {
            let { itemName, amount, data } = item;

            if (itemName.startsWith('minecraft:')) itemName = itemName.replace('minecraft:', '');
            itemName = itemName.split(' ')[0];

            runCommand(`give ${this.receiver.name} ${itemName} ${amount} ${data}`);
            runCommand(`clear ${this.offerer.name} ${itemName} ${data} ${amount}`);
        });

        runCommand(`tellraw ${this.offerer.name} {"rawtext":[{"text":"§2§l${this.receiver.name}, has accepted your trade offer!"}]}`);
        runCommand(`tellraw ${this.receiver.name} {"rawtext":[{"text":"§2Accepted trade offer from §l${this.offerer.name}"}]}`);
        runCommand(`playsound beacon.activate ${this.offerer.name}`);
        runCommand(`playsound beacon.activate ${this.receiver.name}`);

        return true;
    }
    public declineOffer(): boolean {
        runCommand(`tellraw ${this.offerer.name} {"rawtext":[{"text":"§c§l${this.receiver.name}, has declined your trade offer!"}]}`);
        runCommand(`tellraw ${this.receiver.name} {"rawtext":[{"text":"§gDeclined trade offer from §l${this.offerer.name}"}]}`);

        return true;
    }
    /**
     * @returns {TradeProposal} a new trade proposal that is a counter offer to be sent to the original offerer in this trade
     */
    counterOffer() {

    }
    public async display() {
        const body = this.offer.stringify();

        const form = new ActionFormData()
            .title(`Trade offer from ${this.offerer.name}`)
            .body(body)
            .button('Accept')
            .button('Decline');

        const {isCanceled, selection} = await form.show(this.receiver);
        if (isCanceled) return null;

        if(selection === 0) {
            return this.acceptOffer();
        } else {
            return this.declineOffer();
        }
        
    }
};

export async function proposeTrade(db: PlayerDB, offerer: Player, receiverName: string) {
    const receiver = getCurrPlayers().find(p => p.name === receiverName);
    const receiverData = db.getPlayerData(receiverName);

    // || receiverName === offerer.name
    if (!receiver) {
        runCommand(`tellraw ${offerer.name} {"rawtext":[{"text":"§cThere is not a player by that name to trade with!"}]}`);
        return;
    }
    if (receiverData.hasTradeOfferFrom(offerer.name)) {
        runCommand(`tellraw ${receiver.name} {"rawtext":[{"text":"§gAlready sent an offer to ${receiver.name}"}]}`);
    }

    const offererData = db.getPlayerData(offerer.name);
    const trade = new TradeProposal(offerer, receiver);

    trade.createOffer(db, offererData, receiverData);

}

export function acceptTrade(db: PlayerDB, accepter: Player, offererName: string) {
    const accepterData = db.getPlayerData(accepter.name);
    const offererData = db.getPlayerData(offererName);

    if (!accepterData.hasTradeOfferFrom(offererName) || !offererData) {
        runCommand(`tellraw ${accepter.name} {"rawtext":[{"text":"§cYou do not have an existing offer from them!"}]}`);
        return;
    }

    const trade = accepterData.getTradeOfferFrom(offererName);
    trade.acceptOffer();

    updateTraderData(db, accepterData, offererData);
}

export function declineTrade(db: PlayerDB, decliner: Player, offererName: string) {
    const declinerData = db.getPlayerData(decliner.name);
    const offererData = db.getPlayerData(offererName);

    if (!isPlayerArgValid(declinerData, offererData?.name, offererData)) return;

    runCommand(`tellraw ${offererName} {"rawtext":[{"text":"§c§l${decliner.name}, has declined your trade offer!"}]}`);
    runCommand(`tellraw ${decliner.name} {"rawtext":[{"text":"§gDeclined trade offer from §l${offererName}"}]}`);

    updateTraderData(db, declinerData, offererData);
}

export function cancelTrade(db: PlayerDB, canceller: Player, receiverName: string) {
    const cancellerData = db.getPlayerData(canceller.name);
    const receiverData = db.getPlayerData(receiverName);

    if (!isPlayerArgValid(cancellerData, receiverName, receiverData)) return;

    runCommand(`tellraw ${receiverName} {"rawtext":[{"text":"§gTrade offer from §l${canceller.name} was cancelled!"}]}`);
    runCommand(`tellraw ${canceller.name} {"rawtext":[{"text":"§2Cancelled trade offer to §l${receiverName}"}]}`);

    updateTraderData(db, cancellerData, receiverData);
}

export async function viewOffer(db: PlayerDB, receiver: Player, offererName: string) {
    const receiverData = db.getPlayerData(receiver.name);
    const offererData = db.getPlayerData(offererName);
    
    if(!isPlayerArgValid(receiverData, offererName, offererData)) return;

    const trade = receiverData.getTradeOfferFrom(offererName);
    const result = await trade.display();
    if (result) updateTraderData(db, receiverData, offererData);
}

/** HELPER TRADING FUNCTIONS */

function isPlayerArgValid(originData: PlayerData, playerName: string, isPlayerInGame: any): boolean {
    if (!originData.hasTradeOfferFrom(playerName) || !isPlayerInGame) {
        runCommand(`tellraw ${originData.name} {"rawtext":[{"text":"§cYou do not have an existing offer from them!"}]}`);
        return false;
    }
    return true;
}

function updateTraderData(db: PlayerDB, originData: PlayerData, playerArgData: PlayerData) {
    originData.removeTradeOfferFrom(playerArgData.name);
    playerArgData.removeTradeOfferedTo(originData.name);
    db.updateEntry(originData);
    db.updateEntry(playerArgData);
}