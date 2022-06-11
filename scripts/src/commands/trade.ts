import { Command } from "./Command";
import { proposeTrade, acceptTrade, declineTrade, cancelTrade, viewOffer } from '../trades'

export const tradeCmd = new Command(
    'trade',
    'description',
    (origin, args, db) => {
        const option = args[0];
        const playerInvolved = args[1];

        if (!playerInvolved) return;

        switch(option) {
            case 'propose':
                proposeTrade(db, origin, playerInvolved);
                break;
            case 'accept':
                acceptTrade(db, origin, playerInvolved);
                break;
            case 'decline':
                declineTrade(db, origin, playerInvolved);
                break;
            case 'cancel':
                cancelTrade(db, origin, playerInvolved);
                break;
            case 'view':
                viewOffer(db, origin, playerInvolved);
                break;
            default:
                return;
        }
    }
);