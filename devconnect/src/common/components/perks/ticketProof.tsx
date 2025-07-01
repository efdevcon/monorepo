import { ticketProofRequest } from "@parcnet-js/ticket-spec";
//"ZeZomy3iAu0A37TrJUAJ+76eYjiB3notl9jiRF3vRJE",
//HZ3Zed6HmpTPJd9uMcEHnfVCG9Gaio3Jj/Ru0Fu3NhA
//"YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs",
export function getTicketProofRequest() {
  return ticketProofRequest({
    classificationTuples: [
      {
        signerPublicKey: "YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs", // update this to the signer public key of pod you want to verify
        eventId: "5074edf5-f079-4099-b036-22223c0c6995", // update this to the event id of pod you want to verify
      },
    ],
    fieldsToReveal: {
      attendeeEmail: true,
      attendeeName: true,
      eventId: true,
    },
    externalNullifier: {
      type: "string",
      value: "zupass-discount-example-v1" // Set app-specific nullifier here
    }
  });
}