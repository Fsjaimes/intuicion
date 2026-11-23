# Estilo visual

Mezcla de dos referencias: **Hairline** (dibujo de línea fina, formal, casi monocromo, objetos que reaccionan al puntero, control de intensidad, tema claro/oscuro y tour con ▶) y **Designed to Scale** (sistemas en isométrico, fondo crema, animación del flujo real, recorrido paso a paso con texto breve). El motor ya implementa todo esto; estas reglas son para que el concepto que escribas lo aproveche y no lo ensucie.

## Principios

0. **El motor da primitivas; el concepto cuenta la historia.** Formas (`caja`, `agente`, `matriz`…) y estados (`foco`, `ok`, `error`…) son neutrales y sirven a cualquier dominio. Lo que significan lo decide cada `.concepto.js`. Elige la composición por la familia del concepto (tabla abajo), no copies la escena del load balancer para todo.
1. **Una idea por paso.** Cada paso añade o cambia una sola cosa en la escena. Si un paso necesita explicar dos mecanismos, son dos pasos.
2. **La analogía vive en la escena.** Cada nodo tiene su papel en la metáfora (`analogia`), los globos hablan con la voz de la metáfora («Pasen, yo los reparto») y la narración de cada paso tiene su chip de analogía. Si un paso no tiene traducción a la metáfora, la metáfora no era buena: vuelve a elegir.
3. **El movimiento es el contenido.** Las partículas existen para mostrar el flujo real, no para decorar. Si algo se mueve, debe significar algo (una petición, un dato, un ping). Nada de animaciones de adorno.
4. **El problema antes que la solución.** El primer paso muestra qué pasa sin el concepto (un servidor que no da abasto, la BD saturada de lecturas repetidas, un consumidor que pierde mensajes). Así la solución se entiende como respuesta a algo.
5. **Jugar es parte de entender.** El último paso, «Tu turno», deja todos los controles libres y su texto propone 2–3 experimentos concretos con lo que se va a observar.
6. **Causa y efecto, no solo bucle.** Si el concepto trata de qué le pasa a *una* entrada (un algoritmo, una validación, una pregunta a un LLM), usa el modo por turnos: la persona elige la entrada, la lanza y la ve atravesar el sistema. El tráfico continuo es para conceptos cuyo interés está en el comportamiento bajo carga.

## Composición por familia

| Familia | Ejemplos | Modo | Primitivas | Inspector |
|---|---|---|---|---|
| Infraestructura, redes y sistemas distribuidos | Load balancer, caché, sharding, colas, circuit breaker | Continuo | `caja`, `cilindro`, `cola`, `escudo`, `persona`, `plano` | Opcional (reglas o estado) |
| Código, algoritmos y estructuras de datos | Recursión, tablas hash, árboles, Git, compiladores, concurrencia | Turnos o híbrido | `codigo`, `matriz`, `caja`, `plano` | Sí: el código, con la línea que se ejecuta resaltada |
| Validación, seguridad y testing | Auth, firewalls, validadores, fuzzing, property-based testing | Turnos con lotes o híbrido | `escudo`/`filtro`, `codigo`, `matriz` | Sí: reglas o casos, con entradas clicables (válida, límite, maliciosa) |
| Agentes de IA y sistemas LLM | RAG, tool use, multi-agent, memoria y contexto | Turnos | `agente`, `documento`, `escudo`, `matriz` | Sí: el prompt o el contexto que ve el modelo |

Recetas concretas por familia en `motor-api.md`, sección «Familias».

## Color y forma

- Casi monocromo: tinta sobre crema (`#f4ebe0`), caras isométricas en tres tonos de crema. **Un solo acento** (terracota) para lo que importa ahora: peticiones, foco, alertas, rechazos. No añadas colores por concepto: si necesitas distinguir tipos de partícula, usa forma (punto lleno, aro, tamaño) antes que color.
- **Única excepción: el verde apagado del estado `ok`.** Validaciones, tests y respuestas necesitan distinguir «correcto» de «fallo», y hacerlo solo con el acento confunde. Úsalo únicamente para resultados correctos (nunca como decoración ni para distinguir categorías).
- Objetos como formas simples: cajas, cilindros, personas de dos piezas, colas de cubos. Sin iconos ni ilustraciones detalladas. Un detalle mínimo distingue el papel (`rack` en servidores, `bandas` en bases de datos).
- Trazo de 1 px que no escala (`vector-effect`), así sigue siendo fino en móvil.

## Composición

- El flujo va de **izquierda a derecha** (origen → destino) y las réplicas se apilan en vertical. Es lo que el ojo espera.
- 5–9 nodos en pantalla como máximo. Si hay más, agrupa (un `plano` con etiqueta «4 réplicas» en lugar de 4 cajas).
- Etiquetas de 1–3 palabras. Las subetiquetas muestran estado vivo («3/4 ocupado · lento»), no explicaciones.
- Deja que el motor encuadre: no fuerces márgenes. Coloca las etiquetas (`lado`) donde no choquen con enlaces: a la derecha en la última columna, a la izquierda en la primera, abajo en las intermedias.

## Inspector

- Es la **otra mitad del diagrama**, no un anexo: cada evento importante de la escena tiene su reflejo en el inspector en el mismo instante (la partícula entra en el `escudo` y la regla que decide pasa a `foco`; la celda se pone en `ok` y la línea de datos cambia de valor).
- Líneas cortas, en monoespaciada, 5–10 como máximo. Si es código, que sea el código mínimo que explica la idea, no un programa real. Las `nota` muestran valores vivos (`x = 3`, `hash = 7`).
- Entradas: 3–6 casos que cubran lo típico, el borde y lo que rompe el sistema. Texto concreto, como lo escribiría una persona («¿Me reembolsan el taxi?», «insertar "gato"»), no «Caso 1».
- La traza («Lo que acaba de pasar») narra en frases de una línea; la última es la que importa.
- Si el inspector repite lo que ya dice la escena sin añadir nada, sobra: no lo pongas.

## Modo por turnos

- Cada acción o entrada es una secuencia `async` que se puede seguir con la vista: entre evento y evento, `await api.esperar(0.4–1)` para que el ojo llegue.
- Cada paso tiene una `demo` que arranca sola y se puede repetir con su botón. Añade 1–2 `acciones` de paso del tipo «Quitar X y repetir»: provocar el fallo es lo que más enseña.
- Antes de cada secuencia, limpia la vista (estados, celdas, inspector) para que solo se vea el recorrido actual.

## Narración de cada paso

- **Título**: el mismo que en «Cómo funciona», corto («Round robin: por turnos»).
- **Texto**: 2–3 frases. Dice qué mirar en el diagrama («mira la etiqueta del balanceador», «fíjate cómo su línea se vuelve punteada»). Negritas solo para el término nuevo del paso.
- **Analogía**: una frase con la misma idea en la metáfora.

## Interacción

- Toda interacción debe producir un cambio visible en ≤ 3 segundos y, si es posible, un contador que lo cuantifique.
- Las más didácticas son las que **rompen** algo: apagar un nodo, quitar la protección (health checks, invalidación, límite), subir la carga por encima de la capacidad. Ver fallar enseña por qué existe el mecanismo.
- Ofrece las acciones también en la tarjeta del nodo (`acciones_nodo`): tocar un servidor y apagarlo es más directo que buscar el interruptor.
- Todo debe funcionar sin hover: en táctil, tocar un nodo lo eleva y muestra su tarjeta.

## Ritmo

- Elige capacidades y tiempos para que el efecto del paso se vea en 3–6 segundos a la velocidad por defecto.
- Valores por defecto moderados (que el sistema funcione) y que el problema aparezca al mover un control. En el paso del problema, al revés: que se rompa solo.
- Usa `api.despues` para que los eventos clave ocurran solos dentro del paso (el servidor que se cae a los 3,5 s), y anúncialos con `api.aviso`.

## Lista de comprobación

- [ ] Cada paso del diagrama = un paso de «Cómo funciona», con el mismo título.
- [ ] La metáfora aparece en: línea de analogía, tabla pieza por pieza, `analogia` de cada nodo, chip de cada paso.
- [ ] Primer paso: el problema. Último paso: «Tu turno».
- [ ] Al menos una interacción con efecto visible y un contador que lo mida.
- [ ] Un solo color de acento; etiquetas de 1–3 palabras.
- [ ] El modo y las primitivas corresponden a la familia del concepto.
- [ ] Si hay inspector, cada evento de la escena se refleja en él al mismo tiempo.
- [ ] En modo por turnos: cada paso tiene `demo`, y las entradas cubren caso típico, borde y fallo.
- [ ] Sin errores en consola; funciona a 375 px sin scroll horizontal ni etiquetas superpuestas.
- [ ] Cada `al_entrar` deja un estado conocido (se puede saltar a cualquier paso).
