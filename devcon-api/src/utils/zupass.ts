import { TicketPod } from '../types/accounts'
import { TicketSpec } from '@parcnet-js/ticket-spec'
import { POD } from '@pcd/pod'

export const DevconTicketSpec = TicketSpec.extend((schema: any, f: any) => {
  return f({
    ...schema,
    entries: {
      ...schema.entries,
      // Make sure the ticket is for the Devcon event
      eventId: {
        type: 'string',
        isMemberOf: [{ type: 'string', value: '5074edf5-f079-4099-b036-22223c0c6995' }],
      },
      // Exclude add-on tickets
      isAddon: {
        type: 'optional',
        innerType: {
          type: 'int',
          isNotMemberOf: [{ type: 'int', value: BigInt(1) }],
        },
      },
    },
    signerPublicKey: {
      // Must be the public key of the Devcon Podbox pipeline
      isMemberOf: ['YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs'],
    },
  })
})

export function ValidateTicketPod(pod: TicketPod) {
  try {
    const ticketPOD = POD.fromJSON(pod)
    const valid = ticketPOD.verifySignature()

    if (valid) {
      const parsed = DevconTicketSpec.safeParse(ticketPOD)
      return parsed.isValid
    }
  } catch (e) {
    console.log('Unable to verify Zupass POD')
    console.error(e)
  }

  return false
}
