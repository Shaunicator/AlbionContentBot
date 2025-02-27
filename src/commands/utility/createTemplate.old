const { SlashCommandBuilder } = require('discord.js');

class EventTemplate {
  constructor(name, description, roles) {
    this.name = name;
    this.description = description;
    this.roles = roles; // Map of role_name: max_slots
  }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create_template')
		.setDescription('Creates a re-usable content event template')
        .addStringOption(option => 
            option.setName('name')
              .setDescription('Descriptive name for the template')
              .setRequired(true)),
	async execute(interaction) {
		//add execution logic here
	},
};