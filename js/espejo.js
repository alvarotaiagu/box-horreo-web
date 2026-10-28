/* BOX · «Invitada y fiesta» (Limpia el espejo).
   API estable:
     window.BoxEspejo = {
       ir(id)     // muestra la prenda con ese id (de las que llevan "espejo": true); devuelve true/false
       limpiar()  // limpia el espejo entero de una pasada (y lo deja limpio hasta empañar o cambiar de prenda)
       empanar()  // vuelve a empañarlo (devuelve una promesa)
     }
   Se monta solo sobre #invitada cuando BOX.prendas() responde. Sin prendas con espejo, la sección queda con `hidden`.
   Depende de window.BOX (cabeza.html): movimiento, sobria(), prendas(), foto(), srcset(), fotos.
   Salida: el botón «Resérvalo…» lanza document 'box:meter' {id}; si window.BoxCaja no existe a los 300 ms, va a #reservar.
   Modos: con movimiento reducido (`esp--quieta`) o densidad sobria (`esp--sobria`) no hay vaho: foto limpia; la sobria
   añade la lista de todas las prendas en texto. */
(function () {
  'use strict';
  var B = window.BOX || {};
  var raiz = document.getElementById('invitada');
  if (!raiz || window.BoxEspejo) return;
  var html = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var lim = function (x, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, x)); };
  var MOV = B.movimiento !== false;
  var NS = 'http://www.w3.org/2000/svg';

  var prendas = [], ix = 0, montado = false, arrancado = false, imgListo = false;
  var cristal, cv, cx2, cn = null, M, mx, img, srcAvif, srcWebp, voz, btnLimpiar, ayuda, espejo, brilloG, reflejo;
  var W = 0, H = 0, dpr = 1;
  var fogA = null, fogB = null, mezcla = 0, mez = null;
  var energia = false, fijo = false, sucio = false, acc = 0, ultLimp = 0, ultPunto = null, barr = null, refog = null, refogRes = null;
  var vis = false, raf = 0, last = 0, cacheBrocha = null, hintHecho = false, token = 0;
  var anchoVista = window.innerWidth, altoVista = window.innerHeight;

  var azarCon = function (s) { return function () { s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  var sobria = function () { return B.sobria ? B.sobria() : html.classList.contains('densidad-sobria'); };
  var conVaho = function () { return MOV && !sobria(); };

  /* ---------- API ---------- */
  window.BoxEspejo = {
    ir: function (id) {
      if (!montado) return false;
      for (var i = 0; i < prendas.length; i++) if (prendas[i].id === id) { cambia(i); return true; }
      return false;
    },
    limpiar: function () { limpiarTodo(); },
    empanar: function () { return empanarTodo(); }
  };

  /* ---------- carga de datos ---------- */
  (B.prendas ? B.prendas() : Promise.resolve([])).then(function (l) {
    prendas = (l || []).filter(function (p) { return p && p.espejo; });
    if (!prendas.length) { raiz.hidden = true; return; }
    monta();
  }).catch(function () { raiz.hidden = true; });

  /* ---------- montaje ---------- */
  function monta() {
    cristal = $('esp-cristal'); cv = $('esp-vaho'); cx2 = cv.getContext('2d');
    M = document.createElement('canvas'); mx = M.getContext('2d');
    img = $('esp-img'); srcAvif = $('esp-src-avif'); srcWebp = $('esp-src-webp');
    voz = $('esp-voz'); btnLimpiar = $('esp-limpiar'); ayuda = $('esp-ayuda'); espejo = $('esp-espejo');
    brilloG = $('esp-brillo'); reflejo = raiz.querySelector('.esp-reflejo');

    construyeMinis(); construyeLista();
    montado = true;
    actualiza(false);
    aplicaModo();

    $('esp-prev').addEventListener('click', function () { cambia(ix - 1); });
    $('esp-next').addEventListener('click', function () { cambia(ix + 1); });
    $('esp-res').addEventListener('click', function () { reservar(prendas[ix].id); });
    btnLimpiar.addEventListener('click', function () { if (fijo) empanarTodo(); else limpiarTodo(); });

    // teclado: flechas para cambiar de prenda; Intro/Espacio sobre el espejo lo limpia o lo empaña
    $('esp-pieza').addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); cambia(ix - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); cambia(ix + 1); }
      else if ((e.key === 'Enter' || e.key === ' ') && t === espejo) { e.preventDefault(); if (fijo) empanarTodo(); else limpiarTodo(); }
    });

    // gestos: ratón/lápiz con pointer events; el dedo con eventos táctiles pasivos (así el scroll vertical sigue libre
    // y se limpia con el movimiento del dedo aunque la página se desplace un poco)
    cv.addEventListener('pointerenter', function () { ultPunto = null; });
    cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; punto(e.clientX, e.clientY); });
    ['pointerleave', 'pointercancel', 'pointerup'].forEach(function (n) { cv.addEventListener(n, function () { ultPunto = null; }); });
    cv.addEventListener('touchstart', function (e) { ultPunto = null; var t = e.touches[0]; if (t) punto(t.clientX, t.clientY); }, { passive: true });
    cv.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) punto(t.clientX, t.clientY); }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (n) { cv.addEventListener(n, function () { ultPunto = null; }, { passive: true }); });

    // brillo del marco y reflejo del cristal siguen al cursor
    espejo.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !conVaho() || !vis) return;
      var r = espejo.getBoundingClientRect();
      brillo(-24 + (e.clientX - r.left) / r.width * 448, -64 + (e.clientY - r.top) / r.height * 660);
    });
    brillo(120, 120);

    // cuándo mirar: se carga la primera foto al acercarse; se pausa fuera de pantalla
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) { arranca(); } }, { rootMargin: '600px 0px' }).observe(raiz);
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) { pide(); sugiere(); } }, { threshold: .05 }).observe(raiz);
    } else { vis = true; arranca(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pide(); });

    window.addEventListener('resize', function () {
      if (window.innerWidth === anchoVista && Math.abs(window.innerHeight - altoVista) < 160) return;
      anchoVista = window.innerWidth; altoVista = window.innerHeight; rehaz();
    });
    if ('ResizeObserver' in window) new ResizeObserver(rehaz).observe(cristal);
    if ('MutationObserver' in window) new MutationObserver(aplicaModo).observe(html, { attributes: true, attributeFilter: ['class'] });
  }

  function construyeMinis() {
    var ul = $('esp-minis');
    prendas.forEach(function (p, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'esp-mini'; b.setAttribute('aria-label', p.nombre + ', ' + p.categoria);
      var pic = document.createElement('picture'), s = document.createElement('source'), im = document.createElement('img');
      s.type = 'image/webp'; s.srcset = B.foto ? B.foto(p.foto, 120, 'webp') : ''; s.sizes = '46px';
      im.src = B.foto ? B.foto(p.foto, 120, 'jpg') : ''; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      var f = B.fotos && B.fotos[p.foto]; if (f) { im.width = f.ancho; im.height = f.alto; }
      im.style.objectPosition = p.enfoque || '50% 40%';
      pic.appendChild(s); pic.appendChild(im); b.appendChild(pic); li.appendChild(b); ul.appendChild(li);
      b.addEventListener('click', function () { cambia(i); });
    });
  }

  function textoPrecio(p) { return p.precio && p.precio.ahora ? p.precio.ahora + (p.precio.antes ? ', antes ' + p.precio.antes : '') : 'Precio en tienda'; }

  function construyeLista() {
    var cont = $('esp-lista-grupos'), grupos = [], mapa = {};
    prendas.forEach(function (p, i) {
      var c = p.categoria || 'Otras';
      if (!mapa[c]) { mapa[c] = { n: c, l: [] }; grupos.push(mapa[c]); }
      mapa[c].l.push(i);
    });
    grupos.forEach(function (g) {
      var d = document.createElement('div'), h = document.createElement('h4'), ul = document.createElement('ul');
      d.className = 'esp-lista-g'; h.textContent = g.n; ul.setAttribute('role', 'list');
      g.l.forEach(function (i) {
        var p = prendas[i], li = document.createElement('li'), nom = document.createElement('span'), meta = document.createElement('span'), acc = document.createElement('span');
        li.setAttribute('data-esp-i', i);
        nom.className = 'esp-fila-nom'; nom.textContent = p.nombre;
        meta.className = 'esp-fila-meta';
        meta.textContent = [p.marca, textoPrecio(p), p.aviso].filter(Boolean).join(' · ');
        acc.className = 'esp-fila-acc';
        var ver = document.createElement('button'), res = document.createElement('button');
        ver.type = res.type = 'button';
        ver.textContent = 'Verla en el espejo'; ver.setAttribute('aria-label', 'Ver en el espejo: ' + p.nombre);
        res.className = 'esp-fila-res'; res.textContent = 'Resérvalo'; res.setAttribute('aria-label', 'Resérvalo para probártelo: ' + p.nombre);
        ver.addEventListener('click', function () {
          cambia(i);
          try { espejo.scrollIntoView({ block: 'center', behavior: MOV ? 'smooth' : 'auto' }); } catch (e) { espejo.scrollIntoView(); }
        });
        res.addEventListener('click', function () { reservar(p.id); });
        acc.appendChild(ver); acc.appendChild(res);
        li.appendChild(nom); li.appendChild(meta); li.appendChild(acc); ul.appendChild(li);
      });
      d.appendChild(h); d.appendChild(ul); cont.appendChild(d);
    });
  }

  /* ---------- texto de la prenda ---------- */
  function actualiza(anuncia) {
    var p = prendas[ix], n = prendas.length;
    $('esp-cuenta').textContent = p.categoria + ' · ' + (ix + 1) + ' / ' + n;
    $('esp-nombre').textContent = p.nombre;
    var m = $('esp-marca'); m.textContent = p.marca || ''; m.hidden = !p.marca;
    $('esp-txt').textContent = p.texto || '';
    var pr = $('esp-precio'); pr.textContent = '';
    if (p.precio && p.precio.ahora) {
      pr.appendChild(document.createTextNode(p.precio.ahora));
      if (p.precio.antes) { var s = document.createElement('s'); s.textContent = 'antes ' + p.precio.antes; pr.appendChild(s); }
    } else pr.textContent = 'Precio en tienda';
    var av = $('esp-aviso'); av.textContent = p.aviso || ''; av.hidden = !p.aviso;
    $('esp-prev').disabled = $('esp-next').disabled = n < 2;
    var bs = $('esp-minis').querySelectorAll('.esp-mini');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-current', i === ix ? 'true' : 'false');
    var fs = $('esp-lista-grupos').querySelectorAll('li[data-esp-i]');
    for (var j = 0; j < fs.length; j++) { if (+fs[j].getAttribute('data-esp-i') === ix) fs[j].setAttribute('aria-current', 'true'); else fs[j].removeAttribute('aria-current'); }
    if (anuncia) voz.textContent = p.categoria + ', ' + (ix + 1) + ' de ' + n + ': ' + p.nombre + '. ' + textoPrecio(p) + '.';
  }

  function reservar(id) {
    try { document.dispatchEvent(new CustomEvent('box:meter', { detail: { id: id } })); } catch (e) {}
    setTimeout(function () { if (!window.BoxCaja) { location.hash = '#reservar'; } }, 300);
  }

  /* ---------- foto limpia (picture) ---------- */
  function ponFoto(p) {
    return new Promise(function (res) {
      var hecho = false, fin = function () { if (!hecho) { hecho = true; res(); } };
      var sz = '(max-width: 760px) 50vw, 240px';
      img.onload = fin; img.onerror = fin;
      img.alt = p.alt || p.nombre;
      img.style.objectPosition = p.enfoque || '50% 40%';
      var f = B.fotos && B.fotos[p.foto]; if (f) { img.width = f.ancho; img.height = f.alto; }
      if (B.srcset) {
        srcAvif.sizes = srcWebp.sizes = img.sizes = sz;
        srcAvif.srcset = B.srcset(p.foto, 'avif'); srcWebp.srcset = B.srcset(p.foto, 'webp'); img.srcset = B.srcset(p.foto, 'jpg');
      }
      img.loading = 'eager';
      img.src = B.foto ? B.foto(p.foto, 800, 'jpg') : '';
      if (img.decode) img.decode().then(fin, fin);
      setTimeout(fin, 8000);
    }).then(function () { imgListo = !!img.naturalWidth; });
  }

  /* ---------- el vaho ---------- */
  function lienzo(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function enfoque(p) { var a = (p.enfoque || '50% 40%').split(/\s+/); return [lim(parseFloat(a[0]) / 100 || .5), lim(parseFloat(a[1]) / 100 || .4)]; }
  function cubre(c, im, w, h, fx, fy) {
    var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s;
    c.drawImage(im, (im.naturalWidth - sw) * fx, (im.naturalHeight - sh) * fy, sw, sh, 0, 0, w, h);
  }
  function desenfoca(im, w, h, fx, fy) {      // reducción y ampliación por pasos: sirve en cualquier navegador
    var c = lienzo(w, h); cubre(c.getContext('2d'), im, w, h, fx, fy);
    var cw = w, ch = h, n, q;
    while (cw > w / 9) { n = lienzo(Math.ceil(cw / 2), Math.ceil(ch / 2)); q = n.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(c, 0, 0, n.width, n.height); c = n; cw = n.width; ch = n.height; }
    while (cw < w) { n = lienzo(Math.min(w, cw * 2), Math.min(h, ch * 2)); q = n.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(c, 0, 0, n.width, n.height); c = n; cw = n.width; ch = n.height; }
    return c;
  }
  function crearVaho(p, seed) {
    var fc = enfoque(p), f = lienzo(W, H), q = f.getContext('2d'), R = azarCon(seed * 977 + 13), i;
    q.drawImage(desenfoca(img, W, H, fc[0], fc[1]), 0, 0, W, H);
    q.fillStyle = 'rgba(238,228,242,.46)'; q.fillRect(0, 0, W, H);
    var g = q.createRadialGradient(W * .5, H * .4, 0, W * .5, H * .45, H * .72);
    g.addColorStop(0, 'rgba(255,250,255,.2)'); g.addColorStop(1, 'rgba(206,192,220,.2)'); q.fillStyle = g; q.fillRect(0, 0, W, H);
    var granos = Math.round(2600 * lim(W * H / (450 * 700), .35, 1.2));
    for (i = 0; i < granos; i++) { q.fillStyle = 'rgba(255,255,255,' + (.04 + R() * .12).toFixed(3) + ')'; q.beginPath(); q.arc(R() * W, R() * H, (.4 + R()) * dpr, 0, 6.283); q.fill(); }
    q.lineCap = 'round';
    for (i = 0; i < 11; i++) {                // regueros
      var x = R() * W, y0 = R() * H * .6, len = (.12 + R() * .3) * H;
      q.strokeStyle = 'rgba(255,255,255,' + (.14 + R() * .12).toFixed(2) + ')'; q.lineWidth = (1.1 + R() * 1.8) * dpr;
      q.beginPath(); q.moveTo(x, y0); q.bezierCurveTo(x + (R() - .5) * 8 * dpr, y0 + len * .4, x + (R() - .5) * 10 * dpr, y0 + len * .7, x + (R() - .5) * 6 * dpr, y0 + len); q.stroke();
    }
    for (i = 0; i < 48; i++) {                 // gotas
      var gx = R() * W, gy = R() * H, r = (1.8 + R() * R() * 6) * dpr;
      q.fillStyle = 'rgba(255,255,255,.2)'; q.beginPath(); q.arc(gx, gy, r, 0, 6.283); q.fill();
      q.strokeStyle = 'rgba(70,50,95,.28)'; q.lineWidth = .9 * dpr; q.beginPath(); q.arc(gx, gy, r, .2, 2.9); q.stroke();
      q.fillStyle = 'rgba(255,255,255,.75)'; q.beginPath(); q.arc(gx - r * .3, gy - r * .35, r * .28, 0, 6.283); q.fill();
    }
    return f;
  }
  function medir(force) {
    var r = cristal.getBoundingClientRect();
    if (r.width < 2) return false;
    var movil = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 760;
    dpr = Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 2);
    var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (w === W && h === H && !force) return false;
    var snap = null;
    if (W && energia) { snap = lienzo(W, H); snap.getContext('2d').drawImage(M, 0, 0); }
    W = w; H = h; cv.width = M.width = w; cv.height = M.height = h; cacheBrocha = null;
    if (snap) mx.drawImage(snap, 0, 0, w, h);
    return true;
  }
  function recomponer() {
    cx2.globalCompositeOperation = 'source-over'; cx2.globalAlpha = 1; cx2.clearRect(0, 0, W, H);
    if (fogA) cx2.drawImage(fogA, 0, 0);
    if (fogB && mezcla > 0) { cx2.globalAlpha = mezcla; cx2.drawImage(fogB, 0, 0); cx2.globalAlpha = 1; }
    cx2.globalCompositeOperation = 'destination-out'; cx2.drawImage(M, 0, 0); cx2.globalCompositeOperation = 'source-over';
  }
  function limpiaMascara() { mx.clearRect(0, 0, W, H); energia = false; sucio = true; }
  // construye el vaho de la prenda actual y lo deja puesto
  function pintaTodo() {
    if (!imgListo || !W) return;
    fogA = crearVaho(prendas[ix], ix + 1); fogB = null; mezcla = 0; mez = null;
    limpiaMascara(); recomponer(); sucio = false;
    cristal.classList.remove('esp--cargando');
  }
  function brocha() {
    var r = Math.round(W * .115);
    if (cacheBrocha && cacheBrocha.r === r) return cacheBrocha;
    var c = lienzo(r * 2, r * 2), q = c.getContext('2d'), g = q.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.9)'); g.addColorStop(.8, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = g; q.fillRect(0, 0, r * 2, r * 2); return (cacheBrocha = { r: r, c: c });
  }
  function sello(x, y) { var b = brocha(); mx.drawImage(b.c, x - b.r, y - b.r); }
  function trazo(x, y) {
    var b = brocha(), paso = b.r * .28;
    if (ultPunto) {
      var dx = x - ultPunto.x, dy = y - ultPunto.y, d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / paso));
      for (var i = 1; i <= n; i++) sello(ultPunto.x + dx * i / n, ultPunto.y + dy * i / n);
    } else sello(x, y);
    ultPunto = { x: x, y: y }; ultLimp = performance.now(); energia = true; sucio = true; pide();
  }
  // un punto de cliente → trazo en el cristal (se mide en cada evento: vale aunque la página se desplace)
  function punto(cx, cy) {
    if (!conVaho() || !W || !fogA) return;
    var r = cv.getBoundingClientRect();
    if (cx < r.left - 30 || cx > r.right + 30 || cy < r.top - 30 || cy > r.bottom + 30) { ultPunto = null; return; }
    trazo((cx - r.left) / r.width * W, (cy - r.top) / r.height * H);
  }
  function pide() { if (conVaho() && vis && !document.hidden && !raf && arrancado) { last = 0; raf = requestAnimationFrame(bucle); } }
  function bucle(t) {
    raf = 0;
    if (!vis || document.hidden || !conVaho()) return;
    var dt = Math.min(200, last ? t - last : 16); last = t;
    var sigue = false;
    if (barr) {
      if (!barr.t0) barr.t0 = t;
      var u = lim((t - barr.t0) / barr.dur), pt = barr.ruta(u);
      trazo(pt.x * W, pt.y * H);
      if (u >= 1) { barr = null; ultPunto = null; } else sigue = true;
    }
    if (refog) {                                  // el vaho vuelve deprisa antes de cambiar de prenda
      sigue = true; acc += dt;
      if (acc >= 40) { mx.globalCompositeOperation = 'destination-out'; mx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(.75, acc / 40)).toFixed(4) + ')'; mx.fillRect(0, 0, W, H); mx.globalCompositeOperation = 'source-over'; acc = 0; sucio = true; }
      if (t - refog.t0 > 450) { limpiaMascara(); refog = null; var rr = refogRes; refogRes = null; if (rr) rr(); sigue = false; }
    } else if (energia && !fijo) {                // y vuelve despacio si se deja
      sigue = true; acc += dt;
      if (acc >= 90) { mx.globalCompositeOperation = 'destination-out'; mx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(.97, acc / 90)).toFixed(4) + ')'; mx.fillRect(0, 0, W, H); mx.globalCompositeOperation = 'source-over'; acc = 0; sucio = true; }
      if (!barr && performance.now() - ultLimp > 14000) { limpiaMascara(); sigue = false; }
    }
    if (mez) {
      var k = lim((t - mez.t0) / mez.dur); mezcla = k; sucio = true;
      if (k >= 1) { fogA = fogB; fogB = null; mezcla = 0; mez = null; } else sigue = true;
    }
    if (sucio) { recomponer(); sucio = false; }
    if (sigue) raf = requestAnimationFrame(bucle);
  }

  /* rutas de la mano */
  function rutaBarrido(u) {
    var filas = 6, s = u * filas, r = Math.min(filas - 1, Math.floor(s)), f = s - r, h = Math.min(f / .85, 1), v = Math.max((f - .85) / .15, 0);
    var y0 = .1 + .8 * r / (filas - 1), y1 = .1 + .8 * Math.min(r + 1, filas - 1) / (filas - 1);
    return { x: r % 2 === 0 ? .06 + .88 * h : .94 - .88 * h, y: y0 + (y1 - y0) * (f > .85 ? v * v * (3 - 2 * v) : 0) };
  }
  function rutaAviso(u) { return { x: .16 + .68 * u, y: .56 + .1 * Math.sin(u * 6.283) }; }
  function lanza(ruta, dur) { ultPunto = null; barr = { ruta: ruta, dur: dur, t0: 0 }; pide(); }

  // un primer trazo de aviso, una sola vez, cuando la sección se ve
  function sugiere() {
    if (hintHecho || !arrancado || !fogA || !conVaho() || energia) return;
    hintHecho = true;
    setTimeout(function () {
      if (vis && !energia && !barr && conVaho() && fogA) lanza(rutaAviso, 1500); else hintHecho = false;
    }, 500);
  }

  function limpiarTodo() {
    if (!montado || !arrancado || !conVaho() || !fogA) return;
    fijo = true; hintHecho = true; lanza(rutaBarrido, 1500); actualizaBoton();
    voz.textContent = 'Espejo limpio: ' + prendas[ix].nombre + '.';
  }
  function empanarTodo() {
    fijo = false; actualizaBoton();
    if (!montado || !conVaho()) return Promise.resolve();
    barr = null; ultPunto = null;
    return refogar().then(function () { voz.textContent = 'Espejo empañado.'; });
  }
  function refogar() {
    return new Promise(function (res) {
      if (refogRes) { var v = refogRes; refogRes = null; v(); }
      if (!energia) { res(); return; }
      if (!vis || document.hidden || !conVaho()) { limpiaMascara(); recomponer(); res(); return; }
      barr = null; refog = { t0: performance.now() }; refogRes = res; acc = 0; pide();
    });
  }
  function actualizaBoton() { if (btnLimpiar) btnLimpiar.textContent = fijo ? 'Volver a empañar' : 'Limpiar el espejo'; }

  /* ---------- cambiar de prenda ---------- */
  function cambia(i) {
    var n = prendas.length; i = ((i % n) + n) % n;
    if (i === ix && imgListo) return;
    ix = i; fijo = false; actualizaBoton(); actualiza(true);
    var mi = ++token, p = prendas[ix];
    if (!arrancado) return;                       // la primera foto aún no se ha pedido: arranca() cargará la elegida
    if (!conVaho()) { ponFoto(p); return; }
    refogar().then(function () {
      if (mi !== token) return;
      return ponFoto(p).then(function () {
        if (mi !== token || !conVaho()) return;
        if (!W) medir(true);
        if (!fogA) { pintaTodo(); }
        else {
          fogB = crearVaho(p, ix + 1); mezcla = 0; mez = { t0: performance.now(), dur: 450 }; limpiaMascara(); sucio = true; pide();
          if (!raf) { fogA = fogB; fogB = null; mez = null; recomponer(); }
        }
        brilloPulso();
      });
    });
  }

  /* ---------- brillo del marco ---------- */
  function brillo(x, y) {
    if (!brilloG) return;
    brilloG.setAttribute('cx', x.toFixed(1)); brilloG.setAttribute('cy', y.toFixed(1));
    if (reflejo) reflejo.style.setProperty('--rx', lim((x + 24) / 448).toFixed(3));
  }
  function brilloPulso() {
    if (!conVaho() || !vis) return;
    var t0 = performance.now();
    (function f(now) {
      if (!vis || document.hidden) return;
      var u = lim((now - t0) / 1000), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      brillo(-20 + 440 * e, 40 + 380 * e); if (u < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ---------- arranque y modos ---------- */
  function arranca() {
    if (arrancado || !montado) return;
    arrancado = true;
    var mi = ++token;
    ponFoto(prendas[ix]).then(function () {
      if (mi !== token) return;
      if (conVaho()) { medir(true); pintaTodo(); sugiere(); }
      else cristal.classList.remove('esp--cargando');
      pide();
    });
  }
  var sobAntes = null;
  function aplicaModo() {
    var sob = sobria();
    if (sob === sobAntes) return;               // la clase de <html> cambia por otros motivos: solo importa la densidad
    sobAntes = sob;
    raiz.classList.toggle('esp--sobria', sob);
    raiz.classList.toggle('esp--quieta', !MOV);
    $('esp-lista').hidden = !sob;
    if (!conVaho()) {
      barr = null; ultPunto = null; fijo = false; energia = false; refog = null;
      if (refogRes) { var v = refogRes; refogRes = null; v(); }
      mez = null; fogB = null; mezcla = 0;
      if (arrancado && imgListo) cristal.classList.remove('esp--cargando');
    } else if (arrancado && imgListo) {
      medir(true); pintaTodo(); pide();
    }
    actualizaBoton();
  }
  function rehaz() {
    if (!montado || !arrancado || !conVaho() || !imgListo) return;
    if (medir()) {
      fogA = crearVaho(prendas[ix], ix + 1); fogB = null; mezcla = 0; mez = null; recomponer(); sucio = false;
    }
  }
})();
