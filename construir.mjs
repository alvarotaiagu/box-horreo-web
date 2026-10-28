/* Genera las páginas a partir de sus fuentes *.src.html:
   1. <!--parte:partes/archivo.html--> → el contenido de ese archivo. Si no existe (un módulo que aún no está),
      deja un comentario y la web funciona sin él.
   2. {{clave}} → el valor de datos.json (teléfono, calle, horario…: UN solo sitio).
   3. <img data-foto="clave" sizes="…" …> → <picture> con AVIF, WebP y JPG en todos los anchos de img/fotos/fotos.json.
   4. <!--fotos--> → BOX.fotos (anchos de cada foto) y el respaldo de datos/prendas.json, por si la página se abre
      sin servidor o falla la red. Las prendas se siguen leyendo del JSON en vivo: cambiarlo no exige tocar código.
   5. Los <link>/<script> propios que aún no existen se quitan con un aviso.
   6. Ejecuta versionar.mjs para poner ?v=<huella> a CSS y JS.
   Se edita SIEMPRE el *.src.html (o la parte); el .html generado se sobrescribe. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const FOTOS = new Map(JSON.parse(leer('img/fotos/fotos.json')).map((f) => [f.nombre, f]));
const DATOS = JSON.parse(leer('datos.json'));
const PRENDAS = JSON.parse(leer('datos/prendas.json'));
const existe = (r) => fs.existsSync(path.join(RAIZ, r));

for (const p of PRENDAS.prendas) if (!FOTOS.has(p.foto)) throw new Error(`prendas.json: «${p.id}» usa la foto ${p.foto}, que no está en img/fotos (node scripts/fotos.mjs)`);

function picture(atrs) {
  const nombre = /data-foto="([^"]+)"/.exec(atrs)[1];
  const f = FOTOS.get(nombre);
  if (!f) throw new Error('Foto desconocida: ' + nombre);
  const sizes = (/\bsizes="([^"]+)"/.exec(atrs) || [, '100vw'])[1];
  const set = (ext) => f.anchos.map((w) => `img/fotos/${nombre}-${w}.${ext} ${w}w`).join(', ');
  const base = f.anchos.includes(800) ? 800 : f.anchos[f.anchos.length - 1];
  let resto = atrs.replace(/\s*data-foto="[^"]+"/, '').replace(/\s*\bsizes="[^"]+"/, '');
  if (!/\bloading=/.test(resto) && !/fetchpriority="high"/.test(resto)) resto += ' loading="lazy"';
  if (!/\bdecoding=/.test(resto)) resto += ' decoding="async"';
  return `<picture data-foto="${nombre}">`
    + `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`
    + `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`
    + `<img src="img/fotos/${nombre}-${base}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${f.ancho}" height="${f.alto}"${resto}>`
    + `</picture>`;
}

const partes = (html, prof = 0) => html.replace(/<!--parte:([^\s>]+)\s*-->/g, (m, ruta) => {
  if (!existe(ruta)) { console.warn('  (falta ' + ruta + ')'); return `<!-- sin ${ruta} -->`; }
  if (prof > 3) throw new Error('Partes anidadas de más: ' + ruta);
  return partes(leer(ruta).trim(), prof + 1);
});

const datos = (html, fichero) => html.replace(/\{\{([a-z_]+)\}\}/g, (m, k) => {
  if (!(k in DATOS)) throw new Error(`${fichero}: falta «${k}» en datos.json`);
  return DATOS[k];
});

const fotosJs = () => {
  const o = Object.fromEntries([...FOTOS].map(([k, f]) => [k, { anchos: f.anchos, ancho: f.ancho, alto: f.alto }]));
  const respaldo = JSON.stringify(PRENDAS).replace(/</g, '\u003c');
  return `<script>BOX.fotos=${JSON.stringify(o)};BOX.tel=${JSON.stringify(DATOS.telefono_tel)};</script>\n`
    + `<script type="application/json" id="prendas-respaldo">${respaldo}</script>`;
};

const quitarAusentes = (html) => html
  .replace(/[ \t]*<link rel="stylesheet" href="(css\/[^"?]+)"[^>]*>\r?\n?/g, (m, r) => (existe(r) ? m : (console.warn('  (sin ' + r + ': se quita su <link>)'), '')))
  .replace(/[ \t]*<script (?:type="module" )?(?:defer )?src="(js\/[^"?]+)"[^>]*><\/script>\r?\n?/g, (m, r) => (existe(r) ? m : (console.warn('  (sin ' + r + ': se quita su <script>)'), '')));

for (const src of fs.readdirSync(RAIZ).filter((f) => f.endsWith('.src.html'))) {
  let html = quitarAusentes(partes(leer(src)));
  html = html.replace('<!--fotos-->', fotosJs);
  html = datos(html, src);
  html = html.replace(/<img\b([^>]*\bdata-foto="[^"]+"[^>]*)>/g, (m, a) => picture(a.replace(/\s*\/$/, '')));
  const destino = src.replace('.src.html', '.html');
  fs.writeFileSync(path.join(RAIZ, destino), html);
  console.log(`${src} → ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
}
execFileSync(process.execPath, [path.join(RAIZ, 'versionar.mjs')], { stdio: 'inherit' });
