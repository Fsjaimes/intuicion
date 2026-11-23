# API del concepto

Un concepto es un archivo JS que asigna `window.CONCEPTO`. Lo habitual es envolverlo en una función para tener estado privado de la simulación:

```js
window.CONCEPTO = (() => {
  const S = {};                // estado de la simulación
  return { titulo: '…', /* … */ };
})();
```

**Principio:** el motor solo ofrece **primitivas y estados semánticos neutrales** (una caja, un agente, una celda en `ok` o en `error`). No sabe qué es un servidor, un prompt o una tabla hash. Toda la narrativa (qué representa cada pieza, qué significa cada estado, qué pasa cuando llega una partícula) vive en el `.concepto.js`. Si te descubres queriendo meter un nombre de dominio en el motor, no lo hagas: compónlo con las primitivas.

Ejemplos completos:
- `ejemplos/load-balancer.concepto.js`: modo **continuo** (flujo de tráfico, simulación en `tick`).
- `ejemplos/rag.concepto.js`: modo **por turnos** con `agente`, `codigo`, `documento`, `matriz`, `escudo`, inspector, entradas clicables, acciones y demostraciones con `await`.

## Contenido

1. [Campos de texto](#campos-de-texto)
2. [Escena: nodos y enlaces](#escena)
3. [Estados semánticos](#estados-semánticos)
4. [Modos de simulación](#modos-de-simulación)
5. [Pasos](#pasos)
6. [Inspector / laboratorio en vivo](#inspector)
7. [Acciones](#acciones)
8. [Panel de juego: controles y contadores](#panel-de-juego)
9. [Simulación: iniciar, tick, al_cambiar, acciones_nodo](#simulación)
10. [Objeto `api`](#objeto-api)
11. [Elegir composición y modo por familia de concepto](#familias)

## Campos de texto

| Campo | Qué es |
|---|---|
| `titulo` | Nombre del concepto tal como se usa en la industria («Load balancer»). |
| `contexto` | Opcional. Va en el kicker: la traducción o de dónde viene («balanceador de carga», «visto en AWS»). |
| `frase` | La idea en una frase (sección 1 de la explicación). |
| `analogia.texto` | La analogía en una o dos frases. |
| `analogia.columnas` | Encabezados de la tabla: `['En el restaurante', 'En el sistema']`. |
| `analogia.mapa` | Pares `[pieza de la analogía, pieza del sistema]`. |
| `terminos` | `[{ termino, traduccion, definicion }]`, 3–6. |
| `modo` | `'continuo'` (por defecto), `'turnos'` o `'hibrido'`. Ver [Modos](#modos-de-simulación). |

## Escena

`escena.nodos`: lista de nodos. Campos comunes:

| Campo | Qué hace |
|---|---|
| `id` | Identificador único. |
| `tipo` | Ver la tabla de tipos. |
| `pos` | `[u, v]`: dónde queda el centro de la base **en pantalla**, en px relativos al centro. `u` → derecha, `v` → abajo. El motor lo convierte a isométrico. |
| `etiqueta` | Nombre corto (1–3 palabras). |
| `sub` | Subetiqueta inicial (estado: «0/4 ocupado»). Se cambia con `api.sub`. |
| `lado` | Dónde va la etiqueta: `abajo` (por defecto), `arriba`, `derecha`, `izquierda`. |
| `analogia` | Su papel en la analogía («El anfitrión»). Se muestra al tocar el nodo. |
| `descripcion` | Una o dos frases que aparecen al tocar o pasar el puntero. Admite `<b>`. |
| `pasos` | `[desde, hasta]` (1-based, inclusivo): en qué pasos es visible. Sin él, siempre visible. |
| `estado` | Estado inicial (ver [Estados](#estados-semánticos)). Si no se da, cada tipo tiene el suyo. |

Tipos:

| Tipo | Campos | Sirve para | Medidor (`api.medidor`) |
|---|---|---|---|
| `caja` | `w`, `d` (= `w`), `h`, `detalle: 'rack'` o `'abierta'` (sin tapa: cubeta) | Servicio, proceso, contenedor, cubeta | Relleno que sube por las caras |
| `cilindro` | `r`, `h`, `bandas` (2 = base de datos clásica) | Almacenamiento, disco, caché | Relleno que sube por el cuerpo |
| `persona` | `r` | Usuario, cliente, actor humano | — |
| `cola` | `slots`, `w`, `separacion`, `h` | Cola, buffer, fila de espera | Huecos llenos de derecha (salida) a izquierda |
| `plano` | `w`, `d` | Zona punteada en el suelo: región, partición, red, ámbito | — |
| `agente` | `r`, `h` (pedestal) | Entidad que decide sola: LLM, agente de IA, worker, coordinador, planificador | Llena el núcleo: contexto usado, carga, confianza |
| `documento` | `w`, `d`, `h`, `lineas` | Texto: documento, prompt, configuración, registro, payload, mensaje | Relleno en la cara frontal |
| `codigo` | igual que `documento` | Igual, con renglones sangrados como código fuente | Relleno en la cara frontal |
| `escudo` | `w` (grosor), `d` (largo), `h` | Compuerta: firewall, validador, guardrail, circuit breaker, política de acceso, compilador | — |
| `filtro` | igual que `escudo` | Igual, pero empieza en estado `filtrando` | — |
| `matriz` | `filas`, `columnas`, `celda` (lado), `separacion`, `h` | Cuadrícula: memoria, caché, tabla hash, particiones, buffer, cobertura, espacio de búsqueda, índice | — (cada celda tiene su estado) |

Guía de tamaños (unidades ≈ px): persona `r: 8`; servidor `w: 62, h: 78`; pieza intermedia `w: 56, h: 40`; cilindro `r: 30, h: 50`; agente `r: 24`; documento `w: 48, h: 62`; escudo `d: 64, h: 54`; celda de matriz `18–22`. Separa nodos apilados en vertical ≥ 150 px de `v` cuando son cajas altas. El motor encuadra el `viewBox` al contenido, pero mantén la composición equilibrada alrededor de `[0, 0]`.

**Renglones** (`documento`, `codigo`): `api.renglon(id, i, estado)` cambia el renglón `i` (0-based). En `documento` el renglón 0 es el título. Úsalos para señalar qué parte del texto está en juego, en paralelo con las líneas del inspector.

**Celdas** (`matriz`): `api.celda(id, fila, col, estado)`, `api.celdas(id, estado)` para todas, `api.celdaTexto(id, f, c, texto)` para una etiqueta mínima (1–3 caracteres: una clave, un número). La fila 0 / columna 0 es la esquina del fondo.

`escena.enlaces`: `[{ de, a, id?, pasos? }]`. El `id` por defecto es `"<de>-<a>"`. Un enlace es una línea fina en el suelo entre las bases. Las partículas no necesitan que exista el enlace, pero sin él el camino no se ve: crea los enlaces de todas las rutas que uses.

## Estados semánticos

`api.estado(id, estado)` aplica un estado visual neutral. El concepto decide qué significa.

| Estado | Aspecto | Úsalo para |
|---|---|---|
| `normal` | Tinta | Reposo |
| `foco` | Trazo de acento | «Mira aquí»: lo que está actuando ahora |
| `ok` | Trazo y tapa verdes (único color además del acento) | Resultado correcto, validado, encontrado |
| `alerta` | Trazo de acento | Atención: saturado, poco fiable, a punto de fallar |
| `error` | Trazo grueso de acento, caras teñidas | Falló, se rechazó, es peligroso |
| `atenuado` | Opacidad baja | No participa en este paso / desactivado |
| `apagado` | Atenuado y punteado | Caído o apagado |
| `inactivo` · `activo` · `saturado` | Halo del `agente`: punteado quieto · girando en acento · núcleo teñido | Agente esperando · pensando o trabajando · sin capacidad |
| `abierto` · `filtrando` · `cerrado` | Compuerta del `escudo`: panel transparente · rejilla · panel teñido de acento | Deja pasar todo · inspecciona · bloquea |

Celdas, renglones y líneas del inspector usan la misma escala: `vacia` (solo celdas), `normal`, `activa` (solo celdas), `foco`, `ok`, `alerta`, `error`, `atenuado`.

`api.destello(id, 'ok' | 'error' | 'foco')`: realce breve (0,7 s) sin cambiar el estado. Ideal para «pasó la validación» o «rechazado» en una compuerta.

El escudo no decide nada solo: cuando una partícula llega a él (`alLlegar`), el concepto decide si la reenvía (`api.enviar` hacia delante), la desvía (otra ruta) o la rechaza (`api.descartar` + `api.estado(id, 'cerrado')`).

## Modos de simulación

| Modo | Quién provoca los eventos | Úsalo para |
|---|---|---|
| `continuo` (por defecto) | `tick` genera eventos sin parar (tráfico, lecturas, mensajes) | Infraestructura y sistemas distribuidos: lo que importa es el comportamiento bajo carga |
| `turnos` | La persona, con **acciones** y **entradas** del inspector; cada una lanza una secuencia que se sigue paso a paso | Algoritmos, estructuras de datos, validación, agentes: lo que importa es qué le pasa a *una* entrada |
| `hibrido` | Ambos: un flujo de fondo en `tick` y acciones que lo alteran («lanzar lote», «inyectar fallo») | Testing por lotes, fuzzing, circuit breakers bajo carga, colas con ráfagas |

En `turnos` e `hibrido`:
- Escribe cada acción como una **función `async`** que usa `await api.viajar(...)` y `await api.esperar(seg)`: la secuencia se lee como el algoritmo.
- Al cambiar de paso, el motor limpia las partículas y abandona las secuencias en curso (no se mezclan entre pasos).
- Mientras una secuencia corre, `api.ocupado` es `true` y los botones de acción y entrada se desactivan, para no lanzar dos a la vez. Una acción con `esperar: false` sigue disponible (útil para «Reiniciar»).
- El tour (▶ Recorrer) espera a que termine la demostración del paso antes de avanzar.

## Pasos

```js
pasos: [{
  titulo: 'Retrieval: buscar lo parecido',  // igual que en «Cómo funciona»
  texto: 'La pregunta se convierte en un <b>embedding</b>…',  // 2–3 frases; admite <b>
  analogia: 'El bibliotecario recorre el fichero…',          // la misma idea en la metáfora
  foco: ['indice'],          // nodos destacados; el tour ▶ los recorre en orden
  duracion: 10,              // opcional: segundos en el tour (si no, se calcula por longitud)
  al_entrar(api) { … },      // deja el sistema en un estado conocido
  // Solo para turnos / híbrido (opcionales):
  demo: (api) => preguntar(…, api),   // secuencia async que muestra el paso; arranca sola al entrar
  demo_texto: '▶ Ver la conversación', // texto de su botón (por defecto «▶ Ver este paso»)
  demo_auto: false,                    // no arrancar sola; solo con el botón
  demo_retraso: 0.6,                   // segundos antes de arrancar sola
  acciones: [{ texto: 'Quitar el guardrail y repetir', fn: async (api) => { … } }], // solo en este paso
  entradas: ['ataque', 'vac'],         // qué entradas del inspector se muestran en este paso
}]
```

`al_entrar` debe dejar el sistema en un estado **conocido**, sin depender del paso anterior: la persona puede saltar a cualquier punto. Patrón: fija los controles que importan (`api.fijar`), reinicia el estado de la simulación y la vista, y programa los eventos del paso (`api.despues`). Los temporizadores creados dentro de `al_entrar` se cancelan solos al cambiar de paso.

## Inspector

Panel lateral (debajo en móvil) sincronizado con la escena. Es opcional: aparece solo si el concepto define `inspector`.

```js
inspector: {
  titulo: 'Prompt que recibe el LLM',
  subtitulo: 'Se arma de nuevo en cada pregunta.',
  vista: 'prompt',                     // etiqueta libre: codigo, estado, reglas, datos, prompt…
  lineas: [                            // vista estructurada: código, estado, reglas o datos
    { id: 'sys', texto: 'SISTEMA: …' },
    { id: 'l2', texto: 'if (x > 0)', sangria: 1, nota: 'x = 3' },
    { id: 'resp', texto: 'RESPUESTA: —', numero: '→' },  // número/símbolo propio
  ],
  entradas: [                          // disparadores clicables
    { id: 'vac', texto: '¿Cuántos días de vacaciones tengo?', detalle: 'tooltip opcional' },
  ],
  al_elegir: (entrada, api) => preguntar(entrada, api),  // o fn por entrada: { id, texto, fn(entrada, api) }
  traza: true,                         // lista «Lo que acaba de pasar» (por defecto true)
  trazaMax: 6,
}
```

- `api.resaltarLinea(id, estado)`, `api.lineaTexto(id, texto, nota?)`: la simulación marca la línea que se ejecuta o el dato que cambia. Úsalo para que el inspector y la escena cuenten lo mismo a la vez (p. ej. la línea 3 del código en `foco` mientras la partícula entra en el `escudo`).
- `api.limpiarLineas(estado?)` cambia solo los estados; `api.reiniciarInspector()` restaura textos, estados y vacía la traza.
- `api.traza(texto, estado?)` añade un evento breve a «Lo que acaba de pasar».
- `api.elegirEntrada(id)` lanza una entrada como si se hubiera tocado (útil en `demo`); `api.entradaActual` dice cuál fue la última.

## Acciones

```js
acciones: [   // globales: visibles en todos los pasos
  { texto: 'Insertar clave', fn: async (api) => { … }, principal: true },
  { texto: 'Reiniciar', fn: (api) => reiniciar(api), esperar: false },
],
```

Se muestran en una barra bajo el diagrama, en este orden: demostración del paso, acciones del paso, acciones globales. `principal: true` las destaca; `descripcion` añade un tooltip. Si `fn` devuelve una promesa, la escena queda ocupada hasta que termine.

## Panel de juego

`controles`: se pintan agrupados por `grupo`.

| `tipo` | Campos | Valor |
|---|---|---|
| `rango` | `id, etiqueta, min, max, paso?, valor, formato?(v)` | número |
| `opciones` | `id, etiqueta, opciones: [[valor, texto], …], valor` | el valor elegido |
| `interruptor` | `id, etiqueta, valor` | booleano |
| `boton` | `id, etiqueta` | dispara `al_cambiar(id, true)` |

`contadores`: `[{ id, etiqueta }]`. Úsalos para que el efecto de una interacción se lea en números.

Controles = **parámetros** del sistema (top-k, número de servidores, ¿hay guardrail?). Acciones y entradas = **causas** que la persona provoca (preguntar, insertar, lanzar un lote). No mezcles los dos papeles.

## Simulación

| Función | Cuándo se llama |
|---|---|
| `iniciar(api)` | Una vez, al cargar. Crea el estado y los temporizadores globales (`api.cada`). |
| `tick(dt, api)` | En cada fotograma, con `dt` en segundos (máx. 0,05). En modo continuo genera eventos; en todos los modos sirve para actualizar medidores y subetiquetas. |
| `al_cambiar(id, valor, api)` | Cuando cambia un control (por la persona o por `api.fijar`). |
| `acciones_nodo(id, api)` | Al tocar un nodo; devuelve `[{ texto, fn }]` para mostrar botones en la tarjeta («Apagar este servidor»). |

Lleva el tiempo dentro de la simulación (`resta -= dt` en `tick`, o `await api.esperar(seg)`), nunca con `setTimeout`: así todo se pausa con la pestaña y `EXPLICA.simular()` funciona.

## Objeto `api`

| Método | Qué hace |
|---|---|
| `api.paso` | Número del paso actual (1-based). |
| `api.modo` | El modo del concepto. |
| `api.valor(id)` / `api.fijar(id, v)` | Lee / cambia un control (actualiza la UI y llama a `al_cambiar`). |
| `api.nodo(id)` / `api.visible(id)` | El nodo (con `ancla`, `centro`) / si está visible en este paso. |
| `api.enviar(ruta, estilo, alLlegar?, opciones?)` | Lanza una partícula. `ruta`: ids de nodo, `'matriz:f,c'` para una celda, `{ nodo, celda: [f, c] }` o puntos `[x, y]`. `estilo`: `'peticion'` (punto de acento), `'respuesta'` (punto de tinta), `'ping'` (aro de acento), `'dato'` (aro de tinta) o `{ r, clase }`. `opciones`: `{ datos, etiqueta, velocidad }`. `alLlegar(p, api)` recibe la partícula (`p.datos`, `p.pos`). |
| `await api.viajar(ruta, estilo, opciones?)` | Igual que `enviar`, pero devuelve una promesa que se cumple al llegar. Para secuencias por turnos. |
| `await api.esperar(seg)` | Pausa una secuencia sobre el reloj de la simulación. |
| `api.ocupado` | `true` mientras corre una acción, entrada o demostración. |
| `api.ejecutar(fn)` | Lanza una secuencia como si fuera una acción (marca la escena como ocupada). |
| `api.limpiarParticulas()` | Quita todas las partículas en vuelo. |
| `api.medidor(id, 0..1)` | Nivel de llenado del nodo. |
| `api.estado(id, estado)` / `api.estadoDe(id)` | Ver [Estados semánticos](#estados-semánticos). |
| `api.destello(id, tipo)` | Realce breve: `ok`, `error` o `foco`. |
| `api.celda(id, f, c, estado)`, `api.celdas(id, estado)`, `api.estadoCelda(id, f, c)`, `api.celdaTexto(id, f, c, texto)` | Celdas de una `matriz`. |
| `api.renglon(id, i, estado)` | Renglón de un `documento` o `codigo`. |
| `api.sub(id, texto)` | Cambia la subetiqueta. |
| `api.enlace(id, 'normal' \| 'roto' \| 'activo' \| 'tenue')` | Roto = punteado; tenue = casi invisible (relaciones de fondo). |
| `api.descartar(p \| [x, y])` | Una × que cae y se desvanece: algo se perdió o se rechazó. |
| `api.pulso(id)` | Onda en el suelo bajo el nodo: «aquí se tomó una decisión». |
| `api.globo(id, texto, seg?)` | Bocadillo sobre el nodo, la voz de la analogía. Máx. ~5 palabras. |
| `api.aviso(texto)` | Mensaje breve sobre el diagrama para eventos importantes. |
| `api.resaltarLinea`, `api.lineaTexto`, `api.limpiarLineas`, `api.reiniciarInspector`, `api.traza`, `api.elegirEntrada`, `api.entradaActual` | Ver [Inspector](#inspector). |
| `api.contar(id, delta?)`, `api.contador(id, v)`, `api.reiniciarContadores()` | Contadores del panel. |
| `api.despues(seg, fn)`, `api.cada(seg, fn)`, `api.cancelar(t)` | Temporizadores sobre el reloj de la simulación. |
| `await api.simular(seg)` | Avanza la simulación sin esperar fotogramas (también las secuencias con `await`). Para verificar desde la consola: `await EXPLICA.simular(10)`. |

`window.EXPLICA` expone el mismo objeto en la consola del navegador.

## Familias

Elige la composición y el modo por la **familia** del concepto, no por la superficie. Son puntos de partida; adapta la escena a la metáfora elegida.

### 1. Infraestructura, redes y sistemas distribuidos
*Load balancer, caché, sharding, colas, circuit breaker, rate limiter, replicación.*
**Modo continuo.** Primitivas: `caja`, `cilindro`, `cola`, `escudo`, `persona`, `plano`. La interacción es sobre parámetros de carga (tráfico, nodos caídos, algoritmo) y se mide con contadores.

- **Caché e invalidación**: `persona` → `caja` app → `cilindro` caché (pequeño) y `cilindro` BD (`bandas: 2`). Partículas con `etiqueta` de clave. Hit vuelve rápido; miss va a la BD y llena la caché. Interacción: editar el dato en la BD sin invalidar → lectura obsoleta; botón «Invalidar»; TTL. Contadores: hits, misses, obsoletas.
- **Rate limiter (token bucket)**: `persona`s → `caja` con `detalle: 'abierta'` cuyo medidor son las fichas → servicio. Sin ficha → `descartar` y contador «429».
- **Sharding**: `caja` router → `cilindro`s sobre `plano`s. Variante con `matriz` para ver el reparto de claves (hot spots).
- **Message queue**: productores → `cola` → consumidores. Apagar un consumidor hace crecer la cola sin perder mensajes.
- **Circuit breaker**: servicio → `escudo` → dependencia. Errores seguidos cierran la compuerta (`cerrado`); tras un tiempo pasa a `filtrando` (half-open) y deja pasar una petición de prueba.

### 2. Código, algoritmos y estructuras de datos
*Recursión, tablas hash, árboles, ordenamiento, Git, compiladores, concurrencia, event loop.*
**Modo por turnos (o híbrido).** Primitivas: `codigo`, `matriz`, `caja`/`plano` para agrupar; **inspector con el código** y `resaltarLinea` en la línea que se ejecuta. Entradas = datos concretos para ejecutar («insertar "gato"», «ordenar [5, 2, 9]»).

- **Tabla hash**: `codigo` con la función hash, `matriz` de 1×N buckets. Cada inserción viaja al bucket `hash(k) % N`, `celdaTexto` con la clave, colisión en `alerta`. Control: N buckets; acción «Redimensionar».
- **Recursión**: una `cola` o columna de `caja`s como pila de llamadas que crece y decrece; inspector con la función y `nota` con los argumentos de cada marco.
- **Git**: `documento`s como commits, `plano`s como ramas; acciones «commit», «branch», «merge».
- **Concurrencia / condición de carrera**: dos `agente`s (hilos) y una `matriz` de 1×1 como variable compartida; modo híbrido con un botón «Con lock / sin lock».

### 3. Validación, seguridad y testing
*Autenticación, firewalls, validadores, fuzzing, property-based testing, inyección SQL, CORS.*
**Modo por turnos con lotes (o híbrido).** Primitivas: `escudo`/`filtro`, `codigo` (la regla o el validador), `matriz` (cobertura o resultados de casos). Entradas clicables = casos concretos (válido, límite, malicioso); acción «Lanzar lote» que dispara muchos y pinta la matriz.

- **Firewall / validador**: entradas → `escudo` → servicio. El inspector muestra las reglas; la regla que decide pasa a `foco` y luego a `ok` o `error`.
- **Fuzzing / property-based testing**: `agente` generador → `codigo` bajo prueba → `matriz` de resultados (cada celda un caso, `ok`/`error`). Acción «Lanzar 50 casos»; el inspector muestra el contraejemplo mínimo.
- **Autenticación**: `persona` → `escudo` (login) → `documento` (token) → recurso; el token viaja como partícula `dato` con `etiqueta`.

### 4. Agentes de IA y sistemas LLM
*RAG, tool use, multi-agent, memoria y contexto, guardrails, evaluación.*
Primitivas: `agente` (su medidor = contexto usado; su estado = pensando, saturado), `documento`/`codigo` (prompts, herramientas, respuestas), `escudo` (guardrails), `matriz` (índice vectorial, memoria). **Inspector con el prompt o el contexto** que ve el modelo, y entradas = preguntas o tareas concretas. Modo por turnos.

- **RAG**: ver `ejemplos/rag.concepto.js`.
- **Tool use**: `agente` + `documento`s como herramientas (calculadora, búsqueda, API). Cada llamada viaja con `etiqueta` del nombre de la herramienta; el inspector muestra el intercambio `tool_call` → `tool_result`.
- **Multi-agent**: varios `agente`s con un coordinador; mensajes como partículas `dato`; el inspector muestra el plan y quién tiene cada subtarea.
- **Ventana de contexto**: el medidor del `agente` llenándose; al saturarse (`saturado`) los mensajes viejos salen de una `matriz` de memoria.
