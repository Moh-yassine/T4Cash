#!/usr/bin/env node
/**
 * Génère les icônes PWA (192x192 et 512x512) à partir du logo T4Cash.
 * Source : supabase/email-templates/logo-T4Cash.png
 * Sortie : public/logo192.png, public/logo512.png
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceIcon = path.join(root, 'supabase', 'email-templates', 'logo-T4Cash.png');
const publicDir = path.join(root, 'public');
const sizes = [192, 512];

if (!fs.existsSync(sourceIcon)) {
  console.error('Logo introuvable:', sourceIcon);
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(publicDir, `logo${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Créé:', outPath);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
