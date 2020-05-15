const Discord = require('discord.js');

const dieImagePath = (number) => `./assets/die/dice${number}.png`;

const getEmoji = (guild, name) => {
  return guild.emojis.cache.find(emoji => emoji.name === name);
}

const getOrCreateDieEmoji = async (guild, dieRoll) => {
  let dieEmoji = getEmoji(guild, `dice${dieRoll}`);
  if (!dieEmoji) {
    await guild.emojis.create(dieImagePath(dieRoll), `dice${dieRoll}`);
    dieEmoji = getEmoji(guild, `dice${dieRoll}`);
  }
  return dieEmoji;
};

const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('🎲')) {
    let dieEmojis = [];
    const numRolls = message.content.split('🎲').length - 1;
    for (let i = 0; i < numRolls; i++) {
      let dieRoll = Math.floor(Math.random() * 6 + 1);
      try {
        dieEmojis.push(await getOrCreateDieEmoji(message.guild, dieRoll));
      } catch (error) {
        // Maximum number of emojis reached
        if (error.code === 30008) {
          let files = [];
          for (let j = 0; j < numRolls; j++) {
            dieRoll = Math.floor(Math.random() * 6 + 1);
            const attachment = new Discord.MessageAttachment(dieImagePath(dieRoll));
            files.push(attachment);
          }
          message.channel.send('', files);
          return;
        }
      }
    }
    message.channel.send(dieEmojis.map((dieEmoji) => `${dieEmoji}`).join(' '));
  }
});

client.login(process.env.BOT_TOKEN);