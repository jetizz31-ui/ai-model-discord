import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionsBitField, ChannelType } from 'discord.js';

const RULES_TEXT = `**RULES - READ BEFORE POSTING**

⚠️ 21+ ONLY - Must be legal betting age where you live
⚠️ ENTERTAINMENT ONLY - These are model outputs, not financial advice
⚠️ NO GUARANTEES - Losses happen, never bet more than you can afford to lose
⚠️ PROBLEM GAMBLING HELP: 1-800-GAMBLER

Respect the chat. No spam, no selling picks, no arguing about losses. VIP access is for paying members only.`;

async function setup() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

  console.log('Setting up server:', guild.name);

  // Roles
  const roles = guild.roles.cache;
  let memberRole = roles.find(r => r.name === 'Member');
  if (!memberRole) {
    memberRole = await guild.roles.create({ name: 'Member', reason: 'Auto-setup' });
    console.log('Created Member role');
  }

  let vipRole = roles.find(r => r.name === 'VIP');
  if (!vipRole) {
    vipRole = await guild.roles.create({ name: 'VIP', color: 0xFFD700, reason: 'Auto-setup' });
    console.log('Created VIP role');
  }

  // Move bot role above VIP
  const botMember = await guild.members.fetch(client.user.id);
  const botRole = botMember.roles.highest;
  if (botRole.position <= vipRole.position) {
    console.warn('WARNING: Bot role is not above VIP role. You must manually move bot role above VIP in Server Settings > Roles');
    console.warn('Current bot position:', botRole.position, 'VIP position:', vipRole.position);
  } else {
    console.log('Bot role is above VIP - can assign roles');
  }

  // Channels
  const categories = {
    public: await guild.channels.create({ name: 'Public', type: ChannelType.GuildCategory }),
    vip: await guild.channels.create({ name: 'VIP Only', type: ChannelType.GuildCategory })
  };

  console.log('Created categories');

  const makeOverwrite = (role, allow = [], deny = [PermissionsBitField.Flags.ViewChannel]) => ({
    allow,
    deny,
    id: role.id
  });

  const publicChannels = [
    { name: 'welcome', topic: 'Welcome to the AI Model Discord' },
    { name: 'rules', topic: 'Server rules' },
    { name: 'free-card', topic: 'Daily free AI Model card' },
    { name: 'results', topic: 'Betting results and recaps' },
    { name: 'how-to-join-vip', topic: 'How to get VIP access' }
  ];

  for (const ch of publicChannels) {
    const existing = guild.channels.cache.find(c => c.name === ch.name);
    if (!existing) {
      await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: categories.public,
        topic: ch.topic
      });
      console.log(`Created #${ch.name}`);
    }
  }

  // VIP channels
  const vipChannels = [
    { name: 'vip-plays', topic: 'Full VIP plays' },
    { name: 'vip-results', topic: 'VIP results' },
    { name: 'vip-chat', topic: 'VIP discussion' }
  ];

  for (const ch of vipChannels) {
    if (!guild.channels.cache.find(c => c.name === ch.name)) {
      const channel = await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: categories.vip,
        topic: ch.topic,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: vipRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
      console.log(`Created VIP #${ch.name}`);
    }
  }

  // Post rules
  const rulesChannel = guild.channels.cache.find(c => c.name === 'rules');
  if (rulesChannel && rulesChannel.isTextBased()) {
    await rulesChannel.send(RULES_TEXT);
  }

  console.log('Setup complete');
  await client.destroy();
}

setup().catch(console.error);
