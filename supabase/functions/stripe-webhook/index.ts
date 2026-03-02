import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});
// Crypto provider requis pour Deno (Web Crypto API)
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const jsonHeaders = { 'Content-Type': 'application/json' };

function okResponse() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: jsonHeaders,
  });
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200 });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature || !webhookSecret) {
      console.error('Webhook: missing signature or STRIPE_WEBHOOK_SECRET');
      return new Response(JSON.stringify({ error: 'Missing signature or webhook secret' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (event.type !== 'payment_intent.succeeded') {
      return okResponse();
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { user_id, paid_at } = paymentIntent.metadata;

    if (!user_id || !paid_at) {
      console.error('Webhook: missing metadata in payment_intent', paymentIntent.id);
      return new Response(JSON.stringify({ error: 'Missing metadata' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const amount = paymentIntent.amount / 100;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('trader_payments').insert({
      user_id,
      amount,
      paid_at,
      stripe_payment_id: paymentIntent.id,
    });

    if (error) {
      if (error.code === '23505') {
        return okResponse();
      }
      console.error('Webhook insert error:', error);
      return new Response(JSON.stringify({ error: 'Insert failed' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return okResponse();
  } catch (err) {
    console.error('Webhook unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
