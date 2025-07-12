import { ticketProofRequest } from '@parcnet-js/ticket-spec'
//"ZeZomy3iAu0A37TrJUAJ+76eYjiB3notl9jiRF3vRJE",
//HZ3Zed6HmpTPJd9uMcEHnfVCG9Gaio3Jj/Ru0Fu3NhA
//"YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs",
export function getDevconTicketProofRequest() {
  return ticketProofRequest({
    // classificationTuples: [
    //   {
    //     signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
    //     eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
    //     // productId: 'c64cac28-5719-4260-bd9a-ea0c0cb04d54',
    //   },
    // ],
    classificationTuples: [
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: 'f124d21c-84fc-42e4-8f38-234f23412bc8',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '27bbc1f3-79fe-48a2-b50f-43113ac4ecc5',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: 'd56f0781-401c-4b7b-9f05-9da601518b29',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '45b07aad-b4cf-4f0e-861b-683ba3de49bd',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: 'e6df2335-00d5-4ee1-916c-977d326a9049',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '2ab74a56-4182-4798-a485-6380f87d6299',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '9fb49dd1-edea-4c57-9ff2-6e6c9c3b4a0a',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '1ad9e110-8745-4eed-8ca5-ee5b8cd69c0f',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        productId: '6b0f70f1-c757-40a1-b6ab-a9ddab221615',
      },
    ],

    fieldsToReveal: {
      // attendeeEmail: true,
      // attendeeName: true,
      // eventId: true,
      ticketId: true,
    },
    externalNullifier: {
      type: 'string',
      value: 'devcon-sea-attendee-discount-v1', // Set app-specific nullifier here
    },
  })
}

export function getDevconnectTicketProofRequest() {
  return ticketProofRequest({
    classificationTuples: [
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '13d06437-ff44-46c3-a76d-e7f9a4e00707',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '29b4eb63-38c1-4264-93ec-c26bf8837f2c',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '830544f0-57d7-458c-97ac-76931f7fb3b1',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '9d3e330a-0bfc-46fc-af68-341509186463',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '12070ec3-0468-48ff-b378-4eac11722ec3',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '618845a3-57f0-4646-b3a9-39e647b31f62',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '67123d7a-3063-460d-941e-27b51381083b',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '49fbd767-78b0-4fee-9712-84575d50f4b2',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: 'e09e5009-b42a-4f77-8674-f1f9a5b13d5d',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '4cf5f1d5-cc26-4bb4-9123-2ce6a504c5e8',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: 'bce2e86a-36a3-49d7-929b-b6e659773117',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '3656f143-c01e-4a99-8f75-bf640ef62ea3',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '061e6205-101b-4392-bd39-32bd6400e7db',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: 'cb3b24d2-b069-441a-ac2f-6a58ab72c788',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: 'a9f1f59d-b874-418a-9fc9-ed5608481dab',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '536a1db6-19d5-4f2d-871e-6a25a4ff9986',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '79010a91-6505-4086-ba06-378409b90687',
      },
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs',
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac',
        productId: '8c7b6d43-0f5b-4150-9ded-0d1a5f25d369',
      },
    ],
    fieldsToReveal: {
      // attendeeEmail: true,
      // attendeeName: true,
      // eventId: true,
      ticketId: true,
    },
    externalNullifier: {
      type: 'string',
      value: 'devconnect-arg-attendee-discount-v1', // Set app-specific nullifier here
    },
  })
}
