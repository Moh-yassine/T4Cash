# Copilot Instructions for T4Cash

- Project type: Expo React Native + Web (monorepo style, same code for mobile and web) with Supabase backend and Stripe payments.
- Entry point: `App.tsx` (`AppStripeWrapper`, `SafeAreaProvider`, `ThemeProvider`, `LanguageProvider`, `AuthProvider`, `AppNavigator`).

## High-level architecture
- `src/navigation/AppNavigator.tsx`: controls auth-vs-main routing and recovery flow.
  - Unauthenticated: `Login`, `Register`, `ForgotPassword`.
  - Authenticated: `MainTabs` (`Home`, `Versement`, `Chart`, `Profile`, `Settings`).
  - Admin flow: `AdminUsers` screen via `RootStack`.
  - Recovery flow: `UpdatePassword` if `isRecoverySession`.
- `src/contexts/AuthContext.tsx`: Single source of truth for user/session/profile with Supabase auth state and password recovery hash handling on web.
- `src/contexts/ThemeContext.tsx`, `src/contexts/LanguageContext.tsx`: local app theme/language settings (persisted with AsyncStorage).
- `src/lib/supabase.ts`: Supabase client config (env vars `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, detectSessionInUrl for web).

## Service boundaries and data flows
- Supabase tables defined in `supabase/schema.sql`; check migrations for post-login features (`versements`, `profiles`, `trader_remaining`) and role-based logic (`admin` role + RPC).
- Stripe serverless integration in `supabase/functions`:
  - `create-payment-intent/index.ts`
  - `record-stripe-payment/index.ts`
  - `stripe-webhook/index.ts`
- `src/screens/*` use hooks from `src/hooks/*` and contexts directly.

## Build / run / debug
- Install: `npm install`
- Run local dev (mobile/web): 
  - `npm run start` (alias `npx expo start`)
  - `npm run android`, `npm run ios`, `npm run web`
- Rebuild web PWA assets:
  - `npm run build:web` (`expo export -p web && node scripts/inject-pwa-manifest.js`)
- No test scripts in repo; unit tests currently not present, focus manual and interactive QA.

## Project-specific patterns
- Avoid changing native/web Stripe wrapper API; use `src/components/AppStripeWrapper.native.tsx` / `.web.tsx`.
- No central Redux; use React Context + custom hooks (e.g. `useTraderBalance`, `useVersementStats`, `useAdminTraderData`).
- Intl keys in `src/i18n/translations.ts`; screens use `useLanguage().t('...')`.
- Theme uses lightweight token object in `src/constants/theme.ts`.

## Implementation hints
- CRUD layer to Supabase is mostly direct `supabase.from(...).select|insert|update`; when adding new data table, update relevant screen/hook and schema migration.
- `AuthContext` manages session refresh and handles potential `Refresh Token` errors by signing out cleanly.
- `AppNavigator` style metadata is applied via `useTheme()` and avoids fallback from OS; use ThemeContext colors for nav bar.

## Safe code edits
- Keep `AuthProvider` and `ThemeProvider` nested order intact (app depends on theme/language while auth flow uses translation strings in nav). 
- In web-specific flows (password recovery), `AuthContext` parses URL hash and cleans history.
- When editing payment flow, inspect `supabase/functions` and `docs/STRIPE-ETAPES.md` for expected sequence (client -> create-payment-intent -> server webhook). 

> Ask for feedback: are there sections where you want more explicit mapping to files, or more depth on one of the backend workflows?