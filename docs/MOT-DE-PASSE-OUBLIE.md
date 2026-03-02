# Mot de passe oublié – Configuration

Le flux "Mot de passe oublié" utilise Supabase Auth. L'app affiche un écran pour définir un nouveau mot de passe après clic sur le lien dans l'email.

---

## Configuration Supabase Dashboard (obligatoire)

### 1. Redirect URLs

Sans cette config, Supabase **refusera** la redirection après clic sur le lien.

1. Allez sur [supabase.com](https://supabase.com) → votre projet T4Cash
2. **Authentication** → **URL Configuration**
3. Dans **Redirect URLs**, ajoutez **chaque** URL utilisée :

   | Environnement | URL à ajouter |
   |---------------|---------------|
   | Web local (Expo) | `http://localhost:8081` |
   | Web production | `https://votredomaine.com` |
   | App mobile (via web) | Même URL que la web si l’utilisateur ouvre le lien dans le navigateur |

4. **Site URL** : URL principale de l’app (ex. `https://t4cash.vercel.app` ou `http://localhost:8081` en dev)

### 2. Variables d'environnement

Dans `.env` :

```
EXPO_PUBLIC_APP_URL=https://votredomaine.com
```

- **Web** : si absent, l’app utilise `window.location.origin`
- **Native** : à définir pour que le lien dans l’email redirige vers une URL accessible (ex. la web app)

### 3. Emails (production)

Par défaut, Supabase limite à **2 emails/heure** et ne garantit pas l’envoi.

Pour la production, configurer un **SMTP personnalisé** :

1. **Project Settings** → **Auth** → **SMTP Settings**
2. Activer **Custom SMTP**
3. Saisir serveur SMTP, identifiants, etc.

### 4. Modèles d’email (optionnel)

1. **Authentication** → **Email Templates**
2. Modèle **Reset Password**
3. Le lien utilise `{{ .ConfirmationURL }}`

Modèle exemple : `supabase/email-templates/reset-password.html`

---

## Flux utilisateur

1. L’utilisateur clique sur « Mot de passe oublié ? » sur l’écran de connexion
2. Il saisit son email et valide
3. Supabase envoie un email avec un lien
4. L’utilisateur clique sur le lien → redirection vers l’URL configurée (ex. `https://app.com#access_token=...&type=recovery`)
5. L’app charge, Supabase détecte le token → session en mode récupération
6. L’écran « Nouveau mot de passe » s’affiche
7. L’utilisateur saisit et confirme son nouveau mot de passe
8. Après validation, il est connecté et redirigé vers l’accueil

---

## Test en local

1. Démarrer Expo : `npx expo start --web`
2. Ouvrir `http://localhost:8081`
3. Saisir un email sur « Mot de passe oublié ? »
4. Vérifier l’email (ou Inbucket en local : `npx supabase status` → lien Mailpit)
5. Cliquer sur le lien → vous devez arriver sur l’app avec l’écran « Nouveau mot de passe »

**Sur mobile** : le lien s’ouvre dans le navigateur. L’URL configurée doit être accessible depuis le téléphone (ex. tunnel ngrok ou URL de production).

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Aucun email reçu | Limite Supabase (2/h) ou SMTP non configuré | Configurer SMTP, vérifier spams |
| Erreur « Invalid redirect URL » | URL absente de Redirect URLs | L’ajouter dans Auth → URL Configuration |
| Lien ouvre une page vide | URL non servie par l’app | Utiliser l’URL de la web app (ex. localhost:8081) |
| Pas d’écran « Nouveau mot de passe » | `detectSessionInUrl` désactivé ou mauvais redirect | Vérifier que l’app web charge à l’URL de redirection |
