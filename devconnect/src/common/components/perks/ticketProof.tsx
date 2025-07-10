import { ticketProofRequest } from '@parcnet-js/ticket-spec'
//"ZeZomy3iAu0A37TrJUAJ+76eYjiB3notl9jiRF3vRJE",
//HZ3Zed6HmpTPJd9uMcEHnfVCG9Gaio3Jj/Ru0Fu3NhA
//"YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs",
export function getDevconTicketProofRequest() {
  return ticketProofRequest({
    classificationTuples: [
      {
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '5074edf5-f079-4099-b036-22223c0c6995', // update this to the event id of pod you want to verify
        // productId: 'c64cac28-5719-4260-bd9a-ea0c0cb04d54',
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
        signerPublicKey: 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs', // update this to the signer public key of pod you want to verify
        eventId: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac', // update this to the event id of pod you want to verify
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
