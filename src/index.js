require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
var http = require('http');

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

const port = process.env.PORT || 3000;

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
//console.log("Folders Path: " + foldersPath);
const commandFolders = fs.readdirSync(foldersPath);
//console.log("Command Folders: " + commandFolders);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	//console.log(interaction);

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command){
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

http.createServer(function (req, res) {
  res.write('Hello World!'); //write a response to the client
  res.end(); //end the response
}).listen(8080);
  client.once('ready', async () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    
    /*try {
      await client.application.commands.set(commands);
      console.log('Successfully registered application commands.');
      setInterval(checkReminders, 60000);
    } catch (error) {
      console.error('Error registering commands:', error);
    }*/
  });
  
// Setup process
async function startup() {
    //await connectToMongoDB();
    await client.login(process.env.DISCORD_TOKEN);
  }
  
  startup().catch(console.error); 