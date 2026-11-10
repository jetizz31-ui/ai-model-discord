# AI Model Discord Bot

Discord bot with Stripe VIP paywall for sports picks.

## Setup

1. **Environment**
   ```bash
   cp .env.example .env
   # Fill in DISCORD_TOKEN, DISCORD_SERVER_ID, Stripe keys
   ```

2. **Install**
   ```bash
   npm install
   ```

3. **Server setup** (one-time)
   ```bash
   npm run setup
   ```
   Creates roles/channels. Bot role must be above VIP role.

4. **Bot** (needs to run)
   ```bash
   npm run bot
   ```
   Registers /join slash command.

5. **Cloudflare Worker** (free)
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put DISCORD_TOKEN
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler deploy
   ```
   Set webhook URL in Stripe Dashboard > Webhooks to `https://your-worker.workers.dev/`

6. **Stripe**
   - Create Product > Price (monthly)
   - Copy Price ID to .env
   - Test with Stripe CLI: `stripe listen --forward-to localhost:8788/webhook`

## Posting cards

```bash
npm run post plays.json NBA
```

Format: JSON array with name, market, line, confidence

## Switch to live

1. In Stripe Dashboard, toggle mode to Live
2. Create live Product/Price
3. Update .env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_MODE=live
4. Update Cloudflare Worker secrets
5. Update bot checkout links
