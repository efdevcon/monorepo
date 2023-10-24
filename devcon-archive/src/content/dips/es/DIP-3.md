---
Summary: 'Winding Tree offers Devcon attendees to book their flights and hotels directly from suppliers with discount. Winding Tree is 100% open-source and we aim to be as decentralized as it is possible.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-3.md
DIP: 3
Title: Las reservas de vuelo y hoteles proceden del mercado descentralizado de viajes de código abierto
Status: Accepted
Themes: Ticketing, Purchases & ID
Tags: Attendee Experience
Authors: Maksim Izmaylov <max@windingtree.com>
Resources Required: Some Devcon dev time, connecting about hotels in Bogota
Discussion: https://forum.devcon.org/t/flights-and-hotels-sourced-via-decentralized-marketplace/42
Created: 2020-07-29
---

## Summary

Winding Tree ofrece a Devcon asistentes para reservar sus vuelos y hoteles directamente de proveedores con descuento. Winding Tree es 100% de código abierto y nuestro objetivo es ser tan descentralizado como sea posible.

## Resumen

Winding Tree es el mercado descentralizado de viajes B2B basado en Ethereum. También hemos construido un conjunto de herramientas de código abierto, incluyendo una [agencia de viajes](https://glider.travel), que podríamos integrar directamente en el sitio web de Devcon. También asumiremos la responsabilidad de encontrar tarifas de hotel con descuento en Bogota, así como billetes de vuelo con descuento.

## Motivación & Racionalidad

Sería genial que los asistentes de Devcon pudieran reservar su vuelo y hotel inmediatamente después de comprar su billete de Devcon, y 10-20% más barato que en cualquier otro sitio web de reservas de viajes!

Esperemos que nadie se dé cuenta de que la reserva de viajes se ha visto facilitada por nuestros contratos inteligentes, lo que sería el mayor cumplimiento. Al mismo tiempo, las mentes curiosas podrán aprender sobre nuestra solución de identidad para las organizaciones.

## Implementación

No hemos hecho nada así en otros eventos, pero nuestra agencia de viajes de código abierto está en vivo: https://glider.travel.

Para que esto funcione, tendremos que girar un módulo independiente de Glider Aggregator, que combinará flujos de datos de diferentes hoteles y compañías aéreas. Expondrá una API REST con la que el sitio web de Devcon podrá hablar.

Después del evento, sería increíble conocer la experiencia de reserva de los asistentes, si es posible, pero es opcional.

Lo que es bueno es que no necesitamos construir nada a partir de cero, sólo modificaremos nuestros componentes existentes de Glider.

## Requisitos operacionales & Propiedad

### 1. ¿Qué medidas son necesarias para aplicar la propuesta en Devcon?

- necesitamos obtener una lista de hoteles equipo de Devcon planeado para el objetivo de bloques de habitación
- Contingente con la aprobación del equipo de Devcon (que se basará en parte en _ver_ un [estelar UX y un minucioso plan de servicio al cliente](https://github.com/efdevcon/DIPs/pull/33) en acción), queremos integrar nuestra interfaz en el sitio web de Devcon

### 2. ¿Quién será responsable de la aplicación efectiva de la propuesta? (es decir, trabajar el día 0) (es decir, trabajar el día 0)

Maksim Izmaylov <max@windingtree.com>

### 3. ¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonus para la colaboración entre equipos :)) (Puntos de bonus para la colaboración entre equipos :))

Ya estamos trabajando con soluciones como Kleros y zkSync. Existe la oportunidad de integrarse con CO2ken y alimentar nuestros datos de vuelo y alojamiento en su sistema para permitir a los asistentes compensar su huella de carbono.

## Enlaces & Información adicional

- https://windingtree.com
- https://orgid.tech
- https://glider.travel
- https://github.com/windingtree
