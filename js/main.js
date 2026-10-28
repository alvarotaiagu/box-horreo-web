/* BOX · main.js: cortina, cabecera, portada en relieve, novedades por la ranura, rebajas, «pisa y descubre»,
   mapa, cookies, WhatsApp y el mando de maqueta. El espejo (espejo.js) y la caja (caja.js) son módulos aparte;
   se habla con ellos por eventos: 'box:meter' {id} para apartar una prenda, 'box:caja' {ids} cuando cambia la caja. */
(function () {
  'use strict';
  const B = window.BOX, d = document, h = d.documentElement;
  const MOV = B.movimiento;
  const $ = (id) => d.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (padre, t, a) => { const e = d.createElementNS(NS, t); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); padre.appendChild(e); return e; };
  const D = Math.PI / 180, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const EXPO = 'cubic-bezier(.16,1,.3,1)';
  const eOut = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
  const eIO = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const eIn = (k) => k * k * k;
  const lin = (k) => k;
  // tween con promesa; sin movimiento salta al final
  const tw = (dur, fn, ease) => new Promise((res) => {
    if (!MOV || dur <= 0) { fn(1); res(); return; }
    const f = ease || eIO, t0 = performance.now();
    const paso = (t) => { const k = clamp((t - t0) / dur, 0, 1); fn(f(k)); if (k < 1) requestAnimationFrame(paso); else res(); };
    requestAnimationFrame(paso);
  });
  const anima = (el, kf, op) => {
    if (!el) return Promise.resolve();
    if (!MOV) return Promise.resolve();
    return el.animate(kf, Object.assign({ fill: 'forwards', easing: EXPO }, op)).finished.catch(() => {});
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, MOV ? ms : 0));
  const meter = (id) => d.dispatchEvent(new CustomEvent('box:meter', { detail: { id } }));
  const el = (tag, cls, txt) => { const e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const picture = (clave, sizes, alt, lazy) => {
    const f = B.fotos[clave], p = el('picture');
    ['avif', 'webp'].forEach((ext) => { const s = el('source'); s.type = 'image/' + ext; s.srcset = B.srcset(clave, ext); s.sizes = sizes; p.appendChild(s); });
    const i = el('img'); i.src = B.foto(clave, 800); i.srcset = B.srcset(clave, 'jpg'); i.sizes = sizes; i.alt = alt || '';
    if (f) { i.width = f.ancho; i.height = f.alto; }
    if (lazy !== false) i.loading = 'lazy';
    i.decoding = 'async'; p.appendChild(i); return p;
  };
  // la barra del móvil cambia el alto al hacer scroll: eso no es un cambio de tamaño de verdad
  let anchoVista = innerWidth, altoVista = innerHeight;
  const cambioReal = () => {
    if (innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160) return false;
    anchoVista = innerWidth; altoVista = innerHeight; return true;
  };

  // =====================================================================
  //  El rótulo: las 8 piezas del logo 2 (la O es una caja partida en dos solapas)
  // =====================================================================
  const PD = ['M0 0H20V100H0Z', 'M24 0H44Q62 0 62 18V28Q62 46 44 46H24Z', 'M24 50H46Q66 50 66 70V80Q66 100 46 100H24Z',
    'M111 0H90Q76 0 76 14V86Q76 100 90 100H111Z', 'M115 0H136Q150 0 150 14V86Q150 100 136 100H115Z',
    'M165 0H193L245 100H217Z', 'M231 0H245L225.2 30H211.2Z', 'M184.8 70H198.8L179 100H165Z'];
  const mk = (g, fill, lista) => (lista || PD).map((dd) => svgEl(g, 'path', { d: dd, fill }));
  // translate + escala en x alrededor de ox (las solapas se abren contra su borde de fuera)
  const trf = (e, x, y, s, ox) => { s = s == null ? 1 : s; e.setAttribute('transform', `translate(${(x + (ox || 0) * (1 - s)).toFixed(2)} ${y.toFixed(2)})` + (s !== 1 ? ` scale(${s.toFixed(3)} 1)` : '')); };
  // luz: azimut + elevación para el relieve y desplazamiento de las capas de sombra
  const motorLuz = (luzEl, difEl, grupos, extra) => (ang, alt) => {
    ang = ((ang % 360) + 360) % 360;
    luzEl.setAttribute('azimuth', ang.toFixed(1)); luzEl.setAttribute('elevation', alt.toFixed(1));
    difEl.setAttribute('diffuseConstant', (1 / Math.sin(alt * D)).toFixed(3));
    const len = clamp(6 / Math.tan(alt * D), 2.5, 13), sx = -Math.cos(ang * D) * len, sy = -Math.sin(ang * D) * len;
    grupos.forEach(([g, k]) => g && g.setAttribute('transform', `translate(${(sx * k).toFixed(2)} ${(sy * k).toFixed(2)})`));
    if (extra) extra(sx, sy);
  };
  // posición de la luz (-1..1) → ángulo y altura: lejos del centro, luz más rasante
  const polar = (x, y) => { const r = Math.min(1, Math.hypot(x, y)); return [Math.atan2(y, x) / D, lerp(56, 22, Math.pow(r, .8))]; };
  const sombras = (gS, gC) => { gS.setAttribute('filter', 'url(#som-b)'); gC.setAttribute('filter', 'url(#som-n)'); gS.setAttribute('fill', '#5B4630'); gS.setAttribute('fill-opacity', '.30'); gC.setAttribute('fill', '#3A2A18'); gC.setAttribute('fill-opacity', '.34'); };
  const aplicaLuz = motorLuz($('rel-luz'), $('rel-dif'), [[$('rot-soms'), 1], [$('rot-somc'), .3]]);

  // =====================================================================
  //  Portada: el rótulo en relieve; la ropa solo se ve por los cortes
  // =====================================================================
  const portada = $('portada'), rot = $('rot');
  const cu = mk($('rot-cuerpos'), '#F8F5F0'), sS = mk($('rot-soms'), null), sC = mk($('rot-somc'), null), mm = mk($('rot-mascp'), '#000');
  sombras($('rot-soms'), $('rot-somc'));
  const PORT = [cu, sS, sC, mm];
  const pon = (SET, i, x, y, s, ox) => SET.forEach((a) => trf(a[i], x, y, s, ox));
  const imgs = [];
  [['rot-cb', 'f22', -4, 74], ['rot-co', 'f0', 72, 84], ['rot-cx', 'f6', 162, 88]].forEach(([cl, clave, x, w]) => {
    const g = svgEl($('rot-fotos'), 'g', { 'clip-path': `url(#${cl})` });
    imgs.push(svgEl(g, 'image', { href: B.foto(clave, 480, 'webp'), x, y: -6, width: w, height: 112, preserveAspectRatio: 'xMidYMid slice' }));
  });
  // huecos entre piezas (unidades del rótulo): reposo + lo que se abren cerca del cursor o del dedo
  const GB = { B: 2.6, Bh: 1.6, O: 4.5, X1: 3, X2: 3 }, GM = { B: 15, Bh: 7, O: 24, X1: 17, X2: 17 };
  const CEN = { B: [22, 50], Bh: [45, 48], O: [113, 50], X1: [221, 16], X2: [185, 85] };
  const KS = Object.keys(GB), G = Object.assign({}, GB);
  const colocaGaps = () => {
    pon(PORT, 0, -G.B / 2, 0); pon(PORT, 1, G.B / 2, -G.Bh / 2); pon(PORT, 2, G.B / 2, G.Bh / 2);
    pon(PORT, 3, -G.O / 2, 0); pon(PORT, 4, G.O / 2, 0); pon(PORT, 5, 0, 0);
    pon(PORT, 6, G.X1 * .55, -G.X1 * .83); pon(PORT, 7, -G.X2 * .55, G.X2 * .83);
  };
  const LZ = { x: -.55, y: -.65 }, LT = { x: -.55, y: -.65 }, CU = { x: -999, y: -999 };
  let ultimo = -1e9, visible = false, cortinando = false, raf = 0, calidadBaja = false, tPrev = 0, dts = [];
  const pintaLuz = () => {
    const [a, al] = polar(LZ.x, LZ.y); aplicaLuz(a, al);
    portada.style.setProperty('--lx', (50 + LZ.x * 42).toFixed(1) + '%'); portada.style.setProperty('--ly', (34 + LZ.y * 42).toFixed(1) + '%');
  };
  const frame = (now) => {
    raf = 0; if (!visible || cortinando || d.hidden || B.sobria()) { tPrev = 0; return; }
    // bajada de calidad automática: si el móvil no llega (media de 40 fotogramas > 32 ms), la luz se queda quieta
    if (tPrev) { dts.push(now - tPrev); if (dts.length > 40) dts.shift(); if (dts.length === 40 && dts.reduce((s, v) => s + v, 0) / 40 > 32) { calidadBaja = true; h.classList.add('calidad-baja'); return; } }
    tPrev = now;
    const activo = now - ultimo < 2600;
    if (!activo) { LT.x = -.5 + .42 * Math.sin(now * .00042); LT.y = -.62 + .26 * Math.cos(now * .00031); }
    LZ.x = lerp(LZ.x, LT.x, .07); LZ.y = lerp(LZ.y, LT.y, .07);
    pintaLuz();
    KS.forEach((k, j) => {
      let pr;
      if (activo) { const dd = Math.hypot(CU.x - CEN[k][0], CU.y - CEN[k][1]); pr = Math.pow(clamp(1 - dd / 58, 0, 1), 1.3); }
      else pr = Math.pow(Math.max(0, Math.sin(now * .0006 + j * 1.26)), 4) * .85;
      G[k] = lerp(G[k], GB[k] + GM[k] * pr, .1);
    });
    colocaGaps();
    imgs.forEach((im) => im.setAttribute('transform', `translate(${(-LZ.x * 1.6).toFixed(2)} ${(-LZ.y * 1.6).toFixed(2)})`));
    raf = requestAnimationFrame(frame);
  };
  const arranca = () => { if (!raf && visible && !cortinando && MOV && !calidadBaja && !d.hidden) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) arranca(); }, { threshold: .05 }).observe(portada);
  d.addEventListener('visibilitychange', arranca);
  if (MOV) {
    // gesto propio de la portada: la luz y las ranuras siguen al cursor o al dedo (deslizar en horizontal sobre el rótulo)
    const mueve = (e) => {
      const r = portada.getBoundingClientRect(), rr = rot.getBoundingClientRect();
      LT.x = clamp(((e.clientX - r.left) / r.width - .5) * 2.1, -1, 1); LT.y = clamp(((e.clientY - r.top) / r.height - .5) * 2.1 - .1, -1, 1);
      CU.x = (e.clientX - rr.left) / rr.width * 245; CU.y = (e.clientY - rr.top) / rr.height * 100;
      ultimo = performance.now(); arranca();
    };
    portada.addEventListener('pointermove', mueve); portada.addEventListener('pointerdown', mueve);
    portada.addEventListener('pointerleave', () => { ultimo = -1e9; });
  }
  colocaGaps(); pintaLuz();

  // la portada entra cuando la cortina EMPIEZA a irse; el rótulo no se anima aquí: llega volando desde la cortina
  const entraPortada = () => {
    if (!MOV) return;
    anima($('cab'), [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: 250, fill: 'both' });
    portada.querySelectorAll('.ln > *').forEach((l, i) => anima(l, [{ transform: 'translateY(112%)' }, { transform: 'none' }], { duration: 1300, delay: 200 + i * 140, fill: 'both' }));
    portada.querySelectorAll('.portada__der > *').forEach((e, i) => anima(e, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: 450 + i * 140, fill: 'both' }));
    anima(portada.querySelector('.portada__pie'), [{ opacity: 0 }, { opacity: 1 }], { duration: 1000, delay: 800, easing: 'ease-out', fill: 'both' });
  };
  B.alAbrirse(entraPortada);

  // =====================================================================
  //  Cortina: las piezas llegan, la luz barre, la caja de la O abre sus solapas y enseña la prenda,
  //  se cierra hasta dejar la ranura y el rótulo vuela a su sitio en la portada.
  //  Rendimiento: cada pieza es una capa con el relieve pintado UNA vez (luz fija, la de reposo de la portada);
  //  todo lo que se mueve es transform u opacity, así que lo hace la tarjeta gráfica sin repintar el filtro.
  // =====================================================================
  (function cortina() {
    const cort = $('cortina');
    if (!cort || !MOV || B.cortinaFuera) { h.classList.add('rot-listo'); B.retirarCortina(); return; }
    B.cortinaEnMarcha = true;
    clearTimeout(window.__redCortina);
    window.__redCortina = setTimeout(() => { h.classList.add('rot-listo'); B.retirarCortina(); }, 7000);
    const cRot = $('cort-rot'), cPared = $('cort-pared'), haz = $('cort-haz'), cPie = $('cort-pie'), cFoto = $('cort-foto'), cImg = $('cort-img');
    // mismo tamaño que el rótulo de la portada: el vuelo final es solo un desplazamiento (sin reescalar la capa)
    const ancho = rot.getBoundingClientRect().width;
    if (ancho > 40) cRot.style.width = ancho + 'px';
    cImg.src = B.foto('f0', 800, 'webp');
    // filtro de relieve fijo para la cortina (el de la portada, #rel, lo mueve su bucle de luz)
    const [aR, alR] = polar(LZ.x, LZ.y);
    const fC = $('rel').cloneNode(true); fC.id = 'rel-c';
    const fLuz = fC.querySelector('feDistantLight'), fDif = fC.querySelector('feDiffuseLighting');
    fLuz.removeAttribute('id'); fDif.removeAttribute('id');
    fLuz.setAttribute('azimuth', (((aR % 360) + 360) % 360).toFixed(1)); fLuz.setAttribute('elevation', alR.toFixed(1));
    fDif.setAttribute('diffuseConstant', (1 / Math.sin(alR * D)).toFixed(3));
    $('rel').parentNode.appendChild(fC);
    const sombraDe = (ang, alt) => { const len = clamp(6 / Math.tan(alt * D), 2.5, 13); return [-Math.cos(ang * D) * len, -Math.sin(ang * D) * len]; };
    const [sxR, syR] = sombraDe(aR, alR), [sx0, sy0] = sombraDe(185, 24);
    // reposo = los huecos de la portada en calma (GB), para que el aterrizaje case con su rótulo
    const REST = [[-GB.B / 2, 0], [GB.B / 2, -GB.Bh / 2], [GB.B / 2, GB.Bh / 2], [-GB.O / 2, 0], [GB.O / 2, 0], [0, 0], [GB.X1 * .55, -GB.X1 * .83], [-GB.X2 * .55, GB.X2 * .83]];
    const OFF = [[-150, 10], [-10, -130], [0, 140], [-90, 110], [110, -110], [170, 20], [80, -130], [-100, 130]];
    const OX = [0, 0, 0, 76, 150, 0, 0, 0]; // las solapas se abren contra su borde de fuera
    const capa = (padre, cls) => { const s = d.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 245 100'); s.setAttribute('class', cls); padre.appendChild(s); return s; };
    const piezas = PD.map((dd, i) => {
      const w = el('div', 'cp');
      if (OX[i]) w.style.transformOrigin = (OX[i] / 245 * 100).toFixed(2) + '% 50%';
      const sa = capa(w, 'cp-s'), sc = capa(w, 'cp-s'), cuerpo = capa(w, 'cp-c');
      svgEl(sa, 'path', { d: dd, fill: '#5B4630', 'fill-opacity': '.30', filter: 'url(#som-b)' });
      svgEl(sc, 'path', { d: dd, fill: '#3A2A18', 'fill-opacity': '.34', filter: 'url(#som-n)' });
      svgEl(cuerpo, 'path', { d: dd, fill: '#F8F5F0', filter: 'url(#rel-c)', stroke: 'rgb(91 70 48 / .22)', 'stroke-width': '.45', 'stroke-linejoin': 'round' });
      cRot.appendChild(w);
      return { w, sa, sc };
    });
    cortinando = true;
    let fuera = false;
    const acabar = () => {
      if (fuera) return; fuera = true;
      h.classList.add('rot-listo'); cortinando = false; B.retirarCortina(); arranca();
    };
    // saltarla: un toque o una tecla
    const saltar = () => { if (fuera) return; B.abrir(); h.classList.add('rot-listo'); anima(cort, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' }).then(acabar); };
    cort.addEventListener('pointerdown', saltar, { once: true });
    d.addEventListener('keydown', saltar, { once: true });
    const IO = 'cubic-bezier(.65,0,.35,1)', CURVA = 'cubic-bezier(.45,0,.55,1)';
    (async () => {
      await espera(100);
      const u = cRot.getBoundingClientRect().width / 245; // px por unidad del rótulo
      const t = (i, s) => `translate(${(REST[i][0] * u).toFixed(1)}px, ${(REST[i][1] * u).toFixed(1)}px)` + (s != null ? ` scaleX(${s})` : '');
      // 1. las ocho piezas llegan, cada una desde su lado; la luz barre y sus sombras se mueven con ella
      piezas.forEach((p, i) => {
        p.w.animate([{ transform: `translate(${((REST[i][0] + OFF[i][0]) * u).toFixed(1)}px, ${((REST[i][1] + OFF[i][1]) * u).toFixed(1)}px)`, opacity: 0 }, { opacity: 1, offset: .28 }, { transform: t(i), opacity: 1 }],
          { duration: 1150, delay: i * 85, easing: EXPO, fill: 'both' });
        [[p.sa, 1], [p.sc, .3]].forEach(([s, k]) => s.animate([{ transform: `translate(${(sx0 * k * u).toFixed(1)}px, ${(sy0 * k * u).toFixed(1)}px)` }, { transform: `translate(${(sxR * k * u).toFixed(1)}px, ${(syR * k * u).toFixed(1)}px)` }],
          { duration: 2300, delay: 150, easing: CURVA, fill: 'both' }));
      });
      anima(cPared, [{ backgroundColor: '#E6E0D5' }, { backgroundColor: '#F4F1EC' }], { duration: 2000, delay: 200, easing: CURVA });
      anima(haz, [{ transform: 'translateX(-130%) skewX(-18deg)', opacity: 0 }, { opacity: 1, offset: .18 }, { opacity: 1, offset: .82 }, { transform: 'translateX(250%) skewX(-18deg)', opacity: 0 }], { duration: 1800, delay: 250, easing: CURVA });
      anima(cPie, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: 600, easing: 'ease-out' });
      await espera(1750); if (fuera) return;
      // 2. la caja de la O abre sus dos solapas y enseña la prenda que hay dentro
      anima(cFoto, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'linear' });
      anima(cImg, [{ transform: 'scale(1.12)' }, { transform: 'none' }], { duration: 1400 });
      [3, 4].forEach((i) => piezas[i].w.animate([{ transform: t(i, 1) }, { transform: t(i, .12) }], { duration: 650, easing: IO, fill: 'forwards' }));
      await espera(650 + 280); if (fuera) return;
      // 3. la caja se cierra hasta dejar la ranura y el rótulo vuela a su sitio en la portada; la pared se va y entra la portada
      const r = rot.getBoundingClientRect(), c = cRot.getBoundingClientRect();
      const dx = r.left + r.width / 2 - (c.left + c.width / 2), dy = r.top + r.height / 2 - (c.top + c.height / 2), esc = r.width / c.width;
      B.abrir();
      [3, 4].forEach((i) => piezas[i].w.animate([{ transform: t(i, .12) }, { transform: t(i, 1) }], { duration: 760, easing: IO, fill: 'forwards' }));
      anima(cPie, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'linear' });
      anima(cPared, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 120, easing: 'ease-in-out' });
      await anima(cRot, [{ transform: 'none' }, { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` + (Math.abs(esc - 1) > .01 ? ` scale(${esc.toFixed(3)})` : '') }], { duration: 900, easing: IO });
      if (fuera) return;
      // 4. aterriza: el rótulo de la portada aparece debajo (con la ropa en las ranuras) y la cortina se funde encima
      h.classList.add('rot-listo');
      await anima(cort, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
      acabar();
    })();
  })();

  // =====================================================================
  //  Cabecera: fija con velo al bajar, menú del móvil, sección actual y «Tu caja (n)»
  // =====================================================================
  const cab = $('cab'), menuBtn = $('cab-menu'), menu = $('menu-movil');
  const fija = () => cab.classList.toggle('fija', scrollY > 24 || !menu.hidden);
  addEventListener('scroll', fija, { passive: true }); fija();
  const abreMenu = (si) => {
    menu.hidden = !si; menuBtn.setAttribute('aria-expanded', si ? 'true' : 'false');
    menuBtn.querySelector('.sr').textContent = si ? 'Cerrar el menú' : 'Abrir el menú'; fija();
    if (si) menu.querySelector('a').focus();
  };
  menuBtn.addEventListener('click', () => abreMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) abreMenu(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { abreMenu(false); menuBtn.focus(); } });
  addEventListener('resize', () => { if (cambioReal() && innerWidth >= 900 && !menu.hidden) abreMenu(false); });
  const enlaces = [...d.querySelectorAll('.cab__nav a')];
  const vistas = new Map();
  const ioNav = new IntersectionObserver((es) => {
    es.forEach((e) => vistas.set(e.target.id, e.isIntersecting));
    const act = enlaces.find((a) => vistas.get(a.hash.slice(1)));
    enlaces.forEach((a) => a.setAttribute('aria-current', a === act ? 'true' : 'false'));
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['novedades', 'invitada', 'rebajas', 'tienda'].forEach((id) => $(id) && ioNav.observe($(id)));
  const cuenta = $('cab-cuenta');
  d.addEventListener('box:caja', (e) => {
    const n = (e.detail && e.detail.ids || []).length;
    cuenta.textContent = n; cuenta.hidden = !n;
    cab.querySelector('.cab__caja').setAttribute('aria-label', n ? `Tu caja: ${n} ${n === 1 ? 'prenda' : 'prendas'}` : 'Prepárame una caja');
    cuenta.classList.remove('salta'); void cuenta.offsetWidth; if (MOV) cuenta.classList.add('salta');
  });

  // =====================================================================
  //  Novedades: por la ranura (la O-caja con dos solapas), desde datos/prendas.json
  // =====================================================================
  (function ranura() {
    const vis = $('ranura-visor'); if (!vis) return;
    const pImg = $('ranura-img'), info = $('ranura-info'), mini = $('ranura-mini');
    const pS = mk($('ranura-s'), null, PD.slice(3, 5)), pC = mk($('ranura-c'), '#F8F5F0', PD.slice(3, 5));
    const aplicaZ = motorLuz($('reln-luz'), $('reln-dif'), [[$('ranura-s'), 1]], (sx, sy) => { vis.style.setProperty('--px', (sx * 1.1).toFixed(1) + 'px'); vis.style.setProperty('--py', (sy * 1.1).toFixed(1) + 'px'); });
    let L = [], idx = 0, destino = 0, pa = 0, tok = 0, botones = [];
    const puertas = (p) => { pa = p; const s = 1 - .88 * p; trf(pC[0], 0, 0, s, 76); trf(pS[0], 0, 0, s, 76); trf(pC[1], 0, 0, s, 150); trf(pS[1], 0, 0, s, 150); };
    const SIZES = '(max-width: 860px) 260px, 340px';
    const carga = (l) => {
      pImg.srcset = B.srcset(l.foto, 'webp'); pImg.sizes = SIZES; pImg.src = B.foto(l.foto, 800); pImg.alt = l.alt; pImg.style.objectPosition = l.enfoque || '50% 40%';
      return pImg.decode ? Promise.race([pImg.decode().catch(() => {}), new Promise((r) => setTimeout(r, 900))]) : Promise.resolve();
    };
    const pinta = () => {
      const l = L[idx];
      $('ranura-num').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(L.length).padStart(2, '0');
      $('ranura-cat').textContent = l.categoria; $('ranura-tit').textContent = l.nombre; $('ranura-marca').textContent = l.marca || ' '; $('ranura-txt').textContent = l.texto;
      const pr = $('ranura-precio'); pr.textContent = '';
      if (l.precio) { pr.append(el('span', 'ahora', l.precio.ahora), el('s', '', 'antes ' + l.precio.antes)); }
      else pr.appendChild(el('small', '', 'Precio en tienda'));
      if (l.aviso) pr.appendChild(el('span', 'ultima', l.aviso));
      botones.forEach((b, i) => b.setAttribute('aria-pressed', i === idx ? 'true' : 'false'));
      anima(info, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 800 });
    };
    const ir = async (n, forzar) => {
      if (!L.length) return;
      n = destino = ((n % L.length) + L.length) % L.length;
      const t = ++tok, p0 = pa;
      if (n !== idx || forzar) {
        await tw(520 * p0, (k) => { if (t === tok) puertas(lerp(p0, 0, k)); }, eIn);
        if (t !== tok) return;
        idx = n; await carga(L[idx]); if (t !== tok) return; pinta();
      }
      const p1 = pa;
      await tw(1000 * (1.15 - p1), (k) => { if (t === tok) puertas(lerp(p1, 1, k)); }, eOut);
    };
    $('ranura-prev').addEventListener('click', () => ir(destino - 1));
    $('ranura-next').addEventListener('click', () => ir(destino + 1));
    $('ranura-meter').addEventListener('click', () => { if (L[idx]) meter(L[idx].id); });
    vis.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(destino - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); ir(destino + 1); }
    });
    // deslizar: las solapas se cierran con el dedo
    let x0 = null;
    vis.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      x0 = e.clientX; tok++; destino = idx; vis.classList.add('arrastrando');
    });
    const suelta = (e) => {
      if (x0 == null) return;
      const dd = e.clientX - x0; x0 = null; vis.classList.remove('arrastrando');
      if (Math.abs(dd) > 60) ir(destino + (dd < 0 ? 1 : -1)); else ir(destino);
    };
    vis.addEventListener('pointerup', suelta); vis.addEventListener('pointercancel', suelta); vis.addEventListener('pointerleave', suelta);
    // la luz sigue al cursor sobre el visor (o se desliza sola); fuera de pantalla no hay bucle
    const LZp = { x: -.55, y: -.65 }, LTp = { x: -.55, y: -.65 };
    let ultimoZ = -1e9, visibleZ = false, rafZ = 0;
    const pintaZ = () => { const [a, al] = polar(LZp.x, LZp.y); aplicaZ(a, al); vis.style.setProperty('--vx', (50 + LZp.x * 40).toFixed(1) + '%'); vis.style.setProperty('--vy', (40 + LZp.y * 40).toFixed(1) + '%'); };
    const frameZ = (now) => {
      rafZ = 0; if (!visibleZ || d.hidden || calidadBaja) return;
      if (now - ultimoZ > 2600) { LTp.x = -.5 + .45 * Math.sin(now * .0005); LTp.y = -.6 + .28 * Math.cos(now * .00036); }
      LZp.x = lerp(LZp.x, LTp.x, .08); LZp.y = lerp(LZp.y, LTp.y, .08);
      pintaZ(); rafZ = requestAnimationFrame(frameZ);
    };
    const arrancaZ = () => { if (visibleZ && !rafZ && MOV && !d.hidden && !calidadBaja) rafZ = requestAnimationFrame(frameZ); };
    new IntersectionObserver((es) => { visibleZ = es[0].isIntersecting; arrancaZ(); }, { threshold: .05 }).observe(vis);
    d.addEventListener('visibilitychange', arrancaZ);
    vis.addEventListener('pointermove', (e) => {
      if (!MOV) return;
      const r = vis.getBoundingClientRect();
      LTp.x = clamp(((e.clientX - r.left) / r.width - .5) * 2.2, -1, 1); LTp.y = clamp(((e.clientY - r.top) / r.height - .5) * 2.2 - .1, -1, 1); ultimoZ = performance.now();
      if (x0 != null) { const dd = e.clientX - x0; tok++; puertas(1 - clamp(Math.abs(dd) / 170, 0, 1)); }
    });
    puertas(0); pintaZ();

    B.prendas().then((todas) => {
      L = todas.filter((p) => p.novedad && B.fotos[p.foto]);
      if (!L.length) { $('novedades').hidden = true; return; }
      botones = L.map((l, i) => {
        const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `Prenda ${i + 1}: ${l.nombre}`);
        const im = el('img'); im.alt = ''; im.src = B.foto(l.foto, 480, 'webp'); im.loading = 'lazy'; im.style.objectPosition = l.enfoque || '50% 40%'; b.appendChild(im);
        b.addEventListener('click', () => ir(i)); mini.appendChild(b); return b;
      });
      // densidad sobria: todas a la vez
      const rej = $('nov-rejilla');
      L.forEach((l) => {
        const li = el('li'), f = el('div', 'foto'); f.appendChild(picture(l.foto, '(max-width: 699px) 50vw, 240px', l.alt));
        const pr = el('p', 'precio');
        if (l.precio) { pr.append(el('b', '', l.precio.ahora), ' · antes ' + l.precio.antes); } else pr.textContent = 'Precio en tienda';
        const bt = el('button', 'enlace', 'Apártala'); bt.type = 'button'; bt.addEventListener('click', () => meter(l.id));
        li.append(f, el('p', 'cat', l.categoria + (l.marca ? ' · ' + l.marca : '')), el('h3', '', l.nombre), pr, bt); rej.appendChild(li);
      });
      carga(L[0]).then(() => { pinta(); if (!MOV) puertas(1); else new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); if (x0 == null) ir(0, false); } }, { threshold: .45 }).observe(vis); });
    });
  })();

  // =====================================================================
  //  Rebajas: antes y ahora, solo con los precios que BOX ha publicado
  // =====================================================================
  B.prendas().then((todas) => {
    const lista = $('reb-lista'), R = todas.filter((p) => p.precio && p.precio.ahora && B.fotos[p.foto]);
    if (!R.length) { $('rebajas').hidden = true; return; }
    R.forEach((p) => {
      const li = el('li', 'reb__item'), f = el('div', 'reb__foto');
      f.appendChild(picture(p.foto, '(max-width: 599px) 92vw, (max-width: 860px) 200px, 30vw', p.alt));
      if (p.aviso) f.appendChild(el('p', 'reb__aviso', p.aviso));
      const dd = el('div', 'reb__datos');
      if (p.marca) dd.appendChild(el('p', 'reb__marca', p.marca));
      dd.appendChild(el('h3', '', p.nombre));
      const pr = el('p', 'reb__precios'), an = el('span', 'reb__antes', 'antes ' + p.precio.antes);
      an.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M1 9C30 6 62 5 99 4"/></svg>');
      const ah = el('span', 'reb__ahora', p.precio.ahora);
      pr.append(an, ah); dd.appendChild(pr);
      if (p.publicado) dd.appendChild(el('p', 'reb__fecha', 'Publicado en Instagram el ' + p.publicado));
      const bt = el('button', 'btn btn--hueco', 'Apártalo para probártelo'); bt.type = 'button'; bt.addEventListener('click', () => meter(p.id));
      dd.appendChild(bt);
      li.append(f, dd); lista.appendChild(li);
      // el precio de antes se tacha a mano al verlo
      const raya = an.querySelector('path');
      if (MOV) {
        raya.style.strokeDasharray = '1'; raya.style.strokeDashoffset = '1';
        new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); anima(raya, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 650, delay: 250, easing: 'cubic-bezier(.65,0,.35,1)' }); anima(ah, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 700, fill: 'both' }); } }, { threshold: .6 }).observe(pr);
      }
    });
  });

  // =====================================================================
  //  La tienda: «Pisa y descubre» (cada baldosa que pisas gira y enseña su trozo de la tienda)
  // =====================================================================
  (function piso() {
    const cv = $('piso-lienzo'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const COLS = 8, ROWS = 10, N = COLS * ROWS, DUR = 640;
    const RINCONES = [
      { etq: 'Escaparate', foto: 'f162', fy: .5, nom: 'El escaparate azul', txt: 'El marco azul cielo da a la rúa do Hórreo, que es peatonal: desde la calle ya se ve lo que acaba de llegar.' },
      { etq: 'Lámpara', foto: 'tienda', fy: .35, nom: 'La lámpara de araña', txt: 'Pantallas plisadas color ámbar y cristales, sobre los percheros y el suelo de baldosa.' },
      { etq: 'Espejo', foto: 'f125', fy: .45, nom: 'El rincón del espejo', txt: 'Un sofá gris, un espejo dorado y la celosía negra lacada con óvalos: para mirarte con calma.' },
      { etq: 'Celosía', foto: 'f201', fy: .45, nom: 'La celosía y la estantería', txt: 'La celosía negra hace de biombo junto a la estantería de madera con luz dorada.' },
      { etq: 'Estantería', foto: 'f309', fy: .5, nom: 'La estantería de madera', txt: 'Madera clara y luz dorada para lo que va doblado.' },
      { etq: 'Suelo', foto: 'f292', fy: .5, nom: 'El suelo', txt: 'Blanco y negro, hidráulico, de los de antes. Sale en casi todas nuestras fotos.' }
    ];
    const barra = $('piso-barra'), por = $('piso-por'), num = $('piso-num'), chips = $('piso-chips'), ficha = $('piso-ficha'), voz = $('piso-voz');
    let dpr = 1, W = 0, H = 0, ts = 1, suelo0 = null, imagen = null, look = -1, ini = new Float64Array(N).fill(Infinity);
    let pasos = 0, hecho = false, toco = false, enfoque = false, hover = -1, pieC = 3, pieR = 5, vis = false, raf = 0, tk = 0, prev = null, aviso = 0, tFicha = 0;
    const cache = new Map();
    const foto = (i) => {
      if (!cache.has(i)) cache.set(i, (async () => {
        const x = new Image(); x.src = B.foto(RINCONES[i].foto, 800); await x.decode();
        const c = d.createElement('canvas'); c.width = 800; c.height = 1000;
        const r = Math.max(800 / x.naturalWidth, 1000 / x.naturalHeight), sw = 800 / r, sh = 1000 / r;
        c.getContext('2d').drawImage(x, (x.naturalWidth - sw) / 2, (x.naturalHeight - sh) * RINCONES[i].fy, sw, sh, 0, 0, 800, 1000);
        return c;
      })());
      return cache.get(i);
    };
    const dibujaSuelo = async () => {
      const im = new Image(); im.src = 'img/baldosa.svg'; await im.decode();
      const c = d.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').drawImage(im, 0, 0, 256, 256);
      suelo0 = c; pido();
    };
    const medida = () => {
      const w = cv.clientWidth; if (!w) return;
      dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2); W = w; H = w * ROWS / COLS; ts = W / COLS;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); pido();
    };
    const suelo = (x, y, w, hh) => { if (suelo0) ctx.drawImage(suelo0, x, y, w, hh); else { ctx.fillStyle = '#F6F4EF'; ctx.fillRect(x, y, w, hh); } };
    const trozo = (c, r, x, y, w, hh) => {
      if (imagen) ctx.drawImage(imagen, c * imagen.width / COLS, r * imagen.height / ROWS, imagen.width / COLS, imagen.height / ROWS, x, y, w + .5, hh + .5);
      else suelo(x, y, w, hh);
    };
    const marco = (i, col, lw, pie) => {
      const x = (i % COLS) * ts, y = ((i / COLS) | 0) * ts;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeRect(x + lw / 2, y + lw / 2, ts - lw, ts - lw);
      if (pie) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + ts * .42, y + ts * .5, ts * .1, ts * .2, -.15, 0, 7); ctx.ellipse(x + ts * .62, y + ts * .5, ts * .1, ts * .2, .15, 0, 7); ctx.fill(); }
      ctx.restore();
    };
    const pista = (x, y, a) => {
      ctx.save(); ctx.font = '700 ' + Math.max(11, ts * .2) + 'px "Hanken Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const t = 'Pisa aquí', w = ctx.measureText(t).width + 18, hh = Math.max(22, ts * .3);
      ctx.fillStyle = '#141414'; ctx.globalAlpha = .55 + a * .45; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + ts / 2 - w / 2, y + ts / 2 - hh / 2, w, hh, 3); else ctx.rect(x + ts / 2 - w / 2, y + ts / 2 - hh / 2, w, hh);
      ctx.fill(); ctx.fillStyle = '#F6F4EF'; ctx.globalAlpha = 1; ctx.fillText(t, x + ts / 2, y + ts / 2 + 1); ctx.restore();
    };
    const dibujar = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const giran = [];
      for (let i = 0; i < N; i++) {
        const c = i % COLS, r = (i / COLS) | 0, x = c * ts, y = r * ts, e = (now - ini[i]) / DUR;
        if (!(e > 0)) { suelo(x, y, ts, ts); ctx.strokeStyle = 'rgba(58,58,58,.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, ts - 1, ts - 1); }
        else if (e >= 1) trozo(c, r, x, y, ts, ts);
        else giran.push(i);
      }
      giran.forEach((i) => {
        const c = i % COLS, r = (i / COLS) | 0, p = eIO((now - ini[i]) / DUR), lev = 1 + .14 * Math.sin(p * Math.PI), hh = ts * lev, y = r * ts - (hh - ts) / 2;
        ctx.save(); ctx.shadowColor = 'rgba(20,20,20,.38)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
        if (p < .5) { const w = ts * lev * (1 - 2 * p); suelo(c * ts + (ts - w) / 2, y, w, hh); }
        else { const w = ts * lev * (2 * p - 1); trozo(c, r, c * ts + (ts - w) / 2, y, w, hh); }
        ctx.restore();
      });
      if (!toco && MOV) { const x = 3 * ts, y = 5 * ts, a = .55 + .45 * Math.sin(now / 320); ctx.strokeStyle = 'rgba(111,168,220,' + a + ')'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4); pista(x, y, a); }
      if (hover >= 0 && ini[hover] === Infinity) marco(hover, '#6FA8DC', 3);
      if (enfoque) marco(pieR * COLS + pieC, '#2F6496', 4, true);
    };
    const sigue = (now) => { if (!MOV) return false; if (!toco) return true; for (let i = 0; i < N; i++) if (isFinite(ini[i]) && now - ini[i] < DUR) return true; return false; };
    const frame = (now) => { raf = 0; dibujar(now); if (vis && !d.hidden && sigue(now)) raf = requestAnimationFrame(frame); };
    const pido = () => { if (!raf && vis) raf = requestAnimationFrame(frame); };
    const anuncia = (t) => { clearTimeout(aviso); aviso = setTimeout(() => { voz.textContent = t; }, 250); };
    const marcador = () => { const pct = hecho ? 100 : Math.round(pasos / N * 100); barra.style.width = pct + '%'; por.textContent = pct + ' % descubierto'; };
    const muestra = () => {
      const R = RINCONES[look]; $('piso-nom').textContent = R.nom; $('piso-txt').textContent = R.txt; ficha.dataset.on = '1';
      anuncia('Descubierto: ' + R.nom + '. ' + R.txt);
    };
    const completar = (desde, rapido) => {
      if (hecho) return; hecho = true; toco = true;
      const now = performance.now(), dc = desde % COLS, dr = (desde / COLS) | 0; let fin = now;
      for (let i = 0; i < N; i++) if (ini[i] === Infinity) {
        if (!MOV || rapido) ini[i] = -1e9;
        else { const dd = Math.hypot((i % COLS) - dc, ((i / COLS) | 0) - dr); ini[i] = now + 150 + dd * 75; }
      }
      for (let i = 0; i < N; i++) if (isFinite(ini[i]) && ini[i] > -1e8) fin = Math.max(fin, ini[i] + DUR);
      marcador(); pido();
      const tt = ++tFicha; setTimeout(() => { if (tt === tFicha) muestra(); }, MOV ? fin - now + 100 : 0);
    };
    const pisar = (i, now) => {
      if (i < 0 || i >= N || ini[i] !== Infinity) return;
      toco = true;
      if (!MOV) { completar(i, true); return; }
      ini[i] = now; pasos++;
      if (pasos / N >= .55) completar(i); else marcador();
      pido();
    };
    const ponLook = async (k) => {
      const t = tk = tk + 1; look = k; ini = new Float64Array(N).fill(Infinity); pasos = 0; hecho = false; toco = false; tFicha++; imagen = null;
      ficha.dataset.on = '0'; marcador();
      num.textContent = 'Rincón ' + (k + 1) + ' de ' + RINCONES.length;
      chips.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', i === k ? 'true' : 'false'));
      anuncia('Rincón ' + (k + 1) + ': ' + RINCONES[k].etq + '. Pisa el suelo para descubrirlo.');
      pido();
      try { const c = await foto(k); if (t === tk) { imagen = c; pido(); } } catch (e) { /* sin foto: se queda el suelo */ }
    };
    RINCONES.forEach((l, i) => { const b = el('button', '', l.etq); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => ponLook(i)); chips.appendChild(b); });
    $('piso-otro').addEventListener('click', () => ponLook((look + 1) % RINCONES.length));
    $('piso-todo').addEventListener('click', () => completar(pieR * COLS + pieC, false));
    // dedo y ratón: se interpola el trayecto para no dejarse baldosas
    const punto = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * COLS, y: (e.clientY - r.top) / r.height * ROWS }; };
    const idxDe = (p) => (p.x < 0 || p.y < 0 || p.x >= COLS || p.y >= ROWS) ? -1 : (Math.floor(p.y) * COLS + Math.floor(p.x));
    const recorre = (p, now) => {
      const a = prev || p, n = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / .4));
      for (let s = 1; s <= n; s++) pisar(idxDe({ x: a.x + (p.x - a.x) * s / n, y: a.y + (p.y - a.y) * s / n }), now);
      prev = p;
    };
    cv.addEventListener('pointermove', (e) => { const p = punto(e); hover = e.pointerType === 'mouse' ? idxDe(p) : -1; enfoque = false; recorre(p, performance.now()); pido(); });
    cv.addEventListener('pointerdown', (e) => { const p = punto(e); prev = null; hover = e.pointerType === 'mouse' ? idxDe(p) : -1; recorre(p, performance.now()); pido(); });
    cv.addEventListener('pointerleave', () => { hover = -1; prev = null; pido(); });
    cv.addEventListener('pointerup', () => { prev = null; });
    cv.addEventListener('focus', () => { if (cv.matches(':focus-visible')) { enfoque = true; pido(); } });
    cv.addEventListener('blur', () => { enfoque = false; pido(); });
    cv.addEventListener('keydown', (e) => {
      let dc = 0, dr = 0; const k = e.key;
      if (k === 'ArrowLeft') dc = -1; else if (k === 'ArrowRight') dc = 1; else if (k === 'ArrowUp') dr = -1; else if (k === 'ArrowDown') dr = 1;
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); enfoque = true; pisar(pieR * COLS + pieC, performance.now()); pido(); return; }
      else return;
      e.preventDefault(); enfoque = true; pieC = clamp(pieC + dc, 0, COLS - 1); pieR = clamp(pieR + dr, 0, ROWS - 1); pido();
    });
    let iniciada = false;
    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (vis) { if (!iniciada) { iniciada = true; dibujaSuelo().catch(() => {}); ponLook(0); } pido(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '200px 0px', threshold: .01 }).observe(cv);
    d.addEventListener('visibilitychange', pido);
    let anchoCv = 0;
    new ResizeObserver(() => { if (cv.clientWidth !== anchoCv) { anchoCv = cv.clientWidth; medida(); } }).observe(cv);
  })();

  // =====================================================================
  //  Mapa (solo si se pide), WhatsApp, cookies, titulares, pie y mando de maqueta
  // =====================================================================
  const mapaBtn = $('mapa-btn');
  if (mapaBtn) mapaBtn.addEventListener('click', () => {
    const f = el('iframe'); f.title = 'Mapa: rúa do Hórreo, Carballo'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = 'https://www.google.com/maps?q=R%C3%BAa%20do%20H%C3%B3rreo%2C%20Carballo&z=17&output=embed';
    const m = $('mapa'); m.querySelector('.mapa__aviso').remove(); m.appendChild(f);
  });

  d.addEventListener('click', (e) => { const b = e.target.closest('[data-wa]'); if (b) B.whatsapp(b.dataset.wa); });
  // el botón flotante de WhatsApp se aparta mientras se ve la caja: tapaba su barra y ella ya lleva su enlace
  const secCaja = $('reservar');
  if (secCaja) new IntersectionObserver((es) => h.classList.toggle('en-caja', es[0].isIntersecting), { rootMargin: '0px 0px -12% 0px' }).observe(secCaja);

  const CLAVE = 'box-cookies-vistas', ck = $('cookies');
  let vistas0 = false; try { vistas0 = localStorage.getItem(CLAVE) === '1'; } catch (e) {}
  if (!vistas0) { ck.hidden = false; h.classList.add('con-cookies'); }
  $('cookies-ok').addEventListener('click', () => { try { localStorage.setItem(CLAVE, '1'); } catch (e) {} ck.hidden = true; h.classList.remove('con-cookies'); });

  // titulares: se observa el padre (el propio elemento desplazado puede no avisar)
  if (MOV) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target.querySelectorAll(':scope > .rev').forEach((r) => r.classList.add('visto')); } }), { rootMargin: '0px 0px -12% 0px' });
    new Set([...d.querySelectorAll('.rev')].map((r) => r.parentElement)).forEach((p) => io.observe(p));
    const pie = $('pie');
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); pie.classList.add('visto'); } }, { threshold: .15 }).observe(pie);
  }

  // MANDO DE MAQUETA (no viaja al cliente): solo con ?revision
  const mando = $('mando');
  if (h.classList.contains('revision') && mando) {
    mando.hidden = false;
    const pinta = () => mando.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === B.sobria())));
    mando.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      h.classList.toggle('densidad-sobria', b.dataset.densidad === 'sobria');
      try { const u = new URL(location.href); if (B.sobria()) u.searchParams.set('densidad', 'sobria'); else u.searchParams.delete('densidad'); history.replaceState(null, '', u); } catch (er) {}
      pinta(); arranca();
    });
    pinta();
  }
})();
