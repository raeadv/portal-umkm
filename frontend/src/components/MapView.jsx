import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { CENTER } from '@/lib/leaflet-setup'
import { Link } from '@tanstack/react-router'
import PlaceSearch from './PlaceSearch'

// Asks the browser for location once on mount and flies there; stays on CENTER if denied.
function LocateUser({ onLocate }) {
  const map = useMap()
  const [pos, setPos] = useState(null)

  useEffect(() => {
    // setView:true would fit the map to the accuracy circle: an IP-based fix (tens of km) zooms out to the whole planet
    const onFound = (e) => {
      setPos(e.latlng)
      onLocate?.(e.latlng)
      map.setView(e.latlng, e.accuracy > 5000 ? 12 : 16)
    }
    const onError = (e) => {
      console.warn('geolocation error', e.code, e.message) // 1 denied, 2 unavailable, 3 timeout
      notifications.show({
        id: 'locate-error', // same id = one toast even under StrictMode's double mount
        color: 'yellow',
        message: 'Lokasi tidak tersedia, izinkan akses lokasi di browser',
      })
    }
    map.on('locationfound', onFound).on('locationerror', onError)
    map.locate()

    // Leaflet measures its container once; re-measure when the layout settles/resizes
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())

    return () => {
      ro.disconnect()
      map.off('locationfound', onFound).off('locationerror', onError)
      map.stopLocate()
    }
  }, [map, onLocate])

  return (
    pos && (
      <Marker position={pos}>
        <Popup>Lokasi Anda</Popup>
      </Marker>
    )
  )
}

// Zooms to a search result like Google Maps: fits its bounding box (a city is wide, a shop is tiny).
function FlyToResult({ result }) {
  const map = useMap()

  useEffect(() => {
    if (result) map.flyToBounds(result.bounds, { maxZoom: 17 })
  }, [map, result])

  return null
}

// Flies to a UMKM picked from the list; `focus` is a fresh object per click so the same UMKM can be refocused.
function FlyToFocus({ focus }) {
  const map = useMap()

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 18)
  }, [map, focus])

  return null
}

export default function MapView({ businesses = [], onLocate, focus, region }) {
  const [found, setFound] = useState(null)

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* left: 50 keeps it clear of the zoom buttons; z-index sits above Leaflet's panes and controls */}
      <PlaceSearch
        onSelect={setFound}
        style={{ position: 'absolute', top: 10, left: 50, right: 10, zIndex: 1000, maxWidth: 420 }}
      />
      <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <LocateUser onLocate={onLocate} />
        <FlyToResult result={found} />
        <FlyToFocus focus={focus} />
        <FlyToResult result={region} />
        {found && (
          <Marker position={[found.lat, found.lng]}>
            <Popup>{found.name}</Popup>
          </Marker>
        )}
        {businesses.map((b) => (
          <Marker key={b.id} position={[b.lat, b.lng]}>
            <Popup>
              <strong>{b.name}</strong>
              {b.jenis && <div>{b.jenis === 'jasa' ? 'Jasa' : 'Barang'}</div>}
              {b.id && <Link to="/detail/$id" params={{ id: b.id }}>Lihat detail</Link>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
