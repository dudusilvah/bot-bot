require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    Partials
} = require("discord.js");

const fs = require("fs");

const client = new Client({

    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],

    partials:[
        Partials.Channel
    ]

});

client.registros = new Collection();

const eventFiles = fs.readdirSync("./events");

for(const file of eventFiles){

    const event = require(`./events/${file}`);

    event(client);

}

client.login(process.env.TOKEN);