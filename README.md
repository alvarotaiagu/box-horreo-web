# BOX · rúa do Hórreo, Carballo

Web de BOX, tienda de ropa de mujer en la rúa do Hórreo de Carballo. Estática (HTML, CSS y JS sin framework), sin WebGL. Solo castellano.
Sale del tablero de bocetos (`../box-horreo-bocetos/`, recomendación: logo 2 «La O es una caja» + sistema de A «El rótulo» + piezas de B, C y D).

## Orden de la portada
1. **Cortina** (`partes/cortina.html`, `js/main.js`): el rótulo se monta pieza a pieza con luz rasante, la caja de la O abre sus solapas y se entra por ella. Se salta con un toque o una tecla; sin movimiento no sale.
2. **Portada**: BOX en relieve (filtro SVG de luz difusa) con la ropa asomando por los cortes. La luz y las ranuras siguen al cursor o al dedo (deslizar en horizontal sobre el rótulo). Si el móvil no llega (media > 32 ms por fotograma), la luz se queda quieta.
3. **Novedades por la ranura**: cada prenda pasa por la O-caja. Salen de `datos/prendas.json` (`novedad: true`).
4. **Invitada y fiesta, «Limpia el espejo»**: módulo `partes/espejo.html` + `css/espejo.css` + `js/espejo.js` (API en su cabecera). Es la única superficie oscura (berenjena y oro).
5. **Rebajas, antes y ahora**: las prendas del JSON con `precio`. Solo los tres precios que BOX publicó.
6. **La tienda por dentro, «Pisa y descubre»**: canvas de baldosas que giran y enseñan seis rincones, con la calle, el horario, el Mercadillo BOX y el mapa (solo si se pide). La cenefa de baldosa cierra la página y el pie es el suelo entero.
7. **Prepárame una caja + calendario**: módulo `partes/caja.html` + `css/caja.css` + `js/caja.js` (API en su cabecera). Simulado y marcado; manda por WhatsApp.

## Cómo se cambia
- **Prendas**: `datos/prendas.json` (sin tocar código). Fotos nuevas: añadir la clave en `scripts/fotos.mjs` y `node scripts/fotos.mjs <clave>`.
- **Teléfono, horario, calle**: `datos.json`.
- **Después de cualquier cambio**: `node construir.mjs` (monta las partes, pone los datos, las `<picture>` y el respaldo del JSON, y versiona CSS y JS con `?v=`).
- Se edita siempre el `*.src.html` o la parte; el `.html` se sobrescribe. Las legales salen de `node scripts/legales.mjs`.
- Marca: `marca/logo.svg` (logo 2), `marca/icono.svg` (la O-caja sola, favicon). PNG y `img/og.jpg`: `node scripts/marca.mjs`.

## Puente común (`partes/cabeza.html`)
`window.BOX`: `movimiento`, `sobria()`, `alAbrirse(fn)`, `fotos`, `foto()`, `srcset()`, `prendas()`, `prenda(id)`, `whatsapp(texto)`, `tel`.
Eventos: `box:meter` {id} (apartar una prenda: lo escucha la caja), `box:caja` {ids} (la caja cambió: lo escucha la cabecera), `box:abierta`, `box:fuera`.

## Densidades (mando de maqueta, solo con `?revision`)
- **El rótulo** (cargada): relieve con luz, ropa en los cortes, ranura, vaho, solapas.
- **Sobria**: rótulo plano con los datos en la portada, todas las novedades en rejilla, los rincones de la tienda en fotos, lista de invitada y fiesta, y la caja como lista con la tabla de horario y los próximos huecos.

**Borrar el mando antes de entregar** (no viaja al cliente): quitar el bloque `<div class="mando" …>` de `index.src.html`, el bloque `MANDO DE MAQUETA` de `partes/cabeza.html` y de `js/main.js`, la sección `.mando` de `css/estilos.css` y las reglas `.densidad-sobria` de los CSS; `node construir.mjs` y comprobar que `grep -r "densidad-sobria\|mando" *.html js css` no devuelve nada.

## Comprobar
`node verificar.mjs` (puerto 8897, un navegador, sin capturas). Lo que hay que mirar a ojo en Chrome: el relieve del rótulo, la caja en el móvil y el vaho del espejo.
