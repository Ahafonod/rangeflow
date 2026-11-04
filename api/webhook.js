import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const bodyText = rawBody.toString('utf8');
    const payload = JSON.parse(bodyText);

    const secret = process.env.WEBHOOK_SECRET;
    const lsSignature = req.headers['x-signature'];
    if (secret && lsSignature) {
      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (hmac !== lsSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    let userId = null;
    let customerId = null;

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data?.object;
      userId = session?.client_reference_id;
      customerId = session?.customer || session?.id;
    }

    if (
      payload.meta?.event_name === 'order_created' ||
      payload.meta?.event_name === 'subscription_created'
    ) {
      userId = payload.meta?.custom_data?.user_id;
      customerId = String(payload.data?.attributes?.customer_id || '');
    }

    if (!userId) {
      return res.status(200).json({ received: true, note: 'No user_id attached' });
    }

    const { error } = await supabaseAdmin
      .from('user_data')
      .upsert(
        {
          user_id: userId,
          tier: 'pro',
          subscription_status: 'active',
          payment_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ upgraded: true, user_id: userId });
  } catch (err) {
    return res.status(400).json({ error: 'Webhook handler failed' });
  }
}
