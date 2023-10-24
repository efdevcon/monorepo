---
Summary: 'Status wants to offer to Devcon attendees a keycard (https://get.keycard.tech/). This card:
- is a hardware wallet with a face value of 29$
- helps user downloads status app, which can be used on the show
- allows any dApp developer to develop applications that interface with the card with the tap of the card on the browser 

Such a dApp could be a redeem dApp, developed by Status, this dApp allowing users to retrieve assets coming preloaded with the card on the wallet of their choice.'
Github URL: https://github.com/efdevcon/DIPs/blob/master/DIPs/DIP-5.md
DIP: 5
Title: Tarjeta clave en Devcon
Status: Accepted
Themes: Ticketing, Purchase & ID
Tags: Attendee Experience
Authors: Guy-Louis Grau <guylouis@status.im>
Resources Required: Operational support, Communication support
Discussion: https://forum.devcon.org/t/dip-5-keycard-at-devcon/46
Created: 2020-08-10
---

## Summary

Status quiere ofrecer a los asistentes de Devcon una tarjeta de teclado (https://get.keycard.tech/). Esta tarjeta:

- es una cartera de hardware con un valor nominal de 29$
- ayuda al usuario a descargar la aplicación de estado, que puede ser usada en la serie
- permite a cualquier desarrollador de dApp desarrollar aplicaciones que interactúen con la tarjeta con el toque de la tarjeta en el navegador

Tal dApp podría ser un canjeo dApp, desarrollado por Status, esta dApp permite a los usuarios recuperar los activos que se cargan previamente con la tarjeta en la cartera de su elección.

## Resumen

La tarjeta de claves es una implementación de código abierto para habilitar tarjetas inteligentes en el espacio criptográfico. El framework permite usar tarjetas inteligentes tanto como carteras de hardware altamente seguras con el teléfono, y como super simple de usar (pensar: un toque) dispositivos que pueden ser tocados en el teléfono de otra persona para firmar una transacción, abriendo una variedad de casos de uso.

Un asistente de Devcon (usando Android o iOS) se entregaría una tarjeta de teclado al facturar en Devcon. Si es relevante, esta tarjeta se imprimirá con alguna indicación de qué activos se ofrecen con la tarjeta. El usuario puede:

- descargar & la aplicación de estado integral. Como parte de esta incorporación, el usuario importaría una cuenta existente o crearía una cuenta ethereum
- si es relevante, recuperar los activos precargados que vienen con la tarjeta (e. Token POAP, token SNT de estado que vendría como un regalo, etc.) a la cartera de su elección
- pulsa la tarjeta para asociar proyectos que desarrollaron una interacción dApp con la tarjeta
- después de la serie puede usar la tarjeta de teclado como cartera de hardware segura con la aplicación de estado

En esta propuesta no se tiene en cuenta la recolección o compra con tarjeta clave.

## Motivación & Racionalidad

La introducción de un simple dispositivo físico que contiene una clave privada (única para cada asistente) y que puede firmar transacciones es permitir que una experiencia de usuario más fluida y rápida interactúe con la cadena de bloques. El usuario no necesita abrir una cartera en su teléfono, o un navegador dApp, sólo tiene que girar su tarjeta en el dApp derecho que se le entregó en un teléfono por ejemplo.

Además, la oferta de tarjetas de teclas incitará fuertemente a los asistentes al estado a bordo (para recuperar sus activos precargados ofrecidos, o pagar si los pagos son parte de la experiencia) y por lo tanto otras características de estado pueden ser apalancadas:

- chat: el código QR de los canales se puede imprimir en las salas de conferencias para permitir a los asistentes comentar las presentaciones
- navegador dapp: cada asistente tendrá un navegador web 3 dapp en su bolsillo para interactuar con devcon dApps

## Implementación

La tarjeta clave se está produciendo en masa (3k tarjetas fabricadas a partir de 08/2020), integradas con la aplicación de estado, y se están vendiendo en todo el mundo. Sin embargo, la tarjeta de claves nunca se ha distribuido en un evento para permitir los casos de uso anteriores.

Para interacciones con dApps (recuperando NFT precargados, recolectándolos, probando la propiedad de un NFT) esto puede hacerse con implementaciones ya existentes

- un dApp que se ejecuta en el navegador de estado puede solicitar que una transacción sea firmada por cualquier tarjeta de teclado pulsada en el teléfono. ver: https://keycard.tech/docs/web3.html
- los contratos inteligentes existentes pueden ser utilizados para asociar activos precargados con las tarjetas de teclado. ver: https://github.com/status-im/keycard-redeem

## Requisitos operacionales & Propiedad

El equipo de Devcon necesita estar involucrado de la siguiente manera:

- soporte de comunicación antes de la conferencia:
  - si se propone canjear los activos precargados, identificar proyectos que quieran ofrecer activos como parte del paquete inicial de activos precargados con cada tarjeta de clave (e.
  - comunicar a los proyectos cómo pueden construir dApps que interactúen con las teclas de los asistentes a través de la API de keycard web3 https://keycard.tech/docs/web3.html
- soporte operativo
  - distribuir tarjetas en el sitio
  - si se utiliza el chat, imprima los códigos QR de los canales de chat y póngalos en los lugares correctos del lugar

Estado será:

- proporcionar las tarjetas
- si es relevante, proporcione los dApps de canje para el paquete inicial de activos ofrecidos con cada tarjeta
- proporcionar material técnico para proyectos que construyan sus propias aplicaciones usando el teclado

El estado puede:

- hacer pública la lista de claves públicas precargadas en el Keycard Cash Applet de cada keycard. Ver: https://keycard.tech/docs/sdk/cash.html y https://keycard.tech/docs/web3.html

El estado será responsable de asegurarse de que el siguiente trabajo es correcto:

- descarga y estado interno con cada teclado
- si es relevante, el usuario puede canjear su paquete de activos gratuitos con la tarjeta de clave

## Enlaces & Información adicional

- Sitio web de tarjetas: https://keycard.tech
- Acerca de la tarjeta de teclas que se integra en el Estado: https://our.status.im/keycards-place-in-the-state network/
- Documentación de la tarjeta clave: https://keycard.tech/docs
- Integrating Keycard con dApps: https://keycard.tech/docs/web3.html
- Pago de estado, para pagos con keycard: https://github.com/statis) im/payment-network-apps
