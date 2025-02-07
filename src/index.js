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

const TOKEN = process.env.DISCORD_TOKEN;

// In-memory storage
const eventTemplates = new Map();
const activeEvents = new Map();

class EventTemplate {
  constructor(name, description, roles) {
    this.name = name;
    this.description = description;
    this.roles = roles; // Map of role_name: max_slots
  }
}

class ActiveEvent {
  constructor(templateName, description, roles, startTime) {
    this.templateName = templateName;
    this.description = description;
    this.roles = roles; // Map of role_name: [array of participant IDs]
    this.startTime = startTime;
    this.reminderSent = false;
  }
}

const commands = [
  new SlashCommandBuilder()
    .setName('create_template')
    .setDescription('Create a new event template')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Template name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('roles')
        .setDescription('Roles and slots (format: role1:slots,role2:slots)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Event description')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('start_event')
    .setDescription('Start an event from a template')
    .addStringOption(option =>
      option.setName('template')
        .setDescription('Template name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Event name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Event start time (format: YYYY-MM-DD HH:mm)')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('list_events')
    .setDescription('List all active events'),
    
  new SlashCommandBuilder()
    .setName('list_templates')
    .setDescription('List all available event templates')
];

client.once('ready', async () => {
  console.log(`Bot is ready! Logged in as ${client.user.tag}`);
  
  try {
    await client.application.commands.set(commands);
    console.log('Successfully registered application commands.');
    
    // Start reminder check interval
    setInterval(checkReminders, 60000); // Check every minute
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

async function checkReminders() {
  const now = new Date();
  
  activeEvents.forEach(async (event, eventName) => {
    const timeDiff = event.startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));
    
    // Send reminder 30 minutes before event
    if (minutesUntilStart <= 30 && minutesUntilStart > 0 && !event.reminderSent) {
      const template = eventTemplates.get(event.templateName);
      
      const embed = new EmbedBuilder()
        .setTitle(`⏰ Reminder: ${eventName} starts in ${minutesUntilStart} minutes!`)
        .setDescription(event.description)
        .setColor('#FF9900');
      
      template.roles.forEach((slots, role) => {
        const participants = event.roles.get(role);
        const participantMentions = participants.map(id => `<@${id}>`).join('\n');
        embed.addFields({
          name: `${role} (${participants.length}/${slots})`,
          value: participantMentions || 'No participants',
          inline: false
        });
      });
      
      // Send reminder to all channels where the event was announced
      // You'd need to store these channels when creating the event
      event.reminderSent = true;
    }
  });
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  switch (interaction.commandName) {
    case 'create_template':
      await handleCreateTemplate(interaction);
      break;
    case 'start_event':
      await handleStartEvent(interaction);
      break;
    case 'list_templates':
      await handleListTemplates(interaction);
      break;
    case 'list_events':
      await handleListEvents(interaction);
      break;
  }
});

async function handleStartEvent(interaction) {
  const templateName = interaction.options.getString('template');
  const eventName = interaction.options.getString('name');
  const timeString = interaction.options.getString('time');
  
  const template = eventTemplates.get(templateName);
  if (!template) {
    await interaction.reply({
      content: `Template '${templateName}' not found!`,
      ephemeral: true
    });
    return;
  }

  try {
    const startTime = new Date(timeString);
    if (isNaN(startTime.getTime())) {
      throw new Error('Invalid date');
    }

    // Initialize empty roles
    const roles = new Map();
    template.roles.forEach((slots, role) => {
      roles.set(role, []);
    });

    // Create active event
    activeEvents.set(eventName, new ActiveEvent(
      templateName,
      template.description,
      roles,
      startTime
    ));

    const embed = new EmbedBuilder()
      .setTitle(`Event: ${eventName}`)
      .setDescription(template.description)
      .setColor('#0099ff')
      .addFields({
        name: 'Start Time',
        value: startTime.toLocaleString(),
        inline: false
      });

    template.roles.forEach((slots, role) => {
      embed.addFields({
        name: `${role} (0/${slots})`,
        value: 'No participants yet',
        inline: false
      });
    });

    embed.setFooter({ text: 'React with 🎯 to sign up' });

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    await message.react('🎯');
  } catch (error) {
    await interaction.reply({
      content: 'Invalid date format. Please use YYYY-MM-DD HH:mm',
      ephemeral: true
    });
  }
}

async function handleListEvents(interaction) {
  if (activeEvents.size === 0) {
    await interaction.reply('No active events.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Active Events')
    .setColor('#00ff00');

  activeEvents.forEach((event, eventName) => {
    const participantCounts = Array.from(event.roles.entries())
      .map(([role, participants]) => `${role}: ${participants.length}/${eventTemplates.get(event.templateName).roles.get(role)}`)
      .join('\n');

    embed.addFields({
      name: eventName,
      value: `Start Time: ${event.startTime.toLocaleString()}\n${participantCounts}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
}

// ... (rest of the previous code for handleCreateTemplate, handleListTemplates, and reaction handling remains the same)

client.login(TOKEN);