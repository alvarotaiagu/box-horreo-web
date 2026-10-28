/* Prepara las fotos de la web desde las de Instagram y Facebook de BOX (en ../box-horreo-bocetos/ref).
   Uso: node scripts/fotos.mjs            (todas)
        node scripts/fotos.mjs f22 f0     (solo esas; el resto de fotos.json se conserva)
   - Claves como en los bocetos: fNN = número de la hoja de contacto (ref/scripts/datos/hojas/indice.tsv),
     fNN_2 = 2.ª diapositiva; 'tienda' (perfil de Facebook) y 'rotulo' (el BOX de la pared).
   - Gradación común suave: un poco menos de saturación y negros levantados, para que fotos de móvil de
     2017 a 2026 parezcan de la misma tienda. Sin calor añadido: el azul del escaparate sigue azul.
   - NUNCA amplía: anchos 480, 800 y 1080 solo si caben, más el ancho propio.
   - Escribe img/fotos/<clave>-<ancho>.{avif,webp,jpg} e img/fotos/fotos.json ({nombre, anchos, ancho, alto}). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(RAIZ, '../box-horreo-bocetos/ref');
const SALIDA = path.join(RAIZ, 'img/fotos');
fs.mkdirSync(SALIDA, { recursive: true });

// las que usa la web (portada, novedades, espejo, rebajas, tienda, caja)
const CLAVES = ['tienda', 'rotulo', 'f0', 'f1', 'f2', 'f3', 'f5', 'f6', 'f7', 'f8', 'f17', 'f18', 'f19', 'f20', 'f22', 'f23', 'f24', 'f26', 'f29', 'f31',
  'f40', 'f41', 'f46', 'f65', 'f67', 'f73', 'f76', 'f77', 'f79', 'f85', 'f92', 'f94', 'f96', 'f125', 'f162', 'f201', 'f208', 'f292', 'f309'];
const ANCHOS = [480, 800, 1080];

const indice = Object.fromEntries(fs.readFileSync(path.join(REF, 'scripts/datos/hojas/indice.tsv'), 'utf8').split('\n').filter(Boolean).map((l) => l.trim().split('\t')));
function origen(clave) {
  if (clave === 'tienda') return path.join(REF, 'logo/facebook-perfil.jpg');
  if (clave === 'rotulo') return path.join(REF, 'logo/rotulo-pared-2.jpg');
  const [, n, d] = /^f(\d+)(?:_(\d+))?$/.exec(clave);
  const codigo = indice[n];
  if (!codigo) throw new Error('Sin código para ' + clave);
  return path.join(REF, 'fotos/instagram', codigo + (d ? '_' + d : '') + '.jpg');
}

function gradar(data) {
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2], y = 0.299 * r + 0.587 * g + 0.114 * b;
    const k = 0.9; // saturación
    const lev = (v) => 8 + v * (247 - 8) / 255;
    data[i] = lev(y + (r - y) * k); data[i + 1] = lev(y + (g - y) * k); data[i + 2] = lev(y + (b - y) * k);
  }
  return data;
}

const ficha = path.join(SALIDA, 'fotos.json');
const previas = fs.existsSync(ficha) ? JSON.parse(fs.readFileSync(ficha, 'utf8')) : [];
const solo = process.argv.slice(2);
const lista = [];
for (const clave of CLAVES) {
  if (solo.length && !solo.includes(clave)) { const p = previas.find((f) => f.nombre === clave); if (p) lista.push(p); continue; }
  const src = origen(clave);
  const { data, info } = await sharp(src).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = sharp(gradar(data), { raw: { width: info.width, height: info.height, channels: 3 } });
  const anchos = [...new Set([...ANCHOS.filter((w) => w < info.width), Math.min(info.width, 1080)])].sort((a, b) => a - b);
  for (const w of anchos) {
    const r = base.clone().resize({ width: w });
    await r.clone().avif({ quality: 50, effort: 4 }).toFile(path.join(SALIDA, `${clave}-${w}.avif`));
    await r.clone().webp({ quality: 72 }).toFile(path.join(SALIDA, `${clave}-${w}.webp`));
    await r.clone().jpeg({ quality: 76, progressive: true, mozjpeg: true }).toFile(path.join(SALIDA, `${clave}-${w}.jpg`));
  }
  const ancho = anchos[anchos.length - 1], alto = Math.round(info.height * ancho / info.width);
  lista.push({ nombre: clave, anchos, ancho, alto });
  console.log(clave, anchos.join(','), `${ancho}×${alto}`);
}
fs.writeFileSync(ficha, JSON.stringify(lista, null, 1));
