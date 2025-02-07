const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    SlashCommandBuilder,
    ButtonStyle,
    TextInputStyle,
  } = require('discord.js');
  const { MongoClient } = require('mongodb');
  require('dotenv').config();
  
  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages
    ]
  });
  
  // MongoDB setup
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  let db;
  
  // Connect to MongoDB
  async function connectToMongoDB() {
    try {
      await mongoClient.connect();
      db = mongoClient.db('eventBot');
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
  }
  
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
  
  // Handle slash commands
  client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
      switch (interaction.commandName) {
        case 'create_template':
          await showTemplateModal(interaction);
          break;
        case 'create_event':
          await showEventCreationMenu(interaction);
          break;
        case 'list_templates':
          await listTemplates(interaction);
          break;
        case 'list_events':
          await listEvents(interaction);
          break;
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'template_modal') {
        await handleTemplateModalSubmit(interaction);
      } else if (interaction.customId === 'event_modal') {
        await handleEventModalSubmit(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'template_select') {
        await showEventModal(interaction);
      }
    }
  });
  
  // Show template creation modal
  async function showTemplateModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('template_modal')
      .setTitle('Create Event Template');
  
    const nameInput = new TextInputBuilder()
      .setCustomId('templateName')
      .setLabel('Template Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const descriptionInput = new TextInputBuilder()
      .setCustomId('templateDescription')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
  
    const rolesInput = new TextInputBuilder()
      .setCustomId('templateRoles')
      .setLabel('Roles (format: role1:slots,role2:slots)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Tank:5,Healer:3,DPS:12')
      .setRequired(true);
  
    const rows = [nameInput, descriptionInput, rolesInput].map(input => 
      new ActionRowBuilder().addComponents(input)
    );
  
    modal.addComponents(rows);
    await interaction.showModal(modal);
  }
  
  // Handle template modal submission
  async function handleTemplateModalSubmit(interaction) {
    const templateName = interaction.fields.getTextInputValue('templateName');
    const description = interaction.fields.getTextInputValue('templateDescription');
    const rolesInput = interaction.fields.getTextInputValue('templateRoles');
  
    try {
      const roles = new Map();
      rolesInput.split(',').forEach(roleData => {
        const [roleName, slots] = roleData.split(':');
        roles.set(roleName.trim(), parseInt(slots));
      });
  
      const template = {
        name: templateName,
        description,
        roles: Object.fromEntries(roles),
        guildId: interaction.guildId,
        createdAt: new Date()
      };
  
      await db.collection('templates').insertOne(template);
  
      await interaction.reply({
        content: `Template "${templateName}" created successfully!`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: 'Error creating template. Please check your input format.',
        ephemeral: true
      });
    }
  }
  
  // Show event creation menu with template selection
  async function showEventCreationMenu(interaction) {
    const templates = await db.collection('templates')
      .find({ guildId: interaction.guildId })
      .toArray();
  
    if (templates.length === 0) {
      await interaction.reply({
        content: 'No templates available. Create a template first!',
        ephemeral: true
      });
      return;
    }
  
    const select = new StringSelectMenuBuilder()
      .setCustomId('template_select')
      .setPlaceholder('Select a template')
      .addOptions(templates.map(template => ({
        label: template.name,
        description: template.description.substring(0, 100),
        value: template.name
      })));
  
    const row = new ActionRowBuilder().addComponents(select);
  
    await interaction.reply({
      content: 'Select a template for your event:',
      components: [row],
      ephemeral: true
    });
  }
  
  // Show event creation modal
  async function showEventModal(interaction) {
    const templateName = interaction.values[0];
    
    const modal = new ModalBuilder()
      .setCustomId('event_modal')
      .setTitle('Create Event');
  
    const eventNameInput = new TextInputBuilder()
      .setCustomId('eventName')
      .setLabel('Event Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const dateInput = new TextInputBuilder()
      .setCustomId('eventDate')
      .setLabel('Date (YYYY-MM-DD)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const timeInput = new TextInputBuilder()
      .setCustomId('eventTime')
      .setLabel('Time (HH:MM)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    // Store template name in a hidden field
    const templateInput = new TextInputBuilder()
      .setCustomId('templateName')
      .setLabel('Template')
      .setValue(templateName)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const rows = [eventNameInput, dateInput, timeInput, templateInput].map(input => 
      new ActionRowBuilder().addComponents(input)
    );
  
    modal.addComponents(rows);
    await interaction.showModal(modal);
  }
  
  // Handle event modal submission
  async function handleEventModalSubmit(interaction) {
    const eventName = interaction.fields.getTextInputValue('eventName');
    const date = interaction.fields.getTextInputValue('eventDate');
    const time = interaction.fields.getTextInputValue('eventTime');
    const templateName = interaction.fields.getTextInputValue('templateName');
  
    try {
      const template = await db.collection('templates').findOne({
        name: templateName,
        guildId: interaction.guildId
      });
  
      if (!template) {
        throw new Error('Template not found');
      }
  
      const startTime = new Date(`${date}T${time}:00Z`);
      if (isNaN(startTime.getTime())) {
        throw new Error('Invalid date/time');
      }
  
      const event = {
        name: eventName,
        templateName,
        description: template.description,
        roles: Object.fromEntries(
          Object.entries(template.roles).map(([role, slots]) => [role, []])
        ),
        startTime,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        reminderSent: false,
        createdAt: new Date()
      };
  
      await db.collection('events').insertOne(event);
  
      const embed = new EmbedBuilder()
        .setTitle(`Event: ${eventName}`)
        .setDescription(template.description)
        .setColor('#0099ff')
        .addFields({
          name: 'Start Time',
          value: startTime.toLocaleString(),
          inline: false
        });
  
      Object.entries(template.roles).forEach(([role, slots]) => {
        embed.addFields({
          name: `${role} (0/${slots})`,
          value: 'No participants yet',
          inline: false
        });
      });
  
      embed.setFooter({ text: 'React with 🎯 to sign up' });
  
      const message = await interaction.reply({
        embeds: [embed],
        fetchReply: true
      });
      await message.react('🎯');
    } catch (error) {
      await interaction.reply({
        content: `Error creating event: ${error.message}`,
        ephemeral: true
      });
    }
  }
  
  // List templates
  async function listTemplates(interaction) {
    const templates = await db.collection('templates')
      .find({ guildId: interaction.guildId })
      .toArray();
  
    if (templates.length === 0) {
      await interaction.reply('No templates available.');
      return;
    }
  
    const embed = new EmbedBuilder()
      .setTitle('Available Event Templates')
      .setColor('#00ff00');
  
    templates.forEach(template => {
      const rolesStr = Object.entries(template.roles)
        .map(([role, slots]) => `${role} (${slots} slots)`)
        .join(', ');
  
      embed.addFields({
        name: template.name,
        value: `Description: ${template.description}\nRoles: ${rolesStr}`,
        inline: false
      });
    });
  
    await interaction.reply({ embeds: [embed] });
  }
  
  // List events
  async function listEvents(interaction) {
    const events = await db.collection('events')
      .find({ 
        guildId: interaction.guildId,
        startTime: { $gte: new Date() }
      })
      .toArray();
  
    if (events.length === 0) {
      await interaction.reply('No upcoming events.');
      return;
    }
  
    const embed = new EmbedBuilder()
      .setTitle('Upcoming Events')
      .setColor('#00ff00');
  
    events.forEach(event => {
      const participantCounts = Object.entries(event.roles)
        .map(([role, participants]) => `${role}: ${participants.length}/${event.roles[role]}`)
        .join('\n');
  
      embed.addFields({
        name: event.name,
        value: `Start Time: ${event.startTime.toLocaleString()}\n${participantCounts}`,
        inline: false
      });
    });
  
    await interaction.reply({ embeds: [embed] });
  }
  
  // Check for upcoming events and send reminders
  async function checkReminders() {
    const now = new Date();
    const events = await db.collection('events').find({
      startTime: {
        $gt: now,
        $lt: new Date(now.getTime() + 30 * 60 * 1000)
      },
      reminderSent: false
    }).toArray();
  
    for (const event of events) {
      const channel = await client.channels.fetch(event.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`⏰ Reminder: ${event.name}`)
          .setDescription(`Event starts in ${Math.floor((event.startTime - now) / (1000 * 60))} minutes!`)
          .setColor('#FF9900');
  
        Object.entries(event.roles).forEach(([role, participants]) => {
          const participantMentions = participants.map(id => `<@${id}>`).join('\n');
          embed.addFields({
            name: `${role} (${participants.length}/${event.roles[role]})`,
            value: participantMentions || 'No participants',
            inline: false
          });
        });
  
        await channel.send({ embeds: [embed] });
        await db.collection('events').updateOne(
          { _id: event._id },
          { $set: { reminderSent: true } }
        );
      }
    }
  }
  
  // Setup process
  async function startup() {
    await connectToMongoDB();
    await client.login(process.env.DISCORD_TOKEN);
  }
  
  startup().catch(console.error);