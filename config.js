Config = {
    discordID: "", // Your discord server's id.
    authKey: "", // Staff panel auth key. You can find this under the settings tab in the staff panel/
    staffAce: "", // Place your staff ace here so they can see in-game reports.
    customActions: [{ // don't touch unless you know what you are doing
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
    }]
}