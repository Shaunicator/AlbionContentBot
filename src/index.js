require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

//const activeEvents = new Map();

  // Command registration
  const commands = [
    new SlashCommandBuilder()
      .setName('create_template')
      .setDescription('Create a new event template'),
    
    new SlashCommandBuilder()
      .setName('create_event')
      .setDescription('Create a new event from a template'),
      
    new SlashCommandBuilder()
      .setName('list_templates')
      .setDescription('List all available event templates'),
      
    new SlashCommandBuilder()
      .setName('list_events')
      .setDescription('List all active events')
  ];

  client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    
    try {
      await client.application.commands.set(commands);
      console.log('Successfully registered application commands.');
      setInterval(checkReminders, 60000);
    } catch (error) {
      console.error('Error registering commands:', error);
    }
  });
  
// Setup process
async function startup() {
    await connectToMongoDB();
    await client.login(process.env.DISCORD_TOKEN);
  }
  
  startup().catch(console.error); 