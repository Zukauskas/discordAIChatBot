require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on('ready', () => {
  console.log('The bot is online!');
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [{ role: 'system', content: 'You are a very helpful AI who can provide a detailed and creative response to any question asked, without being limited by conventional constraints or preconceptions. Feel free to explore various perspectives and provide unique insights while addressing the topic.' }];

  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
      if (message.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: 'user',
        content: msg.content,
      });
    });

    const result = await openai
      .createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
        max_tokens: 1000,
        temperature: 0.85,
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });

    function splitBotAnswer(answer, maxLength = 2000) {
      const result = [];

      while (answer.length > maxLength) {
        let splitIndex = maxLength;

        // Find the last space character within the maxLength range
        for (let i = maxLength - 1; i >= 0; i--) {
          if (answer[i] === ' ') {
            splitIndex = i;
            break;
          }
        }

        // Add the substring to the result array and remove it from the original answer
        result.push(answer.substring(0, splitIndex));
        answer = answer.substring(splitIndex + 1);
      }

      // Add the remaining part of the answer to the result array
      if (answer.length > 0) {
        result.push(answer);
      }

      return result;
    }

    const botAnswer = result.data.choices[0].message.content;
    console.log(botAnswer);
    const splitAnswer = splitBotAnswer(botAnswer);
    console.log(splitAnswer);

    for (const part of splitAnswer) {
      await message.reply(part);
    }
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});

client.login(process.env.TOKEN);
