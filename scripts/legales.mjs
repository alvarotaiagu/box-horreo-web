/* Genera los *.src.html de las páginas legales y el 404 con una plantilla común.
   Uso: node scripts/legales.mjs  (después, node construir.mjs)
   La titular, el NIF, el número de la calle y el teléfono NO constan en ninguna fuente: van como PENDIENTE visible. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TITULAR = `<dl>
  <dt>Titular</dt><dd><span class="pendiente">PENDIENTE</span></dd>
  <dt>NIF</dt><dd><span class="pendiente">PENDIENTE</span></dd>
  <dt>Nombre comercial</dt><dd>BOX</dd>
  <dt>Dirección</dt><dd>{{calle}} <span class="pendiente">número por confirmar</span> · {{cp}} {{localidad}} ({{provincia}})</dd>
  <dt>Teléfono</dt><dd><span class="pendiente">{{telefono}}</span></dd>
  <dt>Correo</dt><dd><span class="pendiente">PENDIENTE</span></dd>
  <dt>Actividad</dt><dd>Comercio al por menor de ropa de mujer</dd>
</dl>
<p class="aviso">PENDIENTE: BOX no publica ni su titular, ni su NIF, ni su número de la calle, ni un teléfono o correo de contacto. Hay que pedírselos antes de publicar.</p>`;

const P = {
  'aviso-legal': { titulo: 'Aviso legal', cuerpo: `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos de la titular de esta web:</p>
${TITULAR}
<h2>Uso de la web</h2>
<p>Esta web informa sobre BOX, una tienda de ropa de mujer en la rúa do Hórreo de Carballo. No es una tienda online: no se vende ni se cobra nada por aquí. Los precios que aparecen son los que BOX ha publicado en sus redes y pueden cambiar; los que valen son los de la tienda.</p>
<p>«Prepárame una caja» es, por ahora, una demostración: no envía ni guarda nada. Para apartar una prenda de verdad, escríbenos o pasa por la tienda.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos, las fotos y el logotipo son de BOX o se usan con su permiso. No se pueden copiar ni reutilizar sin autorización.</p>
<h2>Enlaces</h2>
<p>La web enlaza a Instagram, Facebook, WhatsApp y Google Maps. Esas páginas tienen sus propias condiciones y políticas de privacidad.</p>` },
  'privacidad': { titulo: 'Política de privacidad', cuerpo: `
<h2>Responsable</h2>
${TITULAR}
<h2>Qué datos tratamos y para qué</h2>
<p>Los que nos das al escribirnos por WhatsApp o en redes, o al llamarnos: tu nombre, tu teléfono y lo que quieras contarnos (qué prenda te interesa, tu talla, cuándo quieres pasar). Los usamos solo para atenderte y prepararte lo que pidas.</p>
<p>La reserva de esta web («Prepárame una caja») es una demostración: lo que elijas o escribas en ella no sale de tu navegador ni se guarda. Si pulsas «Mandar por WhatsApp», el mensaje se abre en tu WhatsApp y eres tú quien decide si lo envía.</p>
<h2>Base legal y plazos</h2>
<p>La base es tu consentimiento al escribirnos. Guardamos la conversación mientras haga falta para atenderte y, después, el tiempo que exija la ley.</p>
<h2>Con quién se comparten</h2>
<p>Con nadie. WhatsApp (Meta) trata los mensajes según su propia política.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación o la portabilidad de tus datos escribiéndonos o en la tienda. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</p>
<h2>Lo que guarda esta web en tu navegador</h2>
<p>Solo una cosa: <code>box-cookies-vistas</code> en el almacenamiento local, para recordar que ya has visto el aviso de cookies. Más detalles en <a href="cookies.html">cookies</a>.</p>` },
  'cookies': { titulo: 'Cookies', cuerpo: `
<p>Esta web no usa cookies propias ni de analítica, publicidad o seguimiento.</p>
<h2>Lo que se guarda en tu navegador</h2>
<table><thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué</th><th>Duración</th></tr></thead>
<tbody><tr><td><code>box-cookies-vistas</code></td><td>Almacenamiento local (propio)</td><td>Recordar que ya has visto el aviso de cookies</td><td>Hasta que lo borres</td></tr></tbody></table>
<h2>Terceros</h2>
<ul>
  <li><b>Google Fonts</b>: las letras de la web se cargan de los servidores de Google, que reciben tu dirección IP. No instala cookies.</li>
  <li><b>Google Maps</b>: el mapa de «Dónde estamos» solo se carga si pulsas «Ver el mapa». Desde ese momento, Google puede instalar sus cookies.</li>
  <li><b>WhatsApp, Instagram y Facebook</b>: son enlaces. Solo al abrirlos se aplican sus condiciones.</li>
</ul>
<h2>Cómo borrarlo</h2>
<p>Desde la configuración de tu navegador (en Chrome: Configuración, Privacidad y seguridad, Datos de sitios) puedes borrar lo que guarda esta web. Si lo borras, el aviso de cookies volverá a salir.</p>` },
  'accesibilidad': { titulo: 'Accesibilidad', cuerpo: `
<p>Queremos que esta web se pueda usar sin ratón, con lector de pantalla y con el movimiento reducido.</p>
<ul>
  <li>Todo se puede recorrer con el teclado, con el foco siempre visible.</li>
  <li>Las piezas que se usan con el dedo o el cursor tienen otra forma de hacerlo: flechas y botones en las novedades, el botón «Limpiar el espejo» y la tecla Intro en el suelo de la tienda.</li>
  <li>Si tu sistema pide menos movimiento, la web aparece sin cortina de entrada ni animaciones.</li>
  <li>Los textos cumplen el contraste del nivel AA de las WCAG 2.2.</li>
</ul>
<p>Si algo no te funciona, cuéntanoslo en la tienda o en <a href="{{instagram}}">Instagram</a> y lo arreglamos.</p>` },
};

const pagina = (titulo, cuerpo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · BOX</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/legal.css">
<link rel="icon" href="marca/favicon.svg" type="image/svg+xml">
<link rel="icon" href="marca/favicon-32.png" sizes="32x32" type="image/png">
</head>
<body>
<header class="legal-cab">
  <div class="env">
    <a class="legal-logo" href="./" aria-label="BOX, a la portada"><img src="marca/logo.svg" width="245" height="100" alt="BOX"></a>
    <a class="volver" href="./">Volver a la portada</a>
  </div>
</header>
<main class="legal">
  <div class="env">
    <h1>${titulo}</h1>
${cuerpo.trim()}
  </div>
</main>
<footer class="legal-pie">
  <div class="env">
    <a href="aviso-legal.html">Aviso legal</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="accesibilidad.html">Accesibilidad</a>
  </div>
</footer>
</body>
</html>
`;
for (const [f, { titulo, cuerpo }] of Object.entries(P)) fs.writeFileSync(path.join(RAIZ, f + '.src.html'), pagina(titulo, cuerpo));
fs.writeFileSync(path.join(RAIZ, '404.src.html'), pagina('Aquí no hay nada', `
<p class="grande">Esta página no existe, o se ha movido. La tienda sigue en la rúa do Hórreo.</p>
<p><a class="btn" href="./">Ir a la portada</a></p>`));
console.log('legales listas');
