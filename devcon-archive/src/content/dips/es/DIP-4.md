---
Summary: 'We set up [Planetscape][planetscape], a dystopian escape game for [36C3][36c3] based on the dreadful effects of climate change (CCC did **not** sponsor the game).

Planetscape is organized in 20 chapters, and requires players to solve quests in real life, explore the congress to find hints and interact with people. Planetscape had **20 levels**, **254 players**, [**1300** transactions][ps:transactions] to the smart contract, and **7 teams** finished the game and claimed their prize.

The players" feedback was heartwarming: "We were about to leave the congress but we found Planetscape, and we stayed longer to play!", "Please make another escape game for the next congress!", "This was the best thing of the congress", "Highlight of this year" ([tweet][ps:highlight]).

During the game, players:

- Discovered new areas and activities, the game kept them engaged with the event.
- United forces with others while playing the game.
- Understood and enjoyed the theme of game.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-4.md
DIP: 4
Title: Juego de caza del tesoro
Status: Accepted
Themes: Social
Tags: Event Production
Authors: Alberto Granzotto <agranzot@mailbox.org>
Resources Required: Communication support, Access to the venue before the event starts
Discussion: https://forum.devcon.org/t/dip-a-treasure-hunt-game-for-devcon/45
Created: 2020-08-07
---

# Resumen de la propuesta

Desarrollar un juego para Devcon para empujar a la gente a explorar el evento, comprometerse con otras personas, y aprender cómo desarrollar una gran UX para una aplicación completamente descentralizada.

# Resumen

Un juego es una gran herramienta para romper el hielo e iniciar una conversación con otros, para descubrir los alrededores y aprender algo nuevo. Un juego también puede transmitir un mensaje para concienciar a la gente acerca de temas específicos, y puede ser divertido jugar sin ser ingenuo.

Proponemos construir un juego de caza de tesoros para Devcon usando tecnología descentralizada **solo** (sin APIs centralizadas). El juego requiere que los jugadores resuelvan misiones en la vida real, exploren la conferencia para encontrar pistas e interactuar con la gente. Para presentar soluciones y avances con la historia, los jugadores utilizan una aplicación web descentralizada desde su navegador (móvil).

Mezclando diferentes enfoques como prueba de conocimiento cero, redes de gasolineras y carteras de quemadores, el juego pretende ser un ejemplo de gran experiencia de usuario en términos de incorporación y jugabilidad.

El juego también es software libre y de código abierto para que otros desarrolladores puedan aprender de él.

# Motivación & Racionalidad


<!--

Social Dist0rtion Protocol (SDP), is a Decentralized Autonomous Organization from the future. We come from a time where transplanetary corporations commodified democracy, manipulated governments, and destroyed the environment, and there is nothing we can to to fix that. The only thing we have left is to travel back in time to convince humans to not repeat the same mistakes we did.

We know that Devcon attendees deeply care about the future of Gaia—our Mother Earth, and that's the reason why we want to connect with you.

We hereby propose to create a treasure hunt game
-->

Una Cacería de Tesoros (o Cacería de Scaveng) es un juego que se juega en un espacio físico como un edificio, un vecindario, una ciudad. El juego se construye alrededor de una historia y está organizado en niveles. Cada nivel contiene:

- **Una misión**: revela una parte de la historia y una pista sobre dónde encontrar el rompecabezas.
- **Un rompecabezas**: un acertijo a resolver para obtener una **contraseña**.
- **Una contraseña**: una cadena que permite al jugador pasar al siguiente nivel.

El juego no es una secuencia de rompecabezas desconectados a resolver. Los participantes descubren el capítulo de la historia por capítulo, interactuando con el espacio físico que les rodea.

Los juegos de caza del tesoro son personalizados y adaptados alrededor de una conferencia o evento. Un juego de caza de tesoros bien ejecutado sería una experiencia notable para los asistentes de Devcon porque anima a la gente a:

- **Descubrer.** El juego requiere explorar diferentes áreas del evento y descubrir lo que hay a su alrededor.
- **Socializar.** Hace que la gente se socialice fuera del contexto de hacer negocios y diviértete juntos. Individuales o grupos de jugadores pueden unirse y jugar juntos el juego.
- **Piense.** El juego está construido alrededor de una historia. Nuestro juego anterior mostró una historia que se desarrolla en un futuro donde las corporaciones transplanetarias comercializaron la democracia, manipuló a los gobiernos y destruyó el medio ambiente para advertir a la gente sobre el futuro distópico que enfrentan si no luchan.
- **Aprender.** El dApp para interactuar con el juego, los contratos inteligentes, y las herramientas para compilar e implementar la historia son software libre y de código abierto. Para luchar contra la centralización, debemos dejar de construir sistemas centralizados. Por eso todo el juego se desarrolla usando sólo Ethereum e IPFS, y no hay APIs centralizadas. El juego en sí es un escaparate de lo que se puede construir **hoy** utilizando protocolos descentralizados.

## Experiencia anterior

Configuramos [Planetscape][planetscape], un juego de escape distópico para [36C3][36c3] basado en los terribles efectos del cambio climático (CCC) **no** patrocina el juego).

El Planetscape está organizado en 20 capítulos, y requiere que los jugadores resuelvan las misiones en la vida real, exploren la congestión para encontrar pistas e interactuar con las personas. Planetscape tenía **20 niveles**, **254 jugadores**, [**1300** transacciones][ps:transactions] al contrato inteligente, y **7 equipos** terminaron el juego y reclamaron su premio.

El comentario de los jugadores fue reconfortante: "Estábamos a punto de dejar el atasco pero encontramos a Planetscape, ¡y nos quedamos más tiempo para jugar! , "¡Por favor haz otro juego de escape para la siguiente congreso! , "This was the best thing of the congress", "Highlight of this year" ([tweet][ps:highlight]).

Durante el juego, jugadores:

- Descubrieron nuevas áreas y actividades, el juego los mantuvo comprometidos con el evento.
- Fuerzas unidas con otros mientras juegan el juego.
- Encendido y disfrutó del tema del juego.

# Implementación

Hay dos aspectos relacionados con la aplicación de una caza de tesoros.

- El primero es el aspecto técnico: ¿cuál es la infraestructura necesaria para ayudar a los asistentes a jugar el juego? Esta parte será pública y libre y software de código abierto que cualquiera pueda auditar.
- El segundo está relacionado con la historia y los rompecabezas: ¿cuál es la trama del juego? ¿Qué tipo de rompecabezas necesitan resolver los jugadores para avanzar en el juego? Esta parte será desarrollada por pocas personas en un repositorio privado. El repositorio se publicará después del final del evento.

## Infraestructura técnica

El Protocolo de Dist0rción Social desarrolló [THC][thc] (Creador de Cacería del Tesoro). THC no es un juego en sí mismo. En cambio, es un marco para crear cacerías de tesoros descentralizadas. Dada una historia, THC genera todos los componentes necesarios para reproducir la caza del tesoro:

- Un dApp web que los jugadores utilizan para leer la historia, enviar contraseñas y comprobar la tabla de posiciones.
- Un contrato inteligente para almacenar la estructura de la historia, validar las presentaciones de los jugadores y leer la tabla de posiciones.
- Documentos JSON cifrados almacenados en IPFS que contienen el texto real de los capítulos.

```

.                                         +---------------------+
.                                         |
.                                 +------>+ IPFS: Nivel Enc |
+----------------+ | |
| | | | | +-------------+
| Juego |
| - Nivel 0 | +-------++ +---------------------+
| - Misión | | | | |
| - Puzzle +------>+ THC +------->+ ETH: Contrato inteligente |
| - Contraseña | | | | | | | |
| - Nivel N | +-------+---------------------+
| - . | |
| | | +---------------------+
+----------------+ | | |
.                                 +------>+ IPFS: dApp          |
.                                         |
.                                         +---------------------+
```

THC crea una aplicación _amigable con el usuario que se basa en la tecnología descentralizada sólo_. Queremos vivir el sueño descentralizado sin compromisos, desarrollar un potente dApp que usaría Ethereum bajo la capa sin exponer ningún detalle sobre blockchain e IPFS al jugador.

El juego tiene **incorporación instantánea** al permitir que la gente juegue solo visitando un sitio web. A estas alturas, esto sucede usando un método similar al de "burner-wallet" (el monedero del jugador se crea sobre la marcha cuando se abre la dApp por primera vez). Con el fin de hacer transacciones los jugadores necesitaban Ether. Mientras que el enfoque actual es simplemente [transferir][gasstation] una pequeña cantidad de Ether (prueba) a nuevos jugadores, queremos mejorar esto usando [OpenGSN][opengsn].

En el contexto de Devcon, y si se asigna una dirección de Ethereum a cada participante, usar OpenGSN funcionaría sin problemas porque podemos tener un `Paymaster` personalizado que solo paga a los asistentes reales.

### Prueba de conocimiento cero

Como se mencionó anteriormente, cada vez que se encuentra una contraseña correcta, se envía una transacción al contrato inteligente. Las transacciones de ethereum son públicas y no queremos que los jugadores eliminen las contraseñas enviadas por otros. Para evitarlo, aplicamos un sistema barato de prueba de conocimiento cero.

En primer lugar, necesitamos entender cómo un capítulo está asociado a su dirección. No queremos incluir contraseñas en el contrato inteligente, de lo contrario cualquiera podría leerlas. En su lugar, guardamos la dirección del capítulo. Para generar la dirección que hacemos:

```
chapter_address = private_key_to_address(
  private_key_from_seed(
    keccak256(
      capter_password)))
```

El `chapter_address` se utiliza para verificar si un usuario encontró la contraseña correcta.

El contrato inteligente almacena la siguiente información:

- Capítulos, identificados por su secuencial `id` como `id (id) [0, 2^96)`. Cada `id` apunta a:
  - La dirección **del capítulo**.
  - El ID de contenido de IPFS (CID) que apunta al contenido del capítulo.
  - La matriz de jugadores que llegaron al capítulo.
- Jugadores, identificados por su dirección de Ethereum (tipo `dirección`, que es un `uint160`). Cada jugador está asociado con el capítulo actual en el que se encuentran.

Hablando, el esquema de prueba de conocimiento cero funciona con la firma del capítulo de la dirección del jugador. El contrato inteligente tiene toda la información para verificar la firma. Si la firma es válida, el jugador puede pasar al siguiente capítulo.

Dado un `chapter_password válido` y un `player_address`, esta es la interacción entre el dApp y el contrato inteligente:

1. El dApp genera `chapter_seed = keccak256(chapter_password)`.
1. El dApp genera `chapter_private_key = private_key_from_seed(chapter_seed)`.
1. El dApp genera `chapter_proof = sign(player_address, chapter_private_key)`
1. DApp llama al método `submit` del contrato inteligente pasando `capter_proof`.
1. El contrato inteligente comprueba el actual `capter_address` para `player_address` en su almacenamiento.
1. Los contratos inteligentes calculan `signing_address` haciendo `ecrecover(player_address, firma)`.
1. Si `signing_address == chapter_address`, entonces el contrato inteligente actualiza el capítulo actual del jugador, moviéndolos al siguiente capítulo.

Puede encontrar más información sobre la [creación][zk:creation] y [verificación][zk:verification] de la prueba en el código fuente.

## Historia y rompecabezas

Un jugador comienza el juego visitando el sitio web del juego. Abriendo el sitio web el jugador tiene acceso al primer **capítulo** del juego que contiene tanto una pieza de la historia de fondo como una pista sobre dónde encontrar el **puzzle**. Si se resuelve, el rompecabezas revela la **contraseña** al siguiente capítulo. Al enviar la contraseña al sitio web, el jugador recibirá una nueva pieza de la historia y un nuevo rompecabezas a resolver, y así hasta el final del juego.

Un juego suele tener veinte capítulos de dificultad creciente. Como un clásico juego de escape, tanto la historia como los rompecabezas se integraron en el entorno circundante. En el contexto de **Planetscape**, el centro de congestión se convirtió en una base planetaria futurista rodeada de un poste apocalíptico. Los rompecabezas obligaban a los jugadores a moverse alrededor del progreso para encontrar códigos secretos (geocaching), utilizar el mapa de navegación interno para descubrir lugares específicos, encontrar un punto de acceso WiFi específico para conectarse a la red social que agravó la Internet gratuita, bloquear un cuadro para revelar la contraseña, y muchos otros.

Con el fin de desarrollar un juego similar para Devcon, la información sobre la zona de conferencias, las salas, el tema, la identidad visual debe ser conocida de antemano. Desarrollar una historia lleva algún tiempo.

# Requisitos operacionales & Propiedad

1. _¿Qué medidas son necesarias para aplicar la propuesta en Devcon?_

   - El juego debe ser desplegado pocos días antes de la conferencia. Los rompecabezas físicos y digitales deben estar listos el primer día del evento.
   - El juego bajo el subdominio `devcon.org` haría que el juego fuera más fiable.
   - Añade el enlace al juego a la guía de papel (si los hay) proporcionada en Devcon.
   - Si los diseñadores de Devcon tienen bandwitdh, cree algunos NFT oficiales "firmado por Devcon" para distribuirlos para los ganadores.

2. _¿Quién será responsable de la aplicación efectiva de la propuesta? (es decir, trabajar el día 0) (es decir, trabajar el día 0)_

   - El Protocolo de distensión social será responsable de la correcta aplicación de esta propuesta.

3. _¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonus para la colaboración entre equipos :)) (Puntos de bonus para la colaboración entre equipos :))_
   - Uno de los objetivos del juego es descubrir Devcon y sus proyectos. Conocer de antemano la lista de proyectos nos permitiría crear niveles a su alrededor.

# Enlaces & Información adicional

Puede encontrar información adicional aquí:

- :camera: [Las fotos](https://imgur.com/a/PCe4hCo) del dApp y algunos de los rompecabezas.
- :writing_hand: [Nuestro extenso post en el blog](https://www.dist0rtion.com/2020/01/30/Planetscape-a-dystopian-escape-game-for-36C3/) sobre el juego.
- :speaking_head: [relámpago](https://www.youtube.com/watch?v=7RJn2gowj2I) en IPFS Pinning Summit

[planetscape]: https://www.dist0rtion.com/2020/01/30/Planetscape-a-dystopian-escape-game-for-36C3/
[36c3]: https://events.ccc.de/congress/2019/wiki/index.php/Main_Page
[ps:transactions]: https://rinkeby.etherscan.io/address/0x4d9529698d112939ad540bc33caf11809fd1d684
[ps:highlight]: https://twitter.com/mediaquery/status/1212043098127241218
[thc]: https://github.com/social-dist0rtion-protocol/thc
[zk:creation]: https://github.com/social-dist0rtion-protocol/thc/blob/v0.0.1/app/src/Chapter.svelte#L21
[zk:verification]: https://github.com/social-dist0rtion-protocol/thc/blob/v0.0.1/eth/contracts/TreasureHuntCreator.sol#L66
[gasstation]: https://rinkeby.etherscan.io/address/0x197970e48082cd46f277abdb8afe492bccd78300
[opengsn]: https://opengsn.org
