---
Summary: 'Vocdoni and POAP joint proposal to provide a universally verifiable, affordable and offchain voting system for DevCon ticket-holders. Supports quadratic voting and other governance systems.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-16.md
DIP: 16
Title: Encuestas verificables fuera de cadena para Devcon 6
Status: Draft
Themes: Community Involvement, Ticketing
Tags: Software, Event production
Authors: Pau Escrich <pau@vocdoni.io>, Patricio Worthalter <worthalter@poap.xyz>, Ferran Reyes <ferran@vocdoni.io>
Resources Required: Communication support
Discussion: https://forum.devcon.org/t/dip-16-universally-verifiable-off-chain-polls-for-devcon-6/204
Created: 2021-01-05
---

## Resumen de la propuesta

Propuesta conjunta de Vocdoni y POAP para proporcionar un sistema de votación universalmente verificable, asequible y offchain para los poseedores de billetes de DevCon. Soporta votaciones cuadráticas y otros sistemas de gobernanza.

## Resumen

**Descripción de 200 palabras de la propuesta.**

Nuestra propuesta implica el desarrollo de una capa de gobernanza centralizada, escalable, asequible y universalmente verificable, completa con una gran UX/UI. Esto permitirá a los asistentes de Devcon ser escuchados y permitir una amplia gama de posibilidades para la organización del evento mientras estimula el conocimiento colectivo de la corona.

Lograremos este objetivo vinculando los esfuerzos de dos equipos experimentados en el campo de la gobernanza y la creación sin permisos: Vocdoni y POAP.

Con esta propuesta los asistentes -que son tenedores de tokens POAP- podrán votar en los muchos procesos de votación creados por los organizadores de Devcon usando [Vocdoni Bridge](https://www.notion.so/Introducing-Vocdoni-Bridge-cf7e73d38c4a45788358e9a1497cdf19), un sistema de votación basado en fichas que confía en la Pila Abierta de Vocdoni.

Para el proyecto piloto Q1 2021 proponemos utilizar el conjunto de datos de los asistentes de Devcon Osaka (que probablemente proporcionaría una representación precisa de los asistentes de Devcon 6). Los titulares de las fichas podrán votar usando algunas de las carteras más comunes incluyendo Metamask y Web3Modal. En los meses siguientes nos centraremos en desarrollar integraciones con varios otros, como Alphawallet.

La herramienta de votación se basará en el Open Stack de Vocdoni, un sistema de votación universalmente verificable, centrado en la privacidad y escalable como Layer2 para laveraging Ethereum y xDai-chain en tres tecnologías principales: Tendermint, libp2p e IPFS. Con esta lista seremos capaces de albergar un proceso de gobernanza transparente que incluya mecanismos de votación complejos como la votación cuadrática o de rango. Los resultados deterministas (calculados por todos los nodos blockchain de la capa 2) pueden ser enviados de vuelta a Ethereum para ejecutar operaciones de contrato inteligente. En un futuro próximo, combinado con [zk-SNARKs](https://docs.vocdoni.io/#/architecture/protocol/franchise-proof?id=zk-rollups-proposal-for-anti-coercion-scalable-and-deterministic-execution) votación anónima también será posible.

Después de este experimento, creemos que nuestra propuesta puede desarrollarse en una serie de nuevos casos de uso de gobernanza para Devcon en los meses y años siguientes incluyendo retroalimentación de eventos, los subsistemas de gobernanza, un mayor compromiso de empresas, proyectos e individuos, y más aún.

Del mismo modo, también será posible desarrollar estrategias de gobierno retroactivo incluyendo participantes de anteriores ediciones de Devcon a procesos de votación o incluso dando más poder de voto a quienes son asistentes recurrentes.

## Motivación & Racionalidad

**Debajo hay algunas sugerencias útiles**

- ¿Cómo mejoraría esto la experiencia de los asistentes?

Los asistentes podrán hacer oír sus voces e influir en algunas decisiones.

Los organizadores podrán aprovechar una capa de gobernanza que les permitirá incluir la aportación de los participantes en la toma de decisiones.

Otros asistentes activos como ponentes, patrocinadores o proyectos usarán una plataforma sin permisos para organizar votos usando diferentes tokens. Así se producirá un ecosistema de comunidades informales y una pequeña iniciativa de gobernanza en el futuro.

- ¿Cómo es esta solución mejor que una experiencia que no sea blockchain?

Vocdoni nació no sólo con el objetivo de crear una plataforma de votación segura, sino también una que sea universalmente verificable y resistente a la censura. Estos atributos hacen necesario el uso de tecnologías descentralizadas, como Ethereum, proporcionar transparencia y trazabilidad a todo el proceso y volverse resistente al ataque.

El uso de tecnologías descentralizadas, como todos sabemos, no está exento de la fricción. Y lo mismo puede decirse de la votación. Pero prestamos mucha atención a la experiencia del usuario y logramos una experiencia bien redonda en la que el usuario puede ni siquiera ser consciente de que está utilizando tecnologías descentralizadas.

- ¿Cómo introduce esta propuesta a los asistentes a un nuevo caso de uso de blockchain/ethereum?

Los sistemas de encuestas normalmente escalables que no utilizan DLT son muy difíciles de operar de forma fiable y con garantías de confianza de alta calidad. En la mayoría de los casos no ofrecen pruebas y en todos los casos son intensivos en recursos, resultando demasiado caro para todas las decisiones de bajo riesgo como los oradores en etapas.

Combinando las tecnologías existentes creadas por Vocdoni y POAP los participantes del evento aprenderán que los procesos de toma de decisiones colectivas superfluos son posibles casi sin costo alguno.

## Implementación

**Flujo de usuario**

0. POAP prepara a los organizadores de cañones + Devcon crear las preguntas & opciones para los procesos de votación.
1. Los asistentes acceden al Puente Vocdoni (a través de un navegador web o integraciones). Esto podría estar potencialmente en un dominio específico.
2. Los asistentes se conectan con su cartera donde tienen los tokens POAP.
3. Los asistentes votan a los oradores de cada tema mediante una votación cuadrática.
4. Los asistentes y terceros pueden validar los resultados usando un nodo de terceros o ejecutando su propio nodo

Nota: La Plataforma actual de Vocdoni incluye una aplicación cliente disponible en las tiendas de Google y Apple. Sin embargo, los usuarios de DevCon no usarán este cliente de aplicación, sino el nuevo DApp basado en la web que se está desarrollando ([Vocdoni Bridge](https://www.notion.so/Introducing-Vocdoni-Bridge-cf7e73d38c4a45788358e9a1497cdf19)) para reducir la fricción y hacer que la plataforma sea fácil de integrar con cualquier cliente de cartera de Dapp (Alphawallet, Estado, etc.).

Los usuarios y organizadores podrán realizar un seguimiento de los votos utilizando el explorador de [Vochain](https://explorer.vocdoni.net), una herramienta para extraer datos de los procesos de votación en el blockchain y hacerlos legibles y buscables.

- ¿Se ha aplicado alguna parte de esta propuesta en otros eventos? Si es así, por favor describa cómo se fue.

La tecnología de Tokens de POAP ha sido utilizada en muchos eventos físicos y virtuales, incluyendo DevCon, EthCC, EthDenver, EDcon y Dappcon. Ya hay más de 650 POAPs representando eventos.

Vocdoni Open Stack ha sido utilizado con éxito por varias organizaciones (municipios, asociaciones, cooperativas, empresas y organizaciones informales) para organizar encuestas de señalización, encuestas de eventos, reuniones generales anuales y elecciones.

La asociación cultural más grande de Europa (185. 00 miembros) ha utilizado Vocdoni para organizar sus Reuniones Generales Anuales y elecciones 2 años seguidos y gestionará una nueva elección el mes de enero de 2021.

- ¿Necesita comentarios o datos de los asistentes después del evento? Los comentarios no sólo serán bienintencionados, sino que también serán muy importantes. Especialmente para continuar mejorando la herramienta para cubrir las necesidades de gobernanza de Devcon y otros eventos de la comunidad. Esto es crucial, ya que la gobernanza implica ocuparse del comportamiento humano y este primer piloto sin duda aportará muchos insumos para mejorar el producto. Tendremos disponible un helpdesk (chat+chatbot+KnowledgeBase+ticketsystem) y podríamos establecer canales adicionales (por ejemplo, telegram) para recibir retroalimentación técnica, accesibilidad y UX/UI.

## Requisitos operacionales & Propiedad

**1. ¿Qué medidas son necesarias para aplicar la propuesta en Devcon?**

Para ejecutar este primer experimento para determinar un pequeño subconjunto de altavoces de Devcon (como se detalla en RFP-4) proponemos, porque las ventas de entradas para Devcon 6 Colombia aún no han comenzado, para usar el Puente Vocdoni como un sistema de votación basado en tokens que hace uso del conjunto de datos de POAP de Devcon 5 Osaka como un cemento para permitir a estos participantes elegir algunos de los altavoces de Devcon 6.

Creemos que los participantes de Devcon 5 son una buena representación de la Comunidad Ethereum que asistió a ediciones pasadas y probablemente futuras. Por lo tanto, el resultado de la votación sería muy similar a lo que se lograría con los titulares de tickets de Devcon 6.

Añadido a restricciones de tiempo, proponemos no usar la integración de AlphaWallet (DIP-6) para este experimento y hacer esta integración más tarde, después de este primer piloto.

Podemos garantizar una primera versión de la herramienta para principios de marzo y esperemos que a finales de febrero.

**Hoja de ruta y acciones requeridas**

Se prepara 7 semanas de trabajo (a partir de hoy) para tener la primera versión lista para la prueba piloto detallada en RFP-4.

- **Primera semana**
  1. Llamamiento conjunto para dar a conocer en profundidad la propuesta de Vocdoni y POAP y para resolver posibles dudas. También a través del foro de Devcon.
  2. Desarrollo del puente de Vocdoni
- **Segunda semana**
  1. Los organizadores de Devcon proporcionan una imagen detallada de cómo les gustaría organizar la votación y cómo se estructurará el contenido.
  2. Desarrollo del puente de Vocdoni
- **Tercera semana**
  1. Vocdoni Bridge dev: Integración con tokens POAP
  2. Vocdoni Bridge dev: Interfaz con votación simple y múltiple
  3. Devcon trae comentarios
  4. Demo
- **Cuatro semana**
  1. Vocdoni Bridge dev: Integración con tokens POAP
  2. Vocdoni Bridge dev: Frontend
  3. Vocdoni Bridge dev: Implementación de la votación cuadrática en el frontend
- **Cinco semanas**
  1. Vocdoni Bridge dev: Soporte para Web3modal
  2. Vocdoni Bridge dev: Abordando problemas
  3. Vocdoni Bridge dev: Personalizaciones de Devcon si es necesario
  4. Ejecutar una prueba
- **Seis semana**
  1. Ejecutar una prueba
  2. Vocdoni Bridge dev: Abordando problemas
- **Séptima semana**
  1. Ejecutar la última prueba antes de lanzar
  2. Iniciar
- **Para direccionar post-piloto**
  1. Vocdoni Bridge dev: integración de AlphaWallet
  2. Vocdoni Bridge dev: Mejoras avanzadas de privacidad
  3. Puente Vocdoni dev: Más opciones de tipo de votación
  4. Explora e introduce más estrategias anticolusión

3. ¿Quién será responsable de la aplicación efectiva de la propuesta? (es decir, trabajar el día 0) (es decir, trabajar el día 0)

El proyecto será coordinado por Pau Escrich (pau@vocdoni.io) y Patricio Worthalter (worthalter@poap.xyz). Vocdoni y POAP unen fuerzas con un equipo mixto de 4 desarrolladores trabajando en el proyecto.

Los equipos Vocdoni y POAP ya están trabajando en el proyecto para permitir a los poseedores de tokens POAP votar usando el puente Vocdoni a través de una UX/UI fácil (firmando con carteras como Metamask o Argent).

**Entregables y Propiedades\u00BB**

| #  | Entregable                              | Descripción               | Propietario |
| -- | --------------------------------------- | ------------------------- | ----------- |
| 1. | Sistema de votación basado en token web | <ul><li>Plataforma de voto del puente Vocdoni</li><li>Bibliotecas para tener compatibilidad con los tokens NFT</li><li>Despliegue bajo un dominio específico</li></ul> | Vocdoni     |
| 2. | Asistentes de Devcon                    | <ul><li>Devcon Osaka POAP token</li></ul> | PUEDAR      |
| 3. | Tipos de preguntas + copias             | <ul><li>Número de preguntas + opciones</li><li>Tipo de votación</li><li>Contenido</li></ul> | DevCon      |

4. ¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonus para la colaboración entre equipos :)) (Puntos de bonus para la colaboración entre equipos :))

El puente Vocdoni puede trabajar con tokens POAP, pero también con tokens ERC-721 y ERC20, permitiendo otras iniciativas de los organizadores, participantes, proyectos o patrocinadores para que surjan de forma natural a lo largo del evento. Dado que el sistema no tiene permiso, permite una forma muy fácil de ejecutar proyectos de gobernanza en el evento lo que puede significar un estallido de iniciativas que faciliten el empoderamiento de la comunidad, doocracia y más.

Creemos que podemos traer una capa de gobernanza para otras propuestas de mejora de DevCon como `DIP-1/DIP-12 Hacer que el carbono del desarrollo sea neutral` y ser fácilmente integrable con otros como `DIP-5 Keycard en Devcon`.

Además, nuestro sistema nos permite ir un paso más allá en el objetivo de integrar a la comunidad. recaudar aportes y tomar decisiones informadas durante todo el año, más allá de los días en que se celebra el evento.

**Siguiente & pasos potenciales después del piloto:**

- Integra Vocdoni Bridge con AlphaWallet
- Integra zk-SNARKs a través de la web para habilitar el voto anónimo (basado en circuitos Iden3 circom)
- Implementación del frontend de nuevos tipos de procesos de votación usando [Protocolo de votación](https://www.notion.so/vocdoni/Question-types-eaa2041ec5ec41ee8de642d7a7c062dd) como opción Pesada, ordenada, Rank, opción múltiple, . , e incluso otras votaciones exponenciales (¡no sólo cuadráticas!)
- Integración con otras carteras como Status.im

## Enlaces & Información adicional

- [Presentando el puente Vocdoni](https://www.notion.so/vocdoni/Introducing-Vocdoni-Bridge-cf7e73d38c4a45788358e9a1497cdf19)
- [Documentos de la pila abierta de Vocdoni](https://docs.vocdoni.io/)
- [IU del puente Vocdoni](https://www.figma.com/file/NO5wUEYxKgIppKz5fryBTR/Vocdoni-Bridge?node-id=0:1)
- [Vocdoni Github repo's](https://github.com/vocdoni)
- [POAP Github repo](https://github.com/poapxyz/poap)
- [Lista de eventos con tokens POAP](https://app.poap.xyz/admin/events)
