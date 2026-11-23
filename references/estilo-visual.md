# Estilo visual

Mezcla de dos referencias: **Hairline** (dibujo de línea fina, formal, casi monocromo, objetos que reaccionan al puntero, control de intensidad, tema claro/oscuro y tour con ▶) y **Designed to Scale** (sistemas en isométrico, fondo crema, animación del flujo real, recorrido paso a paso con texto breve). El motor ya implementa todo esto; estas reglas son para que el concepto que escribas lo aproveche y no lo ensucie.

## Principios

1. **Una idea por paso.** Cada paso añade o cambia una sola cosa en la escena. Si un paso necesita explicar dos mecanismos, son dos pasos.
2. **La analogía vive en la escena.** Cada nodo tiene su papel en la metáfora (`analogia`), los globos hablan con la voz de la metáfora («Pasen, yo los reparto») y la narración de cada paso tiene su chip de analogía. Si un paso no tiene traducción a la metáfora, la metáfora no era buena: vuelve a elegir.
3. **El movimiento es el contenido.** Las partículas existen para mostrar el flujo real, no para decorar. Si algo se mueve, debe significar algo (una petición, un dato, un ping). Nada de animaciones de adorno.
4. **El problema antes que la solución.** El primer paso muestra qué pasa sin el concepto (un servidor que no da abasto, la BD saturada de lecturas repetidas, un consumidor que pierde mensajes). Así la solución se entiende como respuesta a algo.
5. **Jugar es parte de entender.** El último paso, «Tu turno», deja todos los controles libres y su texto propone 2–3 experimentos concretos con lo que se va a observar.

## Color y forma

- Casi monocromo: tinta sobre crema (`#f4ebe0`), caras isométricas en tres tonos de crema. **Un solo acento** (terracota) para lo que importa ahora: peticiones, foco, alertas, rechazos. No añadas colores por concepto: si necesitas distinguir tipos de partícula, usa forma (punto lleno, aro, tamaño) antes que color.
- Objetos como formas simples: cajas, cilindros, personas de dos piezas, colas de cubos. Sin iconos ni ilustraciones detalladas. Un detalle mínimo distingue el papel (`rack` en servidores, `bandas` en bases de datos).
- Trazo de 1 px que no escala (`vector-effect`), así sigue siendo fino en móvil.

## Composición

- El flujo va de **izquierda a derecha** (origen → destino) y las réplicas se apilan en vertical. Es lo que el ojo espera.
- 5–9 nodos en pantalla como máximo. Si hay más, agrupa (un `plano` con etiqueta «4 réplicas» en lugar de 4 cajas).
- Etiquetas de 1–3 palabras. Las subetiquetas muestran estado vivo («3/4 ocupado · lento»), no explicaciones.
- Deja que el motor encuadre: no fuerces márgenes. Coloca las etiquetas (`lado`) donde no choquen con enlaces: a la derecha en la última columna, a la izquierda en la primera, abajo en las intermedias.

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
- [ ] Sin errores en consola; funciona a 375 px sin scroll horizontal.
- [ ] Cada `al_entrar` deja un estado conocido (se puede saltar a cualquier paso).
