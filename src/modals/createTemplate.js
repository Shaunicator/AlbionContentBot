const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

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
      .setPlaceholder('Tank:1,Healer:1,DPS:5')
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