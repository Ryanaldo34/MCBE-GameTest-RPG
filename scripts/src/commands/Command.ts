import { Player } from 'mojang-minecraft';
import { PlayerDB } from '../PlayerDB';

type PermLvl = 'owner' | 'admin' | 'moderator' | 'player';

interface CmdOptions {
    permission: PermLvl;
    excludeFromHelp: boolean;
}

export class Command {
    name: string;
    description: string;
    options: CmdOptions;
    run: (origin: Player, args: Array<string>, db: PlayerDB) => void;
    subCmds: Map<string, Command>;

    constructor(name: string, description: string, options: CmdOptions, run: (origin: Player, args: Array<string>, db: PlayerDB) => void) {
        this.name = name;
        this.description = description;
        this.options = options;
        this.run = run;
        this.subCmds = new Map();
    }
    registerSubCmd(cmd: Command): void {
        this.subCmds.set(cmd.name, cmd);
    }
}