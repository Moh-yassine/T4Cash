# T4Cash - Synthese Rapide Projet

Ce document sert de memo court pour comprendre vite le projet et appliquer des changements rapidement.

## 1) Stack et demarrage

- Front: Expo + React Native + Web
- Langage: TypeScript
- Backend: Supabase (Auth + Postgres + Storage + Edge Functions)
- Paiement: Stripe

Commandes utiles:

```bash
npm install
npm run start
npm run web
npm run android
npm run ios
npm run build:web
```

## 2) Structure cle

- `App.tsx`: point d'entree providers
- `src/navigation/AppNavigator.tsx`: routing auth/app/admin/recovery
- `src/contexts/AuthContext.tsx`: session, user, profile, reset password
- `src/contexts/ThemeContext.tsx`: theme light/dark persiste
- `src/contexts/LanguageContext.tsx`: FR/EN persiste
- `src/lib/supabase.ts`: client Supabase
- `src/screens/*`: ecrans
- `src/hooks/*`: logique metier reutilisable
- `supabase/schema.sql`: schema principal
- `supabase/migrations/*.sql`: evolutions BDD
- `supabase/functions/*`: create-payment-intent, record-stripe-payment, stripe-webhook

## 3) Navigation (important)

Flux principal:

1. Non connecte: `Login`, `Register`, `ForgotPassword`
2. Connecte: tabs `Home`, `Versement`, `Chart`, `Profile`, `Settings`
3. Admin: ecran `AdminUsers` (si role admin)
4. Recovery password (web): `UpdatePassword`

## 4) Modele de donnees

Tables:

- `profiles`: infos user + `role` (`user` | `admin`)
- `versements`: gains/pertes par jour (unique `user_id,date`)
- `trader_payments`: paiements trader (optionnellement lies a Stripe via `stripe_payment_id`)

Regle metier centrale:

- Net jour = `gains - pertes`
- Part trader = `30% du net positif`

Constantes:

- Capital initial: `1000`
- Objectif mensuel: `2000`
- Objectif quotidien: `100`
- Part trader: `0.3`

## 5) Ecrans et responsabilites

- `HomeScreen`: resume mensuel, progression, part trader totale, acces admin
- `VersementScreen`: saisie gains/pertes du jour + panel paiement trader
- `ChartScreen`: calendrier performances + graphiques capital / P&L
- `ProfileScreen`: edition profil + upload avatar (bucket `avatars`)
- `SettingsScreen`: theme, langue, logout
- `AdminUsersScreen`: reste a payer + historique paiements via RPC

## 6) Hooks metier

- `useVersementStats`: stats versements + realtime
- `useTraderBalance`: total du / total paye / reste + historique paiements
- `useAdminTraderData`: RPC admin listes + historiques

## 7) Paiement Stripe (resume)

1. App appelle `create-payment-intent`
2. Stripe retourne `clientSecret`
3. UI Stripe confirme paiement
4. App tente `record-stripe-payment` (secours)
5. Webhook `stripe-webhook` peut aussi enregistrer le paiement

Note:

- Mobile: `@stripe/stripe-react-native`
- Web: `@stripe/react-stripe-js`
- Wrappers: `AppStripeWrapper.native.tsx` et `.web.tsx`

## 8) Variables d'environnement a connaitre

App:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_APP_URL` (utile reset password)

Supabase Edge Functions (secrets):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (fourni cote Supabase)
- `SUPABASE_URL` (fourni cote Supabase)

## 9) Points d'attention rapides

- Auth recovery web depend du hash URL (`type=recovery`) dans `AuthContext`
- `detectSessionInUrl` actif sur web
- L'ordre des providers dans `App.tsx` est important
- Les traductions sont dans `src/i18n/translations.ts`
- Les policies RLS sont actives sur tables principales
- Admin depend des fonctions SQL RPC:
  - `admin_list_user_trader_balances`
  - `admin_get_user_payment_history`

## 10) Docs utiles dans le repo

- `docs/CONFIG-STRIPE.md`
- `docs/INTEGRATION-PAIEMENTS.md`
- `docs/STRIPE-ETAPES.md`
- `docs/MOT-DE-PASSE-OUBLIE.md`

---

Si besoin, je peux aussi te faire une version encore plus courte en mode "checklist avant modification" (10 lignes).
