// Imports of Command Classes
const { Start, CommandList, SetTimer, ShowTimer, ShowCommands, ChangePrefix,
    Leaderboard, ServerLeaderboard, ResetLeaderboard, Skip, Stop } = require("./commands.js");

 // Initialize dotenv
require('dotenv').config();

// Imports of some Discord.js library / methods.
const { Client, Intents } = require("discord.js");

//create new client
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// Global dictionary which include every variable enabling multi-server execution.
let channelVariable = {};

// Main "function" which execute at each message sent by players in each server.
client.on("message", async msg => {

    if (msg.author.bot) return;

    // Setting up default variable for each server.
    const serverID = msg.channel.id;
    if (!(serverID in channelVariable))
        channelVariable[serverID] =
            {
                "gameOn": false,                    
                "defaultTimer": process.env.TIMER,
                "prefix": process.env.PREFIX,
                "leaderBoard": {},
                "serverLeaderBoard": {}
            };


    // Only process a command message.
    if (msg.content[0] != channelVariable[serverID]["prefix"]) return;

    // Separate command and arguments.
    const args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // If command exist, process it.
    if (command in CommandList.commandList) {
        // I am using the eval function, to go from a Command String to a Command Class, without any object instantiation.
        // Using class heredity and its function overriding should make things easier.
        let dynamic_class = eval(CommandList.commandList[command]);
        dynamic_class.exec(msg, channelVariable, serverID, args);
    }
});

// Login bot using token
client.login(process.env.CLIENT_TOKEN);