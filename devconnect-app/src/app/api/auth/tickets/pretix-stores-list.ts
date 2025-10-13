const stores: Record<
  string,
  { organizerSlug: string; eventSlug: string; url: string; apiKey: string }
> = {
  devconnect: {
    organizerSlug: 'devconnect',
    eventSlug: 'cowork',
    url: 'https://ticketh.xyz',
    apiKey: process.env.PRETIX_API_KEY || '',
  },
};

export default stores;
