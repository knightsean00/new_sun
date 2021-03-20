const { exec } = require("child_process");
const generalUtil = require("./generalUtil");
var FileWriter = require('wav').FileWriter;

var streams = {};

function createStreams(id) {
    if (streams[id] == null) {
        streams[id] = {};
    }
}

function startUserStream(user_id, guild_id, connect, timeOut = 120000) {
    console.log("Starting stream for", user_id);
    const readStream = connect.receiver.createStream(user_id, {mode: "pcm", end: "manual"})
    generalUtil.makeDir(`./output/${guild_id}/`);
    const writeStream = new FileWriter(`./output/${guild_id}/${user_id}.wav`, {
        channels: 2
    });

    readStream.pipe(writeStream);
    streams[guild_id][user_id] = writeStream;

    setTimeout(() => {
        writeStream.end();
    }, timeOut)
}

module.exports = {
    startStream: (client_id, guild_id, members, connect) => {
        createStreams(guild_id)
        members.forEach((s, g) => {
            if (g !== client_id) {
                startUserStream(g, guild_id, connect)
            }
        });
    },

    clip: (msg) => {
        for (const [id, s] of Object.entries(streams[msg.guild.id])) {
            s.end();
        }
        msg.reply("clipped, please type name file.")
    },

    ship: (msg, clipName) => {
        console.log(clipName)
        exec(`py ./helpers/sound_concat.py ${clipName} ${msg.guild.id}`, (err, stdout, stderr) => {
            if (err) {
                console.log(err);
                return ;
            } if (stderr) {
                console.log(stderr);
                return ;
            }
            msg.reply("shipped!")
            console.log(stdout);
        })
    }
}