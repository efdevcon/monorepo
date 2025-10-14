import stores from './pretix-stores-list';

interface PretixItem {
  id: number;
  name: string | { en: string; [key: string]: string };
  description?: string | { en: string; [key: string]: string };
  category?: string;
  active?: boolean;
  [key: string]: any;
}

export async function getPaidTicketsByEmail(
  email: string,
  storeID = 'devconnect'
) {
  const apiKey = stores[storeID].apiKey;
  const baseUrl = stores[storeID].url;
  const organizerSlug = stores[storeID].organizerSlug;
  const eventSlug = stores[storeID].eventSlug;

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing');
  }

  const headers = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Fetch items (products/tickets) to get item details
  const itemsUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/items/`;
  const itemsResponse = await fetch(itemsUrl, {
    headers,
    next: { revalidate: 3600 }, // doesn't need to be revalidated often, its store config and won't change often
  });

  if (!itemsResponse.ok) {
    throw new Error(`Failed to fetch items: ${itemsResponse.status}`);
  }

  const itemsData = await itemsResponse.json();
  const itemsMap = new Map<number, PretixItem>(
    itemsData.results.map((item: any) => [item.id, item])
  );

  // Fetch orders
  const url = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders`;
  const params = new URLSearchParams({
    status: 'p',
    search: email,
  });

  const response = await fetch(`${url}?${params}`, { headers });

  if (!response.ok) {
    console.error('Pretix API error:', response);
    throw new Error(`Pretix API error: ${response.status}`);
  }

  const data = await response.json();
  const orders = data.results || [];

  return orders
    .map((order: any) => {
      const mainPositions = order.positions.filter(
        (position: any) =>
          position.attendee_email &&
          position.attendee_email.toLowerCase() === email.toLowerCase() &&
          !position.addon_to
      );

      return {
        orderCode: order.code,
        orderDate: order.datetime,
        email: order.email,
        tickets: mainPositions.map((position: any) => {
          // Resolve main ticket item details
          const mainItemDetails = itemsMap.get(position.item);

          // Get addons for this position
          const addons = order.positions
            .filter((p: any) => p.addon_to === position.id)
            .map((addon: any) => {
              const itemDetails = itemsMap.get(addon.item);
              const name = itemDetails?.name;
              const description = itemDetails?.description;
              return {
                id: addon.item,
                secret: addon.secret,
                itemName:
                  typeof name === 'object' ? name.en : name || `Item ${addon.item}`,
                description:
                  typeof description === 'object' ? description.en : description,
                price: addon.price,
                attendeeName: addon.attendee_name,
                category: itemDetails?.category,
                active: itemDetails?.active,
              };
            });

          const mainName = mainItemDetails?.name;
          const mainDescription = mainItemDetails?.description;
          
          return {
            secret: position.secret,
            attendeeName: position.attendee_name,
            attendeeEmail: position.attendee_email || order.email,
            price: position.price,
            // Use item details from the items endpoint
            itemId: position.item,
            itemName:
              typeof mainName === 'object' ? mainName.en : mainName || position.item_name || 'Ticket',
            itemDescription:
              typeof mainDescription === 'object' ? mainDescription.en : mainDescription,
            addons: addons,
          };
        }),
      };
    })
    .filter((ticket: any) => ticket.tickets.length > 0);
}
