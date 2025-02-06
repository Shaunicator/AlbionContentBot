require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT;

console.log("✅ Service Account File Loaded:", SERVICE_ACCOUNT_FILE);

console.log("Service Account Path:", SERVICE_ACCOUNT_FILE);

console.log("Google Service Account File:", process.env.GOOGLE_SERVICE_ACCOUNT);
console.log("Environment Variables Loaded: ", process.env);

// Setup bot intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// MongoDB connection
const mongoClient = new MongoClient(MONGO_URI);
let eventsCollection;

async function connectToMongoDB() {
    try {
        await mongoClient.connect();
        const db = mongoClient.db("discord_bot");
        eventsCollection = db.collection("events");
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
    }
}

// Google Calendar setup
let calendar;
try {
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, SERVICE_ACCOUNT_FILE)));
    const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/calendar']
    );
    calendar = google.calendar({ version: 'v3', auth });
    console.log("✅ Google Calendar API initialized");
} catch (error) {
    console.error("⚠️ Google Calendar setup failed:", error);
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    setInterval(eventReminder, 60000); // Check for reminders every 60 seconds
});

// Create event command
client.on('messageCreate', async message => {
    if (!message.content.startsWith('/create_event')) return;

    const args = message.content.split(' ');
    if (args.length < 4) {
        return message.reply("❌ Usage: `/create_event <title> <YYYY-MM-DD> <HH:MM> <description>`");
    }

    const title = args[1];
    const date = args[2];
    const time = args[3];
    const description = args.slice(4).join(' ');

    const eventTime = new Date(`${date}T${time}:00Z`);

    const eventData = {
        title,
        date: eventTime,
        description,
        guild_id: message.guild.id,
        rsvps: {}
    };

    await eventsCollection.insertOne(eventData);

    if (calendar) {
        const gcalEvent = {
            summary: title,
            description,
            start: { dateTime: eventTime.toISOString(), timeZone: 'UTC' },
            end: { dateTime: new Date(eventTime.getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'UTC' }
        };
        await calendar.events.insert({ calendarId: 'primary', resource: gcalEvent });
    }

    message.reply(`✅ Event "${title}" created for ${eventTime.toUTCString()}!`);
});

// List events command
client.on('messageCreate', async message => {
    if (!message.content.startsWith('/list_events')) return;

    const events = await eventsCollection.find({ guild_id: message.guild.id }).toArray();

    if (!events.length) {
        return message.reply("📅 No upcoming events.");
    }

    const eventList = events.map(event => `**${event.title}** - ${new Date(event.date).toUTCString()}`).join("\n");
    message.reply(`📅 **Upcoming Events:**\n${eventList}`);
});

// RSVP command
client.on('messageCreate', async message => {
    if (!message.content.startsWith('/rsvp')) return;

    const args = message.content.split(' ');
    if (args.length < 3) {
        return message.reply("❌ Usage: `/rsvp <event_title> <emoji>`");
    }

    const eventTitle = args[1];
    const emoji = args[2];

    const event = await eventsCollection.findOne({ title: eventTitle, guild_id: message.guild.id });

    if (!event) {
        return message.reply("❌ Event not found!");
    }

    await eventsCollection.updateOne({ _id: event._id }, { $set: { [`rsvps.${message.author.id}`]: emoji } });

    message.reply(`✅ ${message.author.username} has RSVP’d with ${emoji} for "${eventTitle}"!`);
});

// Event reminder system
async function eventReminder() {
    const now = new Date();
    const upcomingEvents = await eventsCollection.find({
        date: { $lte: new Date(now.getTime() + 30 * 60 * 1000), $gte: now }
    }).toArray();

    for (const event of upcomingEvents) {
        const guild = client.guilds.cache.get(event.guild_id);
        if (guild) {
            const channel = guild.systemChannel;
            if (channel) {
                channel.send(`🚀 **Reminder:** "${event.title}" starts in **30 minutes!**`);
            }
        }
    }
}

// Start bot
connectToMongoDB().then(() => {
    client.login(TOKEN);
});
