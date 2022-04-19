// Used to fetch info on a HTML page
const fetch = require("node-fetch")
// Import the Canvas library to crop / resize image
const { createCanvas, loadImage } = require("canvas");
const { MessageEmbed, MessageAttachment } = require("discord.js");


// List of all Commands. 
// Separated in 2 categories :
//      Commands that are executable at any moment.
//      Commands that can only be executed after the game started.
class CommandList {
    static commandList = {
        "start"             : "Start",
        "settimer"          : "SetTimer",
        "showtimer"         : "ShowTimer",
        "help"              : "Help",
        "changeprefix"      : "ChangePrefix",
        "leaderboard"       : "Leaderboard",
        "serverleaderboard" : "ServerLeaderboard",
        "resetleaderboard"  : "ResetLeaderboard"
    };
    static commandListGameOn = {
        "skip"              : "Skip",
        "stop"              : "Stop"
    };
}



// Main layout of each Command
class Command {

    // Description of Command, used in the Help Command.
    static getDescription(channelVariable, serverID) {
        return "Command's Description";
    }
    
    /**
     * Main task of each command
     * All arguments may or may not be used for its execution.
     * 
     * @param msg               Message sent that launched the command.
     *                          Used for sending back message to the correct server.
     * @param channelVariable   Contains global variable for each server.
     * @param serverID          Server's ID
     * @param args              Arguments used for some Command
     */
    static exec(msg, channelVariable, serverID, args) {
         return;
    }
}

// Launches the game.
class Start extends Command {
    

    static getDescription(channelVariable, serverID) {
        return "Launch the game with \"start [number of rounds][guess time in seconds]\".\n" +
            "You can set number of rounds and guess time.\n" +
            "[Number of rounds] and [guess time] must be between [1-100] and [5-120] respectively" +
            "(Default: Number of rounds : 1, Current Guess time : " + channelVariable[serverID]["defaultTimer"] +
            ").\nHow to use : \"" + channelVariable[serverID]["prefix"] + "start 5\", \"" + channelVariable[serverID]["prefix"] + "start 10 25\"."
    }

    // Main code of this DisguisedBot. 
    static async exec(msg, channelVariable, serverID, args) {

        var nbRounds = 1;

        // Verify if the command was inputed correctly.
        if (args.length > 0) {
            if (!isNaN(args[0])) {
                const checkRoundNumber = parseInt(args[0]);

                if (checkRoundNumber < 1 || checkRoundNumber > 101) {
                    const CheckRoundsMsg = new MessageEmbed()
                        .setDescription("The number of rounds must be between 1 and 100 !");
                    await msg.channel.send({ embeds: [CheckRoundsMsg] });
                    return;
                }
                else
                    nbRounds = checkRoundNumber;
            }
            else {
                const CheckRoundsMsg = new MessageEmbed()
                    .setDescription("The number of rounds must be a number (between 1 and 100) !");
                await msg.channel.send({ embeds: [CheckRoundsMsg] });
                return;
            }
        }



        let sessionTimer = channelVariable[serverID]["defaultTimer"];
        if (args.length > 1) {
            if (!isNaN(args[1])) {
                const checkDefaultTimer = parseInt(args[1]);

                if (checkDefaultTimer < 5 || checkDefaultTimer > 120) {
                    const setTimerMsg = new MessageEmbed()
                        .setDescription("Guess time must be between 5 and 120 seconds !");
                    await msg.channel.send({ embeds: [setTimerMsg] });
                    return;
                }

                sessionTimer = checkDefaultTimer;

            }
            else {
                const setTimerMsg = new MessageEmbed()
                    .setDescription("Guess time must be a Number between 5 and 120 seconds !");
                await msg.channel.send({ embeds: [setTimerMsg] });
                return;
            }
        }

        // Prevent two game to be launched at once.
        if (channelVariable[serverID]["gameOn"]) return;
        channelVariable[serverID]["gameOn"] = true;

        // Reset current Leaderboard.
        channelVariable[serverID]["leaderBoard"] = {};

        const startMessage = new MessageEmbed()
            .setTitle("Starting a " + nbRounds + " round session.")
            .setDescription("To skip a round, use " + channelVariable[serverID]["prefix"] +
                "skip.\nTo stop the session, use " + channelVariable[serverID]["prefix"] + "stop");


        await msg.channel.send({ embeds: [startMessage] });


        for (let currentRound = 0; currentRound < nbRounds &&
            channelVariable[serverID]["gameOn"]; currentRound++) {



            // Random card ID
            let randomNumber = -1;
            var correctAnswer;
            
            
            // Searching information on the card holder.
            let isImgError = true;

            let response;
            let body;
            let card;

            // Checking if error in fetching website and card illustration. 
            // If Error, try with another ID number.
            while (isImgError) {
                randomNumber = Math.floor(Math.random() * 453) + 4001;
                console.log("Choosing a random ID : " + randomNumber);

                // Obtaining the card's informations ((Name of the card / monsters who drops it) == Answers to the question).
                response = await fetch("https://ratemyserver.net/item_db.php?item_id="+ randomNumber + "&small=1&back=1");
                body = await response.text();

                // Obtaining the card's illustraton.
                await loadImage("https://static.divine-pride.net/images/items/cards/" + randomNumber + ".png") 
                    .then((image) => {
                        isImgError = false;
                        card = image;
                    })
                    .catch(() => {
                        isImgError = true;
                        console.log("Error loading Card's image...\nRetry...");
                    });

                // This card shouldn't be a valid one, so I'll take it out of the pool.
                if (randomNumber == 4446) isImgError = false;
            }

            // I search for the owner of the card / monster name by searching in the website's source code.
            // Inside, is the following line :
            //      <td valign='bottom'><b> MONSTER_NAME Card </b><b>[</b>Equippement<b>]</b>&
            //
            // Thus, I seek to isolate "MONSTER_NAME"

            const firstLeftBracket = "\<td valign='bottom'\>\<b\>";
            const firstLeftBracketIndex = body.indexOf(firstLeftBracket);
            const firstString = body.slice(firstLeftBracketIndex + firstLeftBracket.length);

            const firstRightBracket = "Card";
            const firstRightBracketIndex = firstString.indexOf(firstRightBracket);

            correctAnswer = firstString.slice(0, firstRightBracketIndex).trim();


            // Sometimes, a monster have two different names.
            // To find it, I'm using a similar approach, but i'm searching for monsters who drops the card instead.
            let isDroppable = (body.indexOf("No Result") == -1);
            let correctAnswerSet = new Set();
            correctAnswerSet.add(correctAnswer.toLowerCase());

            if (isDroppable) {
                // Here the targetted line is :
                //      onclick="return popMob(1705,1,1)">MONSTER NAME / MONSTER 2ND NAME<div class='tipstext'>(0.01%)

                let mobDropLine = body;
                let leftBracket = "1,1)\"\>";
                let rightBracket = "\<div class";

                // Guaranteed to be found at least once.
                let leftBracketIndex = mobDropLine.indexOf(leftBracket);

                // Applying it for all monster who drops the card.
                while (leftBracketIndex != -1) {
                    mobDropLine = mobDropLine.slice(leftBracketIndex + leftBracket.length);
                    let rightBracketIndex = mobDropLine.indexOf(rightBracket);
                    let mobNameArray = mobDropLine.slice(0, rightBracketIndex).trim().split(" / ");
                    for (let mobNameIndex = 0; mobNameIndex < mobNameArray.length; mobNameIndex++) {
                        // (Re-Stats)-Monsters are not included in my game.
                        if (mobNameArray[mobNameIndex].indexOf("(Re-Stats)") == -1)
                            correctAnswerSet.add(mobNameArray[mobNameIndex].toLowerCase());
                    }

                    leftBracketIndex = mobDropLine.indexOf(leftBracket);
                }

            }

            console.log(correctAnswerSet);


            // Init canvas and load Image taken from Ragnarok Database
            const canvas = createCanvas(600, 750);
            const ctx = canvas.getContext("2d");

            // Set image position in the canvas
            ctx.drawImage(card, 0, -44, canvas.width, canvas.height);

            // Add the drawn image to the buffer
            const attachment = new MessageAttachment(canvas.toBuffer(), "Disguised_Monster_Card.png");

            
            const roundCountEmbed = new MessageEmbed()
                .setTitle("Round " + (currentRound + 1) + " is starting...")
                .setColor("#FFA500")
            await msg.channel.send({ embeds: [roundCountEmbed] });

            const msgEmbed = new MessageEmbed()
                .setTitle("Who is that ~~Pokemon~~ monster ?")
                .setImage("attachment://Disguised_Monster_Card.png");


            await msg.channel.send({ embeds: [msgEmbed] , files: [attachment] });


            // Create countdown which is shown to the players.
            let countdown = sessionTimer;
            let countdownMsg = "Only " + countdown + "sec left !";
            const sentTimerMsg = await msg.channel.send({ content: countdownMsg });
            let interval = setInterval(async function () {
                countdown--;

                // Update the countdown message every 10sec and below 5sec.
                if (countdown < 5 || countdown % 10 == 0) {
                    countdownMsg = "Only " + countdown + "sec left !";
                    sentTimerMsg.edit({ content: countdownMsg });
                }

                if (countdown <= 0) {
                    clearInterval(interval);
                }
            }, 1000);


            // Bot's message isn't taken in consideration.
            const filter =
                answer => {
                    return !answer.author.bot;
                };

            // Takes care of verifying if answer is correct or not.
            const getAnswerer = async function () {
                const answererUsername = await msg.channel.awaitMessages({ filter, max: 1, time: countdown * 1000 + 100, errors: ['time', 'max'] })
                    .then(collected => {
                        let answerContent = collected.first().content.toLowerCase();
                        
                        if (correctAnswerSet.has(answerContent)) {
                            return collected.first().author;
                        }
                        else {
                            // If the sent message is a command, execute it instead.
                            if (answerContent[0] == channelVariable[serverID]["prefix"]) {
                                const answerArgs = answerContent.slice(1).trim().split(/ +/g);
                                const answerCommand = answerArgs.shift().toLowerCase();

                                // These commands are only usable while the game is going on.
                                // It also end the current round.
                                if (answerCommand in CommandList.commandListGameOn) {
                                    let dynamic_class = eval(CommandList.commandListGameOn[answerCommand]);
                                    dynamic_class.exec(msg, channelVariable, serverID, answerArgs);
                                    return;
                                }

                            }

                            // Continue to wait for answer.
                            return getAnswerer();


                        }
                    })
                    .catch(async collected => {
                        // Timeout message.
                        const timeOutMsg = new MessageEmbed()
                            .setColor("#FF0000")
                            .setTitle("Nobody answered correctly in time...");
                        await msg.channel.send({ embeds: [timeOutMsg] });
                        return;
                    })
                return answererUsername;
            };


            let winner = await getAnswerer();
            clearInterval(interval);


            if (winner) {
                let winnerUsername = await msg.guild.members.fetch(winner.id)
                    .then(member => {
                        if (member.nickname == null)
                            return winner.username;
                        return member.nickname;
                    });

                // Update leaderboard
                Leaderboard.updateLeaderboard(channelVariable, serverID, "leaderBoard", winnerUsername);
                Leaderboard.updateLeaderboard(channelVariable, serverID, "serverLeaderBoard", winnerUsername);

                const winMsg = new MessageEmbed()
                    .setColor("#00FF00")
                    .setImage(winner.displayAvatarURL({ format: 'png' }))
                    .setTitle(winnerUsername + " wins this round !");
                await msg.channel.send({ embeds: [winMsg] });
            }

            // if the game wasn't stopped, show the correct answer.
            if (channelVariable[serverID]["gameOn"]) {
                let rightAnswerArray = Array.from(correctAnswerSet);
                rightAnswerArray.forEach((elem, index) => {
                    rightAnswerArray[index] = elem[0].toUpperCase() + elem.slice(1);
                });

                let rightAnswerMsg = rightAnswerArray.join(" or ") + " !";
                
                const endRoundMsg = new MessageEmbed()
                    .setTitle("The Correct answer was : ")
                    .setDescription(rightAnswerMsg)
                    .setColor("FFA500");
                await msg.channel.send({ embeds: [endRoundMsg] });
            }

        }// End of round.

        channelVariable[serverID]["gameOn"] = false;
        await msg.channel.send("The " + nbRounds + " round session ended !\nHere are the results !");
        Leaderboard.exec(msg, channelVariable, serverID, null);

    }
}


// Set a new default timer.
class SetTimer extends Command {
    static getDescription(channelVariable, serverID) {
        return "Set the default guess time.\n" +
            "How to use : \"" + channelVariable[serverID]["prefix"] + "setTimer 30\".";
    }

    static async  exec(msg, channelVariable, serverID, args) {

        // Checks if the arguments are correctly inputted.
        if (args.length == 1) {
            if (!isNaN(args[0])) {
                const checkDefaultTime = parseInt(args[0]);
                if (checkDefaultTime < 5 || checkDefaultTime > 120) {
                    const setTimerMsg = new MessageEmbed()
                        .setDescription("Guess time must be between 5 and 120 seconds !");
                    await msg.channel.send({ embeds: [setTimerMsg] });
                }
                else {
                    // Change the default timer of the server.
                    channelVariable[serverID]["defaultTimer"] = checkDefaultTime;
                    const setTimerMsg = new MessageEmbed()
                        .setDescription("The guess time has been updated to " + channelVariable[serverID]["defaultTimer"] + " !");
                    await msg.channel.send({ embeds: [setTimerMsg] });
                }
            }
            else {
                const setTimerErrMsg = new MessageEmbed()
                    .setDescription("The argument must be a number !")
                await msg.channel.send({ embeds: [setTimerErrMsg] });
            }
        }

        else {
            const setTimerErrMsg = new MessageEmbed()
                .setDescription("You must add an argument to the setTimer command !\n" +
                    "Here is one way to use it : \"" + channelVariable[serverID]["prefix"] + "setTimer 25\".");
            await msg.channel.send({ embeds: [setTimerErrMsg] });
        }

    }

}


// Displays current default timer.
class ShowTimer extends Command {
    static getDescription(channelVariable, serverID) {
        return "Show the current Timer";
    }

    static async exec(msg, channelVariable, serverID, args) {
        const defaultTimeMsg = new MessageEmbed()
            .setDescription("Default time is : " + channelVariable[serverID]["defaultTimer"]);
        await msg.channel.send({ embeds: [defaultTimeMsg] });

    }
}

// Shows all command.
class Help extends Command {
    static getDescription(channelVariable, serverID) {
        return "List all the implemented commands.";
    }

    static async exec(msg, channelVariable, serverID, args) {

        const commandMsg = new MessageEmbed()
            .setTitle("Command List")
            .setDescription("Here is a list of all implemented commands :");


        // Using the layout of commands, we can build the command list and
        // its description, more easily.
        Object.keys(CommandList.commandList).forEach(command => {
            let dynamic_class = eval(CommandList.commandList[command]);

            commandMsg.addFields(
                {
                    name: channelVariable[serverID]["prefix"] + command,
                    value: dynamic_class.getDescription(channelVariable, serverID)
                });
        });


        Object.keys(CommandList.commandListGameOn).forEach(command => {
            let dynamic_class = eval(CommandList.commandListGameOn[command]);

            commandMsg.addFields(
                {
                    name: channelVariable[serverID]["prefix"] + command,
                    value: dynamic_class.getDescription(channelVariable, serverID)
                });
        });

        
        await msg.channel.send({ embeds: [commandMsg] });

    }
}

// This class enable users to change their server's command's prefix.
class ChangePrefix extends Command {
    // Different possible prefix.
    static listPrefix = ["!", "?", "&", "*", ",", "~"];
    
    static getDescription(channelVariable, serverID) {
        return "Change the prefix of this DisguiseBot.\nYou can only choose between " + ChangePrefix.listPrefix.join(" ") + ".";
    }
    

    static async exec(msg, channelVariable, serverID, args) {
        // Checks if the arguments are correctly inputted.
        if (args.length == 1) {
            const inputPrefix = args[0];
            if (inputPrefix.length != 1 || !(ChangePrefix.listPrefix.includes(inputPrefix))) {
                const defaultPrefixMsg = new MessageEmbed()
                    .setDescription("Prefix must be 1 character long !\n"+
                        "You can only choose between : \n" + ChangePrefix.listPrefix.join(" "));
                await msg.channel.send({ embeds: [defaultPrefixMsg] });
            }
            else {
                // Input correctly, it simply changes the prefix in the channel's variables.
                channelVariable[serverID]["prefix"] = inputPrefix;
                const defaultPrefixMsg = new MessageEmbed()
                    .setDescription("Default prefix has been updated to : \"" + channelVariable[serverID]["prefix"] + "\" !");
                await msg.channel.send({ embeds: [defaultPrefixMsg] });
            }
        }
        else {
            const defaultPrefixMsg = new MessageEmbed()
                .setDescription("Only 1 argument is allowed for this command !");
            await msg.channel.send({ embeds: [defaultPrefixMsg] });
        }


    }
}



// This class manages the leaderboard used in game.
// It is used to update and show the current leaderboard to the players.
class Leaderboard extends Command {

    static getDescription(channelVariable, serverID) {
        return "Display the current state of the Leaderboard.";
    }

    // swap() simply exchanges the place of two element in an array.
    // It is used in partition().
    static swap(iList, indexA, indexB) {
        let tempA = iList[indexA];
        iList[indexA] = iList[indexB];
        iList[indexB] = tempA;
    }


    // partition() uses the pivot to put every numbers higher than itself on the left side
    // and the opposite on the right side.
    static partition(listNames, listPoints, bot, top) {
        let pivot = listPoints[top];
        let left = bot - 1;

        for (let right = bot; right <= top - 1; right++) {
            if (listPoints[right] > pivot) {
                left++;
                Leaderboard.swap(listPoints, left, right);
                Leaderboard.swap(listNames, left, right);
            }
        }
        Leaderboard.swap(listPoints, left + 1, top);
        Leaderboard.swap(listNames, left + 1, top);
        return left + 1;
    }

    // By using the Divide to Conquer strategy and recursivity, we repetedly use partition()
    // in order to sort the list.
    static quickSort(listNames, listPoints, bot, top) {
        if (bot < top) {
            let pivot = Leaderboard.partition(listNames, listPoints, bot, top);

            Leaderboard.quickSort(listNames, listPoints, bot, pivot - 1);
            Leaderboard.quickSort(listNames, listPoints, pivot + 1, top);

        }
    }

    // Using quickSort() to arrange the leaderboard, by order of point earned.
    static sortLeaderboard(leaderBoard) {
        let listNames = Object.keys(leaderBoard);
        let listPoints = Object.values(leaderBoard);

        Leaderboard.quickSort(listNames, listPoints, 0, listNames.length - 1);

        return [listNames, listPoints]
    }

    // Updates the leaderboard,
    static updateLeaderboard(channelVariable, serverID, Board, winnerUsername) {
        if (!(winnerUsername in channelVariable[serverID][Board]))
            channelVariable[serverID][Board][winnerUsername] = 1;
        else
            channelVariable[serverID][Board][winnerUsername] += 1;
    }

    // Displays the leaderboard.
    static async showLeaderboard(msg, listNamesPoints, boardName) {
        var boardMessage = "";

        for (let i = 0; i < listNamesPoints[0].length; i++) {
            let name = listNamesPoints[0][i];
            let point = listNamesPoints[1][i];

            if (boardMessage == "")
                boardMessage = "`" + (name.slice(0, 25).padEnd(25, ".").concat((point.toString()).padStart(5, "."))) + "`";
            else
                boardMessage += "\n`" + (name.slice(0, 25).padEnd(25, ".").concat((point.toString()).padStart(5, "."))) + "`";
        }


        const leaderBoardEmbed = new MessageEmbed();

        if(boardName == "leaderBoard")
            leaderBoardEmbed.setTitle("Disguise Current Leaderboard");
        else if (boardName == "serverLeaderBoard")
            leaderBoardEmbed.setTitle("Disguise Server Leaderboard");

        if (boardMessage != "")
            leaderBoardEmbed.setDescription(boardMessage);
        else
            leaderBoardEmbed.setDescription("Nobody won a point yet... :(");

        await msg.channel.send({ embeds: [leaderBoardEmbed] });
    }


    // Displays the leaderboard, after sorting it.
    static async exec(msg, channelVariable, serverID, args) {
        let listNamesPoints = Leaderboard.sortLeaderboard(channelVariable[serverID]["leaderBoard"]);
        Leaderboard.showLeaderboard(msg, listNamesPoints, "leaderBoard");
    }
}



// It is used to show the server's leaderboard to the players.
class ServerLeaderboard extends Command {

    static getDescription(channelVariable, serverID) {
        return "Display the server's Leaderboard.";
    }

    // Displays the leaderboard, after sorting it.
    static async exec(msg, channelVariable, serverID, args) {
        let listNamesPoints = Leaderboard.sortLeaderboard(channelVariable[serverID]["serverLeaderBoard"]);
        Leaderboard.showLeaderboard(msg, listNamesPoints, "serverLeaderBoard");
    }

}


// This class resets the server's leaderboard.
class ResetLeaderboard extends Command {

    static getDescription(channelVariable, serverID) {
        return "Reset the cumulative score Leaderboard of the server.";
    }

    // Resets the leaderboard.
    static async exec(msg, channelVariable, serverID, args) {
        channelVariable[serverID]["serverLeaderBoard"] = {};
        

        const resetEmbed = new MessageEmbed()
            .setTitle("Reset Leaderboard");

        var boardMessage = "The server board has been reset !";
        resetEmbed.setDescription(boardMessage);

        await msg.channel.send({ embeds: [resetEmbed] });

    }

}



class Skip extends Command {
    static getDescription(channelVariable, serverID) {
        return "Skip the current round.";
    }

    // As this command is only used while the game has started,
    // it end the current round, only leaving the msg to be sent.
    static async exec(msg, channelVariable, serverID, args) {
        const skipMsg = new MessageEmbed()
            .setColor("#FF0000")
            .setTitle("Round was skipped...\nStarting next round...");
        await msg.channel.send({ embeds: [skipMsg] });
    }
}




class Stop extends Command {
    
    static getDescription(channelVariable, serverID) {
        return "Stop the current session.";
    }

    // Stops the game.
    static async exec(msg, channelVariable, serverID, args) {
        channelVariable[serverID]["gameOn"] = false;
        const stopMsg = new MessageEmbed()
            .setColor("#FF0000")
            .setTitle("Game was terminated...");
        await msg.channel.send({ embeds: [stopMsg] });

    }
}


module.exports = { Start, CommandList, SetTimer, ShowTimer, Help, ChangePrefix, Leaderboard, ServerLeaderboard, ResetLeaderboard, Skip, Stop  }