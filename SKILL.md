---
name: explica-intuicion
description: Explica un concepto técnico nuevo con intuición primero y detalle después (idea en una frase, analogía cotidiana, mecanismo paso a paso, términos clave, cuándo usarlo, preguntas de comprobación) y entrega un HTML autocontenido con un diagrama SVG isométrico, animado e interactivo que se recorre paso a paso y se puede «jugar». Úsala siempre que el usuario pida entender, explicar o visualizar un concepto técnico que no conoce («qué es un load balancer», «explícame el sharding», «no entiendo cache invalidation», «lo vi en un curso de AWS y no lo pillo», «hazme un diagrama de cómo funciona una message queue», «cómo funciona RAG», «qué es una tabla hash», «no entiendo la recursión», «cómo funciona un firewall»), aunque no pida un diagrama, y cuando diga /explica-intuicion. No la uses para documentar un proyecto propio, revisar código, ni para dudas puntuales de sintaxis que se responden en una línea.
---

# explica-intuicion

Ayuda a entender un concepto técnico **la primera vez que se encuentra**. La persona tiene base técnica pero aprende mejor de forma visual: necesita primero la intuición y después el detalle. Por eso la entrega tiene dos partes que cuentan la misma historia:

1. **La explicación en el chat**, en seis secciones fijas (abajo).
2. **Un archivo HTML autocontenido** con un diagrama isométrico que representa la analogía y el mecanismo, se recorre paso a paso y tiene al menos una interacción para «jugar» con el concepto.

La analogía y el diagrama deben bastar por sí solos para captar la idea. La parte técnica profundiza; no reemplaza la intuición.

## Flujo de trabajo

### 1. Recibe el concepto
Toma el concepto y el contexto si lo da («lo vi en un curso de AWS», «me salió en una entrevista»). El contexto decide el ejemplo real de la sección 5 y el tono: si viene de AWS, el ejemplo real es un ALB/ELB; si viene de una entrevista, incluye el trade-off que suelen preguntar.

Si el concepto depende de otro que probablemente no conoce (p. ej. *cache invalidation* depende de qué es una caché; *sharding* de qué es un índice o una clave), explícalo en una línea antes de seguir, tanto en el chat como en el primer paso del diagrama si hace falta.

### 2. Propón metáforas y deja que elija
Propón **2 o 3 metáforas visuales**, una línea cada una, y espera a que elija. Cada una debe ser concreta, dibujable con formas simples y **sostenerse en todo el mecanismo**, no solo en la idea general: si la analogía se rompe al llegar a los health checks o a la invalidación, no sirve. Marca la que recomiendas.

```
Para «Rate limiter» se me ocurren tres metáforas:
1. **Torniquete del metro con fichas** (recomendada): cada pasajero gasta una ficha y las fichas se reponen a ritmo fijo → token bucket.
2. **Portero de discoteca con contador**: deja entrar N personas por minuto y al resto los pone en fila.
3. **Grifo con embudo**: el agua entra como sea pero sale a goteo constante → leaky bucket.
¿Cuál prefieres?
```

Sáltate este paso si la persona ya dio la metáfora o dijo «elige tú».

### 3. Escribe la explicación y construye el HTML
Escribe primero la explicación (te obliga a fijar los pasos del mecanismo) y luego el diagrama a partir de ella: **cada paso del diagrama corresponde a un paso de la explicación técnica**, con el mismo título.

### 4. Revisa
Comprueba que el diagrama dice lo mismo que la explicación y que las interacciones funcionan (ver «Verificar» abajo). No entregues sin abrirlo.

### 5. Entrega
La explicación completa en el chat + la ruta del archivo HTML (y ábrelo en el navegador si hay uno disponible). Cierra con una línea invitando a pedir ajustes.

### 6. Ajusta según comentarios
«La flecha no se entiende», «hazlo más simple», «otro ejemplo». Edita el `.concepto.js` (no el HTML generado) y vuelve a ensamblar. Si piden simplificar, quita pasos o nodos antes que acortar textos: menos piezas en pantalla es lo que más ayuda.

## La explicación (orden obligatorio)

Usa exactamente estas seis secciones, en este orden, con estos títulos. Breve y concreta: la persona va a leer esto antes de abrir el diagrama.

```markdown
## 1. La idea en una frase
Qué es y para qué existe, sin jerga. Una sola frase.

## 2. La analogía
La metáfora elegida, contada en 2–3 frases, con los personajes que luego aparecen en el diagrama.

## 3. Cómo funciona
Pasos cortos y numerados. Cada paso: el mecanismo real + entre paréntesis su pieza en la analogía
(«El balanceador (el anfitrión) recibe la petición…»). Mismos pasos y títulos que el diagrama.

## 4. Términos clave
3–6 términos, una línea cada uno: **término** (traducción) — definición.

## 5. Cuándo se usa y cuándo no
Un ejemplo real (servicio, empresa o caso concreto) y sus límites o trade-offs: qué cuesta, qué rompe, qué alternativa hay.

## 6. Comprueba que lo entendiste
2–3 preguntas cortas que obliguen a aplicar la idea, no a repetir una definición.
Cada respuesta va oculta para que la persona piense antes de leerla:
<details><summary>Ver respuesta</summary>…</details>
```

**Idioma**: español. Los términos técnicos que la industria usa en inglés se quedan en inglés, con su traducción entre paréntesis la primera vez: *round robin (turno rotativo)*. Después, solo en inglés.

## El diagrama

### Cómo se construye
El HTML se arma a partir de un **motor compartido** (`assets/motor.js`, `assets/motor.css`, `assets/base.html`) más un archivo de **concepto** que escribes tú. El concepto declara la escena (nodos y enlaces en isométrico), los pasos con su narración, el modo de simulación, el inspector opcional, las acciones y los controles. El motor se encarga del resto: proyección isométrica, partículas que viajan, elevación al pasar el puntero con caída hacia los vecinos, control de intensidad, tema claro/oscuro, botón ▶ Recorrer (tour guiado), anterior/siguiente, teclado, táctil y glosario.

**El motor ofrece primitivas y estados semánticos neutrales; la narrativa vive en el concepto.** Las formas (`caja`, `cilindro`, `persona`, `cola`, `plano`, `agente`, `documento`, `codigo`, `escudo`, `filtro`, `matriz`) y los estados (`foco`, `ok`, `alerta`, `error`, `atenuado`…) no saben de servidores, prompts ni tablas hash: el concepto decide qué representan. No reescribas el motor para cada concepto. Si de verdad falta algo (una forma, un efecto), añádelo al motor **de forma general**, para que sirva a cualquier dominio, y documéntalo en `references/motor-api.md`.

**Elige modo y composición por la familia del concepto:**

| Familia | Modo | Primitivas | Inspector |
|---|---|---|---|
| Infraestructura, redes, sistemas distribuidos (load balancer, caché, colas, circuit breaker) | `continuo` | `caja`, `cilindro`, `cola`, `escudo` | Opcional |
| Código, algoritmos, estructuras de datos (recursión, tablas hash, Git, compiladores, concurrencia) | `turnos` / `hibrido` | `codigo`, `matriz` | El código con la línea en ejecución |
| Validación, seguridad, testing (auth, firewalls, fuzzing, property-based testing) | `turnos` con lotes / `hibrido` | `escudo`, `codigo`, `matriz` | Reglas o casos + entradas clicables |
| Agentes de IA y LLM (RAG, tool use, multi-agent, memoria) | `turnos` | `agente`, `documento`, `escudo`, `matriz` | El prompt o el contexto del modelo |

En modo continuo, la simulación corre sola en `tick` y se juega con parámetros. En modo por turnos, **la persona provoca la causa** (elige una entrada, pulsa una acción) y ve el efecto atravesar el sistema paso a paso; cada paso trae una `demo` que se repite con un botón.

1. Lee `references/motor-api.md` (la API, los modos y recetas por familia) y `references/estilo-visual.md` (reglas de diseño).
2. Abre el ejemplo más cercano a la familia del concepto: `ejemplos/load-balancer.concepto.js` (continuo) o `ejemplos/rag.concepto.js` (por turnos, con inspector, `agente`, `codigo`, `documento`, `matriz` y `escudo`). Úsalo como referencia de estructura, no como plantilla de layout: cada concepto merece su propia escena.
3. Escribe `<slug>.concepto.js`.
4. Ensambla:
   ```bash
   python3 <ruta-de-esta-skill>/scripts/ensamblar.py <slug>.concepto.js <slug>.html
   ```
   El script incrusta todo en un único HTML sin dependencias externas y revisa la sintaxis JS con Node si está instalado.

**Dónde guardar**: si la persona no dice otra cosa, en `explicaciones/` dentro del directorio de trabajo actual: `explicaciones/<slug>.concepto.js` y `explicaciones/<slug>.html`. Conserva el `.concepto.js`: es lo que se edita en el paso 6.

### Qué debe tener (resumen; el detalle está en `references/estilo-visual.md`)
- **La analogía y el sistema en la misma escena**: cada nodo lleva su `analogia` («El anfitrión») y la tabla «La analogía, pieza por pieza» las empareja. La metáfora se sostiene en todos los pasos.
- **4–7 pasos**, cada uno igual a un paso de «Cómo funciona». El primero suele mostrar **el problema** (lo que pasa sin el concepto); el último suele ser **«Tu turno»**, con todo el panel de juego libre.
- **Flujo real animado**: peticiones, datos o mensajes como puntos que viajan por los enlaces y producen efectos visibles (un servidor que se llena, una × cuando algo se rechaza, un aro para un health check).
- **Al menos una interacción con efecto visible**: subir el tráfico, apagar un nodo, cambiar el algoritmo, lanzar una entrada concreta, quitar una protección y repetir. Que se note la diferencia en segundos, con contadores que la cuantifiquen.
- **Si hay inspector**, cada evento de la escena se refleja en él en el mismo instante (línea resaltada, valor que cambia, evento en la traza).
- **Etiquetas cortas** (1–3 palabras), mucho espacio, nada recargado. Lo largo va en la narración del paso o en la descripción del nodo (se ve al tocarlo).

### Verificar
Antes de entregar:
1. El ensamblado no reporta errores de sintaxis.
2. Abre el HTML en un navegador (si hay herramientas de navegador, úsalas; si no, al menos `open <archivo>.html` en macOS) y revisa la consola: cero errores.
3. Recorre todos los pasos y comprueba que lo que se ve coincide con el texto de cada paso. Si la pestaña está en segundo plano, la animación se frena: usa `await EXPLICA.simular(10)` desde la consola para avanzar 10 s simulados (también las secuencias por turnos) y luego lee el estado (subetiquetas, contadores, líneas del inspector).
4. Prueba cada control, acción y entrada, y confirma que cambia algo visible y que los contadores y el inspector reaccionan como dice la narración. En modo por turnos, `EXPLICA.elegirEntrada('id')` lanza una entrada desde la consola.
5. Prueba a 375 px de ancho: sin scroll horizontal, etiquetas dentro del diagrama y sin superponerse; el inspector pasa debajo del diagrama.
6. Relee la explicación y el diagrama juntos: mismos pasos, mismos títulos, mismos nombres en la analogía.
