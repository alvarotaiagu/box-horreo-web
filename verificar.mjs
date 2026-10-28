/* Verificación de la web de BOX (Playwright, un solo navegador, ventanas pequeñas, escala 1). Sin capturas.
   Uso: node verificar.mjs   (puerto 8897)
   Antes de lanzarlo: Get-CimInstance Win32_Process -Filter "Name='chrome-headless-shell.exe'" (una prueba a la vez).
   Todo con movimiento reducido salvo el bloque final de movimiento (cortina, recarga a media página, tachado). */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8897;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado: ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;

const fallos = [];
let nOk = 0;
const comprobar = (cond, m, detalle) => { if (cond) { nOk++; console.log('  ok     ' + m); } else { fallos.push(m); console.log('  FALLO  ' + m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle) : '')); } };
const LLAVE = 'box-cookies-vistas';
const sinCookies = `try { localStorage.setItem('${LLAVE}', '1'); } catch (e) {}`;
const existe = (f) => fs.existsSync(path.join(RAIZ, f));
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* ================= 0. archivos (sin navegador) ================= */
console.log('\n0. Archivos');
for (const f of fs.readdirSync(RAIZ).filter((x) => x.endsWith('.html') && !x.endsWith('.src.html'))) {
  const s = leer(f);
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, nofollow">/.test(s), `${f}: charset lo primero y noindex justo detrás`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)]);
  comprobar(!/<!--parte:/.test(s) && !/<!-- sin partes/.test(s) && !/\{\{[a-z_]+\}\}/.test(s) && !/<!--fotos-->/.test(s), `${f}: partes y datos sustituidos`);
}
comprobar(['404.html', 'manifest.json', 'datos.json', 'datos/prendas.json', 'img/og.jpg', 'img/baldosa.svg', 'marca/logo.svg', 'marca/icono.svg', 'marca/favicon.svg', 'marca/favicon-32.png', 'marca/apple-touch-icon.png', 'marca/icono-512.png', 'PENDIENTES.md', 'README.md'].every(existe), '404, manifest, datos, prendas, og, baldosa, logo, icono y favicons, PENDIENTES y README');
const PR = JSON.parse(leer('datos/prendas.json')).prendas;
const FOT = new Set(JSON.parse(leer('img/fotos/fotos.json')).map((f) => f.nombre));
comprobar(PR.every((p) => FOT.has(p.foto)), 'prendas.json: todas las fotos existen');
comprobar(new Set(PR.map((p) => p.id)).size === PR.length, 'prendas.json: ids únicos');
const precios = PR.filter((p) => p.precio).map((p) => p.precio.ahora + '|' + p.precio.antes).sort();
comprobar(JSON.stringify(precios) === JSON.stringify(['161 €|230 €', '78 €|155,90 €', '97 €|139 €']), 'solo los tres precios publicados por BOX', precios);
const idx = leer('index.html');
const todoJs = ['js/main.js', 'js/espejo.js', 'js/caja.js'].map(leer).join('\n');
comprobar(!/getContext\(['"](webgl|experimental-webgl)/.test(todoJs) && !/three/i.test(idx), 'sin WebGL');
comprobar(!/localStorage\.|sessionStorage\.|document\.cookie/.test(leer('js/caja.js') + leer('js/espejo.js')), 'la caja y el espejo no guardan nada');
comprobar(/<div class="mando" id="mando" hidden>/.test(idx) && /MANDO DE MAQUETA/.test(idx), 'mando de maqueta presente y oculto en el HTML');
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{\s*display:\s*flex/.test(leer('css/estilos.css')) && !/\.cookies\s*\{[^}]*display:\s*flex/.test(leer('css/estilos.css')), 'cookies: display solo con :not([hidden])');
comprobar(/\[teléfono\]/.test(idx) && /Horario por confirmar/.test(idx), 'lo que falta va marcado: [teléfono] y horario por confirmar');
// contraste de los pares de color del sistema
const lum = (hex) => { const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4))); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const pares = [['141414', 'F4F1EC'], ['3A3A3A', 'F4F1EC'], ['5C5751', 'F4F1EC'], ['2F6496', 'F4F1EC'], ['9B2C1F', 'F4F1EC'], ['8A4B12', 'F4F1EC'], ['5C5751', 'ECE7DF'], ['2F6496', 'ECE7DF'], ['D9BD74', '3B1A2A'], ['141414', '6FA8DC'], ['F4F1EC', '141414'], ['F4F1EC', '2F6496']];
const malos = pares.map(([a, b]) => [a, b, +ratio(a, b).toFixed(2)]).filter((p) => p[2] < 4.5);
comprobar(malos.length === 0, 'contraste AA (4,5:1) de los pares del sistema', malos);

/* ================= navegador ================= */
const browser = await chromium.launch();
const errores = [];
const nuevo = async (op = {}) => {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }, op));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|404/.test(m.text())) errores.push(m.text()); });
  return { ctx, page };
};
try {
  /* ================= 1. escritorio, sin movimiento ================= */
  console.log('\n1. Escritorio 1280×800, movimiento reducido');
  {
    const { ctx, page } = await nuevo();
    await ctx.addInitScript(sinCookies);
    await page.goto(BASE + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#ranura-mini button').length > 0 && document.querySelectorAll('#reb-lista li').length > 0);
    const e = await page.evaluate(() => ({
      fuera: document.documentElement.classList.contains('cortina-fuera'),
      cort: getComputedStyle(document.getElementById('cortina')).display,
      cuerpos: document.querySelectorAll('#rot-cuerpos path').length,
      fotosRot: document.querySelectorAll('#rot-fotos image').length,
      h1: document.getElementById('portada-tit').getBoundingClientRect().height > 0,
      minis: document.querySelectorAll('#ranura-mini button').length,
      reb: [...document.querySelectorAll('#reb-lista li')].map((l) => l.textContent),
      espejo: !document.getElementById('invitada').hidden && !!window.BoxEspejo,
      caja: !!window.BoxCaja,
      ancho: document.documentElement.scrollWidth <= innerWidth,
      mando: getComputedStyle(document.getElementById('mando')).display,
    }));
    comprobar(e.fuera && e.cort === 'none', 'sin movimiento: la cortina no se ve', e);
    comprobar(e.cuerpos === 8 && e.fotosRot === 3, 'portada: 8 piezas del rótulo y 3 fotos por los cortes');
    comprobar(e.h1, 'portada: el titular se ve');
    comprobar(e.minis === PR.filter((p) => p.novedad).length, 'novedades: una miniatura por prenda nueva del JSON', e.minis);
    comprobar(e.reb.length === 3 && /78 €/.test(e.reb.join()) && /155,90 €/.test(e.reb.join()) && /Es el último: talla M/.test(e.reb.join()), 'rebajas: 3 prendas con antes, ahora y la última talla');
    comprobar(e.espejo, 'espejo montado (BoxEspejo)');
    comprobar(e.caja, 'caja montada (BoxCaja)');
    comprobar(e.ancho, 'sin scroll horizontal');
    comprobar(e.mando === 'none', 'sin ?revision el mando no se ve');
    // novedades: siguiente y apartar
    const t0 = await page.textContent('#ranura-tit');
    await page.click('#ranura-next');
    await page.waitForFunction((t) => document.getElementById('ranura-tit').textContent !== t, t0);
    comprobar(true, 'novedades: la flecha cambia de prenda');
    await page.click('#ranura-meter');
    await page.waitForFunction(() => window.BoxCaja.ids().length === 1);
    const cu = await page.evaluate(() => ({ n: document.getElementById('cab-cuenta').textContent, oculto: document.getElementById('cab-cuenta').hidden }));
    comprobar(cu.n === '1' && !cu.oculto, 'apartar desde novedades: la caja tiene 1 y la cabecera lo cuenta', cu);
    // la caja no pasa de 3
    const n = await page.evaluate(() => { const ids = ['trench-ferrache', 'largo-limon', 'jersey-crudo', 'abrigo-cuadros']; ids.forEach((i) => window.BoxCaja.meter(i)); return window.BoxCaja.ids().length; });
    comprobar(n === 3, 'la caja no admite más de 3 prendas', n);
    // rebajas: apartar
    await page.evaluate(() => window.BoxCaja.vaciar());
    await page.click('#reb-lista li:first-child button');
    comprobar(await page.evaluate(() => window.BoxCaja.ids()[0]) === 'trench-ferrache', 'apartar desde rebajas mete esa prenda');
    // espejo: resérvalo
    await page.evaluate(() => window.BoxCaja.vaciar());
    const btnEsp = page.locator('#invitada button', { hasText: /Resérvalo/ }).first();
    if (await btnEsp.count()) { await btnEsp.scrollIntoViewIfNeeded(); await btnEsp.click(); await page.waitForTimeout(150); comprobar((await page.evaluate(() => window.BoxCaja.ids().length)) === 1, 'apartar desde el espejo mete la prenda en la caja'); }
    else comprobar(false, 'el espejo tiene botón «Resérvalo»');
    // pisa y descubre
    await page.locator('#piso-lienzo').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('piso-lienzo').width > 100);
    await page.click('#piso-todo');
    await page.waitForFunction(() => document.getElementById('piso-ficha').dataset.on === '1');
    comprobar(/escaparate/i.test(await page.textContent('#piso-nom')), 'pisa y descubre: «Descubrirlo entero» enseña el rincón');
    comprobar(await page.evaluate(() => !document.querySelector('#mapa iframe')), 'el mapa de Google no se carga sin pedirlo');
    // WhatsApp sin número → aviso
    await page.click('#wa');
    comprobar(await page.isVisible('#aviso-tel'), 'WhatsApp sin número: avisa de que falta');
    // cabecera fija
    comprobar(await page.evaluate(() => document.getElementById('cab').classList.contains('fija')), 'la cabecera se fija con velo al bajar');
    // titulares sin movimiento: visibles
    comprobar(await page.evaluate(() => [...document.querySelectorAll('.rev')].every((r) => getComputedStyle(r).opacity === '1')), 'sin movimiento, todos los titulares visibles');
    await ctx.close();
  }

  /* ================= 2. cookies, mando, respaldo del JSON ================= */
  console.log('\n2. Cookies, mando y respaldo');
  {
    const { ctx, page } = await nuevo();
    await page.goto(BASE + 'index.html', { waitUntil: 'load' });
    comprobar(await page.isVisible('#cookies'), 'cookies: contexto limpio → el aviso sale');
    await page.click('#cookies-ok');
    comprobar(!(await page.isVisible('#cookies')) && (await page.evaluate((k) => localStorage.getItem(k), LLAVE)) === '1', 'cookies: «Entendido» lo cierra y guarda la marca');
    await page.reload({ waitUntil: 'load' });
    comprobar(!(await page.isVisible('#cookies')), 'cookies: al recargar no vuelve');
    await page.goto(BASE + 'index.html?revision', { waitUntil: 'load' });
    comprobar(await page.isVisible('#mando'), 'con ?revision el mando se ve');
    await page.click('#mando [data-densidad="sobria"]');
    await page.waitForFunction(() => document.querySelectorAll('#nov-rejilla li').length > 0);
    const s = await page.evaluate(() => ({ sobria: document.documentElement.classList.contains('densidad-sobria'), rot: getComputedStyle(document.getElementById('rot')).display, plano: getComputedStyle(document.querySelector('.rot-plano')).display, rej: getComputedStyle(document.getElementById('nov-rejilla')).display, datos: getComputedStyle(document.querySelector('.portada__datos')).display, url: location.search }));
    comprobar(s.sobria && s.rot === 'none' && s.plano === 'block' && s.rej === 'grid' && s.datos === 'grid' && /densidad=sobria/.test(s.url), 'densidad sobria en vivo: rótulo plano, datos, rejilla de novedades', s);
    await ctx.close();
    // respaldo: sin datos/prendas.json las novedades salen igual
    const b = await nuevo();
    await b.ctx.addInitScript(sinCookies);
    await b.page.route('**/datos/prendas.json*', (r) => r.abort());
    await b.page.goto(BASE + 'index.html', { waitUntil: 'load' });
    await b.page.waitForFunction(() => document.querySelectorAll('#ranura-mini button').length > 0, null, { timeout: 5000 }).catch(() => {});
    comprobar((await b.page.locator('#ranura-mini button').count()) > 0, 'si falla datos/prendas.json, las novedades salen del respaldo');
    await b.ctx.close();
  }

  /* ================= 3. móvil ================= */
  console.log('\n3. Móvil');
  for (const [w, hh] of [[390, 844], [360, 640]]) {
    const { ctx, page } = await nuevo({ viewport: { width: w, height: hh }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(sinCookies);
    await page.goto(BASE + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#ranura-mini button').length > 0);
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const a = r('#rot'), t = r('#portada-tit');
      return { ancho: document.documentElement.scrollWidth, vista: innerWidth, solapa: a.bottom > t.top + 1, rotDentro: a.left >= 0 && a.right <= innerWidth + .5 };
    });
    comprobar(m.ancho <= m.vista, `${w}×${hh}: sin scroll horizontal`, m);
    comprobar(!m.solapa && m.rotDentro, `${w}×${hh}: el rótulo cabe y no pisa el titular`, m);
    await page.tap('#cab-menu');
    const mm = await page.evaluate(() => { const p = document.getElementById('menu-movil'); const r = p.getBoundingClientRect(); return { visible: !p.hidden, alto: Math.round(r.height), esperado: innerHeight - 64 }; });
    comprobar(mm.visible && Math.abs(mm.alto - mm.esperado) <= 2, `${w}×${hh}: el menú ocupa la pantalla bajo la cabecera`, mm);
    await page.tap('#menu-movil a[href="#reservar"]');
    await page.waitForTimeout(200);
    comprobar(await page.evaluate(() => document.getElementById('menu-movil').hidden), `${w}×${hh}: el menú se cierra al elegir`);
    // la caja: meter dos y mirar la bandeja
    await page.evaluate(() => { window.BoxCaja.meter('falda-roja'); window.BoxCaja.meter('largo-limon'); });
    await page.waitForTimeout(150);
    const c = await page.evaluate(() => {
      const sec = document.getElementById('reservar'), band = sec.querySelector('[class*="bandeja"]');
      const r = band ? band.getBoundingClientRect() : null;
      return { hay: !!band, dentro: r ? r.left >= -.5 && r.right <= innerWidth + .5 : false, visible: r ? r.bottom > 0 && r.top < innerHeight : false, ancho: document.documentElement.scrollWidth <= innerWidth };
    });
    comprobar(c.hay && c.dentro && c.visible && c.ancho, `${w}×${hh}: la bandeja de la caja se ve y cabe`, c);
    await page.waitForTimeout(500);
    comprobar(!(await page.isVisible('#wa')), `${w}×${hh}: en la caja, el WhatsApp flotante se aparta (no pisa la barra)`);
    await page.evaluate(() => document.getElementById('rebajas').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(300);
    comprobar(await page.isVisible('#wa'), `${w}×${hh}: fuera de la caja, el WhatsApp vuelve`);
    // la barra del móvil: cambiar solo el alto no mueve la página
    const antes = await page.evaluate(() => document.getElementById('rebajas').getBoundingClientRect().top + scrollY);
    await page.setViewportSize({ width: w, height: hh + 56 }); await page.waitForTimeout(120);
    await page.setViewportSize({ width: w, height: hh }); await page.waitForTimeout(120);
    const despues = await page.evaluate(() => document.getElementById('rebajas').getBoundingClientRect().top + scrollY);
    comprobar(Math.abs(antes - despues) < 1, `${w}×${hh}: cambiar el alto (barra del móvil) no mueve nada`, [antes, despues]);
    await ctx.close();
  }

  /* ================= 4. movimiento (una sola vez, al final) ================= */
  console.log('\n4. Movimiento');
  {
    const { ctx, page } = await nuevo({ reducedMotion: 'no-preference' });
    await ctx.addInitScript(sinCookies);
    await page.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#cort-rot .cp').length === 8);
    const tapa = await page.evaluate(() => { const c = document.getElementById('cortina'); const r = c.getBoundingClientRect(); return getComputedStyle(c).display !== 'none' && r.width >= innerWidth && r.height >= innerHeight; });
    comprobar(tapa, 'cortina: tapa la pantalla al cargar');
    const pieza = () => page.evaluate(() => ({ t: getComputedStyle(document.querySelectorAll('#cort-rot .cp')[7]).transform, fuera: document.documentElement.classList.contains('cortina-fuera') }));
    await page.waitForTimeout(450); const m1 = await pieza();
    await page.waitForTimeout(600); const m2 = await pieza();
    comprobar(!m2.fuera && m1.t !== m2.t && /matrix/.test(m1.t), 'cortina: a medias, las piezas van llegando (fotograma a medias)', [m1, m2]);
    await page.waitForFunction(() => document.documentElement.classList.contains('rot-listo'), null, { timeout: 7000 });
    const casa = await page.evaluate(() => { const a = document.getElementById('cort-rot').getBoundingClientRect(), b = document.getElementById('rot').getBoundingClientRect(); return [a.left - b.left, a.top - b.top, a.width - b.width].map((v) => Math.round(Math.abs(v) * 10) / 10); });
    comprobar(casa.every((v) => v <= 2), 'cortina: el rótulo aterriza justo encima del de la portada (±2 px)', casa);
    await page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera'), null, { timeout: 7000 });
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && scrollY === 0), 'cortina: se retira y deja la página arriba');
    // recargar a media página: vuelve arriba
    for (let i = 0; i < 18; i++) await page.mouse.wheel(0, 100);
    await page.waitForFunction(() => scrollY > 1200);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera'), null, { timeout: 7000 });
    comprobar(await page.evaluate(() => scrollY) === 0, 'recargar a media página: tras la cortina, arriba del todo');
    // rebajas: el precio de antes se tacha al verlo
    await page.evaluate(() => document.getElementById('reb-lista').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => { const p = document.querySelector('.reb__antes path'); return p && parseFloat(getComputedStyle(p).strokeDashoffset) < .05; }, null, { timeout: 4000 }).catch(() => {});
    comprobar(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.reb__antes path')).strokeDashoffset) < .05), 'rebajas: el precio de antes queda tachado');
    // titulares: con movimiento, los visitados se ven
    await page.evaluate(() => document.getElementById('novedades').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(1300);
    comprobar(await page.evaluate(() => getComputedStyle(document.querySelector('#nov-tit')).opacity === '1'), 'con movimiento, el titular de novedades aparece al verlo');
    await ctx.close();
  }
  comprobar(errores.length === 0, 'sin errores de JavaScript en ninguna página', errores.slice(0, 6));
} finally {
  await browser.close();
  servidor.close();
}
console.log(`\n${nOk} bien, ${fallos.length} fallos`);
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exitCode = 1; }
