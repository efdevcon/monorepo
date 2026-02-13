/**
 * Test script to simulate the full x402 ticket purchase flow
 * Run with: pnpm run x402:test-flow
 *
 * This script simulates:
 * 1. Fetching available tickets and questions
 * 2. Creating a purchase request
 * 3. Getting payment requirements (402 response)
 *
 * Note: Actual payment verification requires a real blockchain transaction
 */
import 'dotenv/config'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000'

interface TicketInfo {
  id: number
  name: string
  description: string | null
  price: string
  available: boolean
  isAdmission: boolean
  variations: { id: number; name: string; price: string }[]
  addons: {
    categoryId: number
    categoryName: string
    minCount: number
    maxCount: number
    items: { id: number; name: string; price: string }[]
  }[]
}

interface QuestionInfo {
  id: number
  question: string
  type: string
  required: boolean
  appliesToItems: number[]
  options: { id: number; answer: string }[]
}

async function fetchTickets() {
  console.log('=== Step 1: Fetching Available Tickets ===\n')

  const response = await fetch(`${API_BASE}/api/x402/tickets`)
  const data = await response.json()

  if (!data.success) {
    console.error('Failed to fetch tickets:', data.error)
    return null
  }

  console.log('Event:', data.data.event.name)
  console.log('Date:', data.data.event.dateFrom, '-', data.data.event.dateTo)
  console.log('Location:', data.data.event.location)
  console.log('Currency:', data.data.event.currency)

  console.log('\n--- Available Tickets ---')
  const admissionTickets = data.data.tickets.filter((t: TicketInfo) => t.isAdmission && t.available)
  for (const ticket of admissionTickets) {
    console.log(`\n[${ticket.id}] ${ticket.name}`)
    console.log(`  Price: ${ticket.price} ${data.data.event.currency}`)
    if (ticket.variations.length > 0) {
      console.log('  Variations:')
      for (const v of ticket.variations) {
        console.log(`    - [${v.id}] ${v.name}: ${v.price}`)
      }
    }
    if (ticket.addons.length > 0) {
      console.log('  Available Addons:')
      for (const addon of ticket.addons) {
        console.log(`    ${addon.categoryName} (${addon.minCount}-${addon.maxCount}):`)
        for (const item of addon.items) {
          console.log(`      - [${item.id}] ${item.name}: ${item.price}`)
        }
      }
    }
  }

  console.log('\n--- Required Questions ---')
  const requiredQuestions = data.data.questions.filter((q: QuestionInfo) => q.required)
  for (const q of requiredQuestions) {
    console.log(`\n[${q.id}] ${q.question}`)
    console.log(`  Type: ${q.type}`)
    if (q.appliesToItems.length > 0) {
      console.log(`  Applies to items: ${q.appliesToItems.join(', ')}`)
    }
    if (q.options.length > 0) {
      console.log('  Options:')
      for (const opt of q.options) {
        console.log(`    - [${opt.id}] ${opt.answer}`)
      }
    }
  }

  console.log('\n--- Payment Info ---')
  console.log('Network:', data.data.paymentInfo.network)
  console.log('Chain ID:', data.data.paymentInfo.chainId)
  console.log('Token:', data.data.paymentInfo.tokenSymbol)
  console.log('Token Address:', data.data.paymentInfo.tokenAddress)
  console.log('Crypto Discount:', data.data.paymentInfo.discountForCrypto)

  return data.data
}

async function createPurchase(ticketData: any) {
  console.log('\n=== Step 2: Creating Purchase Request ===\n')

  // Find first available admission ticket
  const ticket = ticketData.tickets.find((t: TicketInfo) => t.isAdmission && t.available)
  if (!ticket) {
    console.error('No available tickets found')
    return null
  }

  console.log(`Selected ticket: [${ticket.id}] ${ticket.name} - ${ticket.price}`)

  // Build answers for required questions
  const answers: { questionId: number; answer: string }[] = []
  for (const q of ticketData.questions.filter((q: QuestionInfo) => q.required)) {
    // Apply only if question is for all items or this specific ticket
    if (q.appliesToItems.length === 0 || q.appliesToItems.includes(ticket.id)) {
      let answer = ''
      switch (q.type) {
        case 'S': // String
        case 'T': // Text
          answer = 'Test answer'
          break
        case 'N': // Number
          answer = '1'
          break
        case 'B': // Boolean
          answer = 'true'
          break
        case 'C': // Choice
        case 'M': // Multiple choice
          if (q.options.length > 0) {
            answer = String(q.options[0].id)
          }
          break
        case 'CC': // Country code
          answer = 'US'
          break
        default:
          answer = 'Test'
      }
      answers.push({ questionId: q.id, answer })
      console.log(`Answer for Q${q.id}: ${answer}`)
    }
  }

  const purchaseRequest = {
    email: 'test@example.com',
    intendedPayer: process.env.TEST_PAYER_ADDRESS || '0x0000000000000000000000000000000000000001',
    tickets: [{ itemId: ticket.id, quantity: 1 }],
    answers,
    attendee: {
      name: {
        given_name: 'Test',
        family_name: 'User',
      },
      email: 'test@example.com',
      country: 'US',
    },
  }

  console.log('\nPurchase Request:')
  console.log(JSON.stringify(purchaseRequest, null, 2))

  const response = await fetch(`${API_BASE}/api/x402/tickets/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(purchaseRequest),
  })

  console.log('\nResponse Status:', response.status)

  // Log x402 headers
  console.log('\nx402 Headers:')
  console.log('X-Payment-Required:', response.headers.get('X-Payment-Required'))
  console.log('X-Payment-Network:', response.headers.get('X-Payment-Network'))
  console.log('X-Payment-Token:', response.headers.get('X-Payment-Token'))
  console.log('X-Payment-Amount:', response.headers.get('X-Payment-Amount'))
  console.log('X-Payment-Recipient:', response.headers.get('X-Payment-Recipient'))
  console.log('X-Payment-Reference:', response.headers.get('X-Payment-Reference'))

  const data = await response.json()
  console.log('\nResponse Body:')
  console.log(JSON.stringify(data, null, 2))

  return data
}

async function checkStatus(paymentReference: string) {
  console.log('\n=== Step 3: Checking Order Status ===\n')

  const response = await fetch(
    `${API_BASE}/api/x402/tickets/status?paymentReference=${paymentReference}`
  )
  const data = await response.json()

  console.log('Status Response:')
  console.log(JSON.stringify(data, null, 2))

  return data
}

async function main() {
  console.log('========================================')
  console.log('   x402 Ticket Purchase Flow Test')
  console.log('========================================\n')

  // Step 1: Fetch tickets
  const ticketData = await fetchTickets()
  if (!ticketData) {
    console.error('\nFailed to fetch ticket data. Make sure the API is running.')
    console.log('\nTo start the API server: npm run dev')
    return
  }

  // Step 2: Create purchase
  const purchaseResult = await createPurchase(ticketData)
  if (!purchaseResult) {
    return
  }

  // Step 3: Check status
  if (purchaseResult.paymentDetails?.payment?.paymentReference) {
    await checkStatus(purchaseResult.paymentDetails.payment.paymentReference)
  }

  console.log('\n========================================')
  console.log('   Next Steps (Manual)')
  console.log('========================================\n')

  if (purchaseResult.paymentDetails) {
    const payment = purchaseResult.paymentDetails.payment
    console.log('To complete the purchase, send USDC:')
    console.log(`  Network: ${payment.network} (Chain ID: ${payment.chainId})`)
    console.log(`  Token: ${payment.tokenSymbol} (${payment.tokenAddress})`)
    console.log(`  Amount: ${payment.amountFormatted}`)
    console.log(`  To: ${payment.recipient}`)
    console.log(`  Reference: ${payment.paymentReference}`)
    console.log(`  Expires: ${new Date(payment.expiresAt * 1000).toISOString()}`)

    console.log('\nAfter payment, verify with:')
    console.log(`  POST /api/x402/tickets/verify`)
    console.log('  Body: {')
    console.log(`    "txHash": "<your_transaction_hash>",`)
    console.log(`    "paymentReference": "${payment.paymentReference}",`)
    console.log(`    "payer": "<your_wallet_address>"`)
    console.log('  }')
  }
}

main().catch(console.error)
