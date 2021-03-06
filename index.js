require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();
const { messageHandler } = require("./helpers/messageHandler");
// const { startStream } = require("./helpers/clipHelpers");
const { shutdown } = require("./helpers/generalUtil");


client.on("ready", () => {
	console.log(`Logged in with ${client.user.tag}`);
});

client.on("message", msg => {
	messageHandler(msg, client);
});

// client.on("voiceStateUpdate", (oldState, newState) => {
//     const memberID = oldState.member.id;
//     if (memberID !== client.user.id && newState.channel != null && newState.channel.members.has(client.user.id)) {
//         if (oldState.channelID == null && newState.channelID != null) {
//             startStream(member, , newState.members, )
//         } else if (oldState.channelID != null && newState.channelID == null) {
//             console.log(memberID, "left");
//         }
//     }
// })

client.login(process.env.discordToken);


process.on("SIGTERM", () => {
	shutdown(client);
});

process.on("SIGINT", () => {
	shutdown(client);
});