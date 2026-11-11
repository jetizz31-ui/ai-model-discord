import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import Stripe from 'stripe';
import http from 'http';

// Create a simple HTTP server to keep Render health check happy
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is alive!');
});
const port = process.env.PORT || 10000;
server.listen(port, () => {
  console.log(`Health check server listening on port ${port}`);
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const commands = [
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Get VIP access link')
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.DISCORD_SERVER_ID),
      { body: commands }
    );
    console.log('Slash commands registered');
  } catch (e) {
    console.error('Command registration failed', e);
  }
}

client.once('ready', async () => {
  console.log(`Bot ready as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'join') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        client_reference_id: interaction.user.id,
        success_url: 'https://discord.com',
        cancel_url: 'https://discord.com',
      });

      await interaction.editReply({
        content: `🎯 **VIP Access**\n\nClick below to subscribe and get VIP plays:\n${session.url}\n\nAfter payment, your VIP role will be assigned automatically!`,
      });
    } catch (e) {
      console.error(e);
      await interaction.editReply({
        content: 'Error generating checkout link. Please try again later.',
      });
    }
  }
});

client.on('error', console.error);

client.login(process.env.DISCORD_TOKEN);
