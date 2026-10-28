/* BOX · «Prepárame una caja» (sección #reservar). Simulado: no guarda nada (sin localStorage ni cookies).

   API estable
   -----------
   window.BoxCaja = {
     meter(id),   // añade la prenda a la caja (máx. 3; si ya hay 3 avisa por aria-live y no la mete),
                  // abre el paso 1 si estaba en otro y hace scroll a #reservar (instantáneo sin movimiento)
     sacar(id),   // saca la prenda de la caja
     ids(),       // copia del array de ids que lleva la caja
     vaciar()     // saca todo y vuelve al paso 1
   }
   Escucha en document:   'box:meter'  con detail.id  (hace lo mismo que BoxCaja.meter)
   Lanza en document:     'box:caja'   con detail.ids (cada vez que cambia el contenido)
   Se monta sola sobre #reservar cuando BOX.prendas() responde. Lo que se llame antes de eso, queda en cola. */
(function () {
  'use strict';

  var MAX = 3;
  var ORDEN = ['Diario', 'Trabajo', 'Punto', 'Abrigo', 'Invitada', 'Fiesta'];
  var TALLAS = ['XS', 'S', 'M', 'L', 'XL'];            // SUPUESTO: BOX no ha publicado sus tallas
  var EASE = 'cubic-bezier(.16, 1, .3, 1)';
  // Horario SUPUESTO (no está publicado), en minutos desde las 00:00
  var TRAMOS = { 1: [[600, 810], [1020, 1230]], 2: [[600, 810], [1020, 1230]], 3: [[600, 810], [1020, 1230]], 4: [[600, 810], [1020, 1230]], 5: [[600, 810], [1020, 1230]], 6: [[600, 840]] };
  var ESPECIALES = { '12-24': [[600, 840]] };           // BOX dice que el 24 de diciembre cierran «a las 2»
  // Festivos supuestos (mm-dd): nacionales y de Galicia; Semana Santa y locales sin añadir
  var FESTIVOS = { '01-01': 'Año Nuevo', '01-06': 'Reyes', '05-01': 'Día del Trabajo', '05-17': 'Día das Letras Galegas', '07-25': 'Santiago Apóstol', '08-15': 'Asunción', '10-12': 'Fiesta Nacional', '11-01': 'Todos los Santos', '12-06': 'Constitución', '12-08': 'Inmaculada', '12-25': 'Navidad' };

  var B = window.BOX || {};
  var cola = [];
  var listo = false;
  var motor = null;

  var API = window.BoxCaja = {
    meter: function (id) { if (listo) motor.meter(id); else cola.push(id); },
    sacar: function (id) { if (listo) motor.sacar(id); },
    ids: function () { return listo ? motor.ids.slice() : []; },
    vaciar: function () { if (listo) motor.vaciar(); else cola.length = 0; }
  };
  document.addEventListener('box:meter', function (e) { if (e && e.detail && e.detail.id) API.meter(e.detail.id); });

  var raiz = document.getElementById('reservar');
  if (!raiz || !document.getElementById('caja-bandeja')) return;
  if (!B.prendas) { try { console.warn('caja.js: falta window.BOX'); } catch (e) {} return; }

  var $ = function (id) { return document.getElementById(id); };
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var anchoVista = innerWidth, altoVista = innerHeight;

  B.prendas().then(function (lista) {
    iniciar(lista || []);
  });

  function iniciar(datos) {
    var porId = {};
    datos.forEach(function (p) { porId[p.id] = p; });

    var ids = [];
    var tallas = {};
    var paso = 1;
    var filtro = 'Todo';
    var vista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    var dia = null, hora = null;
    var cerrando = false;

    var vivo = $('caja-vivo'), bandeja = $('caja-bandeja'), slots = $('caja-slots');
    var cuenta = $('caja-cuenta'), lista = $('caja-lista'), btnSig = $('caja-sig');
    var obj = $('caja-obj'), solI = $('caja-si'), solD = $('caja-sd');
    var rejilla = $('caja-rejilla'), pasos = $('caja-pasos').children;
    var cards = {};

    var anima = function () { return B.movimiento !== false && !(B.sobria && B.sobria()); };
    var plural = function (n) { return n === 1 ? '1 prenda' : n + ' prendas'; };
    var avisa = function (t) {
      vivo.textContent = '';
      setTimeout(function () { vivo.textContent = t; }, 40);
    };
    var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    var hhmm = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    var fmtMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
    var fmtSem = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
    var fmtNomMes = new Intl.DateTimeFormat('es-ES', { month: 'long' });
    var fmtCorto = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    var diaLargo = function (d) { return fmtSem.format(d) + ' ' + d.getDate() + ' de ' + fmtNomMes.format(d); };
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var mmdd = function (d) { return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var unir = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; };
    var nombreTalla = function (p) { var t = tallas[p.id]; return t && TALLAS.indexOf(t) > -1 ? p.nombre + ' (talla ' + t + ')' : p.nombre; };

    /* ---------- fotos ---------- */
    function foto(p, sizes, eager) {
      var pic = document.createElement('picture');
      ['avif', 'webp'].forEach(function (ext) {
        var ss = B.srcset ? B.srcset(p.foto, ext) : '';
        if (!ss) return;
        var s = document.createElement('source'); s.type = 'image/' + ext; s.srcset = ss; s.sizes = sizes; pic.appendChild(s);
      });
      var img = document.createElement('img');
      var ss = B.srcset ? B.srcset(p.foto, 'jpg') : '';
      if (ss) { img.srcset = ss; img.sizes = sizes; }
      img.src = B.foto ? B.foto(p.foto, 480, 'jpg') : '';
      img.alt = '';
      img.decoding = 'async';
      if (!eager) img.loading = 'lazy';
      if (p.enfoque) img.style.objectPosition = p.enfoque;
      pic.appendChild(img);
      return pic;
    }

    /* ---------- paso 1: catálogo ---------- */
    function construirFiltros() {
      var cont = $('caja-filtros');
      var hay = {};
      datos.forEach(function (p) { hay[p.categoria] = true; });
      var cats = ['Todo'].concat(ORDEN.filter(function (c) { return hay[c]; }));
      Object.keys(hay).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });
      cats.forEach(function (c) {
        var b = el('button', 'caja-chip', c);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(c === filtro));
        b.addEventListener('click', function () {
          filtro = c;
          Array.prototype.forEach.call(cont.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          aplicarFiltro();
          avisa(c === 'Todo' ? 'Mostrando todas las prendas' : 'Mostrando ' + c);
        });
        cont.appendChild(b);
      });
    }
    function construirRejilla() {
      rejilla.textContent = '';
      datos.forEach(function (p) {
        var li = el('li', 'caja-item');
        var b = el('button', 'caja-card');
        b.type = 'button';
        b.dataset.id = p.id;
        b.setAttribute('aria-pressed', 'false');
        var f = el('span', 'caja-foto');
        f.appendChild(foto(p, '(min-width: 900px) 200px, 46vw'));
        b.appendChild(f);
        b.appendChild(el('span', 'caja-nom', p.nombre));
        b.appendChild(el('span', 'caja-meta', (p.marca ? p.marca + ' · ' : '') + p.categoria));
        var pr = el('span', 'caja-precio');
        if (p.precio && p.precio.ahora) {
          var ah = el('b', 'caja-ahora', p.precio.ahora);
          pr.appendChild(ah);
          if (p.precio.antes) {
            pr.appendChild(document.createTextNode(' '));
            pr.appendChild(el('span', 'sr', 'antes '));
            pr.appendChild(el('s', 'caja-antes', p.precio.antes));
          }
        } else pr.textContent = 'Precio en tienda';
        b.appendChild(pr);
        if (p.aviso) b.appendChild(el('span', 'caja-aviso', p.aviso));
        b.addEventListener('click', function () {
          if (ids.indexOf(p.id) > -1) quitar(p.id, { desde: 'card' }); else poner(p.id, { desde: 'card' });
        });
        li.appendChild(b);
        li.dataset.cat = p.categoria;
        rejilla.appendChild(li);
        cards[p.id] = b;
      });
      aplicarFiltro();
    }
    function aplicarFiltro() {
      Array.prototype.forEach.call(rejilla.children, function (li) { li.hidden = !(filtro === 'Todo' || li.dataset.cat === filtro); });
    }
    function marcarCards() {
      Object.keys(cards).forEach(function (id) { cards[id].setAttribute('aria-pressed', String(ids.indexOf(id) > -1)); });
    }

    /* ---------- la caja (bandeja) ---------- */
    function pintarBandeja(nuevoId) {
      slots.textContent = '';
      for (var i = 0; i < MAX; i++) {
        var p = porId[ids[i]];
        if (!p) { slots.appendChild(el('span', 'caja-hueco')); continue; }
        var b = el('button', 'caja-pieza');
        b.type = 'button';
        b.dataset.id = p.id;
        b.setAttribute('aria-label', 'Sacar ' + p.nombre + ' de la caja');
        b.appendChild(foto(p, '(min-width: 900px) 110px, 52px', true));
        b.appendChild(el('span', 'caja-x', '×'));
        b.addEventListener('click', (function (id) { return function () { quitar(id, { desde: 'bandeja' }); }; })(p.id));
        slots.appendChild(b);
        if (nuevoId === p.id && anima() && b.animate) {
          b.animate([{ transform: 'translateY(-150%) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 520, easing: EASE });
        }
      }
      lista.textContent = '';
      ids.forEach(function (id) {
        var p = porId[id];
        var li = el('li', 'caja-fila');
        li.appendChild(el('span', 'caja-fila-nom', p.nombre));
        var x = el('button', 'caja-fila-x', 'Sacar');
        x.type = 'button';
        x.setAttribute('aria-label', 'Sacar ' + p.nombre + ' de la caja');
        x.addEventListener('click', function () { quitar(id, { desde: 'bandeja' }); });
        li.appendChild(x);
        lista.appendChild(li);
      });
      var n = ids.length, cerrada = paso >= 3;
      cuenta.textContent = n ? (cerrada ? 'Caja cerrada · ' + plural(n) : n + ' de ' + MAX + ' prendas') : 'Tu caja está vacía';
      slots.toggleAttribute('inert', cerrada);
      lista.toggleAttribute('inert', cerrada);
      bandeja.classList.toggle('caja-cerrada', cerrada);
      botonBandeja();
    }
    function botonBandeja() {
      var n = ids.length;
      if (paso === 1) { btnSig.textContent = 'Continuar'; btnSig.disabled = !n; btnSig.hidden = false; }
      else if (paso === 2) { btnSig.textContent = 'Cerrar la caja'; btnSig.disabled = !n || cerrando; btnSig.hidden = false; }
      else { btnSig.textContent = 'Abrir la caja'; btnSig.disabled = false; btnSig.hidden = false; btnSig.classList.add('btn--hueco'); }
      if (paso < 3) btnSig.classList.remove('btn--hueco');
    }
    function cambio() {
      marcarCards();
      try { document.dispatchEvent(new CustomEvent('box:caja', { detail: { ids: ids.slice() } })); } catch (e) {}
    }

    /* animación de las dos solapas (las dos mitades de la O del logo) */
    function solapas(cerrar, animar) {
      var clase = 'caja-cerrada';
      bandeja.classList.toggle(clase, cerrar);
      if (!(animar && anima() && solI.animate)) return Promise.resolve();
      var de = cerrar ? 'scaleX(.07)' : 'scaleX(1)', a = cerrar ? 'scaleX(1)' : 'scaleX(.07)';
      var ops = { duration: 720, easing: EASE, fill: 'backwards' };
      var a1 = solI.animate([{ transform: de }, { transform: a }], ops);
      var a2 = solD.animate([{ transform: de }, { transform: a }], Object.assign({ delay: 70 }, ops));
      return Promise.all([a1.finished, a2.finished]).then(function () {
        if (cerrar && obj.animate) obj.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
      }).catch(function () {});
    }

    /* ---------- meter y sacar ---------- */
    function poner(id, o) {
      o = o || {};
      var p = porId[id];
      if (!p) return false;
      if (ids.indexOf(id) > -1) { avisa(p.nombre + ' ya está en la caja. Tienes ' + plural(ids.length) + ' en la caja'); return false; }
      if (ids.length >= MAX) { avisa('La caja ya lleva tres prendas. Saca una para meter ' + p.nombre + '.'); return false; }
      ids.push(id);
      pintarBandeja(id);
      avisa(p.nombre + ' dentro. Tienes ' + plural(ids.length) + ' en la caja');
      cambio();
      return true;
    }
    function quitar(id, o) {
      var i = ids.indexOf(id);
      if (i < 0 || paso >= 3) return;
      ids.splice(i, 1);
      pintarBandeja();
      var p = porId[id];
      avisa('Has sacado ' + (p ? p.nombre : 'la prenda') + '. ' + (ids.length ? 'Tienes ' + plural(ids.length) + ' en la caja' : 'La caja está vacía'));
      cambio();
      if (!ids.length && paso === 2) irPaso(1, {});
      if (o && o.desde === 'bandeja') {
        var sig = slots.querySelector('.caja-pieza') || lista.querySelector('button');
        (sig || cuenta).focus({ preventScroll: true });
      }
    }
    function vaciar() {
      ids = []; tallas = {};
      if (paso !== 1) irPaso(1, { quieto: true });
      pintarBandeja();
      avisa('Has vaciado la caja');
      cambio();
    }
    function irAReservar() {
      var tope = raiz.getBoundingClientRect().top;
      if (tope > 8 && tope < innerHeight * 0.5) return;
      raiz.scrollIntoView({ behavior: B.movimiento === false ? 'auto' : 'smooth', block: 'start' });
    }

    /* ---------- pasos ---------- */
    function irPaso(n, o) {
      o = o || {};
      var antes = paso;
      paso = n;
      for (var i = 1; i <= 4; i++) $('caja-p' + i).hidden = i !== n;
      Array.prototype.forEach.call(pasos, function (li, i) {
        li.classList.toggle('hecho', i + 1 < n);
        if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      var estabaCerrada = antes >= 3, cierra = n >= 3;
      if (estabaCerrada !== cierra && !o.sinSolapas) solapas(cierra, true);
      if (n === 2) pintarTallas();
      if (n === 3) pintarCal();
      if (n === 4) pintarResumen();
      pintarBandeja();
      if (n === 4) $('caja-msg').textContent = '';
      if (!o.quieto) {
        var t = $('caja-t' + n);
        t.focus({ preventScroll: true });
        var r = t.getBoundingClientRect();
        if (r.top < 70 || r.top > innerHeight * 0.55) {
          var pasoEl = $('caja-p' + n);
          pasoEl.scrollIntoView({ behavior: B.movimiento === false ? 'auto' : 'smooth', block: 'start' });
        }
      }
    }

    function pintarTallas() {
      var ul = $('caja-tallas');
      ul.textContent = '';
      ids.forEach(function (id) {
        var p = porId[id];
        var li = el('li', 'caja-talla');
        var mini = el('span', 'caja-talla-foto');
        mini.appendChild(foto(p, '64px', true));
        li.appendChild(mini);
        var txt = el('div', 'caja-talla-txt');
        var lab = el('label', 'caja-talla-nom', p.nombre);
        lab.setAttribute('for', 'caja-talla-' + id);
        txt.appendChild(lab);
        if (p.aviso) txt.appendChild(el('span', 'caja-aviso', p.aviso));
        li.appendChild(txt);
        var s = document.createElement('select');
        s.id = 'caja-talla-' + id;
        s.className = 'caja-select';
        [['', 'Aún no lo sé'], ['XS', 'XS'], ['S', 'S'], ['M', 'M'], ['L', 'L'], ['XL', 'XL'], ['otra', 'Otra (la digo en la tienda)']].forEach(function (par) {
          var o = document.createElement('option'); o.value = par[0]; o.textContent = par[1]; s.appendChild(o);
        });
        s.value = tallas[id] || '';
        s.addEventListener('change', function () { tallas[id] = s.value; });
        li.appendChild(s);
        ul.appendChild(li);
      });
    }

    /* ---------- calendario (horario supuesto, ocupación inventada pero estable) ---------- */
    var azar = function (d, s) {
      var h = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate() + s * 7919;
      h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^ (h >>> 16)) >>> 0) % 100;
    };
    var semilla = function () { var s = 0, t = ids.slice().sort().join(','); for (var i = 0; i < t.length; i++) s += t.charCodeAt(i); return s % 97 + 1; };
    function huecos(d) {
      var k = mmdd(d);
      if (FESTIVOS[k]) return [];
      var tr = ESPECIALES[k] || TRAMOS[d.getDay()];
      if (!tr) return [];
      var ahora = new Date(), esHoy = d.getTime() === hoy.getTime(), sal = semilla(), out = [];
      tr.forEach(function (t) {
        for (var m = t[0]; m + 30 <= t[1]; m += 30) {
          if (esHoy && m <= ahora.getHours() * 60 + ahora.getMinutes() + 60) continue;
          if (azar(new Date(d.getTime() + m * 6e4), sal) < 45) continue;   // ocupado (inventado)
          out.push(m);
        }
      });
      return out;
    }
    function pintarCal() {
      if (dia && (dia < hoy || !huecos(dia).length)) { dia = null; hora = null; }
      if (dia && hora != null && huecos(dia).indexOf(hora) < 0) hora = null;
      $('caja-mes').textContent = cap(fmtMes.format(vista));
      $('caja-ant').disabled = vista <= new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      $('caja-sig-mes').disabled = vista >= new Date(hoy.getFullYear(), hoy.getMonth() + 2, 1);
      var cal = $('caja-cal');
      cal.textContent = '';
      ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].forEach(function (n) { var s = el('span', 'caja-dsem', n); s.setAttribute('aria-hidden', 'true'); cal.appendChild(s); });
      var pre = (vista.getDay() + 6) % 7;
      for (var i = 0; i < pre; i++) cal.appendChild(el('span', 'caja-vacio'));
      var fin = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
      for (var n = 1; n <= fin; n++) {
        var d = new Date(vista.getFullYear(), vista.getMonth(), n), b = el('button', 'caja-d', String(n));
        b.type = 'button';
        var libres = d < hoy ? 0 : huecos(d).length, fest = FESTIVOS[mmdd(d)];
        b.disabled = !libres;
        b.setAttribute('aria-label', diaLargo(d) + (fest ? ', ' + fest + ', cerrado' : libres ? ', ' + (libres === 1 ? '1 hora libre' : libres + ' horas libres') : ', cerrado o completo'));
        if (fest) b.title = fest;
        var sel = dia && d.getTime() === dia.getTime();
        b.setAttribute('aria-pressed', String(!!sel));
        if (libres && libres <= 3) b.classList.add('caja-pocas');
        b.addEventListener('click', (function (dd) { return function () { dia = dd; hora = null; pintarCal(); var h = $('caja-horas').querySelector('button'); if (h) h.focus({ preventScroll: true }); }; })(d));
        cal.appendChild(b);
      }
      var horasEl = $('caja-horas');
      horasEl.textContent = '';
      $('caja-dia').textContent = dia ? cap(diaLargo(dia)) : 'Elige un día';
      if (dia) huecos(dia).forEach(function (m) {
        var b = el('button', 'caja-h', hhmm(m));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(hora === m));
        b.addEventListener('click', function () { hora = m; pintarCal(); var s = $('caja-p3-sig'); if (s) s.focus({ preventScroll: true }); avisa(cap(diaLargo(dia)) + ' a las ' + hhmm(m)); });
        horasEl.appendChild(b);
      });
      $('caja-p3-sig').disabled = !(dia && hora != null);
      pintarProximos();
    }
    function pintarProximos() {
      var cont = $('caja-prox');
      cont.textContent = '';
      var vistos = 0;
      for (var k = 0; k < 21 && vistos < 6; k++) {
        var d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + k), h = huecos(d);
        if (!h.length) continue;
        vistos++;
        var b = el('button', 'caja-pr', cap(fmtCorto.format(d).replace(/\./g, '')) + ' · ' + hhmm(h[0]));
        b.type = 'button';
        b.addEventListener('click', (function (dd, mm) { return function () { dia = dd; hora = mm; vista = new Date(dd.getFullYear(), dd.getMonth(), 1); pintarCal(); }; })(d, h[0]));
        cont.appendChild(b);
      }
    }

    /* ---------- resumen y WhatsApp ---------- */
    function pintarResumen() {
      var dd = $('caja-res-prendas');
      dd.textContent = '';
      var ul = el('ul', 'caja-res-lista');
      ids.forEach(function (id) { ul.appendChild(el('li', '', nombreTalla(porId[id]))); });
      dd.appendChild(ul);
      $('caja-res-dia').textContent = dia ? cap(diaLargo(dia)) : '—';
      $('caja-res-hora').textContent = hora != null ? hhmm(hora) : '—';
    }
    function mensaje() {
      var nom = $('caja-nombre').value.replace(/\s+/g, ' ').trim();
      var nombres = ids.map(function (id) { return nombreTalla(porId[id]); });
      return 'Hola' + (nom ? ', soy ' + nom : '') + ', ¿me preparáis una caja con ' + unir(nombres) + ' para probármela el ' + diaLargo(dia) + ' a las ' + hhmm(hora) + '? Gracias.';
    }
    function escribir() {
      var nombres = ids.map(function (id) { return porId[id].nombre; });
      var t = 'Hola, quería preguntaros algo sobre probarme ropa en la tienda' + (nombres.length ? ' (he mirado ' + unir(nombres) + ')' : '') + '.';
      if (B.whatsapp) B.whatsapp(t);
    }

    /* ---------- cableado ---------- */
    construirFiltros();
    construirRejilla();
    pintarBandeja();

    btnSig.addEventListener('click', function () {
      if (paso === 1 && ids.length) irPaso(2, {});
      else if (paso === 2) cerrar();
      else if (paso >= 3) irPaso(1, {});
    });
    $('caja-p2-atras').addEventListener('click', function () { irPaso(1, {}); });
    $('caja-cerrar').addEventListener('click', cerrar);
    $('caja-p3-atras').addEventListener('click', function () { irPaso(2, {}); avisa('Caja abierta otra vez'); });
    $('caja-p3-sig').addEventListener('click', function () { if (dia && hora != null) irPaso(4, {}); });
    $('caja-p4-atras').addEventListener('click', function () { irPaso(3, {}); });
    $('caja-ant').addEventListener('click', function () { vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1); pintarCal(); });
    $('caja-sig-mes').addEventListener('click', function () { vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1); pintarCal(); });
    $('caja-wa').addEventListener('click', function () {
      if (!ids.length || !dia || hora == null) return;
      var ok = B.whatsapp ? B.whatsapp(mensaje()) : false;
      $('caja-msg').textContent = ok
        ? 'Se abre WhatsApp con tu mensaje. Simulación: aquí no se ha enviado ni guardado nada.'
        : 'Simulación: no se ha enviado nada. Cuando BOX tenga WhatsApp, aquí se abrirá con tu mensaje ya escrito.';
    });
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-escribe]'), function (b) { b.addEventListener('click', escribir); });

    function cerrar() {
      if (cerrando || !ids.length) return;
      cerrando = true;
      botonBandeja();
      avisa('Cerrando la caja…');
      var fin = function () {
        cerrando = false;
        irPaso(3, { sinSolapas: true });
        avisa('Caja cerrada con ' + plural(ids.length) + '. Elige día y hora para probártela.');
      };
      if (anima() && solI.animate) {
        // cierra las solapas y, al acabar, pasa al calendario
        bandeja.classList.add('caja-cerrada');
        var ops = { duration: 720, easing: EASE, fill: 'backwards' };
        var a1 = solI.animate([{ transform: 'scaleX(.07)' }, { transform: 'scaleX(1)' }], ops);
        var a2 = solD.animate([{ transform: 'scaleX(.07)' }, { transform: 'scaleX(1)' }], Object.assign({ delay: 70 }, ops));
        Promise.all([a1.finished, a2.finished]).then(function () {
          if (obj.animate) obj.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
          fin();
        }).catch(fin);
      } else fin();
    }

    // la densidad puede cambiar en vivo: la CSS oculta lo que sobra; aquí se refrescan las piezas
    try {
      new MutationObserver(function () { pintarBandeja(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}

    // solo el ancho cuenta: la barra del móvil cambia el alto y no hay que rehacer nada
    var medir = function () {
      raiz.style.setProperty('--caja-bandeja-alto', bandeja.offsetHeight + 'px');
    };
    addEventListener('resize', function () {
      if (innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160) return;
      anchoVista = innerWidth; altoVista = innerHeight;
      medir();
    });
    medir();

    motor = {
      get ids() { return ids; },
      meter: function (id) {
        var ya = porId[id];
        if (!ya) return;
        var estaba = paso;
        if (estaba >= 3) { irPaso(1, { quieto: true }); avisa('Caja abierta otra vez'); }
        else if (estaba !== 1) irPaso(1, { quieto: true });
        poner(id, { desde: 'api' });
        irAReservar();
      },
      sacar: function (id) { quitar(id, {}); },
      vaciar: vaciar
    };
    listo = true;
    cola.splice(0).forEach(function (id) { motor.meter(id); });
  }
})();
