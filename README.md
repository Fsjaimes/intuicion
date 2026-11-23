# explica-visual

> Entiende un concepto técnico nuevo con intuición primero y detalle después: una explicación en seis pasos y un diagrama isométrico interactivo que puedes recorrer y «jugar».

Una skill para [Claude Code](https://claude.com/claude-code). Le das un concepto («load balancer», «cache invalidation», «lo vi en un curso de AWS») y te propone 2–3 metáforas visuales; eliges una y te entrega:

| Parte | Qué incluye |
|---|---|
| **Explicación en el chat** | 1. La idea en una frase · 2. Analogía cotidiana · 3. Cómo funciona (pasos conectados con la analogía) · 4. Términos clave · 5. Cuándo se usa y cuándo no · 6. Preguntas para comprobar que lo entendiste |
| **HTML autocontenido** | Diagrama SVG isométrico sin dependencias externas (abre desde el disco), con flujo animado, recorrido paso a paso, tour ▶, control de intensidad, tema claro/oscuro, panel para «jugar» con el concepto y glosario |

Ejemplo terminado: [`ejemplos/load-balancer.html`](ejemplos/load-balancer.html) (con su explicación en [`ejemplos/load-balancer.md`](ejemplos/load-balancer.md)).

## Estilo

Mezcla de dos referencias:

- **[Hairline](https://hairline.lucasmarkes.com/skills)**: línea fina, formal, casi monocromo con un acento; lo que está bajo el puntero se eleva y sus vecinos reaccionan menos; control de intensidad, tema claro/oscuro y tour con ▶.
- **[Designed to Scale](https://designed-to-scale.vercel.app/#/load-balancing/1)**: sistemas en isométrico, fondo crema `#f4ebe0`, flujo animado (peticiones como puntos que viajan) y recorrido con anterior/siguiente y un texto breve por paso.

Las reglas completas están en [`references/estilo-visual.md`](references/estilo-visual.md).

## Cómo está hecho

```
explica-visual/
├── SKILL.md                    # flujo, formato de la explicación y reglas del diagrama
├── assets/
│   ├── base.html               # esqueleto de la página
│   ├── motor.css               # estilos y tokens de tema
│   └── motor.js                # motor: isometría, partículas, pasos, tour, controles
├── scripts/ensamblar.py        # concepto.js + motor → un único HTML autocontenido
├── references/
│   ├── motor-api.md            # API para escribir un concepto + recetas
│   └── estilo-visual.md        # principios de diseño y lista de comprobación
├── ejemplos/                   # load balancer completo (concepto, HTML y explicación)
└── evals/                      # casos de prueba (formato de claude plugin eval)
```

Cada concepto es un archivo corto (`<slug>.concepto.js`) que declara la escena, los pasos y la simulación. El motor es compartido, así que una mejora en él beneficia a todos los diagramas. Para regenerar el ejemplo:

```bash
python3 scripts/ensamblar.py ejemplos/load-balancer.concepto.js ejemplos/load-balancer.html
```

Requisitos: Python 3. Node.js es opcional (si está, el ensamblado revisa la sintaxis del JS).

## Instalación

Enlaza la carpeta en tus skills personales:

```bash
ln -s ~/Desktop/PROYECTOS/explica-visual ~/.claude/skills/explica-visual
```

Luego, en Claude Code: `/explica-visual load balancer`, o simplemente «explícame qué es el sharding».

## Probar la skill

Los casos de `evals/` cubren: proponer metáforas (caché), usar una metáfora dada (rate limiter), elegir la metáfora y explicar prerrequisitos (sharding), adaptar al contexto de entrevista (message queue) y no activarse para documentar un proyecto propio.

```bash
claude plugin eval . --allow-tools Write,Edit,Bash
```

## Licencia

MIT
