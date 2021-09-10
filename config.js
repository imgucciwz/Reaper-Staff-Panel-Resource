Config = {
    socket: "http://144.172.70.29:4785", // dont change
    discordID: "", // your discord server id
    authKey: "", // staff panel auth key
    customActions: [{
        type: "executeCommand",
        name: "Refresh Config",
        color: "info",
        type: "server", // player - shows on player page / server - shows in server panel
        input: undefined,
        allowedRoles: [], // discord roles
        callback: (data) => {
            eval(LoadResourceFile(GetCurrentResourceName(), "config.js"));
            socket.emit("updateActions", Config.customActions);
        }
    }],
    devMode: false // leave false
} 
