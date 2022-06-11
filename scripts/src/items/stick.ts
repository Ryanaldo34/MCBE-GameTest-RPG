import { Player, Entity } from "mojang-minecraft";
import { ActionFormData, ModalFormData } from "mojang-minecraft-ui";
import { runCommand } from "../helpers";
import { PlayerDB } from "../PlayerDB";
import { proposeTrade, viewOffer } from "../trades";

/**
 * 
 * @param {Player} origin 
 * @param {PlayerDB} db 
 */

export default async function stick(origin: Player, db: PlayerDB) {
    const playerReceivingData = db.getPlayerData(origin.name);
    const selectionForm = new ActionFormData()
        .title('Trade Manager')
        .button('Make Trade Offer')
        .button('View Trade Offer');

    const {isCanceled, selection} = await selectionForm.show(origin);

    if (isCanceled) return;

    if (selection === 0) {
        const getReceiverForm = new ModalFormData()
            .title('Propose Trade')
            .textField('Player Name', 'Enter the player name');

        const playerReceiving = (await getReceiverForm.show(origin)).formValues[0];
        proposeTrade(db, origin, playerReceiving);
    } 
    else {
        const offers = [...playerReceivingData.getTradeOffers()];
        if (offers.length === 0) {
            runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§cYou have no trade offers at this time!"}]}`);
            return;
        }
        const tradesForm = new ActionFormData()
        .title('Trade Offers')
        for (const offer of offers) {
            tradesForm.button(offer.offerer.name);
        }

        let { isCanceled, selection } = await tradesForm.show(origin);
        if (isCanceled) return;
        const playerOffering = offers[selection].offerer.name;

        viewOffer(db, origin, playerOffering);
    }
}