import { Entity, Player } from "mojang-minecraft";
import { PlayerDB } from "../PlayerDB";
import compass from "../items/compass";
import paper from "../items/paper";
import stick from "../items/stick";

type Origin = Player | Entity;

class ItemHandler {
    private events: Map<string, (origin: Origin, db: PlayerDB) => void>;

    constructor () {
        this.events = new Map();
    }

    register(itemId: string, func: (origin: Origin, db: PlayerDB) => void) {
        this.events.set(itemId, func);
    }

    handle(origin: Origin, db: PlayerDB, itemId: string) {
        if (!this.events.has(itemId)) return;

        const func = this.events.get(itemId);
        func(origin, db);
    }
}

export const itemHandler = new ItemHandler();

itemHandler.register('minecraft:compass', compass);
itemHandler.register('minecraft:paper', paper);
itemHandler.register('minecraft:stick', stick);