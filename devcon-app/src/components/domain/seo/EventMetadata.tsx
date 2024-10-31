import React from 'react'

interface EventMetadataProps {
  title: string
  description: string
  image: string
}

export function EventMetadata(props: EventMetadataProps) {
  const eventJsonLd = `{
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "${props.title}",
        "description": "${props.description}",
        "startDate": "2024-11-12",
        "endDate": "2024-11-15",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
            "@type": "Place",
            "name": "Queen Sirikit National Convention Center (QSNCC)",
            "sameAs": "https://www.qsncc.com/",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "60 Queen Sirikit National Convention Center, Ratchadaphisek Road, Khlong Toei Sub-district, Khlong Toei District, Bangkok 10110, Thailand",
                "addressLocality": "Bangkok",
                "addressCountry": "Thailand"
            }
        },
        "image": [
            "${props.image}"
        ],
        "offers": {
            "@type": "Offer",
            "url": "https://devcon.org/en/tickets/",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/SoldOut",
            "validFrom": "2024-11-12T00:00"
        },
        "organizer": {
            "@type": "Organization",
            "name": "Ethereum Foundation",
            "url": "https://ethereum.foundation/"
        }
    }`

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: eventJsonLd }} key="event-jsonld" />
}
