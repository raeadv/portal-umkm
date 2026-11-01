import { CENTER } from "@/lib/leaflet-setup";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import PlaceSearch from "./PlaceSearch";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Click the map or drag the pin to set the location; lat/lng are plain numbers or "" when unset.
export default function LocationPicker({ lat, lng, onChange }) {
  const hasPosition = typeof lat === "number" && typeof lng === "number";

  // 6 decimals is ~10 cm, plenty for a shop front
  const pick = (la, ln) => onChange(Number(la.toFixed(6)), Number(ln.toFixed(6)));

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        console.warn("geolocation error", err.code, err.message);
        notifications.show({
          color: "yellow",
          message: "Lokasi tidak tersedia, pilih lokasi manual di peta",
        });
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="light" onClick={useMyLocation} type="button">
        Gunakan lokasi saya
      </Button>
      <div style={{ height: 300, position: "relative" }}>
        {/* overlaid on the map, same as the /map page; left: 50 clears the zoom buttons */}
        <PlaceSearch
          onSelect={(place) => pick(place.lat, place.lng)}
          style={{
            position: "absolute",
            top: 10,
            left: 50,
            right: 10,
            zIndex: 1000,
            maxWidth: 420,
          }}
        />
        <MapContainer
          center={hasPosition ? [lat, lng] : CENTER}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <ClickToPick onPick={pick} />
          {hasPosition && (
            <>
              <Marker
                draggable
                position={[lat, lng]}
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng();
                    pick(p.lat, p.lng);
                  },
                }}
              />
              <Recenter lat={lat} lng={lng} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// keeps the pin in view after "use my location" or typed coordinates
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [map, lat, lng]);
  return null;
}
