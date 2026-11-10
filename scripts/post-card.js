import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fs from 'fs';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function loadPlays(path) {
  const ext = path.split('.').pop().toLowerCase();
  const raw = fs.readFileSync(path, 'utf8');
  if (ext === 'json') {
    return JSON.parse(raw);
  }
  // CSV: name,market,line,confidence
  return raw.split('\n').slice(1).filter(l => l.trim()).map(line => {
    const [name, market, lineNum, conf] = line.split(',');
    return { name, market, line: lineNum, confidence: conf };
  });
}

function formatCard(plays, sport, dateStr) {
  const emoji = sport.toLowerCase() === 'nba' ? '🏀' : sport.toLowerCase() === 'nfl' ? '🏈' : '🏀';
  const header = `My AI Model ${sport} Card (${dateStr}) ${emoji}`;
  const lines = [header, ''];
  plays.slice(0, 5).forEach(p => {
    lines.push(`${p.name} ${p.market}${p.line} | ${p.confidence}%`);
    lines.push('');
  });
  lines.push('1u each');
  return lines.join('\n');
}

function formatVipPlays(plays) {
  return plays.map(p => `${p.name} ${p.market}${p.line} | ${p.confidence}%`).join('\n');
}

await client.login(process.env.DISCORD_TOKEN);
const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

const playsPath = process.argv[2] || 'plays.json';
const sport = process.argv[3] || 'NBA';
const dateStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

const plays = loadPlays(playsPath);

const freeCard = formatCard(plays, sport, dateStr);
const vipCard = formatVipPlays(plays);

const channels = {
  free: await guild.channels.fetch(process.env.FREE_CHANNEL_ID || 'free-card'),
  vip: await guild.channels.fetch(process.env.VIP_PLAYS_CHANNEL_ID || 'vip-plays')
};

if (channels.free) await channels.free.send(freeCard);
if (channels.vip) await channels.vip.send(`**FULL VIP CARD**\n\n${vipCard}`);

console.log('Posted cards');
await client.destroy();
