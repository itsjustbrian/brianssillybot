const Discord = require('discord.js');
const ytdl = require("ytdl-core");

console.log(process.env);

const getEmoji = (guild, name) => {
  return guild.emojis.cache.find(emoji => emoji.name === name);
}

const getOrCreateDieEmoji = async (guild, dieRoll) => {
  let dieEmoji = getEmoji(guild, `dice${dieRoll}`);
  if (!dieEmoji) {
    const imgPath = `./assets/die/dice${dieRoll}.png`;
    await guild.emojis.create(imgPath, `dice${dieRoll}`);
    dieEmoji = getEmoji(guild, `dice${dieRoll}`);
  }
  return dieEmoji;
};

const client = new Discord.Client();

const queue = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('🎲')) {
    let dieEmojis = [];
    const numRolls = message.content.split('🎲').length - 1;
    for (let i = 0; i < numRolls; i++) {
      const dieRoll = Math.floor(Math.random() * 6 + 1);
      dieEmojis.push(await getOrCreateDieEmoji(message.guild, dieRoll));
    }
    message.channel.send(dieEmojis.map((dieEmoji) => `${dieEmoji}`).join(' '));
  }

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith('mambo')) {
    message.content = '!play https://www.youtube.com/watch?v=kjERnmcjbAE';
    execute(message, serverQueue);
    return;
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  //serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(process.env.BOT_TOKEN);