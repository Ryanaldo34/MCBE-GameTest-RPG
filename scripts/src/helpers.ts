import { world, Container, Player, CommandResult} from "mojang-minecraft";

 export function getScore(objective: string, player: string): number {
    const scoreboard = world.scoreboard.getObjective(objective);
    const scores = scoreboard.getScores();
    let pScore: number;

    for (const score of scores) {
        if (score.participant.displayName === player) {
            pScore = score.score;
            break;
        }
    }
    return pScore;
}

export function getCurrPlayers(): Player[] {
    return [...world.getPlayers()];
}

 export async function runCommand(cmd: string): Promise<CommandResult> {
        return world.getDimension('overworld').runCommandAsync(cmd);
}

export function findItemSlot(entityInventory: Container, targetItemId: string): number | null {
    const { size } = entityInventory;

    for (let i = 0; i < size; i++) {
        const item = entityInventory.getItem(i);
        if (item.id === targetItemId) {
            return i;
        }
    }
    return null;
}

interface ItemData {
    name: string;
    amount: number;
    data: number; 
}

export function getInventoryItemCounts(entityInventory: Container) {
    const { size, emptySlotsCount } = entityInventory;
    const itemCountObj = {};

    if (emptySlotsCount === size) return null;

    for (let i = 0; i < size; i++) {
        if (entityInventory.getItem(i) === undefined) continue;

        const { id, amount, data} = entityInventory.getItem(i);
        const itemName = `${id} ${data}`;
        
        if (itemName in itemCountObj) {
            itemCountObj[itemName].amount += amount;
        }
        else {
            const itemData: ItemData = { name: itemName, amount: amount, data: data };
            itemCountObj[itemName] = itemData
        }
    }
    return itemCountObj;
}