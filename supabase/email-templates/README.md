# Templates e-mail Supabase – T4Cash (logo + bannière)

## Étape 1 : Héberger le logo et la bannière

Les e-mails doivent afficher des images accessibles par **URL publique**.

### Supabase Storage

1. **Dashboard Supabase** → **Storage** → **New bucket**.
2. Nom du bucket : `email-assets` (ou autre).
3. Cocher **Public bucket** → Create.
4. Uploader ton image :
   - Soit **une seule image** (logo + bannière sur le même fichier) : par ex. `assets/email-logo-banner.png` du projet.
   - Soit **deux images** : une pour le logo, une pour la bannière.
5. Cliquer sur le fichier → **Get public URL** (ou copier l’URL).  
   Format : `https://VOTRE_PROJECT_REF.supabase.co/storage/v1/object/public/email-assets/NOM_FICHIER.png`

**Exemple avec une seule image :**  
- URL : `https://ihboufmimryilgjrwagg.supabase.co/storage/v1/object/public/email-assets/email-logo-banner.png`  
- Tu peux utiliser **la même URL** pour le logo et la bannière dans le template (voir ci‑dessous).

---

## Étape 2 : Remplacer les URLs dans le template

1. Ouvrir **`confirm-signup.html`**.
2. Remplacer **`LOGO_URL`** par l’URL publique de ton **logo** (ou de l’image complète).
3. Remplacer **`BANNER_URL`** par l’URL publique de ta **bannière** (ou de la même image).

**Une seule image (logo + bannière sur le même fichier) :**  
Mets la même URL à la place de `LOGO_URL` et de `BANNER_URL`.

---

## Étape 3 : Coller le template dans Supabase

1. **Dashboard Supabase** → **Authentication** → **Email Templates**.
2. Choisir **Confirm signup**.
3. Copier **tout** le contenu de `confirm-signup.html` (après avoir remplacé `LOGO_URL` et `BANNER_URL`).
4. Coller dans l’éditeur du template Supabase (remplacer l’ancien contenu).
5. **Save**.

Les variables **`{{ .ConfirmationURL }}`** doivent rester telles quelles.

---

## Rendu de l’e-mail

- **En haut** : logo T4Cash.
- **Au centre** : texte « Confirmez votre inscription » + bouton **Confirmer mon adresse email** (lien `{{ .ConfirmationURL }}`) + lien de secours.
- **En bas** : bannière T4Cash (Trade. Invest. Profit.).
- Fond sombre (#0a0a0a) pour rester cohérent avec la charte.
