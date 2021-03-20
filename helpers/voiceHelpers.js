const scdl = require('soundcloud-downloader').default;
const clipHelpers = require('./clipHelpers');
var ytsr = require('ytsr');
var ytpl = require('ytpl');
const ytdl = require("ytdl-core");

var queue = {};

function timeRemaining(streamTime, totalTime) {
    let timeRemaining = totalTime - streamTime;
    let hours = Math.floor(timeRemaining / 3600);

    timeRemaining = timeRemaining - hours * 3600;
    let minutes = Math.floor(timeRemaining / 60);

    let seconds = Math.floor(timeRemaining - minutes * 60);

    if (hours > 0) {
        return `${hours}hr ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`
}

function createQueue(id) {
    if (queue[id] == null) {
        queue[id] = [];
    }
}

function displayQueue(id, time) {
    if (queue[id] == null || queue[id].length === 0) {
        return "There is nothing in queue."
    }
    let runningTime = queue[id][0].time;
    var output = `Now playing ${queue[id][0].title} with ${timeRemaining(time, runningTime)} remaining`
    if (queue[id].length === 1) {
        output += "\n\nNo other songs in queue."
    } else {
        output += "\n\nQueue:"
        for(let i = 1; i < Math.min(queue[id].length, 51); i++) {
            output += `\n${i}) ${queue[id][i].title} ${timeRemaining(time, runningTime)}`;
            runningTime += queue[id][i].time;
        }
    }

    let footer = (queue[id.length > 50]) ? "Only displays the first 50 songs" : ""

    return { embed: {
            color: "#FF6AD5",
            title: "Queue",
            author: {
                name: "sunsets_locale",
                icon_url: "https://images-na.ssl-images-amazon.com/images/I/71e7DkexvHL._AC_SX425_.jpg",
            },
            thumbnail: {
                url: queue[id].cover,
            },
            description: output,
            footer: {
                text: footer
            }
        }
    }
}

function nowPlaying(song) {
    return {embed: {
            color: "#FF6AD5",
            title: song.title,
            url: song.url,
            description: `${song.artist}\nDuration: ${timeRemaining(0, song.time)}`,
            thumbnail: {
                url: song.cover,
            }
        }
    }
}

const join = async (msg) => {
    if (msg.member.voice.channel === null || !msg.member.voice.channel.joinable) {
        msg.reply("you are not currently in a voice channel");
    } else {
        const connect = await msg.member.voice.channel.join();
        // clipHelpers.startStream(msg.guild.me.id, msg.guild.id, msg.member.voice.channel.members, connect);
    }
    return
}

async function play(msg, force = false) {
    if (msg.guild.me.voice.channel == null) {
        await join(msg);
    }
    if (queue[msg.guild.id].length === 1 || force) {
        const song = queue[msg.guild.id][0];
        try {
            var dispatch = null;
            if (song.type === "sc") {
                const stream = await scdl.download(song.url);
                dispatch = msg.guild.me.voice.connection.play(stream);
            } else {
                dispatch = msg.guild.me.voice.connection.play(ytdl(song.url));
            }
            
            msg.channel.send(nowPlaying(song));

            dispatch.on("speaking", speak => {
                if (!speak) {
                    queue[msg.guild.id].shift();
                    play(msg, true);
                }
            })
        } catch (e) {
            console.log(e);
            msg.channel.send(`I was unable to catch stream for ${song.title}. Skipping...`);
            queue[msg.guild.id].shift();
            play(msg, true);
        }
    } else if (queue[msg.guild.id].length === 0) {
        msg.channel.send("The queue is empty.")
    }
}

module.exports = {
    join: join,

    dc: (msg) => {
        if (msg.guild.me.voice.channel === null) {
            msg.reply("I am not currently in a voice channel");
        } else {
            msg.guild.me.voice.channel.leave();
            queue[msg.guild.id] = [];
        }
    },

    enqueue: async (msg, query, sc=false) => {
        createQueue(msg.guild.id);
        try {
            if (sc) {
                let songInfo = await scdl.search({query: query, resourceType: "tracks", limit: 1});
                songInfo = songInfo.collection[0];
                queue[msg.guild.id].push({type: "sc", 
                    cover: songInfo.artwork_url, 
                    url: songInfo.permalink_url, 
                    title: songInfo.title, 
                    artist: songInfo.user.username,
                    time: Math.trunc(songInfo.duration / 1000)
                });
            } else {
                const possibleFilters = await ytsr.getFilters(query);
                const filters = possibleFilters.get("Type").get("Video");
                let res = await ytsr(filters.url, {limit: 1});
                res = res.items[0];
                queue[msg.guild.id].push({type: "yt", 
                    cover: res.bestThumbnail.url, 
                    url: res.url, 
                    title: res.title, 
                    artist: res.author.name,
                    time: res.durationSec
                })   
            }
            msg.reply(`added ${queue[msg.guild.id][queue[msg.guild.id].length - 1].title} to queue.`);
            play(msg);
        } catch {
            msg.reply(`could not find ${query}.`);
        }  
    },

    enqueuePlaylist: async (msg, query, sc=false) => {
        createQueue(msg.guild.id);
        let songsAdded = 0;
        let playOnAdd = (queue[msg.guild.id].length === 0) ? true : false;
        try {
            if (sc) {
                let songInfo = await scdl.search({query: query, resourceType: "playlists", limit: 1});
                songInfo = songInfo.collection[0].tracks;
                songInfo = songInfo.map(song => {
                    return song.id
                });
                songInfo = await scdl.getTrackInfoByID(songInfo);
                songInfo.forEach(song => {
                    try {
                        queue[msg.guild.id].push({type: "sc", 
                            cover: song.artwork_url, 
                            url: song.permalink_url, 
                            title: song.title, 
                            artist: song.user.username,
                            time: Math.trunc(song.duration / 1000)
                        });
                        songsAdded++;
                    } catch {
                        console.log("Song could not be found");
                        console.log(song);
                    }
                })
            } else {
                const possibleFilters = await ytsr.getFilters(query);
                const filters = possibleFilters.get("Type").get("Playlist");
                let res = await ytsr(filters.url, {limit: 1, });
                res = res.items[0].url;
                res = await ytpl(res);
                res = res.items;
                res.forEach(song => {
                    try {
                        queue[msg.guild.id].push({type: "yt", 
                            cover: song.bestThumbnail.url, 
                            url: song.shortUrl, 
                            title: song.title, 
                            artist: song.author.name,
                            time: song.durationSec
                        });
                        songsAdded++;
                    } catch {
                        console.log("Song could not be found");
                        console.log(song);
                    }
                });
            }
            msg.reply(`added ${songsAdded} songs to queue.`);
            if (playOnAdd && songsAdded > 0) {
                play(msg, true);
            }
        } catch (e) {
            console.log(e)
            msg.reply(`could not find ${query}.`);
        }  
    },

    resume: (msg) => {
        try {
            msg.guild.me.voice.connection.dispatcher.resume()
        } catch {
            msg.reply("there is nothing to resume.")
        }
    },

    pause: (msg) => {
        try {
            msg.guild.me.voice.connection.dispatcher.pause()
        } catch {
            msg.reply("there is nothing to pause.")
        }
    },

    skip: (msg) => {
        try {
            queue[msg.guild.id].shift();
            if (queue[msg.guild.id].length > 0) {
                play(msg, true);
            } else {
                msg.guild.me.voice.connection.dispatcher.destroy();
            }
        } catch {
            msg.reply("there is nothing to skip.");
        }
    },

    stop: (msg) => {
        try {
            queue[msg.guild.id] = [];
            msg.guild.me.voice.connection.dispatcher.destroy();
        } catch {
            msg.reply("there is nothing to stop.");
        }
    },

    clear: (msg) => {
        queue[msg.guild.id] = [];
        msg.reply("the queue has been cleared.")
    },

    seek: (msg, index) => {
        try {
            queue[msg.guild.id] = queue[msg.guild.id].slice(index);
            play(msg, true);
        } catch {
            msg.reply("the song index was invalid.")
        }
    },

    remove: (msg, index) => {
        try {
            const removedSong = queue[msg.guild.id].splice(index, 1);
            msg.reply(`${removedSong[0]} was removed`)
        } catch {
            msg.reply("the song index was invalid.")
        }
    },

    queue: (msg) => {
        try {
            msg.channel.send(displayQueue(msg.guild.id, Math.floor(msg.guild.me.voice.connection.dispatcher.streamTime / 1000)));
        } catch {
            msg.reply("there is nothing in queue.");
        }
    },

    np: (msg) => {
        try {
            msg.channel.send(nowPlaying(queue[msg.guild.id][0]));
        } catch {
            msg.reply("there is nothing playing.");
        }
    }
}