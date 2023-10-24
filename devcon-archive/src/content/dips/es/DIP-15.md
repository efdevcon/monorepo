---
Summary: 'A lot of people will travel to DevConVI. This will impose a number of risks to these people:
flight Delays, baggage loss, theft, and others. We will build a decentralized travel insurance for DevConVI participants.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-15.md
DIP: 15
Title: Seguro de viaje
Status: Draft
Themes: Travel, Safety
Tags: DeFi, Insurance, Peer2Peer
Authors: Christoph Mussenbrock <christoph@etherisc.com>
Resources Required: CustomerSupportBooth at DevConVI
Discussion: https://forum.devcon.org/t/dip-15-travel-insurance/176
Created: 2020-11-27
---

## Resumen de la propuesta

Muchas personas viajarán a DevConVI. Esto impondrá una serie de riesgos a estas personas: retrasos de vuelo, pérdida de maletas, robo y otros. Construiremos un seguro de viaje descentralizado para los participantes de DevConVI.

## Resumen

Ofrecemos un seguro de vuelo para los asistentes de DevconVI.

Después de registrarse, la gente selecciona su(s) vuelo(s) y paga una pequeña prima (alrededor de 10 USD$-25$) en algunas monedas estables, p.e. USDC, DAI, etc. A través de un oráculo se calcula el riesgo de retraso del vuelo. Después del aterrizaje, el retraso real es determinado por una segunda llamada de oráculo y en caso de retraso, el pago se calcula e inmediatamente se transfiere a la cartera de clientes. Actualmente estamos hablando con [Team WindingTree](https://windingtree.com) para integrar el seguro en la solución de agencia de viajes de windingtree. El oráculo es proporcionado por [Chainlink](https://chain.link). El proceso empresarial central se ejecuta en nuestro "[Marco de Seguro Genérico](https://github.com/etherisc/GIF)" y no necesita necesariamente ningún componente fuera de la cadena, que, sin embargo, se facilitan para su comodidad.

Exploraremos si otros productos de seguros relacionados con viajes pueden ser implementados de manera similar. . pérdida de maldito, robo y otros, dependiendo de la disponibilidad de datos de pérdida confiables.

Las reclamaciones son pagadas a través de los grupos de riesgo. Los inversionistas pueden proporcionar liquidez para las piscinas de riesgo. Los proveedores de liquidez reciben aquellas primas que no se utilizan para pagar reclamos. Para convertirse en un proveedor de liquidez, los inversores necesitan apostar [tokens DIP (protocolo de seguro descentralizado)](https://etherscan.io/token/0xc719d010b63e5bbf2c0551872cd5316ed26acd83).

El modelo económico junto con el modelo de apuestas, será probado en el Q1/2021.

## Motivación & Racionalidad

Los asistentes se sentirán tranquilos cuando viajen a DevConVI. Esto aumentará su bienestar y también atraerá a la gente que de lo contrario se abstendría de participar. Es muy probable que los asistentes de DevConVI estén dispuestos a usar un seguro basado en blockchain porque se ajusta a mejor en su compromiso DeFi. Los pagos pueden ser inmediatos y no se necesita papeleo. Si bien hemos ofrecido un seguro de vuelo en DevConII y hemos obtenido muchos buenos comentarios, creemos que un seguro de viaje con todas las características sería aún más atractivo para los asistentes a Devcon VI. La conexión con WindingTree mejorará aún más la experiencia del usuario porque los viajeros pueden comprar billetes de vuelo, y otros servicios y pagan en una sola transacción.

## Implementación

FlightDelay Insurance ha estado en vivo en DevConII y DevConIII. Se implementará usando nuestro [Marco de Seguro Genérico](https://github.com/etherisc/GIF) y vivirá en el mainnet de Ethereum.

## Requisitos operacionales & Propiedad

La implementación y operación serán proporcionadas por Etherisc. Estamos hablando con [el autor DIP-3 WindingTree](https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-3.md) para integrarse en su agencia de viajes.

## Enlaces & Información adicional

- https://etherisc.com
- https://github.com/etherisc/GIF
- https://windingtree.com
- https://github.com/windingtree
- https://chain.link
- [Blog que describe la Integración de Chainlink de las Oráculas de FlightDelay](https://blog.etherisc.com/etherisc-to-leverage-chainlink-oracles-for-decentralized-flight-insurance-product-9559b64d79c7)
