# Configuration Stripe – À faire de votre côté

L'intégration Stripe est en place. Voici ce qu'il vous reste à configurer :

---

## 1. Régénérer votre clé secrète Stripe

**Important** : Votre clé secrète a été exposée. Régénérez-la immédiatement :

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers** → **API keys**
2. Cliquez sur **Reveal** à côté de la Secret key
3. Cliquez sur **Roll key** ou **Regenerate** pour créer une nouvelle clé

---

## 2. Ajouter les secrets Supabase (Edge Functions)

1. Allez sur [supabase.com](https://supabase.com) → votre projet T4Cash
2. **Project Settings** → **Edge Functions** → **Secrets**
3. Ajoutez :

| Nom | Valeur |
|-----|--------|
| `STRIPE_SECRET_KEY` | Votre nouvelle clé secrète Stripe (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | À ajouter après l’étape 4 |

---

## 3. Exécuter la migration

Exécutez la migration pour ajouter la colonne `stripe_payment_id` :

```bash
npx supabase db push
```

Ou exécutez manuellement dans **SQL Editor** (Supabase Dashboard) :

```sql
alter table public.trader_payments
  add column if not exists stripe_payment_id text unique;
```

---

## 4. Déployer les Edge Functions et configurer le webhook

### Déployer les fonctions

**Important** : Le webhook Stripe doit être déployé avec `--no-verify-jwt` car Stripe n'envoie pas de token JWT :

```bash
npx supabase functions deploy create-payment-intent
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy record-stripe-payment
```

> **Note** : `record-stripe-payment` est un secours si le webhook échoue (ex. signature invalide). Après un paiement Stripe réussi, l’app enregistre le paiement via cette fonction, qui vérifie auprès de Stripe que le paiement a bien abouti.

### Créer le webhook Stripe

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL** : `https://ihboufmimryilgjrwagg.supabase.co/functions/v1/stripe-webhook`
3. **Events to send** : sélectionnez `payment_intent.succeeded`
4. Cliquez sur **Add endpoint**
5. Copiez le **Signing secret** (`whsec_...`)
6. Ajoutez-le dans Supabase comme secret `STRIPE_WEBHOOK_SECRET`

---

## 5. Tester

1. Lancez l’app : `npx expo start`
2. Allez sur la page **Versement** → ouvrez **Paiements trader**
3. Saisissez un montant (ex. 10)
4. Cliquez sur **Payer par carte**
5. Utilisez une carte de test Stripe : `4242 4242 4242 4242`
   - Date : n’importe quelle date future
   - CVC : 3 chiffres quelconques

---

## Erreur : "client_secret does not match any PaymentIntent"

Cette erreur signifie que la **clé publique** (app) et la **clé secrète** (backend) ne sont **pas du même compte Stripe**.

### Solution

1. Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vérifiez que vous êtes sur le **bon compte** (et en mode Test si vous testez)
3. **Developers** → **API keys**
4. Récupérez les deux clés **du même écran** :
   - **Publishable key** : `pk_test_...` → pour l'app (`.env` + plateforme d'hébergement)
   - **Secret key** : `sk_test_...` → pour Supabase (Edge Functions → Secrets)
5. Les deux doivent commencer par le même identifiant (ex. `51T3cen...`)

### Vérifications

| Où | Variable | Doit contenir |
|----|----------|---------------|
| `.env` local | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| **Vercel/Netlify** (si utilisé) | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (même valeur) |
| **Supabase** → Edge Functions → Secrets | `STRIPE_SECRET_KEY` | `sk_test_...` (même compte) |

⚠️ Si vous hébergez sur Vercel/Netlify, ajoutez `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` dans les variables d'environnement du projet, puis **rebuild**.

---

## Checklist

- [ ] Clé secrète Stripe régénérée
- [ ] `STRIPE_SECRET_KEY` ajouté dans Supabase
- [ ] Migration exécutée
- [ ] Edge Functions déployées
- [ ] Webhook Stripe créé
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans Supabase
- [ ] Test avec carte 4242... OK
