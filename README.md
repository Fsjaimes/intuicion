# intuicion

> Entiende un concepto técnico nuevo con intuición primero y detalle después: una explicación en seis pasos y un diagrama isométrico interactivo que puedes recorrer y «jugar».

Una skill para [Claude Code](https://claude.com/claude-code). Le das un concepto («load balancer», «cache invalidation», «lo vi en un curso de AWS») y te propone 2–3 metáforas visuales; eliges una y te entrega:

| Parte | Qué incluye |
|---|---|
| **Explicación en el chat** | 1. La idea en una frase · 2. Analogía cotidiana · 3. Cómo funciona (pasos conectados con la analogía) · 4. Términos clave · 5. Cuándo se usa y cuándo no · 6. Preguntas para comprobar que lo entendiste |
| **HTML autocontenido** | Diagrama SVG isométrico sin dependencias externas (abre desde el disco), con flujo animado, recorrido paso a paso, tour ▶, control de intensidad, tema claro/oscuro, panel para «jugar» con el concepto y glosario |

Ejemplos terminados:
- [`ejemplos/load-balancer.html`](ejemplos/load-balancer.html): flujo continuo de tráfico (explicación en [`ejemplos/load-balancer.md`](ejemplos/load-balancer.md)).
- [`ejemplos/rag.html`](ejemplos/rag.html): RAG con guardrail y memoria, por turnos, con inspector del prompt en vivo.

El motor ofrece primitivas neutrales (`caja`, `cilindro`, `persona`, `cola`, `plano`, `agente`, `documento`, `codigo`, `escudo`, `matriz`), estados semánticos (`foco`, `ok`, `alerta`, `error`…), un inspector sincronizado con la escena y dos modos de simulación: **continuo** (infraestructura bajo carga) y **por turnos** (algoritmos, validación, agentes de IA: la persona provoca la causa y ve el efecto).

## Estilo

Mezcla de dos referencias:

- **[Hairline](https://hairline.lucasmarkes.com/skills)**: línea fina, formal, casi monocromo con un acento; lo que está bajo el puntero se eleva y sus vecinos reaccionan menos; control de intensidad, tema claro/oscuro y tour con ▶.
- **[Designed to Scale](https://designed-to-scale.vercel.app/#/load-balancing/1)**: sistemas en isométrico, fondo crema `#f4ebe0`, flujo animado (peticiones como puntos que viajan) y recorrido con anterior/siguiente y un texto breve por paso.

Las reglas completas están en [`references/estilo-visual.md`](references/estilo-visual.md).

## Cómo está hecho

```
intuicion/
├── SKILL.md                    # flujo, formato de la explicación y reglas del diagrama
├── assets/
│   ├── base.html               # esqueleto de la página
│   ├── motor.css               # estilos y tokens de tema
│   └── motor.js                # motor: isometría, primitivas, partículas, pasos, tour, inspector, modos
├── scripts/ensamblar.py        # concepto.js + motor → un único HTML autocontenido
├── references/
│   ├── motor-api.md            # API para escribir un concepto + recetas
│   └── estilo-visual.md        # principios de diseño y lista de comprobación
├── ejemplos/                   # load balancer (continuo) y RAG (por turnos): concepto + HTML
└── evals/                      # casos de prueba (formato de claude plugin eval)
```

Cada concepto es un archivo corto (`<slug>.concepto.js`) que declara la escena, los pasos y la simulación. El motor es compartido, así que una mejora en él beneficia a todos los diagramas. Para regenerar el ejemplo:

```bash
python3 scripts/ensamblar.py ejemplos/load-balancer.concepto.js ejemplos/load-balancer.html
```

Requisitos: Python 3. Node.js es opcional (si está, el ensamblado revisa la sintaxis del JS).

## Instalación

La skill se llama `explica-intuicion`. Desde la raíz del repo, enlázala en tus skills personales con ese nombre (el nombre del enlace debe coincidir con el campo `name` de `SKILL.md`):

```bash
ln -s "$(pwd)" ~/.claude/skills/explica-intuicion
```

Luego, en Claude Code: `/explica-intuicion load balancer`, o simplemente «explícame qué es el sharding».

## Probar la skill

Los casos de `evals/` cubren: proponer metáforas (caché), usar una metáfora dada (rate limiter), elegir la metáfora y explicar prerrequisitos (sharding), adaptar al contexto de entrevista (message queue) y no activarse para documentar un proyecto propio.

```bash
claude plugin eval . --allow-tools Write,Edit,Bash
```

## Licencia

MIT
