/* Concepto: Load balancer (balanceador de carga)
   Analogía: el anfitrión de un restaurante que reparte a los clientes entre los meseros. */
window.CONCEPTO = (() => {
  const SERVIDORES = ['s1', 's2', 's3'];
  const CLIENTES = ['u1', 'u2', 'u3', 'u4'];
  const CAPACIDAD = 4;       // mesas que atiende cada mesero a la vez
  const FILA_MAX = 3;        // clientes que pueden esperar de pie
  const ATENCION = 1.5;      // segundos que tarda en atender una petición

  // Estado de la simulación
  const S = {};
  function reiniciar(api) {
    api.limpiarParticulas();
    S.acum = 0; S.rr = 0; S.pegado = {}; S.avisoCiego = 0;
    for (const id of SERVIDORES) {
      S[id] = S[id] || {};
      Object.assign(S[id], { activos: [], fila: [], sano: true, enCamino: 0 });
      api.enlace('lb-' + id, 'normal');
    }
    api.reiniciarContadores();
  }
  const encendido = (api, id) => api.valor('on_' + id);
  const lento = (api, id) => id === 's1' && api.valor('lento');

  function marcarSalud(api, id, sano) {
    if (!api.valor('hc') || S[id].sano === sano) return; // ignora pings que seguían en camino
    S[id].sano = sano;
    api.enlace('lb-' + id, sano ? 'normal' : 'roto');
    api.globo('lb', sano ? `${nombre(id)} volvió` : `${nombre(id)} no responde`, 2.2);
  }
  const nombre = (id) => 'Servidor ' + id.slice(1);

  function elegir(api) {
    const hc = api.valor('hc');
    const candidatos = SERVIDORES.filter((id) => !hc || S[id].sano);
    if (!candidatos.length) return null;
    const alg = api.valor('algoritmo');
    if (alg === 'least') {
      // cuenta también las peticiones ya enviadas que aún no llegan
      const carga = (id) => (S[id].activos.length + S[id].fila.length + S[id].enCamino) / CAPACIDAD;
      const min = Math.min(...candidatos.map(carga));
      const empatados = candidatos.filter((id) => carga(id) === min);
      return empatados[Math.floor(Math.random() * empatados.length)];
    }
    if (alg === 'random') return candidatos[Math.floor(Math.random() * candidatos.length)];
    // round robin: el siguiente en la lista que esté disponible
    for (let k = 0; k < SERVIDORES.length; k++) {
      const id = SERVIDORES[(S.rr + k) % SERVIDORES.length];
      if (candidatos.includes(id)) { S.rr = (SERVIDORES.indexOf(id) + 1) % SERVIDORES.length; return id; }
    }
    return candidatos[0];
  }

  function llegaAlBalanceador(p, api) {
    const cliente = p.datos.cliente;
    let id;
    if (api.valor('algoritmo') === 'sticky') {
      id = S.pegado[cliente];
      const valido = id && (!api.valor('hc') || S[id].sano);
      if (!valido) { S.pegado[cliente] = id = elegir({ valor: (k) => (k === 'algoritmo' ? 'rr' : api.valor(k)) }); }
    } else id = elegir(api);
    if (!id) { api.descartar(p); api.contar('rechazadas'); api.aviso('Ningún servidor disponible: el balanceador responde 503'); return; }
    api.pulso('lb');
    S[id].enCamino++;
    api.enviar(['lb', id], 'peticion', (p2) => { S[id].enCamino--; llegaAlServidor(id, p2, api); }, { datos: { cliente, via: 'lb' } });
  }

  function llegaAlServidor(id, p, api) {
    if (!encendido(api, id)) {
      api.descartar(p); api.contar('perdidas');
      if (!api.valor('hc') && api.paso > 1 && S.avisoCiego <= 0) {
        api.aviso(`Sin health checks, el balanceador no sabe que el ${nombre(id)} está apagado`);
        S.avisoCiego = 4;
      }
      return;
    }
    const s = S[id];
    if (s.activos.length < CAPACIDAD) s.activos.push({ resta: ATENCION * (lento(api, id) ? 2.6 : 1), ...p.datos });
    else if (s.fila.length < FILA_MAX) s.fila.push(p.datos);
    else { api.descartar(p); api.contar('rechazadas'); }
  }

  return {
    titulo: 'Load balancer',
    contexto: 'balanceador de carga',
    frase: 'Un load balancer (balanceador de carga) recibe todas las peticiones y las reparte entre varios servidores, para que ninguno se sature y si uno falla los demás sigan atendiendo.',
    analogia: {
      texto: 'Es como el anfitrión de un restaurante: recibe a cada cliente en la puerta y lo lleva con el mesero que puede atenderlo, para que ninguno se sature.',
      columnas: ['En el restaurante', 'En el sistema'],
      mapa: [
        ['Clientes que llegan', 'Peticiones de los usuarios (HTTP)'],
        ['El anfitrión en la puerta', 'El load balancer'],
        ['Los meseros', 'Los servidores (instancias)'],
        ['Mesas ocupadas de un mesero', 'Conexiones activas de un servidor'],
        ['Preguntar «¿puedes con otra mesa?»', 'Health check'],
        ['Turnarse: uno a cada mesero', 'Round robin'],
        ['Llevar al cliente con su mesero de siempre', 'Sticky sessions'],
      ],
    },
    terminos: [
      { termino: 'Round robin', traduccion: 'turno rotativo', definicion: 'Reparte las peticiones en orden: una a cada servidor y vuelve a empezar.' },
      { termino: 'Least connections', traduccion: 'menos conexiones', definicion: 'Envía cada petición al servidor que tiene menos trabajo en ese momento.' },
      { termino: 'Health check', traduccion: 'chequeo de salud', definicion: 'Pregunta periódica del balanceador a cada servidor para saber si sigue vivo.' },
      { termino: 'Sticky sessions', traduccion: 'sesiones pegajosas', definicion: 'El mismo usuario siempre va al mismo servidor, útil si este guarda su sesión en memoria.' },
      { termino: 'Single point of failure', traduccion: 'punto único de fallo', definicion: 'Una pieza que, si cae, tumba todo. Por eso los balanceadores se despliegan en pareja.' },
    ],

    escena: {
      nodos: [
        { id: 'u1', tipo: 'persona', pos: [-390, -150], etiqueta: 'Ana', lado: 'izquierda', analogia: 'Un cliente', descripcion: 'Cada punto que sale de aquí es una petición: abrir una página, enviar un formulario.' },
        { id: 'u2', tipo: 'persona', pos: [-390, -50], etiqueta: 'Luis', lado: 'izquierda', analogia: 'Un cliente', descripcion: 'Cada punto que sale de aquí es una petición.' },
        { id: 'u3', tipo: 'persona', pos: [-390, 50], etiqueta: 'Sara', lado: 'izquierda', analogia: 'Un cliente', descripcion: 'Cada punto que sale de aquí es una petición.' },
        { id: 'u4', tipo: 'persona', pos: [-390, 150], etiqueta: 'Tomás', lado: 'izquierda', analogia: 'Un cliente', descripcion: 'Cada punto que sale de aquí es una petición.' },
        { id: 'lb', tipo: 'caja', pos: [-70, 0], w: 56, h: 40, etiqueta: 'Load balancer', lado: 'abajo', pasos: [2, 6], analogia: 'El anfitrión', descripcion: 'Es la única dirección que conocen los clientes. Decide a qué servidor va cada petición.' },
        { id: 's1', tipo: 'caja', pos: [250, -170], w: 62, h: 78, detalle: 'rack', etiqueta: 'Servidor 1', lado: 'derecha', analogia: 'Mesero 1', descripcion: `Atiende hasta ${CAPACIDAD} peticiones a la vez; el relleno muestra qué tan ocupado está.` },
        { id: 's2', tipo: 'caja', pos: [250, 0], w: 62, h: 78, detalle: 'rack', etiqueta: 'Servidor 2', lado: 'derecha', pasos: [2, 6], analogia: 'Mesero 2', descripcion: `Atiende hasta ${CAPACIDAD} peticiones a la vez.` },
        { id: 's3', tipo: 'caja', pos: [250, 170], w: 62, h: 78, detalle: 'rack', etiqueta: 'Servidor 3', lado: 'derecha', pasos: [2, 6], analogia: 'Mesero 3', descripcion: `Atiende hasta ${CAPACIDAD} peticiones a la vez.` },
      ],
      enlaces: [
        ...CLIENTES.map((u) => ({ de: u, a: 's1', id: 'directo-' + u, pasos: [1, 1] })),
        ...CLIENTES.map((u) => ({ de: u, a: 'lb', pasos: [2, 6] })),
        ...SERVIDORES.map((s) => ({ de: 'lb', a: s, pasos: [2, 6] })),
      ],
    },

    controles: [
      { id: 'trafico', grupo: 'Tráfico', tipo: 'rango', etiqueta: 'Peticiones por segundo', min: 1, max: 14, valor: 3 },
      { id: 'algoritmo', grupo: 'Balanceador', tipo: 'opciones', etiqueta: 'Algoritmo', valor: 'rr',
        opciones: [['rr', 'Round robin'], ['least', 'Least connections'], ['random', 'Aleatorio'], ['sticky', 'Sticky']] },
      { id: 'hc', grupo: 'Balanceador', tipo: 'interruptor', etiqueta: 'Health checks', valor: false },
      { id: 'on_s1', grupo: 'Servidores', tipo: 'interruptor', etiqueta: 'Servidor 1 encendido', valor: true },
      { id: 'on_s2', grupo: 'Servidores', tipo: 'interruptor', etiqueta: 'Servidor 2 encendido', valor: true },
      { id: 'on_s3', grupo: 'Servidores', tipo: 'interruptor', etiqueta: 'Servidor 3 encendido', valor: true },
      { id: 'lento', grupo: 'Servidores', tipo: 'interruptor', etiqueta: 'Servidor 1 lento (máquina vieja)', valor: false },
      { id: 'reiniciar', grupo: 'Tráfico', tipo: 'boton', etiqueta: 'Reiniciar contadores' },
    ],
    contadores: [
      { id: 'atendidas', etiqueta: 'Atendidas' },
      { id: 'rechazadas', etiqueta: 'Rechazadas por saturación' },
      { id: 'perdidas', etiqueta: 'Perdidas en un servidor caído' },
    ],

    al_cambiar(id, v, api) {
      if (id === 'reiniciar') api.reiniciarContadores();
      if (id === 'hc' && !v) SERVIDORES.forEach((s) => { S[s].sano = true; api.enlace('lb-' + s, 'normal'); });
      if (id.startsWith('on_') && !v) { const s = S[id.slice(3)]; s.activos = []; s.fila = []; }
    },
    acciones_nodo(id, api) {
      if (!SERVIDORES.includes(id) || !api.visible('lb')) return [];
      const on = encendido(api, id);
      return [{ texto: on ? 'Apagar este servidor' : 'Encenderlo', fn: () => api.fijar('on_' + id, !on) }];
    },

    iniciar(api) {
      reiniciar(api);
      // Health checks: cada 2 s el balanceador "pregunta" a cada servidor.
      api.cada(2, () => {
        if (!api.valor('hc') || !api.visible('lb')) return;
        for (const id of SERVIDORES) {
          api.enviar(['lb', id], 'ping', () => {
            if (encendido(api, id)) api.enviar([id, 'lb'], 'ping', () => marcarSalud(api, id, true), { velocidad: 1.6 });
            else api.despues(0.4, () => marcarSalud(api, id, false));
          }, { velocidad: 1.6 });
        }
      });
    },

    tick(dt, api) {
      S.avisoCiego -= dt;
      const directo = api.paso === 1;
      // Generar peticiones
      S.acum += dt * api.valor('trafico');
      while (S.acum >= 1) {
        S.acum -= 1;
        const cliente = CLIENTES[Math.floor(Math.random() * CLIENTES.length)];
        if (directo) api.enviar([cliente, 's1'], 'peticion', (p) => llegaAlServidor('s1', p, api), { datos: { cliente, via: 'directo' } });
        else api.enviar([cliente, 'lb'], 'peticion', (p) => llegaAlBalanceador(p, api), { datos: { cliente } });
      }
      // Atender
      for (const id of SERVIDORES) {
        const s = S[id], on = encendido(api, id);
        for (let k = s.activos.length - 1; k >= 0; k--) {
          const t = s.activos[k];
          t.resta -= dt;
          if (t.resta <= 0) {
            s.activos.splice(k, 1);
            const ruta = t.via === 'lb' ? [id, 'lb', t.cliente] : [id, t.cliente];
            api.enviar(ruta, 'respuesta', () => api.contar('atendidas'), { velocidad: 1.3 });
            if (s.fila.length) s.activos.push({ resta: ATENCION * (lento(api, id) ? 2.6 : 1), ...s.fila.shift() });
          }
        }
        const carga = (s.activos.length + s.fila.length) / (CAPACIDAD + FILA_MAX);
        api.medidor(id, on ? carga : 0);
        api.estado(id, !on ? 'apagado' : s.fila.length ? 'alerta' : 'normal');
        api.sub(id, !on ? 'apagado' : `${s.activos.length}/${CAPACIDAD} ocupado` + (s.fila.length ? ` · ${s.fila.length} en fila` : '') + (lento(api, id) ? ' · lento' : ''));
      }
      if (api.visible('lb')) {
        const alg = api.valor('algoritmo');
        api.sub('lb', alg === 'rr' ? `siguiente → ${nombre(SERVIDORES[S.rr])}` : { least: 'al menos ocupado', random: 'al azar', sticky: 'cada cliente a su servidor' }[alg]);
      }
    },

    pasos: [
      {
        titulo: 'El problema: un solo servidor',
        texto: 'Todas las peticiones llegan directo al <b>Servidor 1</b>. Puede atender 4 a la vez; las demás esperan en fila y, cuando la fila se llena, se <b>rechazan</b> (las × rojas).',
        analogia: 'Un restaurante sin anfitrión: todos los clientes se sientan con el mismo mesero y los demás meseros miran.',
        foco: ['s1'],
        al_entrar(api) {
          api.fijar('trafico', 4); api.fijar('hc', false); api.fijar('lento', false);
          SERVIDORES.forEach((s) => api.fijar('on_' + s, true));
          reiniciar(api);
          api.despues(4, () => api.globo('s1', '¡No doy abasto!'));
        },
      },
      {
        titulo: 'Llega el balanceador',
        texto: 'Ahora los clientes no hablan con un servidor: hablan con el <b>load balancer</b>, que es la única dirección pública. Él decide a qué servidor va cada petición y la respuesta vuelve por el mismo camino.',
        analogia: 'El anfitrión recibe a todos en la puerta. Los clientes no eligen mesero: el anfitrión los lleva.',
        foco: ['lb'],
        al_entrar(api) {
          api.fijar('algoritmo', 'rr'); api.fijar('hc', false); api.fijar('lento', false);
          SERVIDORES.forEach((s) => api.fijar('on_' + s, true));
          reiniciar(api);
          api.despues(1.2, () => api.globo('lb', 'Pasen, yo los reparto'));
        },
      },
      {
        titulo: 'Round robin: por turnos',
        texto: 'El algoritmo más simple es <b>round robin</b> (turno rotativo): una petición al Servidor 1, la siguiente al 2, luego al 3 y vuelta a empezar. Mira la etiqueta del balanceador: indica a quién le toca.',
        analogia: 'El anfitrión sienta un cliente con cada mesero, en orden, sin mirar quién está más ocupado.',
        foco: ['lb', 's1', 's2', 's3'],
        al_entrar(api) {
          api.fijar('algoritmo', 'rr'); api.fijar('hc', false); api.fijar('lento', false);
          SERVIDORES.forEach((s) => api.fijar('on_' + s, true));
          reiniciar(api);
        },
      },
      {
        titulo: 'Health checks: ¿sigues vivo?',
        texto: 'Cada 2 segundos el balanceador envía un <b>health check</b> (los aros) a cada servidor. Si uno no responde, deja de mandarle tráfico. En unos segundos el Servidor 3 se va a caer: fíjate cómo su línea se vuelve punteada y el tráfico se reparte entre los otros dos.',
        analogia: 'El anfitrión se asoma a cada rato: «¿puedes con otra mesa?». Si un mesero no contesta, deja de llevarle clientes.',
        foco: ['lb', 's3'],
        al_entrar(api) {
          api.fijar('algoritmo', 'rr'); api.fijar('hc', true); api.fijar('lento', false);
          SERVIDORES.forEach((s) => api.fijar('on_' + s, true));
          reiniciar(api);
          api.despues(3.5, () => { api.fijar('on_s3', false); api.aviso('El Servidor 3 se cayó'); });
        },
      },
      {
        titulo: 'Least connections: al menos ocupado',
        texto: 'Ahora el Servidor 1 es <b>lento</b>. Con round robin seguiría recibiendo su turno y se saturaría. Con <b>least connections</b> el balanceador mira cuánto trabajo tiene cada uno y elige al más libre. Prueba a cambiar el algoritmo abajo y mira el relleno del Servidor 1.',
        analogia: 'Un anfitrión atento no sienta clientes por turno: mira qué mesero tiene menos mesas y lleva ahí al siguiente.',
        foco: ['s1', 'lb'],
        al_entrar(api) {
          api.fijar('algoritmo', 'least'); api.fijar('hc', true); api.fijar('lento', true); api.fijar('trafico', 4);
          SERVIDORES.forEach((s) => api.fijar('on_' + s, true));
          reiniciar(api);
        },
      },
      {
        titulo: 'Tu turno',
        texto: 'Experimenta: sube el tráfico hasta que ni tres servidores den abasto; apaga un servidor <b>sin</b> health checks y mira las peticiones perdidas; prueba <b>Sticky</b> y observa que cada cliente vuelve siempre al mismo servidor. Toca un servidor para apagarlo.',
        analogia: 'Ahora tú eres el gerente: decide cuántos clientes entran, qué meseros trabajan y cómo reparte el anfitrión.',
        foco: [],
        al_entrar() {},
      },
    ],
  };
})();
