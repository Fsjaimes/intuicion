# API del concepto

Un concepto es un archivo JS que asigna `window.CONCEPTO`. Lo habitual es envolverlo en una función para tener estado privado de la simulación:

```js
window.CONCEPTO = (() => {
  const S = {};                // estado de la simulación
  return { titulo: '…', /* … */ };
})();
```

Ejemplo completo: `ejemplos/load-balancer.concepto.js`.

## Contenido

1. [Campos de texto](#campos-de-texto)
2. [Escena: nodos y enlaces](#escena)
3. [Pasos](#pasos)
4. [Panel de juego: controles y contadores](#panel-de-juego)
5. [Simulación: iniciar, tick, al_cambiar, acciones_nodo](#simulación)
6. [Objeto `api`](#objeto-api)
7. [Recetas para conceptos típicos](#recetas)

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

## Escena

`escena.nodos`: lista de nodos. Campos comunes:

| Campo | Qué hace |
|---|---|
| `id` | Identificador único. |
| `tipo` | `caja`, `cilindro`, `persona`, `cola`, `plano`. |
| `pos` | `[u, v]`: dónde queda el centro de la base **en pantalla**, en px relativos al centro. `u` → derecha, `v` → abajo. El motor lo convierte a isométrico. |
| `etiqueta` | Nombre corto (1–3 palabras). |
| `sub` | Subetiqueta inicial (estado: «0/4 ocupado»). Se cambia con `api.sub`. |
| `lado` | Dónde va la etiqueta: `abajo` (por defecto), `arriba`, `derecha`, `izquierda`. |
| `analogia` | Su papel en la analogía («El anfitrión»). Se muestra al tocar el nodo. |
| `descripcion` | Una o dos frases que aparecen al tocar o pasar el puntero. Admite `<b>`. |
| `pasos` | `[desde, hasta]` (1-based, inclusivo): en qué pasos es visible. Sin él, siempre visible. |

Campos por tipo:

| Tipo | Campos | Uso típico | Medidor (`api.medidor`) |
|---|---|---|---|
| `caja` | `w`, `d` (= `w`), `h`, `detalle: 'rack'` (líneas de servidor) o `'abierta'` (sin tapa: cubeta) | Servidor, servicio, balanceador, cubeta | Relleno de acento que sube por las caras |
| `cilindro` | `r`, `h`, `bandas` (líneas horizontales: 2 = base de datos clásica) | Base de datos, caché, disco | Relleno que sube por el cuerpo |
| `persona` | `r` | Usuario, cliente, productor | — |
| `cola` | `slots`, `w` (lado de cada hueco), `separacion`, `h` | Message queue, buffer, fila de espera | Huecos llenos de derecha (salida) a izquierda |
| `plano` | `w`, `d` | Zona punteada en el suelo: región, shard, red privada | — |

Guía de tamaños (unidades ≈ px): persona `r: 8`; servidor `w: 62, h: 78`; pieza intermedia `w: 56, h: 40`; cilindro `r: 30, h: 50`. Separa nodos apilados en vertical ≥ 150 px de `v` cuando son cajas altas. El motor encuadra el `viewBox` al contenido, así que no hace falta centrar a mano, pero mantén la composición equilibrada alrededor de `[0, 0]`.

`escena.enlaces`: `[{ de, a, id?, pasos? }]`. El `id` por defecto es `"<de>-<a>"`. Un enlace es una línea fina en el suelo entre las bases. Las partículas no necesitan que exista el enlace, pero sin él el camino no se ve: crea los enlaces de todas las rutas que uses.

## Pasos

```js
pasos: [{
  titulo: 'Health checks: ¿sigues vivo?',   // igual que en «Cómo funciona»
  texto: 'Cada 2 segundos el balanceador… <b>health check</b>…', // 2–3 frases; admite <b>
  analogia: 'El anfitrión se asoma a cada rato…',                 // la misma idea en la metáfora
  foco: ['lb', 's3'],          // nodos destacados; el tour ▶ los recorre en orden
  duracion: 10,                // opcional: segundos en el tour (si no, se calcula por longitud)
  al_entrar(api) { … },        // prepara el estado de este paso
}]
```

`al_entrar` debe dejar el sistema en un estado **conocido**, sin depender del paso anterior: la persona puede saltar a cualquier punto. Patrón: fija los controles que importan (`api.fijar`), reinicia el estado de la simulación, programa los eventos del paso (`api.despues`). Los temporizadores creados dentro de `al_entrar` se cancelan solos al cambiar de paso.

## Panel de juego

`controles`: se pintan agrupados por `grupo`.

| `tipo` | Campos | Valor |
|---|---|---|
| `rango` | `id, etiqueta, min, max, paso?, valor, formato?(v)` | número |
| `opciones` | `id, etiqueta, opciones: [[valor, texto], …], valor` | el valor elegido |
| `interruptor` | `id, etiqueta, valor` | booleano |
| `boton` | `id, etiqueta` | dispara `al_cambiar(id, true)` |

`contadores`: `[{ id, etiqueta }]`. Úsalos para que el efecto de una interacción se lea en números: «Atendidas», «Rechazadas», «Cache hits», «Mensajes perdidos».

## Simulación

| Función | Cuándo se llama |
|---|---|
| `iniciar(api)` | Una vez, al cargar. Crea el estado y los temporizadores globales (`api.cada`). |
| `tick(dt, api)` | En cada fotograma, con `dt` en segundos (máx. 0,05). Genera eventos, avanza trabajos, actualiza medidores, estados y subetiquetas. |
| `al_cambiar(id, valor, api)` | Cuando cambia un control (por la persona o por `api.fijar`). |
| `acciones_nodo(id, api)` | Al tocar un nodo; devuelve `[{ texto, fn }]` para mostrar botones en la tarjeta («Apagar este servidor»). |

Lleva el tiempo de los trabajos dentro del estado (`resta -= dt` en `tick`), no con `setTimeout`: así la simulación se pausa con la pestaña y `EXPLICA.simular()` funciona.

## Objeto `api`

| Método | Qué hace |
|---|---|
| `api.paso` | Número del paso actual (1-based). |
| `api.valor(id)` / `api.fijar(id, v)` | Lee / cambia un control (actualiza la UI y llama a `al_cambiar`). |
| `api.visible(id)` | Si el nodo está visible en este paso. |
| `api.enviar(ruta, estilo, alLlegar?, opciones?)` | Lanza una partícula por `ruta` (lista de ids de nodo). `estilo`: `'peticion'` (punto de acento), `'respuesta'` (punto de tinta), `'ping'` (aro de acento), `'dato'` (aro de tinta) o `{ r, clase }`. `opciones`: `{ datos, etiqueta, velocidad }`. `alLlegar(p, api)` recibe la partícula (`p.datos`, `p.pos`). |
| `api.limpiarParticulas()` | Quita todas las partículas en vuelo (al reiniciar un paso). |
| `api.medidor(id, 0..1)` | Nivel de llenado del nodo. |
| `api.estado(id, 'normal' \| 'alerta' \| 'apagado')` | Alerta = trazo de acento; apagado = atenuado y punteado. |
| `api.sub(id, texto)` | Cambia la subetiqueta. |
| `api.enlace(id, 'normal' \| 'roto' \| 'activo')` | Roto = punteado tenue. |
| `api.descartar(p \| [x, y])` | Dibuja una × que cae y se desvanece: algo se perdió o se rechazó. |
| `api.pulso(id)` | Onda en el suelo bajo el nodo: «aquí se tomó una decisión». |
| `api.globo(id, texto, seg?)` | Bocadillo sobre el nodo, la voz de la analogía («¡No doy abasto!»). Máx. ~5 palabras. |
| `api.aviso(texto)` | Mensaje breve sobre el diagrama para eventos importantes («El Servidor 3 se cayó»). |
| `api.contar(id, delta?)`, `api.contador(id, v)`, `api.reiniciarContadores()` | Contadores del panel. |
| `api.despues(seg, fn)`, `api.cada(seg, fn)`, `api.cancelar(t)` | Temporizadores sobre el reloj de la simulación. |
| `api.simular(seg)` | Avanza la simulación sin esperar fotogramas. Para verificar desde la consola: `EXPLICA.simular(10)`. |

`window.EXPLICA` expone el mismo objeto en la consola del navegador.

## Recetas

Formas de llevar los conceptos típicos a la escena. Son puntos de partida; adapta la escena a la metáfora elegida.

**Caché y cache invalidation** — `persona` → `caja` (app) → `cilindro` caché (pequeño, cerca) y `cilindro` base de datos (grande, `bandas: 2`, lejos). Las partículas llevan `etiqueta` con la clave (`'user:42'`). Hit: vuelve rápido desde la caché. Miss: va a la base de datos, vuelve y se guarda en caché (medidor sube). Interacción: «Editar el dato en la BD» sin invalidar → la caché sirve datos viejos (el globo lo dice); botón «Invalidar»; control de TTL. Contadores: hits, misses, lecturas obsoletas.

**Rate limiter (token bucket)** — `persona`s → `caja` limitador con `detalle: 'abierta'` como cubeta cuyo medidor son las fichas → `caja` servicio. Cada petición gasta una ficha; las fichas se reponen a ritmo fijo en `tick`. Sin ficha → `descartar` y contador «429 Too Many Requests». Controles: ritmo de reposición, tamaño de la cubeta, ráfaga de un cliente abusivo.

**Sharding de bases de datos** — `persona` → `caja` router → 3–4 `cilindro`s, cada uno sobre un `plano` («Shard A: A–H»). Las partículas llevan la clave; el router aplica la shard key (rango o hash) y el `pulso` marca la decisión. Interacción: cambiar entre rango y hash con claves sesgadas (hot spot visible en un medidor), añadir un shard y ver cuántas claves se mueven.

**Message queue** — `persona`s productoras → `cola` (`slots: 6–8`) → `caja`s consumidoras. Los mensajes esperan en los huecos; los consumidores sacan a su ritmo. Controles: ritmo de producción, número de consumidores, «apagar consumidor» (la cola crece pero nada se pierde, frente a la llamada directa donde sí se pierde). Contadores: procesados, en cola, perdidos.

**Load balancer** — ver `ejemplos/load-balancer.concepto.js`.
