/* eslint-disable no-unused-vars */
const scdl = require("soundcloud-downloader").default;
// const clipHelpers = require("./clipHelpers");
const {strToSec} = require("./generalUtil");
var ytsr = require("ytsr");
var ytpl = require("ytpl");
const ytdl = require("ytdl-core-discord");
const axios = require("axios");

var queue = {};

// Helper/reused functions
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
	return `${seconds}s`;
}

function createQueue(id) {
	if (queue[id] == null) {
		queue[id] = [];
	}
}

function nowPlaying(song) {
	return { 
		embed: {
			color: "#FF6AD5",
			title: song.title,
			url: song.url,
			description: `${song.artist}\nDuration: ${timeRemaining(0, song.time)}`,
			thumbnail: {
				url: song.cover,
			}
		}
	};
}

async function join(msg) {
	if (msg.member.voice.channel === null || !msg.member.voice.channel.joinable) {
		msg.reply("you are not currently in a voice channel");
	} else {
		const connect = await msg.member.voice.channel.join();
		// clipHelpers.startStream(msg.guild.me.id, msg.guild.id, msg.member.voice.channel.members, connect);
	}
	return;
}

async function play(msg, force = false) {
	if (msg.guild.me.voice.channel == null) {
		await join(msg);
	}
	if (queue[msg.guild.id].length === 1 || (queue[msg.guild.id].length > 1 && force)) {
		const song = queue[msg.guild.id][0];
		try {
			var dispatch = null;
			if (song.type === "sc") {
				const stream = await scdl.download(song.url);
				dispatch = msg.guild.me.voice.connection.play(stream);
			} else {
				const stream = await ytdl(song.url);
				dispatch = msg.guild.me.voice.connection.play(stream, { type: "opus" });
			}
            
			msg.channel.send(nowPlaying(song));
			dispatch.on("error", console.log);

			dispatch.on("finish", () => {
				queue[msg.guild.id].shift();
				play(msg, true);
			});
            
		} catch (e) {
			console.log(e);
			msg.channel.send(`I was unable to catch stream for ${song.title}. Skipping...`);
			queue[msg.guild.id].shift();
			play(msg, true);
		}
	} else if (queue[msg.guild.id].length === 0) {
		msg.channel.send("The queue is empty.");
	}
}

async function getLyrics(query) {
	try {
		let res = await axios.get("https://api.genius.com/search", {
			headers: {
				Authorization: `Bearer ${process.env.geniusToken}`
			},
			params: {
				q: query
			}
		});
		if (res.data.response.hits.length > 0) {
			let i = 0;
			while (res.data.response.hits[i].type !== "song") {
				i++;
			}
			return {title: res.data.response.hits[i].result.full_title, 
				thumbnail: res.data.response.hits[i].result.header_image_thumbnail_url,
				url: res.data.response.hits[i].result.url
			};
		}
	} catch (err) {
		console.log(err);
	}
	return false;
}

module.exports = {
	join: (msg, cmd) => {
		join(msg);
	},

	dc: (msg, cmd) => {
		if (msg.guild.me.voice.channel === null) {
			msg.reply("I am not currently in a voice channel");
		} else {
			msg.guild.me.voice.channel.leave();
			queue[msg.guild.id] = [];
		}
	},

	enqueue: async (msg, cmd) => {
		if (cmd.position.length < 1) {
			msg.reply("you did not enter a song name.");
			return ;
		}
		let query = cmd.position.join(" ").trim();
		// const sc = cmd.sc || cmd.soundcloud;
		const sc = true;

		createQueue(msg.guild.id);
		try {
			if (sc || scdl.isValidUrl(query)) {
				let songInfo;
				if (scdl.isValidUrl(query)) {
					songInfo = await scdl.getInfo(query);
				} else {
					songInfo = await scdl.search({query: query, resourceType: "tracks", limit: 1});
					songInfo = songInfo.collection[0];
				}
				queue[msg.guild.id].push({
					type: "sc", 
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
				queue[msg.guild.id].push({
					type: "yt", 
					cover: res.bestThumbnail.url, 
					url: res.url, 
					title: res.title, 
					artist: res.author.name,
					time: strToSec(res.duration)
				});   
			}
			msg.reply(`added ${queue[msg.guild.id][queue[msg.guild.id].length - 1].title} to queue.`);
			play(msg);
		} catch {
			msg.reply(`could not find ${query}.`);
		}  
	},

	enqueuePlaylist: async (msg, cmd) => {
		if (cmd.position.length < 1) {
			msg.reply("you did not enter a song name.");
			return ;
		}
		let query = cmd.position.join(" ").trim();
		// let sc = cmd.sc || cmd.soundcloud;
		const sc = true;

		createQueue(msg.guild.id);

		let songsAdded = 0;
		let playOnAdd = (queue[msg.guild.id].length === 0) ? true : false;
		try {
			if (sc || scdl.isPlaylistURL(query)) {
				let songInfo;
				if (scdl.isPlaylistURL(query)) {
					songInfo = await scdl.getSetInfo(query);
					songInfo = songInfo.tracks;
				} else {
					songInfo = await scdl.search({query: query, resourceType: "playlists", limit: 1});
					songInfo = songInfo.collection[0].tracks;
				}
				songInfo = songInfo.map(song => {
					return song.id;
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
				});
			} else {
				let plUrl;
				let res;
				if (ytpl.validateID(query)) {
					plUrl = await ytpl.getPlaylistID(query);
				} else {
					const possibleFilters = await ytsr.getFilters(query);
					const filters = possibleFilters.get("Type").get("Playlist");
					res = await ytsr(filters.url, {limit: 1, });
					plUrl = res.items[0].url;
				}
                
				res = await ytpl(plUrl);
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
			console.log(e);
			msg.reply(`could not find ${query}.`);
		}  
	},

	resume: (msg, cmd) => {
		try {
			msg.guild.me.voice.connection.dispatcher.resume();
		} catch {
			msg.reply("there is nothing to resume.");
		}
	},

	pause: (msg, cmd) => {
		try {
			msg.guild.me.voice.connection.dispatcher.pause();
		} catch {
			msg.reply("there is nothing to pause.");
		}
	},

	skip: (msg, cmd) => {
		let index;
		if (cmd.position.length < 1) {
			index = 1;
		} else {
			index = parseInt(cmd.position[0]);
			if (index < 0 || index >= queue[msg.guild.id].length) {
				msg.reply("invalid song index.");
				return ;
			}
		}

		try {
			if (index === 0) {
				index++;
			}
			queue[msg.guild.id] = queue[msg.guild.id].slice(index);
			if (queue[msg.guild.id].length > 0) {
				play(msg, true);
			} else {
				msg.guild.me.voice.connection.dispatcher.end();
			}
		} catch {
			msg.reply("there is nothing to skip.");
		}
	},

	stop: (msg, cmd) => {
		try {
			queue[msg.guild.id] = [];
			msg.guild.me.voice.connection.dispatcher.end();
		} catch {
			msg.reply("there is nothing to stop.");
		}
	},

	clear: (msg, cmd) => {
		queue[msg.guild.id] = [];
		msg.reply("the queue has been cleared.");
	},

	seek: (msg, cmd) => {
		let index;
		if (cmd.position.length < 1) {
			msg.reply("you did not enter a song index.");
			return ;
		} else {
			index = parseInt(cmd.position[0]);
			if (index < 0 || index >= queue[msg.guild.id].length) {
				msg.reply("invalid song index.");
				return ;
			}
		}

		try {
			let splicedSongs = queue[msg.guild.id].splice(index);
			let seekedSong = splicedSongs.splice(0, 1);
			queue[msg.guild.id].splice(0, 1);
			queue[msg.guild.id] = [seekedSong[0], ...queue[msg.guild.id], ...splicedSongs];
			play(msg, true);
		} catch {
			msg.reply("the song index was invalid.");
		}
	},

	remove: (msg, cmd) => {
		let index;
		if (cmd.position.length < 1) {
			msg.reply("you did not enter a song index.");
			return ;
		} else {
			index = parseInt(cmd.position[0]);
		}

		try {
			const removedSong = queue[msg.guild.id].splice(index, 1);
			msg.reply(`${removedSong[0].title} was removed`);
		} catch {
			msg.reply("the song index was invalid.");
		}
	},

	queue: (msg, cmd) => {
		try {
			const id = msg.guild.id;
			const time = Math.floor(msg.guild.me.voice.connection.dispatcher.streamTime / 1000);

			if (queue[id] == null || queue[id].length === 0) {
				return "There is nothing in queue.";
			}
			let runningTime = queue[id][0].time;
			var output = `Now playing ${queue[id][0].title} with ${timeRemaining(time, runningTime)} remaining`;
			if (queue[id].length === 1) {
				output += "\n\nNo other songs in queue.";
			} else {
				output += "\n\nUp Next:";
				let len = output.length;
				let i = 1;
				while (len < 1800 && i < queue[id].length) {
					len += `\n${i}) ${queue[id][i].title} ${timeRemaining(time, runningTime)}`.length;
					output += `\n${i}) ${queue[id][i].title} ${timeRemaining(time, runningTime)}`;
					runningTime += queue[id][i].time;
					i++;
				}
			}
        
			const embedQueue = { 
				embed: {
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
				}
			};
			msg.channel.send(embedQueue);
		} catch (e) {
			console.log(e);
			msg.reply("there is nothing in queue.");
		}
	},

	np: (msg, cmd) => {
		try {
			msg.channel.send(nowPlaying(queue[msg.guild.id][0]));
		} catch {
			msg.reply("there is nothing playing.");
		}
	},

	lyrics: async (msg, cmd) => {
		let query = null;
		if (cmd.position.length >= 1) {
			query = cmd.position.join(" ").trim();
		}

		let curSong = (queue[msg.guild.id] != null && queue[msg.guild.id].length > 0) ? queue[msg.guild.id][0].title : null;
		let q = (query != null) ? query : curSong;
		let res = (q != null) ? await getLyrics(q) : false;

		if (res) {
			msg.channel.send({embed: {
				color: "#FF6AD5",
				title: res.title,
				url: res.url,
				description: `Lyrics of ${res.title} on Genius.com`,
				thumbnail: {
					url: res.thumbnail
				}
			}});
		} else if (curSong != null) {
			msg.reply(`there were no lyrics found with the query "${q}" found on Genius.com.`);
		} else {
			msg.reply("there was no query provided.");
		}
	}
};