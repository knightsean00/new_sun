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
};

const cmdMap = {
    "join": voiceHelpers.join,
    "dc": voiceHelpers.dc,
    "play": voiceHelpers.enqueue,
    "playlist": voiceHelpers.enqueuePlaylist,
    "pause": voiceHelpers.pause,
    "resume": voiceHelpers.resume,
    "skip": voiceHelpers.skip,
    "stop": voiceHelpers.stop,
    "queue": voiceHelpers.queue,
    "clear": voiceHelpers.clear,
    "remove": voiceHelpers.remove,
    "seek": voiceHelpers.seek,
    "np": voiceHelpers.np,
    "lyric": voiceHelpers.lyrics,
    "help": (msg, cmd) => {
        msg.channel.send(help);
    }
};

module.exports = {
    messageHandler: (msg) => {
        if (msg.content.startsWith(pre)) {
            const content = getArgs(msg.content.slice(pre.length));
            console.log(content);

            if (content.command in cmdMap) {
                cmdMap[content.command](msg, content);
            } else {
                msg.reply(`sorry, I did not understand that command, try ${pre}help to get a list of available commands.`);
            }
        } 
    }
}