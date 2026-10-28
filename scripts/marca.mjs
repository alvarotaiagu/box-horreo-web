/* PNG de la marca a partir de marca/icono.svg y marca/logo.svg: favicon-32, apple-touch-icon (180),
   icono-512 (manifest) y la imagen para compartir img/og.jpg (1200×630, el logo sobre la pared con la luz de la tienda).
   Uso: node scripts/marca.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = (f) => path.join(RAIZ, 'marca', f);
const icono = fs.readFileSync(M('icono.svg'));
await sharp(icono, { density: 300 }).resize(32, 32).png().toFile(M('favicon-32.png'));
await sharp(icono, { density: 600 }).resize(180, 180).png().toFile(M('apple-touch-icon.png'));
await sharp(icono, { density: 1200 }).resize(512, 512).png().toFile(M('icono-512.png'));
const logo = fs.readFileSync(M('logo.svg'), 'utf8').match(/<g fill="#141414">[\s\S]*?<\/g>/)[0];
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="l" cx="30%" cy="22%" r="85%"><stop offset="0" stop-color="#FFFEFB"/><stop offset=".45" stop-color="#F4F1EC"/><stop offset="1" stop-color="#E4DDD1"/></radialGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#l)"/>
  <g transform="translate(232 150) scale(3)"><g transform="translate(5 6)" opacity=".32" filter="url(#s)">${logo.replace('#141414', '#5B4630')}</g>${logo}</g>
  <rect x="232" y="500" width="736" height="2" fill="#6FA8DC"/>
</svg>`;
await sharp(Buffer.from(og)).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(RAIZ, 'img/og.jpg'));
console.log('marca lista');
