const fetch = require("node-fetch")
//import 'dotenv'
//import Client, Intents, MessageEmbed, MessageAttachment from 'discord.js'


require('dotenv').config(); //initialize dotenv

const { Client, Intents, MessageEmbed, MessageAttachment } = require("discord.js");


const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }); //create new client

//const fetch = require('node-fetch');
//const Canvas = require('canvas');
const { createCanvas, loadImage } = require("canvas");

client.on("ready", () => {
    console.log("Connected");
    console.log("Logged in as: ");
    console.log(`${client.user.tag}` + " - (" + `${client.user.id}` + ")" );
});





client.on("message", async msg => {

    if (msg.author.bot) return;
    if (msg.content == "!start") {

        
        // Random card ID
        var cardDropable = false;
        let randomNumber = -1;
        var correctAnswer;

        // This string appears if the card is droppable by a normal Monster
        const lastIndexString = "\</a\>\</td\>\n\t\t\t\<td class=\"bgLtRow2 padded\"\>0.02%";
        const lastIndexSlicedString = ">";
        
        do {
            randomNumber = Math.floor(Math.random() * 100) + 4001;
            console.log("Choosing a random ID : " + randomNumber);
            // Obtain the card ID's Monster name
            const response = await fetch("http://db.irowiki.org/db/item-info/" + randomNumber + "/");
            const body = await response.text();

            // Check if card is droppable, return the index and return -1 if not
            const lastIndex = body.indexOf(lastIndexString);
            
            if (lastIndex != -1) {
                cardDropable = true;
                const slicedString = body.slice(0,lastIndex);
                const lastIndexSliced = slicedString.lastIndexOf(lastIndexSlicedString)+1;
                correctAnswer = slicedString.slice(lastIndexSliced);
            }

            //cardDropable = body.includes("0.02%");
        } while (!cardDropable);

        
        console.log(cardDropable);
        console.log(correctAnswer);

        //let splitBody = body.split("title>")[1].split(" ");

        //const beforeJoined = splitBody.slice(6, splitBody.length - 1);
        //console.log(beforeJoined);
        //const correctAnswer = beforeJoined.join(" ");


        //const splitBody = body.split("\</a\>\</td\>\n\t\t\t\<td class=\"bgLtRow2 padded\"\>0.02%")[0];
        //const afterSplit = test_log1.split("/\">");
        //const correctAnswer = test_log2[test_log2.length - 1];
        //console.log(correctAnswer);
        

        // Init canvas and load Image taken from Ragnarok Database
        const canvas = createCanvas(600, 750);
        const ctx = canvas.getContext("2d");
        const card = await loadImage("http://db.irowiki.org/image/card/" +randomNumber+".png");

        // Set image position in the canvas
        ctx.drawImage(card, 0, -44, canvas.width, canvas.height);

        // Add the drawn image to the buffer
        const attachment = new MessageAttachment(canvas.toBuffer(), "Disguised_Monster_Card.png");

        const msgEmbed = new MessageEmbed()
            .setTitle("Who is that ~~Pokemon~~ monster ?")
            .setImage("attachment://Disguised_Monster_Card.png");


        const testmsg = await msg.channel.send({ embeds: [msgEmbed], files: [attachment] });//{ content: "Who is that ~~Pokemon~~ monster ?", files: [attachment]});
        
        



        let timer = process.env.TIMER;
        let timerMsg = "Only " + timer + "sec left !";

        const sentMsg = await msg.channel.send({ content: timerMsg });



        let interval = setInterval(async function () {
            timer--;
            timerMsg = "Only " + timer + "sec left !";
            sentMsg.edit({ content: timerMsg });
            if (timer <= 0) {
                clearInterval(interval);
                msg.channel.send("Game Over!");
            }
        }, 1000);

        
        const filter = answer => {
            return (answer.content.toLowerCase() == correctAnswer.toLowerCase()) && !answer.author.bot;
        };


        let answererUsername = await msg.channel.awaitMessages({ filter, max: 1, time: process.env.TIMER*1000, errors: ['time', 'max'] })
            .then(collected => {
                console.log(collected.first().content);
                clearInterval(interval);
                return collected.first().author.username;
            })
            .catch(collected => {
                return ;
            })


        if (answererUsername) {
            console.log(answererUsername + " wins this round !");
            await msg.channel.send(answererUsername + " wins this round !");
        }
        else {
            console.log("Nobody got the right answer...");
            await msg.channel.send("Nobody got the right answer...\nThe right answer was :\n" + correctAnswer + " !");
        }

    }
    
});

client.login(process.env.CLIENT_TOKEN); //login bot using token