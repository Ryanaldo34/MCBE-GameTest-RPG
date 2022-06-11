import { Command } from "./Command.js";
import { runCommand } from "../helpers";

export const teamCmd = new Command(
    'team',
    'Add a player to your team',
    (origin, args, db) => {
        const option = args[0];

        switch(option) {
            case 'join':
                const inviter = args[1];
                const playerData = db.getPlayerData(origin.name);
                const inviterData = db.getPlayerData(inviter);

                if (playerData.isInTeam()) {
                    runCommand(
                        `tellraw ${origin.name} {"rawtext":[{"text":"§gYou need to leave you current team first!"}]}`
                    );
                    return;
                }

                if (playerData.hasInviteFrom(inviter)) {
                    const teamMembers = [...inviterData.getTeamMembers()];

                    inviterData.addToTeam(origin.name);
                    playerData.joinTeam(teamMembers, inviter);
                    runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§aJoined §l${inviter}\`s team!"}]}`);
                }
                else {
                    runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§cNo invite from §l${inviter}"}]}`);
                }
                break;
            case 'invite':
                const playerInvited = args[1];
                const pInvitedData = db.getPlayerData(playerInvited);
                const invite = origin.name;
                const inviteData = db.getPlayerData(invite);

                if (!pInvitedData || playerInvited === invite) {
                    runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§cThere is no player by the name of: §l${playerInvited}"}]}`);
                    return;
                }

                if (pInvitedData.hasInviteFrom(invite) || inviteData.hasTeamMember(playerInvited)) {
                    runCommand(`tellraw ${invite} {"rawtext":[{"text":"§gAlready invited §l${playerInvited}"}]}`);
                    return;
                }

                runCommand(
                    `tellraw ${playerInvited} {"rawtext":[{"text":"§aYou have been invited to join §l${invite}\`s team!"}]}`
                );
                runCommand(`tellraw ${invite} {"rawtext":[{"text":"§aInvite Sent to §l${playerInvited}"}]}`);
                pInvitedData.addPendingInvite(origin.name);
                db.updateEntry(pInvitedData);
                break;
            case 'leave':
                const player = db.getPlayerData(origin.name);

                if (!player.isInTeam()) {
                    runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§cYou aren't in a team!"}]}`);
                    return;
                }

                player.leaveTeam();
                db.updateEntry(player);
                runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§gYou have left your team!"}]}`);
                break;
            default:
                runCommand(`tellraw ${origin.name} {"rawtext":[{"text":"§cInvalid arg for team!"}]}`);
        }
    }
)