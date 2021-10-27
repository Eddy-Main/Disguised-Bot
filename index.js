const fetch = require("node-fetch")
//import 'dotenv'
//import Client, Intents, MessageEmbed, MessageAttachment from 'discord.js'


require('dotenv').config(); //initialize dotenv

const { Client, Intents, MessageEmbed, MessageAttachment } = require("discord.js");


const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }); //create new client

//const fetch = require('node-fetch');
//const Canvas = require('canvas');
const { createCanvas, loadImage } = require("canvas");




function swap(iList, indexA, indexB) {
    let tempA = iList[indexA];
    iList[indexA] = iList[indexB];
    iList[indexB] = tempA;
}



function partition(listNames, listPoints, bot, top) {
    let pivot = listPoints[top];
    let left = bot - 1;

    for (let right = bot; right <= top - 1; right++) {
        if (listPoints[right] > pivot) {
            left++;
            swap(listPoints, left, right);
            swap(listNames, left, right);
        }
    }
    swap(listPoints, left + 1, top);
    swap(listNames, left + 1, top);
    return left + 1;
}

function quickSort(listNames, listPoints, bot, top) {
    if (bot < top) {
        let pivot = partition(listNames, listPoints, bot, top);

        quickSort(listNames, listPoints, bot, pivot - 1);
        quickSort(listNames, listPoints, pivot + 1, top);

    }
}


function sortLeaderboard(iLeaderBoard) {

    let listNames = Object.keys(iLeaderBoard);
    let listPoints = Object.values(iLeaderBoard);
    quickSort(listNames, listPoints, 0, listNames.length - 1);

    return [listNames, listPoints]
}




async function showLeaderboard(message, leaderBoard) {
    let listNamesPoints = sortLeaderboard(leaderBoard);
    // Show leaderBoard
    var boardMessage = ""
    for (let i = 0; i < listNamesPoints[0].length; i++) {
        let name = listNamesPoints[0][i];
        let point = listNamesPoints[1][i];
        if (boardMessage == "")
            boardMessage = name.slice(0, 30).padEnd(40, ".").concat(point);
        else
            boardMessage += "\n" + name.slice(0, 30).padEnd(40, ".").concat(point);
    }


    const leaderBoardEmbed = new MessageEmbed()
        .setTitle("Disguise Leader Board");

    if (boardMessage != "") 
        leaderBoardEmbed.setDescription(boardMessage);
    else
        leaderBoardEmbed.setDescription("Nobody won a point yet... :(");
    
    const leaderBoardMsg = await message.channel.send({ embeds: [leaderBoardEmbed] });
}







client.on("ready", () => {
    console.log("Connected");
    console.log("Logged in as: ");
    console.log(`${client.user.tag}` + " - (" + `${client.user.id}` + ")" );
});



let channelVariable = {};
let listPrefix = ["!", "?", "&", "*"];

client.on("message", async msg => {

    if (msg.author.bot) return;



    const serverId = msg.channel.id;
    if (!(serverId in channelVariable)) channelVariable[serverId] = { "gameOn": false, "defaultTimer": process.env.TIMER, "prefix": process.env.PREFIX }

    if (msg.content[0] != channelVariable[serverId]["prefix"]) return;

    const args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();


    switch (command) {
        case "start":

            if (channelVariable[serverId]["gameOn"]) return;
            channelVariable[serverId]["gameOn"] = true;



            let leaderBoard = {};

            var nbRounds = 1;
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



            let sessionTimer = channelVariable[serverId]["defaultTimer"];
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


            const startMessage = new MessageEmbed()
                .setTitle("Starting a " + nbRounds + " round session.")
                .setDescription("To skip a round, use " + channelVariable[serverId]["prefix"] + "skip.\nTo stop the session, use " + channelVariable[serverId]["prefix"] + "stop");


            await msg.channel.send({ embeds: [startMessage] });


            for (let i = 0; i < nbRounds; i++) {



                // Random card ID
                var cardDropable = false;
                let randomNumber = -1;
                var correctAnswer = "";
                var correctAnswer2 = "";


                // Two string which has the Monster name in between in the html page of the database.
                const lastIndexString = " Card\<\/title\>";
                const firstIndexString = "\<title\>iW Database - Item Info - ";

                const lastIndexString2 = "\</a\>\</td\>\n\t\t\t\<td class=\"bgLtRow. padded\"\>0.02%";
                const firstIndexString2 = ">";

                let isError = true;
                let isImgError = true;
                let isDroppable = false;

                let response;
                let body;

                let card;

                while (isError || isImgError) {
                    randomNumber = Math.floor(Math.random() * 453) + 4001;
                    console.log("Choosing a random ID : " + randomNumber);

                    // Obtain the card ID's Monster name
                    response = await fetch("http://db.irowiki.org/db/item-info/" + randomNumber + "/");
                    body = await response.text();

                    // Item exist ? (i.e non-existing item : 4130)
                    isError = (body.indexOf("iW Database - Item Info") == -1);
                    // Droppable ?
                    isDroppable = (body.indexOf("0.02%") != -1);

                    await loadImage("http://db.irowiki.org/image/card/" + randomNumber + ".png")
                        .then((image) => {
                            isImgError = false;
                            card = image;
                        })
                        .catch(() => {
                            isImgError = true;
                            console.log("Error loading Card's image...\nRetry...");
                        });

                    if (isError) console.log("Error loading Card ID's information...\nRetry...");

                }

                const lastIndex = body.indexOf(lastIndexString);
                const slicedString = body.slice(0, lastIndex);
                const firstIndexSliced = slicedString.lastIndexOf(firstIndexString) + firstIndexString.length;
                correctAnswer = slicedString.slice(firstIndexSliced);

                // Check if card is droppable, return true if droppable and return false if not.
                // ToDo :   This should be clearer.
                //          But some card are specially dropped, which cause an error. (ex : 4446)
                //const isDroppable = (body.indexOf("Monster Drops") != -1);

                // Use this for now... which is less clear.


                if (isDroppable) {
                    const lastIndex2 = body.search(lastIndexString2);
                    const slicedString2 = body.slice(0, lastIndex2);
                    const firstIndexSliced2 = slicedString2.lastIndexOf(firstIndexString2) + firstIndexString2.length;
                    correctAnswer2 = slicedString2.slice(firstIndexSliced2);
                }

                const indexOfParentheses = correctAnswer2.indexOf(" (");
                if (indexOfParentheses != -1)
                    correctAnswer2 = correctAnswer2.slice(0, indexOfParentheses);

                console.log(correctAnswer);
                console.log(correctAnswer2);


                // Init canvas and load Image taken from Ragnarok Database
                const canvas = createCanvas(600, 750);
                const ctx = canvas.getContext("2d");

                // Set image position in the canvas
                ctx.drawImage(card, 0, -44, canvas.width, canvas.height);

                // Add the drawn image to the buffer
                const attachment = new MessageAttachment(canvas.toBuffer(), "Disguised_Monster_Card.png");

                const roundCountEmbed = new MessageEmbed()
                    .setTitle("Round " + (i + 1) + " is starting...")
                    .setColor("#FFA500")
                await msg.channel.send({ embeds: [roundCountEmbed] });

                const msgEmbed = new MessageEmbed()
                    .setTitle("Who is that ~~Pokemon~~ monster ?")
                    .setImage("attachment://Disguised_Monster_Card.png");


                await msg.channel.send({ embeds: [msgEmbed], files: [attachment] });//{ content: "Who is that ~~Pokemon~~ monster ?", files: [attachment]});





                let timer = sessionTimer;

                let timerMsg = "Only " + timer + "sec left !";

                const sentTimerMsg = await msg.channel.send({ content: timerMsg });



                let interval = setInterval(async function () {
                    timer--;


                    if (timer < 5 || timer % 10 == 0) {
                        timerMsg = "Only " + timer + "sec left !";
                        sentTimerMsg.edit({ content: timerMsg });
                    }

                    if (timer <= 0) {
                        clearInterval(interval);
                    }
                }, 1000);



                const filter =
                    answer => {
                        return !answer.author.bot;
                    };

                // Get this out of the loop. No need to define this function at every loop.
                let skipped = false;
                let stopped = false;

                const getAnswerer = async function () {
                    const answererUsername = await msg.channel.awaitMessages({ filter, max: 1, time: timer * 1000 + 100, errors: ['time', 'max'] })
                        .then(collected => {
                            if ((collected.first().content.toLowerCase() == correctAnswer.toLowerCase()) ||
                                (collected.first().content.toLowerCase() == correctAnswer2.toLowerCase())) {
                                return collected.first().author;
                            }
                            else if (collected.first().content.toLowerCase() == (channelVariable[serverId]["prefix"] + "skip")) {
                                skipped = true;
                                return;
                            }
                            else if (collected.first().content.toLowerCase() == (channelVariable[serverId]["prefix"] + "stop")) {
                                stopped = true;
                                return;
                            }
                            else if (collected.first().content.toLowerCase() == (channelVariable[serverId]["prefix"] + "leaderboard")) {
                                showLeaderboard(msg, leaderBoard);
                                return getAnswerer();
                            }
                            else {
                                console.log("Wrong Answer !");
                                return getAnswerer();
                            }
                        })
                        .catch(collected => {
                            msg.channel.send("Time out !!\nThis round is over !!");
                            return;
                        })
                    return answererUsername;
                };

                let winner = await getAnswerer();

                clearInterval(interval);

                const endRoundMsg = new MessageEmbed();

                if (winner) {
                    let winnerUsername = winner.username;
                    // Update leaderboard
                    if (!(winnerUsername in leaderBoard))
                        leaderBoard[winnerUsername] = 1;
                    else
                        leaderBoard[winnerUsername] += 1;

                    endRoundMsg
                        .setColor("#00FF00")
                        .setImage(winner.displayAvatarURL({ format: 'png' }))
                        .setTitle(winnerUsername + " wins this round !");
                }
                else {
                    if (stopped) {
                        console.log("Game was terminated...");
                        channelVariable[serverId]["gameOn"] = false;
                        showLeaderboard(msg, leaderBoard);
                        const stopMsg = new MessageEmbed()
                            .setDescription("Game was terminated...");
                        await msg.channel.send({ embeds: [stopMsg] });
                        return;
                    }

                    else {
                        if (skipped) {
                            console.log("Round was skipped...\nStarting Next rounds...");
                            endRoundMsg
                                .setColor("#FF0000")
                                .setTitle("Round was skipped...");
                            clearInterval(interval);
                        }
                        else {
                            console.log("Nobody got the right answer...");
                            endRoundMsg
                                .setColor("#FF0000")
                                .setTitle("Nobody got the right answer...");
                        }
                    }
                }


                let rightAnswerMsg = "The right answer(s) was: \n" + correctAnswer;
                if (isDroppable && (correctAnswer != correctAnswer2))
                    rightAnswerMsg += " or " + correctAnswer2 + " !";


                endRoundMsg.setDescription(rightAnswerMsg);
                await msg.channel.send({ embeds: [endRoundMsg] });


            }
            channelVariable[serverId]["gameOn"] = false;
            await msg.channel.send("The " + nbRounds + " round session ended !\nHere are the results !");
            showLeaderboard(msg, leaderBoard);
            break;

        case "commands":

            const commandMsg = new MessageEmbed()
                .setTitle("Command List")
                .setDescription("Here is a list of all implemented commands :")
                .addFields(
                    {
                        name: channelVariable[serverId]["prefix"] + "start [number of rounds] [timer in seconds]",
                        value: "Launch the game.\nYou can set number of rounds and guess time.\n" +
                            "Number of rounds and guess time must be between [1-100] and [5-120] respectively" +
                            "(Default: Number of rounds : 1, Current Guess time : " + channelVariable[serverId]["defaultTimer"] +
                            ").\nHow to use : \"" + channelVariable[serverId]["prefix"] + "start 5\", \"" + channelVariable[serverId]["prefix"] + "start 10 25\"."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "skip",
                        value: "Skip the current round."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "stop",
                        value: "Stop the current session."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "setTimer [timer in seconds]",
                        value: "Set the default guess time.\n" +
                            "How to use : \"" + channelVariable[serverId]["prefix"] + "setTimer 30\"."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "showTimer",
                        value: "Show the current Timer"
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "leaderBoard",
                        value: "Show the current state of the Leaderboard."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "commands",
                        value: "List all the implemented commands."
                    },
                    {
                        name: channelVariable[serverId]["prefix"] + "changePrefix",
                        value: "Change the prefix of this DisguiseBot.\nYou can only choose between "+listPrefix.join(" ")+"."
                    }
                )
            
            await msg.channel.send({ embeds: [commandMsg] });
            break;

        case "setTimer".toLowerCase():
            if (args.length == 1) {
                if (!isNaN(args[0])) {

                    const checkDefaultTime = parseInt(args[0]);
                    if (checkDefaultTime < 5 || checkDefaultTime > 120) {
                        const setTimerMsg = new MessageEmbed()
                            .setDescription("Guess time must be between 5 and 120 seconds !");
                        await msg.channel.send({ embeds: [setTimerMsg] });
                    }
                    else {
                        channelVariable[serverId]["defaultTimer"] = checkDefaultTime;
                        const setTimerMsg = new MessageEmbed()
                            .setDescription("The guess time has been updated to " + channelVariable[serverId]["defaultTimer"] + " !");
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
                        "Here is one way to use it : \"" + channelVariable[serverId]["prefix"] + "setTimer 25\".");
                await msg.channel.send({ embeds: [setTimerErrMsg] });
            }
            break;
        case "showTimer".toLowerCase():
            const defaultTimeMsg = new MessageEmbed()
                .setDescription("Default time is : " + channelVariable[serverId]["defaultTimer"]);
            await msg.channel.send({ embeds: [defaultTimeMsg] });

        case "changePrefix".toLowerCase():
            if (args.length == 1) {
                const inputPrefix = args[0];
                if (inputPrefix.length != 1 || !(listPrefix.includes(inputPrefix))) {
                    const defaultPrefixMsg = new MessageEmbed()
                        .setDescription("Prefix must be 1 character long !\nYou can only choose between : \n" + listPrefix.join(" "));
                    await msg.channel.send({ embeds: [defaultPrefixMsg] });
                }
                else {
                    channelVariable[serverId]["prefix"] = inputPrefix;
                    const defaultPrefixMsg = new MessageEmbed()
                        .setDescription("Default prefix has been updated to : \"" + channelVariable[serverId]["prefix"] + "\" !");
                    await msg.channel.send({ embeds: [defaultPrefixMsg] });
                }
            }
            else {
                const defaultPrefixMsg = new MessageEmbed()
                    .setDescription("Only 1 argument is allowed for this command !");
                await msg.channel.send({ embeds: [defaultPrefixMsg] });
            }

            break;
        default:
            break;
    }
});

client.login(process.env.CLIENT_TOKEN); //login bot using token