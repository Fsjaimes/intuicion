# Load balancer — explicación de ejemplo

Esto es lo que la skill entrega en el chat junto a `load-balancer.html`.

## 1. La idea en una frase
Un load balancer (balanceador de carga) recibe todas las peticiones de los usuarios y las reparte entre varios servidores, para que ninguno se sature y, si uno falla, los demás sigan atendiendo.

## 2. La analogía
Piensa en el **anfitrión de un restaurante**. Los clientes no eligen mesero: llegan a la puerta y el anfitrión los lleva con el mesero que puede atenderlos. Si un mesero tiene todas sus mesas llenas o se fue a casa, el anfitrión deja de llevarle gente.

## 3. Cómo funciona
1. **El problema: un solo servidor.** Todas las peticiones van a la misma máquina; cuando se llena, las peticiones esperan y luego se rechazan (un solo mesero para todo el restaurante).
2. **Llega el balanceador.** Los usuarios solo conocen la dirección del load balancer (el anfitrión en la puerta). Él reenvía cada petición a un servidor y la respuesta vuelve por el mismo camino.
3. **Round robin: por turnos.** El algoritmo más simple: una petición a cada servidor, en orden (el anfitrión sienta un cliente con cada mesero, sin mirar quién está más ocupado).
4. **Health checks: ¿sigues vivo?** Cada pocos segundos el balanceador pregunta a cada servidor si responde; si no, lo saca del reparto hasta que vuelva (el anfitrión se asoma: «¿puedes con otra mesa?»).
5. **Least connections: al menos ocupado.** Si los servidores no son iguales, mejor enviar al que tiene menos trabajo en curso (el anfitrión mira qué mesero tiene menos mesas).
6. **Tu turno.** Sube el tráfico, apaga servidores con y sin health checks, prueba sticky sessions.

## 4. Términos clave
- **Round robin** (turno rotativo) — reparte en orden, uno a cada servidor.
- **Least connections** (menos conexiones) — envía al servidor con menos trabajo en curso.
- **Health check** (chequeo de salud) — pregunta periódica para saber si un servidor sigue vivo.
- **Sticky sessions** (sesiones pegajosas) — el mismo usuario siempre va al mismo servidor.
- **Single point of failure** (punto único de fallo) — pieza que, si cae, tumba todo; por eso los balanceadores van en pareja.

## 5. Cuándo se usa y cuándo no
**Ejemplo real:** una tienda online en AWS pone un Application Load Balancer delante de varias instancias EC2; en Black Friday el auto scaling añade instancias y el ALB empieza a enviarles tráfico en cuanto pasan el health check.

**Límites:** el balanceador reparte, pero no hace más rápido a cada servidor; si el cuello de botella es la base de datos, añadir servidores no ayuda. Con sticky sessions, si cae el servidor de un usuario, este pierde su sesión: es mejor guardar la sesión fuera (Redis). Y el propio balanceador debe ser redundante.

## 6. Comprueba que lo entendiste
1. Tienes tres servidores y uno es el doble de lento. ¿Qué algoritmo elegirías y por qué?
   <details><summary>Ver respuesta</summary>Least connections: round robin le seguiría dando un tercio del tráfico aunque no pueda con él; least connections ve que tiene más trabajo pendiente y le envía menos.</details>
2. Apagas un servidor y durante unos segundos algunos usuarios ven errores. ¿Por qué no fue instantáneo?
   <details><summary>Ver respuesta</summary>El balanceador solo se entera en el siguiente health check; hasta entonces sigue enviando peticiones al servidor caído.</details>
3. Tu app guarda el carrito en la memoria del servidor. ¿Qué pasa con round robin y cómo lo arreglas?
   <details><summary>Ver respuesta</summary>Cada petición puede ir a otro servidor que no tiene el carrito. Se arregla con sticky sessions o, mejor, guardando la sesión en un almacén compartido.</details>
