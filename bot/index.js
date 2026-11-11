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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages]
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

const welcomeQueue = new Map();

client.once('ready', async () => {
  console.log(`Bot ready as ${client.user.tag}`);
  await registerCommands();

  // Check for pending welcomes on startup
  const now = Date.now();
  for (const [userId, data] of welcomeQueue.entries()) {
    if (now - data.joinedAt > 24 * 60 * 60 * 1000) {
      await sendWelcomeDM(userId);
      welcomeQueue.delete(userId);
    }
  }
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

async function sendWelcomeDM(userId) {
  try {
    const user = await client.users.fetch(userId);
    const embed = {
      content: `🎯 **Welcome to AI Model!**\n\nYou've been here 24 hours — ready for full access?\n\nRun \`/join\` in the server to get VIP plays:\n• Daily NBA, NFL & College picks\n• 10-20 plays daily vs 5 free\n• VIP-only channels\n\n$10/month, cancel anytime.`,
      embeds: []
    };
    await user.send(embed.content);
    console.log(`Welcome DM sent to ${userId}`);
  } catch (e) {
    console.error(`Failed to send welcome DM to ${userId}:`, e.message);
  }
}

client.on('guildMemberAdd', async member => {
  welcomeQueue.set(member.id, { joinedAt: Date.now() });

  // Schedule DM for 24 hours later
  setTimeout(async () => {
    if (welcomeQueue.has(member.id)) {
      await sendWelcomeDM(member.id);
      welcomeQueue.delete(member.id);
    }
  }, 24 * 60 * 60 * 1000);
});

client.on('error', console.error);

client.login(process.env.DISCORD_TOKEN);
