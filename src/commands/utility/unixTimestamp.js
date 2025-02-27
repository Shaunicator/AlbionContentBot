const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('timestamp')
	.setDescription('Creates a timestamp relative to users local Timezone')
	.addIntegerOption(option =>
		option.setName('hours')
			.setDescription('Hours until portal closes')
			.setRequired(true)
		.setMinValue(0)
		.setMaxValue(23))
	.addIntegerOption(option =>
		option.setName('minutes')
			.setDescription('Minutes until portal closes')
			.setRequired(true)
			.setMinValue(0)
			.setMaxValue(59))
	.addStringOption(option =>
		option.setName('format')
			.setDescription('Timezone Format')
			.addChoices(
				{ name: 'Relative (eg "in 3 hours")', value: 'f' },
				{ name: 'Short Time (eg 6:10 PM)', value: 't' },
				{ name: 'Date/Time (eg "February 27, 2025 at 6:10 PM")', value: 'R' }
			)),
	async execute(interaction) {
		let date = new Date();
		
		const suffix = interaction.options.getString('format') ?? 'R';
		const hours = interaction.options.getInteger('hours');
		const minutes = interaction.options.getInteger('minutes');
		let _hours = date.getHours() + parseInt(hours);
		let _minutes = date.getMinutes() + parseInt(minutes);
		date.setHours(_hours);
		date.setMinutes(_minutes);
		let timestamp = Math.floor(date.getTime() / 1000);
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply({content:`Copy/Paste this:<t:${timestamp}:${suffix}>`, ephemeral: true});
	},
};