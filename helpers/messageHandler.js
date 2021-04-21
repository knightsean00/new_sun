const voiceHelpers = require("./voiceHelpers");
const clipHelpers = require('./clipHelpers');
const { getArgs } = require('./generalUtil');
const pre = process.env.prefix;

var clip = false;

const help = {embed: {
        color: "#FF6AD5",
        author: {
            name: "Here to help!",
            icon_url: "https://cdn.dribbble.com/users/213309/screenshots/3708228/gradient_sunset.jpg"
        },
        fields: [{
                name: `${pre}ping`,
                value: "Test the server latency."
            },
            {
                name: `${pre}join`,
                value: "Bring Sunsets to your voice channel."
            },
            {
                name: `${pre}dc/leave`,
                value: "Disconnect Sunsets from the channel it's currently in."
            },
            {
                name: `${pre}play/p [song name/url] -sc`,
                value: "Searches for the given url or video. Default platform is YouTube. Use -sc flag for SoundCloud."
            },
            {
                name: `${pre}pause`,
                value: "Pauses the given playback."
            },
            {
                name: `${pre}resume`,
                value: "Resumes a paused playback."
            },
            {
                name: `${pre}queue/q`,
                value: "Prints out the current queue."
            },
            {
                name: `${pre}clear`,
                value: "Clears the current queue."
            },
            {
                name: `${pre}skip [song #]`,
                value: "Skips to the specified song #, otherwise, if no song # is specifed, skips the current song."
            },
            {
                name: `${pre}stop`,
                value: "Stops the playback and clears the queue."
            },
            {
                name: `${pre}np`,
                value: "Displays current song."
            },
            {
                name: `${pre}remove [index]`,
                value: "Removes the given song in Sunsets' queue."
            },
            {
                name: `${pre}seek [index]`,
                value: "Skips to song at position [index] in queue."
            },
            {
                name: `${pre}lyric(s)/ly [query]`,
                value: "Finds lyrics for the query specified, otherwise, if no query is specified, then current song is used as query"
            },
            {
                name: `${pre}help`,
                value: "try \"" + `${pre}help` + "\" for an infinite help loop."
            }
        ],
    }
}

module.exports = {
    messageHandler: (msg) => {
        if (msg.content.startsWith(pre)) {
            const content = getArgs(msg.content.slice(pre.length));
            console.log(content);
            switch (content.command) {
                case "join":
                    voiceHelpers.join(msg);
                    break;
    
                case "dc":
                    voiceHelpers.dc(msg);
                    break;
    
                case "play":
                    if (content.position < 1) {
                        msg.reply("you did not enter a song name.")
                    } else {
                        voiceHelpers.enqueue(msg, content.position.join(" ").trim(), content.sc || content.soundcloud);
                    }
                    break;

                case "playlist":
                    if (content.position < 1) {
                        msg.reply("you did not enter a playlist name.")
                    } else {
                        voiceHelpers.enqueuePlaylist(msg, content.position.join(" ").trim(), content.sc || content.soundcloud);
                    }
                    break;
    
                case "pause":
                    voiceHelpers.pause(msg);
                    break;
    
                case "resume":
                    voiceHelpers.resume(msg);
                    break;
    
                case "skip":
                    if (content.position < 1) {
                        voiceHelpers.skip(msg, 0);
                    } else {
                        voiceHelpers.skip(msg, parseInt(content.position[0]));
                    }
                    break
    
                case "stop":
                    voiceHelpers.stop(msg);
                    break;
    
                case "queue":
                    voiceHelpers.queue(msg);
                    break;

                case "clear":
                    voiceHelpers.clear(msg);
                    break;
    
                case "remove":
                    if (content.position < 1) {
                        msg.reply("you did not enter a song index.")
                    } else {
                        voiceHelpers.remove(msg, parseInt(content.position[0]));
                    }
                    break;
    
                case "seek":
                    if (content.position < 1) {
                        msg.reply("you did not enter a song index.")
                    } else {
                        voiceHelpers.seek(msg, parseInt(content.position[0]));
                    }
                break;
    
                case "help":
                    msg.channel.send(help);
                break;

                // case "clip":
                    // try {
                    //     clipHelpers.clip(msg);
                    //     clip = true;
                    // } catch (e) {
                    //     console.log("Error with clipping.")
                    //     console.log(e)
                    // }
                // break;

                case "np":
                    voiceHelpers.np(msg);
                break;

                case "lyric":
                    if (content.position < 1) {
                        voiceHelpers.lyrics(msg);
                    } else {
                        voiceHelpers.lyrics(msg, content.position.join(" ").trim());
                    }
                break;

                default:
                    msg.reply(`sorry, I did not understand that command, try ${pre}help to get a list of available commands.`)
            }
        } 
        // else if (clip && msg.author.id !== msg.guild.me.id) {
        //     const clipName = msg.content.split(' ').join("-").trim();
        //     try {
        //         clipHelpers.ship(msg, clipName)
        //     } catch (e) {
        //         console.log("Error with shipping");
        //         console.log(e);
        //     } finally {
        //         clip = false;
        //     }
        // }
    }
}