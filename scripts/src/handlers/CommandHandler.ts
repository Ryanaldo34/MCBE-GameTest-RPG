import { teamCmd } from '../commands/team';
import { tradeCmd } from '../commands/trade';
import { runCommand } from '../helpers';
import { Command } from '../commands/Command';
import { Player } from 'mojang-minecraft';
import { PlayerDB } from '../PlayerDB';

class CommandHandler {
    prefix: string;
    commands: Map<string, Command>;

    constructor(prefix: string) {
        this.prefix = prefix;
        this.commands = new Map();
    }
    /**
     * @returns {boolean} if the message is a command
     */
    private isCommand(msg: string): boolean {
        return true ? msg.startsWith(this.prefix) : false;
    }
    /**
     * @remarks Adds a command to be handled
     */
    public addCommand(name, command: Command) {
        this.commands.set(name, command);
        return this;
    }
    public handle(msg: string, origin: Player, db: PlayerDB) {
        if (!this.isCommand(msg)) return;

        const cmdName = msg.split(' ').splice(0, 1)[0].replace(this.prefix, '');
        const args = msg.split(' ').splice(1)
        const cmd = this.commands.get(cmdName);

        if (!cmd) {
            runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§c${cmdName} is not a valid command!"}]}`)
            return;
        };

        cmd.run(origin, args, db);
    }
};

export const cmdHandler = new CommandHandler('#')
    .addCommand(teamCmd.name, teamCmd)
    .addCommand(tradeCmd.name, tradeCmd);