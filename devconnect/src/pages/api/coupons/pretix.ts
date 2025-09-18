export async function getPaidTicketsByEmail(email: string) {
    const apiKey = process.env.PRETIX_API_KEY
    const baseUrl = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz'
    const organizerSlug = 'devconnect'
    const eventSlug = 'cowork'
  
    if (!apiKey) {
      throw new Error('PRETIX_API_KEY is missing')
    }
  
    if (!organizerSlug || !eventSlug) {
      throw new Error('Missing Pretix configuration in environment variables')
    }
  
    const url = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders`
  
    const params = new URLSearchParams({
      email: email,
      status: 'p', // 'p' for paid orders
    })
  
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  
    if (!response.ok) {
      console.error('Pretix API error:', response)
      throw new Error(`Pretix API error: ${response.status}`)
    }
  
    const data = await response.json()
    const orders = data.results || []
    
    // Return simplified ticket data, filtering out positions without attendee names
    return orders.map((order: any) => ({
      orderCode: order.code,
      orderDate: order.datetime,
      email: order.email,
      tickets: order.positions
        .filter((position: any) => position.attendee_name && position.attendee_name.trim() !== '')
        .map((position: any) => ({
          secret: position.secret,
          attendeeName: position.attendee_name,
          attendeeEmail: position.attendee_email || order.email,
          price: position.price,
          itemName: position.item_name || 'Ticket',
        }))
    }))
  }
  