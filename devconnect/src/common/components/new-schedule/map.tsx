import { useLoadScript, GoogleMap } from '@react-google-maps/api'
import { useMemo } from 'react'
import { dummyEvents } from './dummy-data'

// You would need to add these coordinates to your event locations
const eventLocations = [
  {
    name: 'Innovation Hub',
    position: { lat: 40.7128, lng: -74.006 }, // Example coordinates for New York
  },
  {
    name: 'Main Conference Hall',
    position: { lat: 40.7589, lng: -73.9851 }, // Example coordinates
  },
  // Add more locations as needed
]

const MapComponent = () => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['marker'],
  })

  const mapCenter = useMemo(() => ({ lat: 40.7128, lng: -74.006 }), []) // Default center (NYC)
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: true,
      scrollwheel: true,
    }),
    []
  )

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ height: '500px', width: '100%' }}>
      <GoogleMap
        options={mapOptions}
        zoom={13}
        center={mapCenter}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        onLoad={map => {
          eventLocations.forEach(location => {
            // if (location.coordinates) {
            //   const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
            //     map,
            //     position: location.coordinates,
            //     title: location.name,
            //   })
            // }
          })
        }}
      ></GoogleMap>
    </div>
  )
}

export default MapComponent
