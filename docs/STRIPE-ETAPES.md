# Stripe – Toutes les étapes à suivre

Guide pas à pas pour intégrer les paiements Stripe (carte bancaire) dans la section **Paiements trader** de T4Cash.

---

## Partie 1 : Configuration Stripe (Dashboard)

### Étape 1.1 – Créer un compte Stripe

1. Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Cliquez sur **Créer un compte**
3. Renseignez email, mot de passe, pays, etc.
4. Validez votre email

### Étape 1.2 – Activer le mode test

1. En haut à droite du dashboard, vérifiez que le **mode test** est activé (bouton « Mode test »)
2. Les clés de test permettent de faire des paiements sans argent réel (cartes de test Stripe)

### Étape 1.3 – Récupérer les clés API

1. Dans le dashboard : **Developers** → **API keys**
2. Notez :
   - **Publishable key** : `pk_test_...` (pour l’app, peut être exposée)
   - **Secret key** : `sk_test_...` (cliquez sur « Reveal », à garder secrète, jamais dans l’app)

### Étape 1.4 – Préparer la production (plus tard)

Quand vous passerez en production :
- Complétez la **vérification du compte** Stripe
- Activez le **mode Live** et récupérez `pk_live_...` et `sk_live_...`
- Configurez les **payouts** (votre IBAN) dans **Settings** → **Payouts** pour recevoir l’argent

---

## Partie 2 : Projet T4Cash (installation)

### Étape 2.1 – Installer le SDK Stripe

Dans le terminal, à la racine du projet :

```bash
cd /Users/moh/Desktop/T4Cash
npx expo install @stripe/stripe-react-native
```

### Étape 2.2 – Configurer le plugin dans app.json

Dans `app.json`, ajoutez un **scheme** et le **plugin Stripe** :

```json
{
  "expo": {
    "name": "T4Cash",
    "scheme": "t4cash",
    "plugins": ["@stripe/stripe-react-native"]
  }
}
```

> Le `scheme` doit correspondre à celui utilisé dans `StripeProvider` (étape 6.1).

---

## Partie 3 : Backend (Supabase Edge Functions)

### Étape 3.1 – Créer les Edge Functions

À la racine du projet (avec [Supabase CLI](https://supabase.com/docs/guides/cli) installée) :

```bash
npx supabase functions new create-payment-intent
npx supabase functions new stripe-webhook
```

Cela crée les dossiers `supabase/functions/create-payment-intent/` et `supabase/functions/stripe-webhook/` avec un fichier `index.ts` de base. Remplacez le contenu par le code ci-dessous.

### Étape 3.2 – Edge Function : create-payment-intent

Dans `supabase/functions/create-payment-intent/index.ts`, mettez :

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-11-20.acacia' });
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount } = await req.json();
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents < 50) {
      return new Response(JSON.stringify({ error: 'Invalid amount (min 0.50 €)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        paid_at: new Date().toISOString().slice(0, 10),
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

> `SUPABASE_ANON_KEY` est fourni automatiquement par Supabase pour les Edge Functions.

### Étape 3.3 – Edge Function : stripe-webhook

Dans `supabase/functions/stripe-webhook/index.ts`, mettez :

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-11-20.acacia' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { user_id, paid_at } = paymentIntent.metadata;

  if (!user_id || !paid_at) {
    console.error('Missing metadata in payment_intent');
    return new Response('Missing metadata', { status: 400 });
  }

  const amount = (paymentIntent.amount / 100);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase.from('trader_payments').insert({
    user_id,
    amount,
    paid_at,
    stripe_payment_id: paymentIntent.id,
  });

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Insert error:', error);
    return new Response('Insert failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Étape 3.4 – Migration : colonne stripe_payment_id

Créez `supabase/migrations/20260222100000_add_stripe_payment_id.sql` :

```sql
alter table public.trader_payments
  add column if not exists stripe_payment_id text unique;
```

Exécutez la migration sur votre projet Supabase (ou via `supabase db push`).

---

## Partie 5 : Variables d’environnement Supabase

### Étape 5.1 – Variables pour les Edge Functions

1. Dashboard Supabase → **Project Settings** → **Edge Functions**
2. Ou : **Settings** → **Secrets** (selon votre interface)
3. Ajoutez :

| Nom | Valeur |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (votre clé secrète Stripe) |
| `STRIPE_WEBHOOK_SECRET` | Sera défini après la création du webhook (étape 5.2) |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà fournis par Supabase.

### Étape 4.2 – Variable pour l’app

Créez ou mettez à jour `.env` à la racine (pour Expo) :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> Ne commitez jamais `.env` (vérifiez qu’il est dans `.gitignore`).

---

## Partie 5 : Webhook Stripe

### Étape 5.1 – Exposer l’URL du webhook

Pour le développement local :

```bash
npx supabase functions serve
```

Puis utilisez [ngrok](https://ngrok.com) pour exposer votre machine :

```bash
ngrok http 54321
```

Pour la production, déployez vos fonctions :

```bash
npx supabase functions deploy stripe-webhook
```

L’URL sera du type :  
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

### Étape 5.2 – Créer le webhook dans Stripe

1. Dashboard Stripe → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL** : `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. **Events to send** : `payment_intent.succeeded`
4. Cliquez sur **Add endpoint**
5. Copiez le **Signing secret** (`whsec_...`) et ajoutez-le comme `STRIPE_WEBHOOK_SECRET` dans les secrets Supabase

---

## Partie 7 : Intégration dans l’app React Native

### Étape 7.1 – StripeProvider dans App.tsx

Enveloppez l’app avec `StripeProvider` :

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App() {
  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="t4cash">
      <SafeAreaProvider>
        ...
      </SafeAreaProvider>
    </StripeProvider>
  );
}
```

> `urlScheme` : doit correspondre au scheme de votre app (ex. `t4cash` si défini dans `app.json`).

### Étape 6.2 – Modifier TraderPaymentPanel.tsx

Dans le panneau « Paiements trader » :

1. Conserver le champ **Montant payé (€)**
2. Ajouter un bouton **Payer avec carte** qui :
   - Appelle l’Edge Function `create-payment-intent` avec `{ amount }` et le token JWT
   - Reçoit le `clientSecret`
   - Ouvre le **PaymentSheet** Stripe (`initPaymentSheet` + `presentPaymentSheet`)
   - À la réussite : ferme le sheet, vide le champ, rafraîchit le solde (via `useTraderBalance`)

3. Optionnel : garder le bouton **Enregistrer paiement** pour saisie manuelle (sans Stripe)

### Étape 6.3 – Appel à l’Edge Function

L’URL de l’Edge Function Supabase :

```
https://<project-ref>.supabase.co/functions/v1/create-payment-intent
```

Avec `fetch` :

- Header : `Authorization: Bearer <session.access_token>`
- Body : `{ "amount": 25.50 }`

---

## Partie 7 : Tests

### Étape 7.1 – Cartes de test Stripe

Utilisez les cartes de test Stripe, par exemple :

- Succès : `4242 4242 4242 4242`
- Refus : `4000 0000 0000 0002`
- 3D Secure : `4000 0025 0000 3155`

Date : toute date future  
CVC : n’importe quel 3 chiffres

### Étape 7.2 – Vérifications

1. Saisir un montant → **Payer avec Stripe**
2. Payer avec une carte de test
3. Vérifier dans Supabase que la ligne apparaît dans `trader_payments`
4. Vérifier que « Reste à payer » se met à jour

---

## Checklist finale

- [ ] Compte Stripe créé
- [ ] Clés API récupérées (test)
- [ ] `@stripe/stripe-react-native` installé
- [ ] Plugin Stripe configuré dans `app.json`
- [ ] Edge Function `create-payment-intent` créée et déployée
- [ ] Edge Function `stripe-webhook` créée et déployée
- [ ] Migration `stripe_payment_id` exécutée
- [ ] Secrets Supabase configurés (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Webhook Stripe configuré et secret ajouté
- [ ] `.env` configuré (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- [ ] `StripeProvider` ajouté dans `App.tsx`
- [ ] `TraderPaymentPanel` modifié pour utiliser le PaymentSheet
- [ ] Tests avec cartes de test OK

---

## Ressources

- [Stripe React Native](https://docs.stripe.com/libraries/react-native)
- [PaymentSheet – React Native](https://docs.stripe.com/payments/accept-a-payment?platform=react-native&ui=payment-sheet)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
