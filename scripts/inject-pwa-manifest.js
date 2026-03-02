#!/usr/bin/env node
/**
 * Injecte le lien du manifest PWA dans dist/index.html après expo export -p web.
 */
const path = require('path');
const fs = require('fs');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html introuvable. Lancez d\'abord "npx expo export -p web".');
  process.exit(1);
}

const manifestLink = '    <link rel="manifest" href="/manifest.json" />';
const viewportSafeArea = 'viewport-fit=cover';
let html = fs.readFileSync(indexPath, 'utf8');

let changed = false;
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${manifestLink}\n  </head>`);
  changed = true;
}
if (html.includes('name="viewport"') && !html.includes('viewport-fit=cover')) {
  html = html.replace(
    /<meta name="viewport" content="([^"]*)"/,
    '<meta name="viewport" content="$1, viewport-fit=cover"'
  );
  changed = true;
}

if (!changed && html.includes('rel="manifest"')) {
  console.log('Manifest et viewport déjà configurés.');
  process.exit(0);
}
fs.writeFileSync(indexPath, html);
console.log('Lien PWA manifest injecté dans dist/index.html');
