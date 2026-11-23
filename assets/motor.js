/* explica-visual · motor
   Lee window.CONCEPTO (ver references/motor-api.md) y monta:
   escena isométrica, partículas, pasos con narración, tour automático,
   intensidad del puntero, tema claro/oscuro, panel de juego y glosario. */
(() => {
  'use strict';
  const C = window.CONCEPTO;
  if (!C) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">Falta window.CONCEPTO.</p>'); return; }

  const NS = 'http://www.w3.org/2000/svg';
  const COS = Math.cos(Math.PI / 6), SIN = 0.5;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const svg = $('escena');

  function el(tag, attrs, padre) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(n);
    return n;
  }
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  // ---- Proyección isométrica -------------------------------------------
  // pos: [u, v] = desplazamiento en pantalla del centro de la base (u → derecha, v → abajo).
  // Se convierte a coordenadas isométricas (x, y) para que las cajas se vean en 3D.
  function uvAiso(u, v) { return [u / (2 * COS) + v, -u / (2 * COS) + v]; }
  function iso(x, y, z) { return [(x - y) * COS, (x + y) * SIN - (z || 0)]; }

  // ---- Estado ------------------------------------------------------------
  const nodos = {};      // id → { def, g, lift, forma, x, y, h, centro, ancla, medidor(), ... }
  const enlaces = {};    // id → { def, g, path }
  const particulas = [];
  const efectos = [];
  const temporizadores = [];
  const valores = {};
  const contadores = {};
  let paso = 0, reproduciendo = false, tiempoPaso = 0, intensidad = 0.6;
  let puntero = null, punteroVirtual = null, seleccionado = null, tourIdx = 0, tourT = 0;
  let ambito = 'global';

  // ---- Capas ---------------------------------------------------------------
  const raiz = el('g', { class: 'raiz' }, svg);
  const capaPlanos = el('g', {}, raiz);
  const capaEnlaces = el('g', {}, raiz);
  const capaNodos = el('g', {}, raiz);
  const capaParticulas = el('g', { 'aria-hidden': 'true' }, raiz);
  const capaEfectos = el('g', { 'aria-hidden': 'true' }, raiz);

  // ---- Formas --------------------------------------------------------------
  function caja(n, g) {
    const { x, y } = n, w = n.def.w || 60, d = n.def.d || w, h = n.def.h ?? 50;
    const hw = w / 2, hd = d / 2;
    const a = (dx, dy, z) => iso(x + dx, y + dy, z);
    el('polygon', { class: 'trazo c-der', points: pts([a(hw, -hd, 0), a(hw, hd, 0), a(hw, hd, h), a(hw, -hd, h)]) }, g);
    el('polygon', { class: 'trazo c-izq', points: pts([a(-hw, hd, 0), a(hw, hd, 0), a(hw, hd, h), a(-hw, hd, h)]) }, g);
    const med1 = el('polygon', { class: 'medidor', points: '' }, g);
    const med2 = el('polygon', { class: 'medidor', points: '' }, g);
    el('polygon', { class: 'trazo c-sup', points: pts([a(-hw, -hd, h), a(hw, -hd, h), a(hw, hd, h), a(-hw, hd, h)]) }, g);
    if (n.def.detalle === 'rack') {
      for (let i = 1; i <= 3; i++) {
        const z = h * i / 4;
        el('polyline', { class: 'detalle', points: pts([a(-hw + 6, hd, z), a(hw - 6, hd, z)]) }, g);
      }
      const led = a(hw - 10, hd, h - 8);
      n.led = el('circle', { cx: led[0], cy: led[1], r: 2, class: 'p-acento' }, g);
    }
    if (n.def.detalle === 'abierta') { // cubeta: tapa sin relleno
      g.lastChild.setAttribute('class', 'trazo c-nada');
    }
    n.h = h; n.radioBase = (w + d) / 4;
    n.medidor = (f) => {
      const z = h * Math.max(0, Math.min(1, f));
      if (z <= 0.01) { med1.setAttribute('points', ''); med2.setAttribute('points', ''); return; }
      med1.setAttribute('points', pts([a(-hw, hd, 0), a(hw, hd, 0), a(hw, hd, z), a(-hw, hd, z)]));
      med2.setAttribute('points', pts([a(hw, -hd, 0), a(hw, hd, 0), a(hw, hd, z), a(hw, -hd, z)]));
    };
  }

  function cilindro(n, g) {
    const r = n.def.r || 30, h = n.def.h ?? 50;
    const rx = Math.SQRT2 * r * COS, ry = Math.SQRT2 * r * SIN;
    const [bx, by] = iso(n.x, n.y, 0), ty = by - h;
    const cuerpo = (top) => `M${bx - rx},${top} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${bx + rx},${top} A${rx},${ry} 0 0 1 ${bx - rx},${top} Z`;
    el('path', { class: 'trazo c-izq', d: cuerpo(ty) }, g);
    const med = el('path', { class: 'medidor', d: '' }, g);
    const bandas = n.def.bandas || 0;
    for (let i = 1; i <= bandas; i++) {
      const yb = by - h * i / (bandas + 1);
      el('path', { class: 'detalle', d: `M${bx - rx},${yb} A${rx},${ry} 0 0 0 ${bx + rx},${yb}` }, g);
    }
    el('ellipse', { class: 'trazo c-sup', cx: bx, cy: ty, rx, ry }, g);
    n.h = h; n.radioBase = ry;
    n.medidor = (f) => {
      f = Math.max(0, Math.min(1, f));
      med.setAttribute('d', f < 0.01 ? '' : cuerpo(by - h * f));
    };
  }

  function persona(n, g) {
    const r = n.def.r || 8, cuerpoH = r * 2.1;
    const rx = Math.SQRT2 * r * COS, ry = Math.SQRT2 * r * SIN;
    const [bx, by] = iso(n.x, n.y, 0), ty = by - cuerpoH;
    el('path', { class: 'trazo c-izq', d: `M${bx - rx},${ty} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${bx + rx},${ty} A${rx},${ry} 0 0 1 ${bx - rx},${ty} Z` }, g);
    el('ellipse', { class: 'trazo c-sup', cx: bx, cy: ty, rx, ry }, g);
    el('circle', { class: 'trazo c-sup', cx: bx, cy: ty - r * 1.15, r: r * 0.85 }, g);
    n.h = cuerpoH + r * 2; n.radioBase = ry;
    n.medidor = () => {};
  }

  function cola(n, g) {
    const k = n.def.slots || 5, t = n.def.w || 22, paso_ = n.def.separacion || t + 8, h = n.def.h ?? 14;
    const celdas = [];
    for (let i = 0; i < k; i++) {
      const du = (i - (k - 1) / 2) * paso_;
      const [cx, cy] = uvAiso(du, 0);
      const x = n.x + cx, y = n.y + cy, hw = t / 2;
      const a = (dx, dy, z) => iso(x + dx, y + dy, z);
      const sg = el('g', {}, g);
      el('polygon', { class: 'trazo c-der', points: pts([a(hw, -hw, 0), a(hw, hw, 0), a(hw, hw, h), a(hw, -hw, h)]) }, sg);
      el('polygon', { class: 'trazo c-izq', points: pts([a(-hw, hw, 0), a(hw, hw, 0), a(hw, hw, h), a(-hw, hw, h)]) }, sg);
      const top = el('polygon', { class: 'trazo c-sup', points: pts([a(-hw, -hw, h), a(hw, -hw, h), a(hw, hw, h), a(-hw, hw, h)]) }, sg);
      celdas.push(sg);
      void top;
    }
    n.h = h; n.radioBase = t / 2 + 4; n.anchoU = k * paso_;
    // Los huecos se llenan desde la salida (derecha) hacia la entrada.
    n.medidor = (f) => {
      const llenos = Math.round(Math.max(0, Math.min(1, f)) * k);
      celdas.forEach((c, i) => c.classList.toggle('lleno', k - 1 - i < llenos));
      celdas.forEach((c) => c.querySelectorAll('polygon').forEach((p) => {
        if (c.classList.contains('lleno')) p.classList.add('slot-lleno'); else p.classList.remove('slot-lleno');
      }));
    };
  }

  function plano(n, g) {
    const w = n.def.w || 200, d = n.def.d || w, hw = w / 2, hd = d / 2;
    const a = (dx, dy) => iso(n.x + dx, n.y + dy, 0);
    el('polygon', { class: 'plano', points: pts([a(-hw, -hd), a(hw, -hd), a(hw, hd), a(-hw, hd)]) }, g);
    n.h = 0; n.radioBase = (w + d) / 4; n.medidor = () => {};
  }

  const FORMAS = { caja, cilindro, persona, cola, plano };

  // ---- Construcción de la escena ------------------------------------------
  function construir() {
    const lista = C.escena.nodos.map((def) => {
      const [x, y] = uvAiso(def.pos[0], def.pos[1]);
      return { def, x, y };
    });
    lista.sort((A, B) => (A.def.tipo === 'plano' ? -1 : 0) - (B.def.tipo === 'plano' ? -1 : 0) || (A.x + A.y) - (B.x + B.y));

    for (const n of lista) {
      const def = n.def;
      const capa = def.tipo === 'plano' ? capaPlanos : capaNodos;
      const g = el('g', { class: 'nodo', 'data-id': def.id }, capa);
      if (def.tipo !== 'plano') {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', [def.etiqueta, def.analogia && '(' + def.analogia + ')'].filter(Boolean).join(' '));
      }
      const base = iso(n.x, n.y, 0);
      n.sombra = el('ellipse', { class: 'sombra', cx: base[0], cy: base[1], rx: 1, ry: 1, opacity: 0 }, g);
      n.lift = el('g', { class: 'lift' }, g);
      const forma = el('g', { class: 'forma' }, n.lift);
      (FORMAS[def.tipo] || caja)(n, forma);
      n.g = g;
      n.ancla = base;
      n.centro = [base[0], base[1] - n.h / 2];
      n.sombra.setAttribute('rx', n.radioBase * COS * 1.6);
      n.sombra.setAttribute('ry', n.radioBase * 0.9);
      n.liftAct = 0;
      etiquetar(n, g);
      g.addEventListener('pointerdown', (e) => { e.stopPropagation(); seleccionar(def.id, true); });
      g.addEventListener('focus', () => seleccionar(def.id, false));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(def.id, true); } });
      nodos[def.id] = n;
      n.medidor(0);
    }

    for (const def of C.escena.enlaces || []) {
      const id = def.id || def.de + '-' + def.a;
      const A = nodos[def.de], B = nodos[def.a];
      if (!A || !B) { console.warn('enlace con nodo inexistente', def); continue; }
      const g = el('g', { class: 'enlace-g' }, capaEnlaces);
      const path = el('line', { class: 'enlace', x1: A.ancla[0], y1: A.ancla[1], x2: B.ancla[0], y2: B.ancla[1] }, g);
      enlaces[id] = { def, g, path };
    }
  }

  function etiquetar(n, g) {
    const def = n.def;
    if (!def.etiqueta && !def.sub) return;
    const lado = def.lado || 'abajo';
    const [bx, by] = n.ancla;
    let x = bx, y, anchor = 'middle';
    const extU = n.anchoU ? n.anchoU / 2 : n.radioBase * 2 * COS;
    if (lado === 'abajo') y = by + n.radioBase + 20;
    else if (lado === 'arriba') y = by - n.h - n.radioBase - 14;
    else if (lado === 'derecha') { x = bx + extU + 14; y = by - n.h / 2 + 4; anchor = 'start'; }
    else { x = bx - extU - 14; y = by - n.h / 2 + 4; anchor = 'end'; }
    if (def.tipo === 'plano') { y = by - n.radioBase - 10; }
    const t = el('text', { x, y, 'text-anchor': anchor }, g);
    t.textContent = def.etiqueta || '';
    n.subEl = el('text', { x, y: y + 16, 'text-anchor': anchor, class: 'sub' }, g);
    n.subEl.textContent = def.sub || '';
  }

  // Ajusta el viewBox al contenido y escala el texto para que siga legible en pantallas pequeñas.
  let vb = { x: 0, y: 0, w: 960, h: 540 };
  // Dos pasadas: el tamaño del texto depende del encuadre y el encuadre del texto.
  function encuadrar() { encuadrarUnaVez(); encuadrarUnaVez(); }
  function encuadrarUnaVez() {
    capaParticulas.style.display = capaEfectos.style.display = 'none';
    const b = raiz.getBBox();
    capaParticulas.style.display = capaEfectos.style.display = '';
    const m = C.lienzo?.margen ?? 36;
    vb = { x: b.x - m, y: b.y - m - 46, w: b.width + m * 2, h: b.height + m * 2 + 46 };
    const minW = C.lienzo?.anchoMin ?? 760;
    if (vb.w < minW) { vb.x -= (minW - vb.w) / 2; vb.w = minW; }
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    reescalarTexto();
  }
  function reescalarTexto() {
    const escala = svg.clientWidth / vb.w || 1;
    const fs = Math.min(22, Math.max(13, 12 / escala));
    svg.style.setProperty('--fs', fs.toFixed(1));
  }

  // ---- API para el concepto --------------------------------------------
  const ESTILOS = {
    peticion: { r: 4.5, clase: 'p-acento' },
    respuesta: { r: 3.5, clase: 'p-tinta' },
    ping: { r: 4, clase: 'p-aro' },
    dato: { r: 4, clase: 'p-aro-tinta' },
  };

  const api = {
    get paso() { return paso + 1; },
    valor: (id) => valores[id],
    // Cambia un control como si lo hiciera la persona: actualiza la UI y llama a al_cambiar.
    fijar(id, v) {
      const antes = valores[id]; valores[id] = v; sincronizarControl(id);
      if (antes !== v) C.al_cambiar?.(id, v, api);
    },
    nodo: (id) => nodos[id],
    visible: (id) => nodos[id] && !nodos[id].g.classList.contains('oculto'),

    enviar(ruta, estilo, alLlegar, opciones) {
      const ptsRuta = ruta.map((id) => nodos[id]?.ancla).filter(Boolean);
      if (ptsRuta.length < 2) return null;
      const est = typeof estilo === 'string' ? (ESTILOS[estilo] || ESTILOS.peticion) : { ...ESTILOS.peticion, ...estilo };
      const jit = (Math.random() - 0.5) * 6;
      const camino = ptsRuta.map((p) => [p[0], p[1] + jit]);
      const largos = [];
      let total = 0;
      for (let i = 1; i < camino.length; i++) { const L = Math.hypot(camino[i][0] - camino[i - 1][0], camino[i][1] - camino[i - 1][1]); largos.push(L); total += L; }
      const g = el('g', {}, capaParticulas);
      el('circle', { r: est.r, class: 'particula ' + est.clase }, g);
      if (opciones?.etiqueta) { const t = el('text', { x: 7, y: -6, class: 'p-etiqueta' }, g); t.textContent = opciones.etiqueta; }
      const p = { camino, largos, total, d: 0, vel: (opciones?.velocidad || 1) * (C.velocidad || 190), g, alLlegar, datos: opciones?.datos, pos: camino[0].slice() };
      particulas.push(p);
      moverParticula(p);
      return p;
    },
    limpiarParticulas() { particulas.splice(0).forEach((p) => p.g.remove()); },

    medidor(id, f) { nodos[id]?.medidor(f); },
    estado(id, e) {
      const n = nodos[id]; if (!n) return;
      n.g.classList.toggle('apagado', e === 'apagado');
      n.g.classList.toggle('alerta', e === 'alerta');
    },
    sub(id, texto) { const n = nodos[id]; if (n?.subEl && n.subEl.textContent !== texto) n.subEl.textContent = texto; },
    enlace(id, estado) {
      const e = enlaces[id]; if (!e) return;
      e.path.classList.toggle('roto', estado === 'roto');
      e.path.classList.toggle('activo', estado === 'activo');
    },

    descartar(donde) {
      const [x, y] = donde?.pos || donde;
      const g = el('g', { transform: `translate(${x},${y})` }, capaEfectos);
      el('path', { class: 'efecto-x', d: 'M-4,-4 L4,4 M4,-4 L-4,4' }, g);
      efectos.push({ g, t: 0, dur: 0.9, tipo: 'caer', x, y });
    },
    pulso(id) {
      const n = nodos[id]; if (!n) return;
      const g = el('ellipse', { class: 'efecto-pulso', cx: n.ancla[0], cy: n.ancla[1], rx: 4, ry: 2 }, capaEfectos);
      efectos.push({ g, t: 0, dur: 0.7, tipo: 'pulso', base: n.radioBase });
    },
    globo(id, texto, seg) {
      const n = nodos[id]; if (!n) return;
      n.globo?.g.remove();
      const g = el('g', { class: 'globo' }, capaEfectos);
      const t = el('text', { 'text-anchor': 'middle' }, g);
      t.textContent = texto;
      const fs = parseFloat(getComputedStyle(svg).getPropertyValue('--fs')) || 13;
      const ancho = texto.length * fs * 0.52 + 20, alto = fs + 14;
      const x = n.ancla[0], y = n.ancla[1] - n.h - n.radioBase - 22;
      g.insertBefore(el('rect', { x: x - ancho / 2, y: y - alto + 4, width: ancho, height: alto, rx: alto / 2 }), t);
      t.setAttribute('x', x); t.setAttribute('y', y - alto / 2 + fs * 0.35 + 4);
      n.globo = { g, t: 0, dur: seg || 2.4, nodo: n };
      efectos.push({ g, t: 0, dur: seg || 2.4, tipo: 'globo', nodo: n });
    },
    aviso(texto) {
      const a = $('aviso');
      a.textContent = texto; a.classList.add('visible');
      clearTimeout(api._av); api._av = setTimeout(() => a.classList.remove('visible'), 2600);
    },

    contar(id, delta) { contadores[id] = (contadores[id] || 0) + (delta ?? 1); pintarContador(id); },
    contador(id, v) { contadores[id] = v; pintarContador(id); },
    reiniciarContadores() { for (const c of C.contadores || []) api.contador(c.id, 0); },

    despues(seg, fn) { const t = { resta: seg, fn, ambito }; temporizadores.push(t); return t; },
    cada(seg, fn) { const t = { resta: seg, cada: seg, fn, ambito }; temporizadores.push(t); return t; },
    cancelar(t) { const i = temporizadores.indexOf(t); if (i >= 0) temporizadores.splice(i, 1); },
    refrescarTarjeta() { if (seleccionado) seleccionar(seleccionado, true); },
  };
  window.EXPLICA = api; // útil para depurar desde la consola

  function moverParticula(p) {
    let d = p.d, i = 0;
    while (i < p.largos.length - 1 && d > p.largos[i]) { d -= p.largos[i]; i++; }
    const A = p.camino[i], B = p.camino[i + 1], f = p.largos[i] ? Math.min(1, d / p.largos[i]) : 1;
    p.pos[0] = A[0] + (B[0] - A[0]) * f; p.pos[1] = A[1] + (B[1] - A[1]) * f;
    p.g.setAttribute('transform', `translate(${p.pos[0].toFixed(1)},${p.pos[1].toFixed(1)})`);
  }

  // ---- Pasos --------------------------------------------------------------
  function irAPaso(i, desdeTour) {
    paso = Math.max(0, Math.min(C.pasos.length - 1, i));
    const P = C.pasos[paso];
    tiempoPaso = 0; tourIdx = 0; tourT = 0;
    for (let k = temporizadores.length - 1; k >= 0; k--) if (temporizadores[k].ambito === 'paso') temporizadores.splice(k, 1);

    const num = paso + 1;
    for (const id in nodos) {
      const r = nodos[id].def.pasos;
      nodos[id].g.classList.toggle('oculto', !!r && (num < r[0] || num > r[1]));
      nodos[id].g.classList.toggle('foco', (P.foco || []).includes(id));
    }
    for (const id in enlaces) {
      const r = enlaces[id].def.pasos;
      enlaces[id].g.classList.toggle('oculto', !!r && (num < r[0] || num > r[1]));
    }

    $('insignia').textContent = `Paso ${num} / ${C.pasos.length}`;
    $('paso-titulo').textContent = P.titulo;
    $('paso-texto').innerHTML = P.texto;
    const chip = $('paso-analogia');
    chip.innerHTML = P.analogia || ''; chip.hidden = !P.analogia;
    $('anterior').disabled = paso === 0;
    $('siguiente').disabled = paso === C.pasos.length - 1;
    [...$('puntos').children].forEach((b, k) => { if (k === paso) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });

    ambito = 'paso';
    try { P.al_entrar?.(api); } finally { ambito = 'global'; }
    if (!desdeTour) cerrarTarjeta();
  }

  function duracionPaso(P) {
    const texto = (P.titulo + ' ' + P.texto.replace(/<[^>]+>/g, '') + ' ' + (P.analogia || '')).length;
    return P.duracion || Math.max(7, Math.min(16, texto * 0.055));
  }

  function alternarPlay(forzar) {
    reproduciendo = forzar ?? !reproduciendo;
    const b = $('play');
    b.setAttribute('aria-pressed', String(reproduciendo));
    b.textContent = reproduciendo ? '❚❚ Pausar' : '▶ Recorrer';
    if (reproduciendo) {
      if (paso === C.pasos.length - 1) irAPaso(0, true);
      tiempoPaso = 0;
    } else punteroVirtual = null;
  }

  // ---- Tarjeta de información -------------------------------------------
  function seleccionar(id, fijo) {
    const n = nodos[id]; if (!n || n.g.classList.contains('oculto')) return;
    seleccionado = fijo ? id : seleccionado;
    const d = n.def, t = $('tarjeta');
    t.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = d.etiqueta || id; t.appendChild(h);
    if (d.analogia) { const a = document.createElement('p'); a.className = 'ana'; a.textContent = 'En la analogía: ' + d.analogia; t.appendChild(a); }
    if (d.descripcion) { const p = document.createElement('p'); p.innerHTML = d.descripcion; t.appendChild(p); }
    const acciones = C.acciones_nodo?.(id, api) || [];
    if (acciones.length) {
      const fila = document.createElement('div'); fila.className = 'acciones';
      for (const ac of acciones) {
        const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = ac.texto;
        b.addEventListener('click', (e) => { e.stopPropagation(); ac.fn(api); seleccionar(id, true); });
        fila.appendChild(b);
      }
      t.appendChild(fila);
    }
    if (fijo) seleccionado = id;
    mostrandoTarjeta = id;
  }
  let mostrandoTarjeta = null;
  function cerrarTarjeta() {
    seleccionado = null; mostrandoTarjeta = null;
    $('tarjeta').innerHTML = '<p class="vacia">Toca o pasa el puntero sobre una pieza para ver qué es.</p>';
  }

  // ---- Controles del panel de juego --------------------------------------
  const refs = {};
  function construirControles() {
    const cont = $('controles');
    const grupos = new Map();
    for (const c of C.controles || []) {
      const gname = c.grupo || '';
      if (!grupos.has(gname)) {
        const g = document.createElement('div'); g.className = 'grupo';
        if (gname) { const h = document.createElement('h3'); h.textContent = gname; g.appendChild(h); }
        cont.appendChild(g); grupos.set(gname, g);
      }
      const g = grupos.get(gname);
      const w = document.createElement('div'); w.className = 'control';
      valores[c.id] = c.valor;
      if (c.tipo === 'rango') {
        w.innerHTML = `<div class="rotulo"><label for="c-${c.id}"></label><output></output></div><input type="range" id="c-${c.id}" min="${c.min}" max="${c.max}" step="${c.paso || 1}">`;
        w.querySelector('label').textContent = c.etiqueta;
        const inp = w.querySelector('input'), out = w.querySelector('output');
        inp.value = c.valor;
        inp.addEventListener('input', () => cambiar(c, Number(inp.value)));
        refs[c.id] = () => { inp.value = valores[c.id]; out.textContent = (c.formato ? c.formato(valores[c.id]) : valores[c.id]); };
      } else if (c.tipo === 'opciones') {
        const l = document.createElement('div'); l.className = 'rotulo'; l.textContent = c.etiqueta; w.appendChild(l);
        const s = document.createElement('div'); s.className = 'segmentos'; s.setAttribute('role', 'group'); s.setAttribute('aria-label', c.etiqueta);
        const botones = c.opciones.map(([v, txt]) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = txt;
          b.addEventListener('click', () => cambiar(c, v)); s.appendChild(b); return [v, b];
        });
        w.appendChild(s);
        refs[c.id] = () => botones.forEach(([v, b]) => b.setAttribute('aria-pressed', String(v === valores[c.id])));
      } else if (c.tipo === 'interruptor') {
        w.innerHTML = `<label class="interruptor"><input type="checkbox" role="switch"><span></span></label>`;
        w.querySelector('span').textContent = c.etiqueta;
        const inp = w.querySelector('input');
        inp.addEventListener('change', () => cambiar(c, inp.checked));
        refs[c.id] = () => { inp.checked = !!valores[c.id]; };
      } else if (c.tipo === 'boton') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = c.etiqueta;
        b.addEventListener('click', () => { C.al_cambiar?.(c.id, true, api); });
        w.appendChild(b); refs[c.id] = () => {};
      }
      g.appendChild(w);
      refs[c.id]();
    }
    if (!(C.controles || []).length) $('juega').hidden = true;

    const cc = $('contadores');
    for (const c of C.contadores || []) {
      const d = document.createElement('div'); d.className = 'contador';
      d.innerHTML = '<b>0</b><span></span>'; d.querySelector('span').textContent = c.etiqueta;
      cc.appendChild(d); c._el = d.querySelector('b'); contadores[c.id] = 0;
    }
  }
  function cambiar(c, v) { valores[c.id] = v; refs[c.id](); C.al_cambiar?.(c.id, v, api); api.refrescarTarjeta(); }
  function sincronizarControl(id) { refs[id]?.(); }
  function pintarContador(id) { const c = (C.contadores || []).find((k) => k.id === id); if (c?._el) c._el.textContent = contadores[id]; }

  // ---- Glosario ----------------------------------------------------------
  function construirGlosario() {
    const g = $('glosario');
    const mapa = C.analogia?.mapa || [];
    if (mapa.length) {
      const s = document.createElement('div');
      s.innerHTML = `<h2>La analogía, pieza por pieza</h2><table class="mapa"><thead><tr><th></th><th></th></tr></thead><tbody></tbody></table>`;
      const [ca, cb] = C.analogia.columnas || ['En la analogía', 'En el sistema'];
      s.querySelectorAll('th')[0].textContent = ca; s.querySelectorAll('th')[1].textContent = cb;
      const tb = s.querySelector('tbody');
      for (const [a, b] of mapa) { const tr = document.createElement('tr'); tr.innerHTML = '<td></td><td></td>'; tr.children[0].textContent = a; tr.children[1].textContent = b; tb.appendChild(tr); }
      g.appendChild(s);
    }
    if ((C.terminos || []).length) {
      const s = document.createElement('div');
      s.innerHTML = '<h2>Términos clave</h2><dl class="terminos"></dl>';
      const dl = s.querySelector('dl');
      for (const t of C.terminos) {
        const dt = document.createElement('dt'); dt.textContent = t.termino;
        if (t.traduccion) { const sm = document.createElement('small'); sm.textContent = ' · ' + t.traduccion; dt.appendChild(sm); }
        const dd = document.createElement('dd'); dd.textContent = t.definicion;
        dl.append(dt, dd);
      }
      g.appendChild(s);
    }
    if (!g.children.length) g.hidden = true;
  }

  // ---- Puntero e intensidad ----------------------------------------------
  function aSvg(e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const m = svg.getScreenCTM(); if (!m) return null;
    const q = p.matrixTransform(m.inverse()); return [q.x, q.y];
  }
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') puntero = aSvg(e); });
  svg.addEventListener('pointerleave', () => { puntero = null; });
  svg.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') puntero = aSvg(e); cerrarTarjeta(); });

  function actualizarLift(dt) {
    const fuente = puntero || punteroVirtual;
    const R = 120, amp = 16 * intensidad;
    let mejor = null, mejorF = 0;
    for (const id in nodos) {
      const n = nodos[id];
      if (n.def.tipo === 'plano') continue;
      let f = 0;
      if (fuente) { const dd = Math.hypot(fuente[0] - n.centro[0], fuente[1] - n.centro[1]); f = Math.exp(-((dd / R) ** 2)); }
      if (seleccionado === id) f = Math.max(f, 1);
      if (n.g.classList.contains('foco')) f = Math.max(f, 0.35);
      if (f > mejorF) { mejorF = f; mejor = id; }
      const objetivo = -amp * f;
      n.liftAct += (objetivo - n.liftAct) * Math.min(1, dt * (reducido ? 30 : 10));
      n.lift.setAttribute('transform', `translate(0,${n.liftAct.toFixed(2)})`);
      n.sombra.setAttribute('opacity', (Math.min(1, -n.liftAct / 16) * 0.8).toFixed(2));
    }
    for (const id in nodos) nodos[id].g.classList.toggle('resaltado', id === mejor && mejorF > 0.55 && intensidad > 0);
    // Muestra la tarjeta de lo que está bajo el puntero si no hay nada fijado.
    if (!seleccionado && puntero && mejor && mejorF > 0.7 && mostrandoTarjeta !== mejor) seleccionar(mejor, false);
    else if (!seleccionado && puntero && mejorF < 0.4 && mostrandoTarjeta) cerrarTarjeta();
  }

  function actualizarTour(dt) {
    if (!reproduciendo || puntero) return;
    const foco = (C.pasos[paso].foco || []).filter((id) => api.visible(id));
    if (!foco.length) { punteroVirtual = null; return; }
    tourT += dt;
    if (tourT > 1.6) { tourT = 0; tourIdx = (tourIdx + 1) % foco.length; }
    const objetivo = nodos[foco[tourIdx % foco.length]].centro;
    if (!punteroVirtual) punteroVirtual = objetivo.slice();
    punteroVirtual[0] += (objetivo[0] - punteroVirtual[0]) * Math.min(1, dt * 4);
    punteroVirtual[1] += (objetivo[1] - punteroVirtual[1]) * Math.min(1, dt * 4);
  }

  // ---- Bucle -------------------------------------------------------------
  let ultimo = performance.now();
  function bucle(ahora) {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
    avanzar(dt);
    requestAnimationFrame(bucle);
  }
  // Avanza la simulación sin esperar fotogramas: EXPLICA.simular(10) corre 10 s simulados.
  // Sirve para verificar el diagrama aunque la pestaña esté en segundo plano.
  api.simular = (seg) => { for (let t = 0; t < seg; t += 1 / 30) avanzar(1 / 30); };

  function avanzar(dt) {
    for (let k = temporizadores.length - 1; k >= 0; k--) {
      const t = temporizadores[k]; if (!t) continue;
      t.resta -= dt;
      if (t.resta <= 0) {
        if (t.cada) t.resta += t.cada; else temporizadores.splice(k, 1);
        t.fn(api);
      }
    }
    C.tick?.(dt, api);

    for (let k = particulas.length - 1; k >= 0; k--) {
      const p = particulas[k];
      p.d += p.vel * dt;
      if (p.d >= p.total) {
        p.d = p.total; moverParticula(p);
        particulas.splice(k, 1); p.g.remove();
        p.alLlegar?.(p, api);
      } else moverParticula(p);
    }

    for (let k = efectos.length - 1; k >= 0; k--) {
      const e = efectos[k]; e.t += dt; const f = e.t / e.dur;
      if (f >= 1) { e.g.remove(); efectos.splice(k, 1); if (e.nodo && e.nodo.globo?.g === e.g) e.nodo.globo = null; continue; }
      if (e.tipo === 'caer') { e.g.setAttribute('transform', `translate(${e.x},${e.y + f * 16})`); e.g.setAttribute('opacity', 1 - f); }
      if (e.tipo === 'pulso') { const r = 4 + f * e.base * 2.2; e.g.setAttribute('rx', r * COS * 1.4); e.g.setAttribute('ry', r * 0.7); e.g.setAttribute('opacity', 1 - f); }
      if (e.tipo === 'globo') {
        const lift = e.nodo.liftAct || 0;
        e.g.setAttribute('transform', `translate(0,${lift.toFixed(1)})`);
        e.g.setAttribute('opacity', f > 0.85 ? (1 - f) / 0.15 : Math.min(1, f * 8));
      }
    }

    actualizarTour(dt);
    actualizarLift(dt);

    if (reproduciendo) {
      tiempoPaso += dt;
      if (tiempoPaso > duracionPaso(C.pasos[paso])) {
        if (paso < C.pasos.length - 1) irAPaso(paso + 1, true); else alternarPlay(false);
      }
    }
  }

  // ---- Tema --------------------------------------------------------------
  function temaActual() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  try { const t = localStorage.getItem('explica-visual-tema'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (_) {}
  $('tema').addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('explica-visual-tema', nuevo); } catch (_) {}
  });

  // ---- Arranque ----------------------------------------------------------
  document.title = C.titulo + ' · explica-visual';
  $('titulo').textContent = C.titulo;
  $('kicker').textContent = 'explica-visual' + (C.contexto ? ' · ' + C.contexto : '');
  $('frase').textContent = C.frase || '';
  $('analogia-linea').textContent = C.analogia?.texto || '';

  const intens = $('intensidad');
  intens.addEventListener('input', () => { intensidad = intens.value / 100; });

  C.pasos.forEach((P, k) => {
    const b = document.createElement('button'); b.type = 'button';
    b.setAttribute('aria-label', `Paso ${k + 1}: ${P.titulo}`);
    b.addEventListener('click', () => { alternarPlay(false); irAPaso(k); });
    $('puntos').appendChild(b);
  });
  $('anterior').addEventListener('click', () => { alternarPlay(false); irAPaso(paso - 1); });
  $('siguiente').addEventListener('click', () => { alternarPlay(false); irAPaso(paso + 1); });
  $('play').addEventListener('click', () => alternarPlay());
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || (tag === 'button' && e.key === ' ')) return;
    if (e.key === 'ArrowRight') { alternarPlay(false); irAPaso(paso + 1); }
    else if (e.key === 'ArrowLeft') { alternarPlay(false); irAPaso(paso - 1); }
    else if (e.key === ' ' && !e.target.closest?.('.nodo')) { e.preventDefault(); alternarPlay(); }
    else if (e.key === 'Escape') cerrarTarjeta();
  });

  construir();
  construirControles();
  construirGlosario();
  encuadrar();
  let tResize; addEventListener('resize', () => { clearTimeout(tResize); tResize = setTimeout(encuadrar, 120); });
  C.iniciar?.(api);
  irAPaso(0);
  requestAnimationFrame((t) => { ultimo = t; requestAnimationFrame(bucle); });
})();
