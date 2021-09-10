const ioClient = require('socket.io-client');

let Config = undefined
eval(LoadResourceFile(GetCurrentResourceName(), "config.js"));

const socket = ioClient(Config.socket, {
    query: `authentication=${Config.discordID}&authKey=${Config.authKey}`
});

socket.on('connect', (data) => {
    console.log(`Connected to the staff panel`);
    socket.emit("updatePlayers", GetPlayers());
    socket.emit("updateActions", Config.customActions);
});

socket.on("connect_error", (err) => {
    console.log(err.message);
});

socket.on("customAction", (data) => {
    for (let action of Config.customActions) {
        if (action.name === data.type) {
            console.log(`${data.type} was executed by ${data.staffUser.displayName}` )
            action.callback(data);
            break
        };
    };
});

socket.on("reloadConfig", async () => {
    eval(LoadResourceFile(GetCurrentResourceName(), "config.js"));
    socket.emit("updateActions", Config.customActions);
});

onNet("StaffPanel:Notify", (staff, message) => {
    socket.emit("showNotification", staff, {
        text: message,
        duration: 3000,
        pos: 'bottom-right'
    });
})

onNet("playerConnecting", async (name, setKickReason, deferrals, source) => {
    deferrals.defer();

    const player = global.source;

    socket.emit("getJoinStatus", playerInfo(player), (data) => {
        if (data.allow) return deferrals.done();
        deferrals.done(data.reason);
    });
});

onNet("playerDropped", async (reason) => {
    const player = global.source;
    socket.emit("playerDropped", playerInfo(player));
    socket.emit("updatePlayers", GetPlayers());
});

onNet("playerJoining", async (reason) => {
    const player = global.source;
    socket.emit("playerConnecting", playerInfo(player));
    socket.emit("updatePlayers", GetPlayers());
});

socket.on("updatePlayers", () => {
    socket.emit("updatePlayers", GetPlayers());
});

onNet("BanPlayer", (license, reason) => {
    const data = {
        staffMember: "826251845932023828",
        bannedTill: "0",
        member: license,
        reason: reason,
        type: "ban"
    };

    socket.emit("resourceController", data, (result) => {
        if (result.error) {
            console.log("resourceController")
            console.log(result)
        };
    });
})

socket.on("moderationAction", (data) => {
    if (data.type == "warn") {
        for (let player of GetPlayers2()) {
            if (getLicense(player) == data.license) {
                emitNet("chat:addMessage", player, {
                    args: [`^1Staff Panel: ^3You have been warned for ^4${data.reason}`]
                });
            };
        };
    } else if (data.type == "kick") {
        for (let player of GetPlayers2()) {
            if (getLicense(player) == data.license) {
                DropPlayer(player, `You have been kicked (${data.reason})`);
            };
        };
    } else if (data.type == "ban") {
        for (let player of GetPlayers2()) {
            if (getLicense(player) == data.license) {
                DropPlayer(player, `You have been banned (${data.reason})\nBan ID: ${data.id}`);
            };
        };
    };
});

RegisterCommand("warn", (source, args, raw) => {
    if (GetPlayerName(args[0] || "")) {
        const data = {
            staffMember: getDiscord(source),
            member: getLicense(args[0]),
            reason: args.splice(1).join(" "),
            type: "warn"
        };

        socket.emit("resourceController", data, (result) => {
            if (result.error) {
                if (result.code == 401) {
                    emitNet("chat:addMessage", source, {
                        args: [`^1Staff Panel: ^3You aren't authorized to use this command.`]
                    });
                }
            } else {
                emitNet("chat:addMessage", source, {
                    args: [`^1Staff Panel: ^4${GetPlayerName(args[0])} ^3has been warned for ^4${data.reason}`]
                });
            };
        });
    } else {
        emitNet("chat:addMessage", source, {
            args: [`^1Staff Panel: ^4${args[0]} ^3is not a valid player ID`]
        });
    }
})

RegisterCommand("kick", (source, args, raw) => {
    const name = GetPlayerName(args[0])

    if (GetPlayerName(args[0] || "")) {
        const data = {
            staffMember: getDiscord(source),
            member: getLicense(args[0]),
            reason: args.splice(1).join(" "),
            type: "kick"
        };

        socket.emit("resourceController", data, (result) => {
            if (result.error) {
                if (result.code == 401) {
                    emitNet("chat:addMessage", source, {
                        args: [`^1Staff Panel: ^3You aren't authorized to use this command.`]
                    });
                }
            } else {
                emitNet("chat:addMessage", source, {
                    args: [`^1Staff Panel: ^4${name} ^3has been kicked for ^4${data.reason}`]
                });
            };
        });
    } else {
        emitNet("chat:addMessage", source, {
            args: [`^1Staff Panel: ^4${args[0]} ^3is not a valid player ID`]
        });
    }
})

RegisterCommand("ban", (source, args, raw) => {
    const name = GetPlayerName(args[0])
    if (GetPlayerName(args[0] || "")) {
        const data = {
            staffMember: getDiscord(source),
            bannedTill: parseInt(args[1]),
            member: getLicense(args[0]),
            reason: args.splice(2).join(" "),
            type: "ban"
        };

        socket.emit("resourceController", data, (result) => {
            if (result.error) {
                if (result.code == 401) {
                    emitNet("chat:addMessage", source, {
                        args: [`^1Staff Panel: ^3You aren't authorized to use this command.`]
                    });
                } else if (result.code == 400) {
                    emitNet("chat:addMessage", source, {
                        args: [`^1Staff Panel: ^3Invalid command ussage! /ban userID days reason`]
                    });
                }
            } else {
                emitNet("chat:addMessage", source, {
                    args: [`^1Staff Panel: ^4${name} ^3has been banned for ^4${data.reason}`]
                });
            };
        });
    } else {
        emitNet("chat:addMessage", source, {
            args: [`^1Staff Panel: ^4${args[0]} ^3is not a valid player ID`]
        });
    }
})

function GetPlayers() {
    if (Config.devMode) {
        return [{
            id: 1,
            ping: 25,
            name: "your a nerd",
            identifiers: ["license:test", "steam:test", "discord:test"],
            tokens: []
        }]
    } else {
        const outPlayers = [];
        const num = GetNumPlayerIndices();
    
        for (let i = 0; i < num; i++) {
            const playerId = GetPlayerFromIndex(i);
    
            let info = [];
            let tokens = [];
            for (let i2 = 0; i2 < GetNumPlayerIdentifiers(playerId); i2++) {
                info.push(GetPlayerIdentifier(playerId, i2));
            };
    
            for (let i2 = 0; i2 < GetNumPlayerTokens(playerId); i2++) {
                tokens.push(GetPlayerToken(playerId, i2));
            }
    
            outPlayers.push({
                id: playerId,
                ping: GetPlayerPing(playerId),
                name: GetPlayerName(playerId),
                identifiers: info,
                tokens: tokens
            });
        };
    
        return outPlayers
    }
};

function GetPlayers2() {
    const outPlayers = [];
    const num = GetNumPlayerIndices();

    for (let i = 0; i < num; i++) {
        outPlayers.push(GetPlayerFromIndex(i))
    };

    return outPlayers;
};

function playerInfo(source) {
    let info = [];
    let tokens = [];

    for (let i2 = 0; i2 < GetNumPlayerIdentifiers(source); i2++) {
        info.push(GetPlayerIdentifier(source, i2));
    };
 
    for (let i2 = 0; i2 < GetNumPlayerTokens(source); i2++) {
        tokens.push(GetPlayerToken(source, i2));
    }

    return {
        ping: GetPlayerPing(source),
        name: GetPlayerName(source),
        identifiers: info,
        tokens: tokens,
        authKey: Config.authKey
    }
}

function getLicense(source) {
    for (let i = 0; i < GetNumPlayerIdentifiers(source); i++) {
        const identifier = GetPlayerIdentifier(source, i);
        if (identifier && identifier.startsWith("license:")) return identifier.split(":")[1];
    };
};

function getDiscord(source) {
    for (let i = 0; i < GetNumPlayerIdentifiers(source); i++) {
        const identifier = GetPlayerIdentifier(source, i);
        if (identifier && identifier.startsWith("discord:")) return identifier.split(":")[1];
    };
};
