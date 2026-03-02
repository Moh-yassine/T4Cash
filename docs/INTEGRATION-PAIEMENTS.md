# Paiements Stripe – Paiements trader

Guide pour intégrer les paiements **Stripe** (carte bancaire) dans la section **Paiements trader** de la page Versement.

---

## Vue d'ensemble

| Solution | Carte bancaire | React Native / Expo |
|----------|----------------|---------------------|
| **Stripe** | ✅ | ✅ Excellent support |

**Avantages Stripe :**
- Très bon support React Native / Expo (`@stripe/stripe-react-native`)
- Paiements par carte bancaire
- Paiements reçus directement sur votre compte Stripe (puis virement vers votre banque)
- Documentation et exemples nombreux

---

## Guide détaillé

Consultez **`docs/STRIPE-ETAPES.md`** pour toutes les étapes pas à pas (compte Stripe, backend, app, tests).

---

## Flux de paiement

1. L’utilisateur saisit le montant dans "Montant payé (€)"
2. L’app appelle l’Edge Function `create-payment-intent` avec `{ amount }` et le token JWT
3. Le backend crée un PaymentIntent Stripe et renvoie le `clientSecret`
4. L’app affiche le **PaymentSheet** Stripe (formulaire carte)
5. L’utilisateur paie
6. Stripe envoie un **webhook** : paiement confirmé → insertion dans `trader_payments`
7. L’app rafraîchit « Reste à payer »

---

## Sécurité

1. **Clé secrète Stripe** : uniquement dans le backend (Edge Functions), jamais dans l’app
2. **Webhooks** : vérifier la signature Stripe
3. **Authentification** : valider le JWT à chaque appel backend
4. **Montants** : valider côté serveur (pas de confiance aveugle à l’app)
5. **Données carte** : jamais stockées par vous, Stripe gère tout (PCI DSS)

---

## Ressources

- [Stripe React Native](https://docs.stripe.com/libraries/react-native)
- [PaymentSheet – React Native](https://docs.stripe.com/payments/accept-a-payment?platform=react-native&ui=payment-sheet)
- [Expo Stripe Plugin](https://docs.expo.dev/versions/latest/sdk/stripe/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
