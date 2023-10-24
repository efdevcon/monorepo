---
Summary: 'The main objective of this DIP is to replicate the experience of using POAP in Devcon 5 (Osaka). This being establishing the process for which every attendee gets one (and only one) POAP redemption code when they show up at the registration desk.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-8.md
DIP: 8
Title: Prueba del Protocolo de Asistencia - Básicos
Status: Accepted
Themes: Social
Tags: Event Production
Authors: Patricio Worthalter <worthalter@poap.xyz>
Resources Required: Strong operations supports
Discussion: https://forum.devcon.org/t/issuance-of-proof-of-attendance-nfts-with-poap/76/5
Created: 2020-08-17
---

## Resumen de la propuesta

El objetivo principal de este DIP es replicar la experiencia de usar POAP en Devcon 5 (Osaka). Estando estableciendo el proceso para el cual cada asistente recibe uno (y sólo) código de canje POAP cuando aparecen en el mostrador de registro.

## Resumen

En devcon 5 los resultados fueron buenos, con 600 NFT canjeados y excelente retroalimentación de la asistencia. El proceso se estableció sobre la marcha el día de la apertura y terminó siendo muy torpe. Los voluntarios debían dar a cada asistente un mazo de artículos que contenían un parche decorativo POAP hecho de tela con un código QR en la espalda y un colorido volante con información general e instrucciones (entre otras cosas como una banda de muñeca, vales de alimentación, un folleto con la agosto). Una coordinación débil e inadecuada, los problemas con el servicio wifi y la barrera lingüística dificultaron el proceso de registro. Por diferentes motivos, muchos asistentes dejaron el área de registro sin su código POAP o sin las instrucciones. Aunque POAP tenía configurado un servicio de asistencia junto a la entrada principal, a veces los asistentes con pregunta no fueron instruidos para llegar allí sólo porque el voluntario fue demasiado estrujado por la siguiente persona en la línea. Para el desarrollo seis tenemos la oportunidad de desarrollar un proceso más pulido con instrucciones y tareas más claras. Queda por analizar en qué formato los asistentes obtienen su código de canje QR siendo las opciones sugeridas:

- El código QR viene en un pedazo de papel, independiente o incluido en otros materiales
- El código QR viene en la parte posterior del parche de tela (este es un modelo probado que la gente ama)
- Los códigos QR vienen en un pin de esmalte (esto fue probado durante ETHDenver y EthCC con gran recepción)
- Otros.

## Motivación & Racionalidad

Cuando se lanzó el POAP en febrero de 2019 los propósitos del mismo eran mostrar la verdadera propiedad de los activos portadores, el potencial de composición y el potencial de Ethereum en general; ya que los POAPs pueden crear diferentes soluciones altamente sofisticadas como las bases para soluciones de identidad resistentes al síbil. Todos estos propósitos se lograron y la comunidad se involucró mucho. A partir de agosto de 2020 POAP es un protocolo altamente reconocido que ha sido utilizado por miles de personas después de estar presente en casi todos los grandes eventos de Ethereum y una larga lista de actividades comunitarias más pequeñas.

## Implementación

Es importante dedicar recursos para crear una implementación de alta calidad. Las personas que no tienen experiencia avanzada en el uso de dapps necesitan tener manos y explicaciones. Idealmente un miembro del equipo de Devcon sería el enlace con el equipo de POAP para asegurarse de que todo el proceso está diseñado y ejecutado cambie. Los comentarios o datos de los asistentes al evento post son útiles, pero no necesarios.

## Requisitos operacionales & Propiedad

1. ¿Qué medidas son necesarias para aplicar la propuesta en Devcon? La implementación abarca varias áreas tanto físicas como virtuales. Es importante elaborar un plan y seguirlo de forma consolidada.
2. ¿Quién será responsable de la aplicación efectiva de la propuesta? (es decir, trabajar el día 0) El equipo de POAP y los voluntarios ad-hoc deben estar disponibles para esto. (es decir, trabajar el día 0) El equipo de POAP y los voluntarios ad-hoc deben estar disponibles para esto.
3. ¿Con qué otros proyectos se podría integrar esta propuesta? (Puntos de bonificación para la colaboración entre equipos :)) POAP tiene un historial de varias integraciones exitosas con otros productos. permanecemos abiertos a colaborar con cualquier persona con buenas intenciones.
