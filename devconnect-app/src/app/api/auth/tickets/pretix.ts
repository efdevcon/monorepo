async function testPretixAccess() {
  const apiKey = process.env.PRETIX_API_KEY;
  const baseUrl = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz'; // 'https://tickets.devcon.org'
  const organizerSlug = 'devconnect';
  const eventSlug = 'cowork';

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing');
  }

  const headers = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };

  console.log('=== Testing Pretix API Access ===');

  // Test 1: Event details (public info)
  try {
    const eventUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/`;
    console.log(`\n1. Testing event endpoint: ${eventUrl}`);
    const eventResponse = await fetch(eventUrl, { headers });
    console.log(
      `   Status: ${eventResponse.status} ${eventResponse.statusText}`
    );
    if (eventResponse.ok) {
      const event = await eventResponse.json();
      console.log(`   ✓ Event found: ${event.name.en || event.name}`);
    } else {
      console.log(`   ✗ Failed to fetch event`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  // Test 2: Items (products/tickets)
  try {
    const itemsUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/items/`;
    console.log(`\n2. Testing items endpoint: ${itemsUrl}`);
    const itemsResponse = await fetch(itemsUrl, { headers });
    console.log(
      `   Status: ${itemsResponse.status} ${itemsResponse.statusText}`
    );
    if (itemsResponse.ok) {
      const items = await itemsResponse.json();
      console.log(`   ✓ Found ${items.results?.length || 0} items/tickets`);
    } else {
      console.log(`   ✗ Failed to fetch items`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  // Test 3: Categories
  try {
    const categoriesUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/categories/`;
    console.log(`\n3. Testing categories endpoint: ${categoriesUrl}`);
    const catResponse = await fetch(categoriesUrl, { headers });
    console.log(`   Status: ${catResponse.status} ${catResponse.statusText}`);
    if (catResponse.ok) {
      const categories = await catResponse.json();
      console.log(`   ✓ Found ${categories.results?.length || 0} categories`);
    } else {
      console.log(`   ✗ Failed to fetch categories`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  // Test 4: Orders without filters
  try {
    const ordersUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders/`;
    console.log(`\n4. Testing orders endpoint (no filters): ${ordersUrl}`);
    const ordersResponse = await fetch(ordersUrl, { headers });
    console.log(
      `   Status: ${ordersResponse.status} ${ordersResponse.statusText}`
    );
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      console.log(
        `   ✓ Can access orders - found ${orders.results?.length || 0} orders`
      );
    } else {
      const errorText = await ordersResponse.text();
      console.log(`   ✗ Failed to fetch orders: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  // Test 5: Quotas
  try {
    const quotasUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/quotas/`;
    console.log(`\n5. Testing quotas endpoint: ${quotasUrl}`);
    const quotasResponse = await fetch(quotasUrl, { headers });
    console.log(
      `   Status: ${quotasResponse.status} ${quotasResponse.statusText}`
    );
    if (quotasResponse.ok) {
      const quotas = await quotasResponse.json();
      console.log(`   ✓ Found ${quotas.results?.length || 0} quotas`);
    } else {
      console.log(`   ✗ Failed to fetch quotas`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  console.log('\n=================================\n');
}

async function discoverPretixSlugs() {
  const apiKey = process.env.PRETIX_API_KEY;
  const baseUrl = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz';

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing');
  }

  try {
    // Fetch all organizers
    const organizersResponse = await fetch(`${baseUrl}/api/v1/organizers/`, {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!organizersResponse.ok) {
      console.error('Failed to fetch organizers:', organizersResponse.status);
      return;
    }

    console.log(organizersResponse, 'organizersResponse');

    const organizersData = await organizersResponse.json();

    console.log(organizersData, 'organizersData');

    console.log('=== Available Pretix Organizers ===');

    for (const org of organizersData.results || []) {
      console.log(`\nOrganizer: ${org.name}`);
      console.log(`  Slug: ${org.slug}`);

      // Fetch events for this organizer
      const eventsResponse = await fetch(
        `${baseUrl}/api/v1/organizers/${org.slug}/events/`,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            // 'Content-Type': 'application/json',
          },
        }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        console.log(eventsData, 'eventsData');
        console.log(`  Events:`);
        for (const event of eventsData.results || []) {
          console.log(
            `    - ${event.name.en || event.name} (slug: ${event.slug})`
          );
        }
      }
    }
    console.log('\n===================================');
  } catch (error) {
    console.error('Error discovering Pretix slugs:', error);
  }
}

export async function getPaidTicketsByEmail(email: string) {
  const apiKey = process.env.PRETIX_API_KEY;
  const baseUrl = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz';
  const organizerSlug = 'devconnect';
  const eventSlug = 'cowork';

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing');
  }

  // console.log(apiKey, 'api keyyyyYYY')

  // Test API access to various endpoints
  // await testPretixAccess()

  // Run discovery on first call to help identify correct slugs
  // await discoverPretixSlugs()

  if (!organizerSlug || !eventSlug) {
    throw new Error('Missing Pretix configuration in environment variables');
  }

  const url = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders`;

  const params = new URLSearchParams({
    // email: email,
    status: 'p', // 'p' for paid orders
    search: email,
  });

  console.log(`${url}?${params}`, 'params');
  // params.append('search', email);

  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Pretix API error:', response);
    throw new Error(`Pretix API error: ${response.status}`);
  }

  const data = await response.json();
  const orders = data.results || [];

  // Return simplified ticket data, filtering out positions without attendee names
  return orders
    .map((order: any) => ({
      orderCode: order.code,
      orderDate: order.datetime,
      email: order.email,
      tickets: order.positions
        .filter((position: any) => position.attendee_email === email)
        .map((position: any) => ({
          secret: position.secret,
          attendeeName: position.attendee_name,
          attendeeEmail: position.attendee_email || order.email,
          price: position.price,
          itemName: position.item_name || 'Ticket',
        })),
    }))
    .filter((ticket: any) => ticket.tickets.length > 0);
}
