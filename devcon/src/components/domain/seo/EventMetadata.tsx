import React from 'react'

interface EventMetadataProps {
  title: string
  description: string
  image: string
}

export function EventMetadata(props: EventMetadataProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: props.title,
    description: props.description,
    startDate: '2026-11-03',
    endDate: '2026-11-07',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: 'Jio World Centre',
      sameAs: 'https://www.jioworldcentre.com/',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'G Block BKC, Bandra Kurla Complex, Bandra East',
        addressLocality: 'Mumbai',
        addressRegion: 'Maharashtra',
        postalCode: '400051',
        addressCountry: 'IN',
      },
    },
    image: [props.image],
    organizer: {
      '@type': 'Organization',
      name: 'Ethereum Foundation',
      url: 'https://ethereum.foundation/',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      key="event-jsonld"
    />
  )
}
