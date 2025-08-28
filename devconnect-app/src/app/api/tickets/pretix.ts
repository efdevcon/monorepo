async function discoverPretixSlugs() {
  const apiKey = process.env.PRETIX_API_KEY
  const baseUrl = process.env.PRETIX_BASE_URL || 'https://tickets.devconnect.org'

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing')
  }

  try {
    // Fetch all organizers
    const organizersResponse = await fetch(`${baseUrl}/api/v1/organizers/`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!organizersResponse.ok) {
      console.error('Failed to fetch organizers:', organizersResponse.status)
      return
    }

    console.log(organizersResponse, 'organizersResponse')

    const organizersData = await organizersResponse.json()
    console.log('=== Available Pretix Organizers ===')
    
    for (const org of organizersData.results || []) {
      console.log(`\nOrganizer: ${org.name}`)
      console.log(`  Slug: ${org.slug}`)
      
      // Fetch events for this organizer
      const eventsResponse = await fetch(`${baseUrl}/api/v1/organizers/${org.slug}/events/`, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        console.log(`  Events:`)
        for (const event of eventsData.results || []) {
          console.log(`    - ${event.name.en || event.name} (slug: ${event.slug})`)
        }
      }
    }
    console.log('\n===================================')
  } catch (error) {
    console.error('Error discovering Pretix slugs:', error)
  }
}

export async function getPaidTicketsByEmail(email: string) {
  const apiKey = process.env.PRETIX_API_KEY
  const baseUrl = process.env.PRETIX_BASE_URL || 'https://tickets.devcon.org'
  const organizerSlug = 'devconnect'
  const eventSlug = 'devcon-2025'

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing')
  }

  // Run discovery on first call to help identify correct slugs
  await discoverPretixSlugs()

  if (!organizerSlug || !eventSlug) {
    throw new Error('Missing Pretix configuration in environment variables')
  }

  const url = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders/`
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
  
  // Return simplified ticket data
  return orders.map((order: any) => ({
    orderCode: order.code,
    orderDate: order.datetime,
    email: order.email,
    tickets: order.positions.map((position: any) => ({
      ticketId: position.secret,
      attendeeName: position.attendee_name,
      attendeeEmail: position.attendee_email || order.email,
      price: position.price,
    }))
  }))
}