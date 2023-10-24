---
Summary: 'Give Devcon participants a taste of a regenerative economy, by allowing them to offset the carbon emissions associated with the event, as part of the ticketing process.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-1.md
DIP: 1
Title: Hacer a Devcon carbono neutral
Status: Accepted
Themes: Ticketing, Environmental Sustainability
Tags: Event production, Software
Authors: Raphaël Haupt <raphael@curvelabs.eu>
Resources Required: Tech support, Communication support
Discussion: https://forum.devcon.org/t/co2ken-carbon-neutral-devcon/27
Created: 2020-07-20
---

## Resumen de la propuesta

Dar a los participantes de Devcon un sabor a una economía regenerativa. permitiéndoles compensar las emisiones de carbono asociadas al evento, como parte del proceso de facturación.

## Resumen

Queremos ofrecer a los asistentes la capacidad de compensar las emisiones de carbono de Devcon. Esto incluye tanto **emisiones directas** que ocurren durante el evento: uso de energía, aire acondicionado, alimentos, etc. así como **emisiones indirectas** que están estrechamente acopladas a ella—lo que es más importante, alojamiento y vuelos.

Hemos identificado dos maneras de acercarse a la compensación, cada una con sus propias ventajas y desventajas. Te describiremos estas opciones, y [comprometeremos a la comunidad](https://forum.devcon.org/t/co2ken-carbon-neutral-devcon/27) para encontrar la opción más adecuada.

El usuario podrá pagar directamente dentro del proceso de ticketing. Las contribuciones compensatorias están destinadas a proyectos locales de carbono de la más alta calidad en nuestro país anfitrión de Colombia.

## Motivación & Racionalidad

La mayoría de nosotros trabajando en Ethereum estamos obsesionados con construir un "futuro mejor", y aunque todos estamos centrados en diferentes bloques de construcción, entendemos que un cambio radical solo es posible si combinamos estos bloques en un sistema global, interconectado, social y económico.

Creemos que cualquier nuevo sistema debe aprender de las deficiencias de los sistemas anteriores y esforzarse por ser regenerativo, pensar en el futuro, teniendo en mente los mejores intereses de las generaciones futuras. Internacionalizar el coste de cualquier impacto social y medioambiental negativo equivale a lograrlo.

Devcon es donde descubrimos, conectamos y sincronizamos con el ecosistema global y donde sentamos las bases para futuras colaboraciones, y como tal desempeña un papel esencial en este nuevo sistema. Vemos esto como una oportunidad para que Devcon lidere con el ejemplo tomando medidas para minimizar su impacto negativo en el mundo natural, y al hacerlo, tenemos la oportunidad de incitar a los participantes a reflexionar sobre sus propias acciones. y no sólo imaginar un futuro mejor, pero para actuar inmediatamente y ser parte de esa visión internalizando una externalidad relativamente bien entendida: las emisiones de carbono asociadas con su participación en Devcon. También esperamos que esto incite a los participantes a generar valor sobre el potencial de un ecosistema tan equilibrado.

```
Estimas estimaciones de emisiones para 3500 asistentes y 4 días:
→ Emisiones directas = 150 t
→ Alojamiento = 280 t
→ Transporte = 1350 t

Precio de compensación de carbono de alta calidad por tonelada:
→ 10 – 20 USD
```

## Implementación

**Organizacional**

- La forma en que los fondos recaudados durante el proceso de facturación serán utilizados para compensar la huella de carbono del evento será discutida en un futuro DIP. Este DIP debería describir la gobernanza y la asignación de los fondos y podría desarrollarse en colaboración con otros proyectos como [Terra0](https://terra0.org/) o la [Iniciativa Naturaleza Soberana](http://sovereignnature.com/). ¡Se animan las entradas de la comunidad!
- Recopilar datos para estimar mejor la huella de carbono del evento.

**Técnico**

- Construye una integración fácil de usar en el proceso de ticketing de Devcon.
- Los usuarios pueden pagar con las mismas monedas que las aceptadas por el proceso de compra de Devcon.

**Experiencia anterior**

- Será la primera vez que integremos la compensación de carbono en el proceso de toma de decisiones de un evento.
- Ya tenemos un PoC en ejecución que puedes echar un vistazo [aquí](https://www.co2ken.io/).

**Post-evento**

- Será muy valioso para nosotros descubrir el apetito compensador de la comunidad Ethereum, así como ver cómo la gente y otros proyectos están utilizando nuestro producto.
- Los datos que recopilamos en Devcon 2021 también nos ayudarán a hacer predicciones más precisas sobre la huella de carbono de Devcon 2022 y otros eventos. ¡Mejoremos la precisión de los datos cuando sea posible!

## Requisitos operacionales & Propiedad

1. _¿Qué medidas son necesarias para aplicar la propuesta en Devcon?_

   - El único esfuerzo que se necesita en Devcon sería incluir cualquier bracetet o swag a la hora de registrarse. Todos los demás esfuerzos se centran en la integración del proceso de reserva.

2. _¿Quién será responsable de la aplicación efectiva de la propuesta? (es decir, trabajar el día 0) (es decir, trabajar el día 0)_

   - CO2ken será responsable de la exitosa aplicación de esta propuesta.

3. _¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonus para la colaboración entre equipos :)) (Puntos de bonus para la colaboración entre equipos :))_
   - Cualquiera que contrarreste sus emisiones recibirá un TNF que represente su contribución.
   - Nos encantaría ver que otros equipos lo recogen para crear un refuerzo positivo, por ejemplo, los participantes con el NFT reciben un cambio especial, descuentos, etc.
   - Nos acercaremos activamente a otros proyectos en los que vemos formas divertidas de colaborar a medida que aparezcan más DI.
   - No queremos castigar a quienes decidieron en contra (o simplemente perdieron la opción) compensando su huella de carbono. Pero queremos recompensar a quienes lo hicieron. Crear valor alrededor del comportamiento positivo es una manera simple pero poderosa de cambiar la economía actual: ¡zanahorias, no palos!

## Enlaces & Información adicional

**Preguntas que a menudo recibimos y posibles respuestas:**

- _Pero no tenemos los datos para calcular con precisión la huella de carbono de `X`?_

  Desafortunadamente hoy, la mayoría de las cosas caen en la categoría **`X`** donde necesitaríamos más datos para entender completamente el impacto climático de una determinada acción. Pero estos datos a menudo no se miden, ni se siloea ni se priva. Creemos que el desarrollo de sistemas que puedan recopilar y añadir datos sobre la huella de carbono es una de las cosas más importantes en las que concentrarse en este momento.

  Pero la falta de datos precisos no debe servir de excusa para no empezar a actuar en primer lugar. No olvidemos que nos estamos ocupando de las emisiones de CO2. Si utilizamos los datos que tenemos, tomamos las estimaciones más conservadoras y empezamos a compensar estas emisiones, en el peor de los casos compensaremos demasiado. Dada la situación del planeta, tenemos que hacerlo de todos modos.

- _¿No es el carbono compensa las nuevas letras de la indulgencia?_

  Queremos dejar claro que la compensación no es una bala de plata. Los estudios estiman que las tres cuartas partes de los créditos de carbono circulantes son “aire caliente” y no conducen a reducciones adicionales de las emisiones. En primer lugar, deberíamos aspirar a reducir nuestra huella de carbono en general, y solo compensar aquellas actividades para las que actualmente no existen buenas alternativas.

  Es por ello que mucha investigación tiene que dedicarse a la obtención de los proyectos adecuados. En última instancia, nuestro objetivo en CO2ken es arrojar luz a la opaca cadena de valor de compensación de carbono para desbloquear el rápido crecimiento que necesitamos ver en la financiación del clima.

**Enlaces:**

- [Enlace al Foro de Devon — CO2ken DIP](https://forum.devcon.org/t/co2ken-carbon-neutral-devcon/27)
- [Sitio web de CO2ken](https://www.co2ken.io/)
- [Publicación media que describe el Génesis del proyecto (las cosas han cambiado desde entonces)](https://medium.com/curve-labs/co2ken-genesis-74d7a1387ea1)
- [@CO2ken_io en Twitter](https://twitter.com/CO2ken_io)
