import Stripe from 'stripe';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const sig = request.headers.get('stripe-signature');
    
    let event;
    try {
      const body = await request.text();
      event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      return new Response(`Webhook error: ${e.message}`, { status: 400 });
    }

    const DISCORD_TOKEN = env.DISCORD_TOKEN;
    const DISCORD_SERVER_ID = env.DISCORD_SERVER_ID;
    const VIP_ROLE_NAME = env.VIP_ROLE_NAME || 'VIP';

    async function getVipRoleId() {
      const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
      });
      const roles = await res.json();
      const role = roles.find(r => r.name === VIP_ROLE_NAME);
      return role?.id;
    }

    async function addRole(userId, roleId) {
      await fetch(`https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${userId}/roles/${roleId}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
      });
    }

    async function removeRole(userId, roleId) {
      await fetch(`https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${DISCORD_TOKEN}` }
      });
    }

    try {
      const vipRoleId = await getVipRoleId();
      if (!vipRoleId) return new Response('VIP role not found', { status: 500 });

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const discordId = session.client_reference_id || session.metadata?.discord_id;
        if (discordId) await addRole(discordId, vipRoleId);
      } else if (event.type === 'invoice.paid') {
        const invoice = event.data.object;
        const discordId = invoice.client_reference_id || invoice.metadata?.discord_id;
        if (discordId) await addRole(discordId, vipRoleId);
      } else if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const discordId = sub.metadata?.discord_id;
        if (discordId) await removeRole(discordId, vipRoleId);
      }
    } catch (e) {
      return new Response(`Processing error: ${e.message}`, { status: 500 });
    }

    return new Response('OK');
  }
};
