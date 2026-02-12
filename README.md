# T4Cash – App mobile de trading

Application mobile React Native (Expo) avec Supabase pour le back-end : connexion, inscription, accueil, profil, versements, graphiques de performance et réglages (thème, langue).

## Prérequis

- Node.js (LTS)
- Compte [Supabase](https://supabase.com)
- Expo Go sur téléphone (ou simulateur)

## Installation

```bash
cd T4Cash
npm install
```

## Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans le dashboard Supabase : **SQL Editor** → exécutez le contenu de `supabase/schema.sql` pour créer les tables et RLS.
3. Créez un fichier `.env` à la racine du projet (voir `.env.example`) :

```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
```

4. (Optionnel) **Temps réel** : dans **Database** → **Replication**, activez la réplication pour la table `versements` afin que les données se mettent à jour en direct sur tous les écrans.
5. (Optionnel) Pour les avatars : dans **Storage**, créez un bucket `avatars` et configurez les policies.

## Lancer l’app

```bash
npx expo start
```

Puis scannez le QR code avec Expo Go (Android) ou l’app Caméra (iOS).

## Fonctionnalités

- **Auth** : Connexion et inscription (email / mot de passe).
- **Accueil** : Résumé du mois, objectif 100 €, part trader 30 %, gains/pertes.
- **Profil** : Avatar (photo ou galerie), nom d’utilisateur, email, adresse.
- **Versement** : Saisie des gains et pertes chaque jour (lun–ven). Objectif 100 €/jour ; 30 % du net au trader. Données en temps réel.
- **Graphique** : Courbe des performances (montant cumulé) par jour / semaine / mois / année avec pourcentages.
- **Réglages** : Thème clair/sombre, langue FR/EN, déconnexion.

## Stack

- **Expo** (SDK 54) + **React Native**
- **Supabase** (Auth + Postgres)
- **React Navigation** (stack + bottom tabs)
- **react-native-gifted-charts** (graphiques)
- **expo-image-picker** (avatar)
- Thème clair/sombre et i18n FR/EN en local (AsyncStorage)
