---
Summary: 'Implement an attestation-based ticketing system on Ethereum for Devcon. The solution will use two attestations, a ticket attestation and an email attestation, to verify the authenticity of a ticket holder for both on-chain and off-chain use cases. This system will function independently of Pretix.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-6.md
DIP: 6
Title: Solución de ticketing basada en comprobación para Devcon
Status: Accepted
Themes: RFP-1 On-chain Ticketing
Tags: Event Operations, Event Production, Software
Authors: Weiwu Zhang <weiwu.zhang@alphawallet.com>, Sunil Tom <sunil.tom.jose@alphawallet.com>, Victor Zhang <victor.zhang@alphawallet.com>
Resources Required: software development, operations Support and tech support
Discussion: https://forum.devcon.org/t/attestation-based-ticketing-system-that-is-managed-by-ethereum-smart-contracts-and-integrated-with-pretix-re-rfp-1-onchain-ticketing/54
Created: 2020-08-13
---

## Resumen de la propuesta

Implementar un sistema de ticketing basado en verificación en Ethereum para Devcon. La solución utilizará dos certificaciones, un certificado de ticket y un certificado de correo electrónico, para verificar la autenticidad de un billete para los casos de uso tanto en cadena como fuera de la cadena. Este sistema funcionará independientemente de Pretix.

## Resumen

En el momento de la compra de un ticket, Devcon emitirá la certificación del asistente por correo electrónico de confirmación, junto con un código QR tradicional generado por el sistema Pretix. Este certificado de ticket será compartido en el correo electrónico como una URL, apuntando a una página web de tickets donde la verificación se convertiría y almacenaría en la caché del navegador como una cookie. Los certificados enlazarán cada ticket a la dirección de correo electrónico correspondiente del asistente, mientras que el código QR compartido en el correo electrónico de confirmación del ticket o página web continuará sirviendo como un ticket tradicional.

Este certificado de ticket será reconocido por los sitios web y dApps que utilizan las bibliotecas de certificación proporcionadas por el equipo de AlphaWalet. Utilizando la certificación del ticket junto con el certificado de correo electrónico correcto, los sitios web y dApps podrán autenticar a los titulares de tickets y proporcionar acceso privilegiado a contenidos o acciones. Esta solución permite a los asistentes de Devcon utilizar cualquier función inteligente basada en contrato proporcionada por Devcon o sus socios como votar o comprar productos y servicios exclusivos. Vale la pena señalar que el asistente no necesita enviar una transacción "aprobada" para comenzar a usar su ticket como un crypto-token.

Este enfoque proporciona un camino costo-efectivo, flexible y de privacidad que preserva el camino para Devcon y los asistentes. Permite al asistente crear una dirección de Ethereum antes o después de la compra de la entrada, o utilizar su elección de dirección para interacciones en línea. A través de criptografía elíptica y pruebas de conocimiento cero, tenemos un protocolo, [protocolo seguro](http://tokenscript.org/Cheque/send_token_by_identifier.html), para habilitar las verificaciones para una dirección de correo electrónico sin revelarlo.

## Motivación & Racionalidad

La mayoría de los usuarios de criptomonedas sólo utilizan tokens como fungibles o NFT en la cadena. Creemos firmemente en un futuro en el que los tokens son la opción más obvia para conectar los derechos y servicios en el mundo digital y físico.

Los boletos son uno de los mejores casos de uso para demostrar cómo se pueden usar los tokens de criptomonedas y blockchain para casos de uso del mundo real. La solución propuesta para blockchain no es sólo tan barata y rápida como el sistema actual, pero también proporciona un montón de características que no pueden ser proporcionadas por los Tickets tradicionales. Estos incluyen:

- Facilitar un mercado secundario sin franqueza, de acuerdo con las reglas del contrato inteligente
- Eliminación del fraude de tickets
- Integración ilimitada con una gama de servicios

Esta solución también puede convertir a usuarios no criptográficos en usuarios de Ethereum, ya que los asistentes pueden utilizar la certificación de sus tickets emitidos como un token de Ethereum. Si podemos mantener y abrir el sistema a otros organizadores de eventos, traerá millones de nuevos usuarios a Ethereum. Actualmente, hay 940 millones de titulares de billetes digitales únicos en todo el mundo; si podemos convertir sólo el 5% de ellos, podemos traer 47 millones de nuevos usuarios a Ethereum (la mitad del total de direcciones únicas de Ethereum a partir de esta escritura).

## Implementación

Los módulos principales de este sistema de ticketing basado en contratos inteligentes ya han sido implementados por AlphaWallet en proyectos anteriores como [FIFA 2018](https://AlphaWallet.com/for-business/case-study-tickets/) y UEFA 2020.

Los trabajos clave que hay que hacer incluyen:

- Integración del sistema de certificación de entradas en la confirmación de compra de entradas. Este componente generador de certificaciones sería creado por AlphaWallet, con integración en el servicio de verificación de correo electrónico implementado por el equipo de Devcon.
- Un servicio de verificación por email
- Componentes JavaScript de Attestation para sitios web
- Biblioteca de atención para contratos inteligentes

El servicio de certificación por correo electrónico creado por AlphaWallet permitirá a los asistentes reclamar sus certificados en el sitio web attestation.id. Esto viene acompañado del objetivo de crear un ecosistema descentralizado de atestiguadores en beneficio del enriquecimiento de las funciones de los contratos inteligentes y de la reducción de las transacciones en cadena. Estos certificados pueden ser reutilizados.

### Cuadro

![Tablero para ticketing basado en certificaciones](images/Storyboard_pic_DIP6.jpg)

### Ataques

Un sistema de ticketing basado en Attestation asegura privacidad, flexibilidad y eficiencia de costos para la implementación de ticketing en blockchain. Se trata de dos certificaciones:

Attestation #1 : Enlaza el ticket con una dirección de correo electrónico (proporcionada por el sistema de ticketing en el momento de la compra).

Attestation #2 : [para usuarios criptográficos] Enlaza una dirección de Ethereum con una dirección de correo electrónico (adquirida por el usuario a través de un navegador dApp).

![Atención involucrada](images/DIP-Ticket_Attestations.svg)

Attestation #1 es el "ticket tradicional". Se emite por correo electrónico después de confirmar el pago en el sitio web de compra de boletos como código QR y [enlace mágico](https://tokenscript.org/MagicLink.html). el usuario no está obligado a tener una dirección de Ethereum en esta etapa.

El sitio web attestation #2 puede ser emitido por attestation.id. El proceso de adquisición de la certificación #2 sería un simple proceso guiado. El usuario visitará un sitio web donde el usuario verifica su correo electrónico para recibir un certificado que se guardará en el navegador dApp como cookie, o en la cartera del usuario (si la cartera puede reconocer los certificados).

Cuando el usuario desea interactuar con una función de contrato inteligente, como votar, el usuario llamará al contrato inteligente con la certificación #1 y #2. Juntos demuestran que la dirección de los remitentes de transacciones Ethereum es la del asistente. Tal implementación preservaría la privacidad del usuario, ya que estos certificados no revelan la dirección de correo electrónico real. Por favor, revisa el [protocolo seguro](https://tokenscript.org/Cheque/send_token_by_identifier.html) para más detalles.

Además, se puede generar la prueba de propiedad de un ticket a partir de [TokenScript](https://tokenscript.org/), lo que permite a un sitio web reconocer a los titulares de tickets de Devcon. Esto es útil para los titulares de boletos para reservar servicios o solicitar un descuento. Podemos crear un sitio web de ejemplo para que los proveedores de servicios lo copien.

### Flujo de Procesos

El diagrama de natación adjunto muestra cómo las diferentes partes implicadas en el proceso de ticketing usarían la solución para probar y verificar la autenticidad del billete.

![Proceso_Flow](images/Swimlane_DIP6.jpg)

**Integración con Pretix**

- No hay integraciones a la solución Pretix, según el último diseño. La aplicación actual para el check-in del ticket Pretix seguirá siendo usada como está.

**Implementaciones anteriores**

Nuestra primera implementación de entradas fue en 2018, como un experimento con Shankai Sports para tokenise los billetes VIP de la Copa Mundial de la FIFA 2018. El experimento tuvo éxito, donde 50 usuarios recibieron enlaces mágicos a través del correo electrónico y 28 de ellos convirtieron esos enlaces mágicos en tokens de Ethereum.

La próxima implementación completa fue en 2019, con Shankai Deportes tokenising tickets de evento VIP del Campeonato O. O 2020 con pases de hospitalidad integrados (Los tickets fueron tokenizados y las aplicaciones estaban listas para ir, pero el evento se canceló 😭😭😭)

En 2019, también trabajamos para implementar entradas de eventos EDCON 2020 en blockchain. Una vez más, la aplicación y los tickets estaban listos, pero gracias al pandemic, el evento se canceló 😭😭😭.

## Requisitos operacionales & Propiedad

**Acciones requeridas para implementar la propuesta en Devcon**

1. ¿Qué medidas son necesarias para aplicar la propuesta en Devcon?

Desarrollo:

- Mejorar nuestro sistema de ticketing basado en certificados y contratos inteligentes
- Optimizando características para Devcon
- Desarrollo y despliegue inteligente de contratos de tickets
- Desarrollo del sitio web Devcon dApp
- Ejemplo de páginas web y Dapps para ayudar a implementar los componentes
- Pruebas iniciales y comentarios (antes del evento)

Las operaciones para el evento deberían ser más o menos las mismas que el Devcon anterior. Se necesitaría más apoyo técnico para las personas que están probando el nuevo sistema.

2. ¿Quién será responsable de la aplicación de la propuesta? (es decir, trabajar el día 0) (es decir, trabajar el día 0)

AlphaWallet y el equipo de Devcon serán responsables de la implementación. La gobernanza del proyecto se realizaría a través de reuniones semanales o de forma duradera gestionadas de forma ágil.

**Entregables y posesiones:**
| #   | Entregable                                               | Descripción                | Propietario                     |
| --- | -------------------------------------------------------- | -------------------------- | ------------------------------- |
| 1.  | Atributos de ticket de Devcon                            | <ul><li>Todos los atributos que definen un ticket.</li></ul>  | Discón                          |
| 2.  | Módulos de Attestation                                   | <ul><li>Biblioteca para sitios web que gestionen los certificados, que están disponibles como cookie en el navegador.</li><li>Los sitios web creados por Devcon y otras terceras partes que quieran verificar un portador de tickets válido de Devcon tendrán que incorporar esta biblioteca en su sitio web.</li></ul>  | AlphaWallet                     |
| 3.  | Biblioteca Attes.sol                                     | <ul><li>Biblioteca para contratos inteligentes para gestionar los certificados, para verificar un titular de tickets válido.</li></ul>  | AlphaWallet                     |
| 4.  | Documentaciones de la biblioteca                         | <ul><li>Documentación para las bibliotecas TS_Attestation.js y Attes.sol.</li></ul>  | AlphaWallet                     |
| 5.  | Sitio web de Attestation.id                              | <ul><li>El sitio web que envía OTP para verificar el ID de correo electrónico del usuario y genera la comprobación de correo electrónico. </li></ul>  | AlphaWallet                     |
| 6.  | Página web de ejemplo: Página web del emisor de tickets  | <ul><li>Un sitio web de muestra que muestra sólo los detalles del ticket y genera una cookie de verificación de tickets para ser almacenada en el navegador del usuario. </li></ul>  | AlphaWallet                     |
| 7.  | Ejemplo dApp: DApp simple usando certificados            | <ul><li>Un simple ejemplo de aplicación distribuida para mostrar cómo implementar la verificación de certificación. Utiliza un contrato inteligente de marcador de posición.</li></ul>  | AlphaWallet                     |
| 8.  | Generador de Attestation de Ticket                       | <ul><li>Componente Java para crear enlaces para la certificación de tickets.</li></ul>  | AlphaWallet                     |
| 9.  | Rutina del correo electrónico de verificación de tickets | <ul><li>Utilice el componente generador de certificados de tickets para crear certificaciones e incorporarlo en los correos electrónicos de confirmación de ticket.</li></ul>  | Discón                          |
| 10. | Página de Ticket de Devcon                               | <ul><li>La página web a la que el enlace de verificación de tickets dirige al usuario. </li></ul>  | Discón                          |
| 11. | Devcon Dapps                                             | <ul><li>Las Dapps que permiten a los usuarios votar, generan NFT etc basado en la verificación de tickets.</li></ul> | Discón                          |
| 12. | Dapps de terceros                                        | <ul><li>Cualquier otro servicio que pueda ser ofrecido por la comunidad, para titulares de boletos válidos.</li></ul> | Equipos de terceros respetuosos |

---

3. ¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonus para la colaboración entre equipos: tly_smiling_face:🚀) (Puntos de bonus para la colaboración entre equipos: tly_smiling_face:🚀)

Cualquier servicio que requiera verificar a los asistentes, tales como descuento para los productos, vales redimibles, desbloqueo de contenido, IoT (puerta abierta, pantalla de control), colateral para DeFis y otros.

El proyecto [CO2ken](https://forum.devcon.org/t/co2ken-carbon-neutral-devcon/27) es un equipo ideal para colaborar e integrar su propuesta (DIP-1) para proporcionar a los asistentes la opción de desactivar algunas de las emisiones de carbono causadas por el evento. Esta funcionalidad se puede añadir al sitio web de Devcon dApp y cualquier usuario que use el sitio web puede apoyar la causa donando tokens a CO2ken

## Enlaces & Información adicional

**Preguntas posibles**

1. ¿Pueden funcionar los Tickets sin conexión a Internet? R. Sí, el billete se puede utilizar para facturar sin conexión a Internet. Este fue uno de los requisitos clave para las implementaciones de la FIFA y la UEFA. Sin embargo, será necesario que Internet acceda a las características avanzadas de dApp ofrecidas por el boleto, como votar.

2. tbc

**Enlaces**

- [Enlace al Foro de Devon — solución de Ticketing basada en Attestation DIP](https://forum.devcon.org/t/attestation-based-ticketing-system-that-is-managed-by-ethereum-smart-contracts-and-integrated-with-pretix-re-rfp-1-onchain-ticketing/54)
- [Sitio web de AlphaWallet](https://alphawallet.com/)
- [Estudio de caso de FIFA Tickets](https://alphawallet.com/for-business/case-study-tickets/)
- [Pretix Solution GitHub](https://github.com/pretix/pretix)
- [AlphaWallet GitHub](https://github.com/AlphaWallet)
