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
        "startDate": "2022-10-11",
        "endDate": "2022-10-14",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
            "@type": "Place",
            "name": "Ágora Bogotá",
            "sameAs": "https://agora-bogota.com/",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "a 22-37, Cra. 38 #22-1",
                "addressLocality": "Bogotá",
                "addressCountry": "Colombia"
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
            "validFrom": "2022-07-18T16:00"
        },
        "organizer": {
            "@type": "Organization",
            "name": "Ethereum Foundation",
            "url": "https://ethereum.foundation/"
        }
    }`

    return <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: eventJsonLd }}
        key="event-jsonld" />
}
