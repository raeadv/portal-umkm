import MapView from "@/components/MapView";
import UmkmFilter, { emptyFilter } from "@/components/UmkmFilter";
import { CENTER } from "@/lib/leaflet-setup";
import { http } from "@/lib/http-client";
import { Badge, Button, Collapse, Paper, ScrollArea, Text } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: MainPageComponent,
});

// straight-line distance in km, plenty for ranking "nearest"
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// wilayah names are stored like "KOTA ADM. JAKARTA PUSAT"; Nominatim knows "Jakarta Pusat"
const cleanName = (n) => n.replace(/^(KAB\.|KOTA)\s*(ADM\.)?\s*/i, "");

// Bounding box of the smallest chosen region, via Nominatim (same service as the place search).
// Tries "smallest, parents..." first, then just the smallest, since OSM names don't always match.
async function regionBounds(names) {
  for (const q of [names.join(", "), names[0]]) {
    const params = new URLSearchParams({ q, format: "jsonv2", countrycodes: "id", limit: "1" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (!res.ok) throw new Error("status " + res.status);
    const [hit] = await res.json();
    if (hit) {
      const [south, north, west, east] = hit.boundingbox.map(Number);
      return { bounds: [[south, west], [north, east]] };
    }
  }
  return null;
}

function MainPageComponent() {
  const [draft, setDraft] = useState(emptyFilter); // what the selects show
  const [applied, setApplied] = useState(emptyFilter); // what the list/map was loaded with
  const [showFilter, setShowFilter] = useState(window.innerWidth >= 1024); // collapsed on phones so the list stays visible
  const [umkms, setUmkms] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [focus, setFocus] = useState(null);
  const [region, setRegion] = useState(null);
  const pendingFit = useRef(null); // region names to fit to after the next load
  const labels = useRef({}); // wilayah field -> name shown in the select

  useEffect(() => {
    let stale = false;
    const params = Object.fromEntries(Object.entries(applied).filter(([, v]) => v));
    http
      .get("/umkm", { params, silent: true })
      .then((res) => {
        if (stale) return;
        setUmkms(res.data.umkm);
        fitRegion(res.data.umkm);
      })
      .catch((err) => console.error("error loading umkm: ", err));
    return () => {
      stale = true;
    };
  }, [applied]);

  // nearest to the user, or to the default map center when location is denied
  const nearest = useMemo(() => {
    const from = userPos ? [userPos.lat, userPos.lng] : CENTER;
    return umkms
      .map((u) => ({ ...u, km: distanceKm(from, [u.lat, u.lng]) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 10);
  }, [umkms, userPos]);

  return (
    // 56px = AppShell header height; Leaflet needs a parent with a real height
    <div className="mt-4 flex flex-col gap-3 lg:flex-row" style={{ height: "calc(100dvh - 72px)" }}>
      <div className="h-[55%] lg:h-full lg:flex-1 rounded-sm overflow-hidden">
        <MapView
          onLocate={setUserPos}
          focus={focus}
          region={region}
          businesses={umkms.map((u) => ({ id: u.id, name: u.nama, jenis: u.jenis_usaha, lat: u.lat, lng: u.lng }))}
        />
      </div>

      <Paper withBorder radius="md" p="sm" className="flex min-h-0 flex-1 flex-col lg:w-80 lg:flex-none">
        <Button variant="subtle" size="xs" onClick={() => setShowFilter((s) => !s)}>
          {showFilter ? "Sembunyikan filter" : "Tampilkan filter"}
        </Button>
        <Collapse expanded={showFilter}>
          <div className="flex flex-col gap-2 pb-2">
            <UmkmFilter value={draft} onChange={setDraft} onPickLabel={(f, l) => (labels.current[f] = l)} />
            <Button onClick={applyFilter}>Terapkan Filter</Button>
          </div>
        </Collapse>

        <Text size="sm" fw={600} mt="xs" mb={4}>
          {userPos ? "10 UMKM terdekat dari lokasi Anda" : "10 UMKM terdekat dari pusat peta"}
        </Text>
        <ScrollArea className="min-h-0 flex-1">
          {nearest.length === 0 && <Text size="sm" c="dimmed">Tidak ada UMKM.</Text>}
          {nearest.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 border-t py-2">
              <div className="min-w-0">
                <Text size="sm" truncate>{u.nama}</Text>
                <Badge size="xs" variant="light">{u.jenis_usaha}</Badge>{" "}
                <Text span size="xs" c="dimmed">{u.km.toFixed(1)} km</Text>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="xs" variant="light" onClick={() => setFocus({ lat: u.lat, lng: u.lng })}>
                  Fokus
                </Button>
                <Button component={Link} to="/detail/$id" params={{ id: u.id }} size="xs" variant="default">
                  Detail
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </Paper>
    </div>
  );

  function applyFilter() {
    // smallest chosen level first, then its parents; the fit happens once the new list has loaded
    pendingFit.current = ["lurahdesa", "kecamatan", "kabkota", "provinsi"]
      .filter((f) => draft[f] && labels.current[f])
      .map((f) => cleanName(labels.current[f]));
    setApplied({ ...draft }); // new object so applying the same filter again still refetches and refits
  }

  // Fit to the UMKM actually inside the region: a province's own bounds include sea and
  // outlying islands (DKI Jakarta spans Kepulauan Seribu), which zooms out too far.
  // Falls back to the region's bounds when it has no UMKM.
  function fitRegion(list) {
    const names = pendingFit.current;
    pendingFit.current = null;
    if (!names || names.length === 0) return;

    if (list.length > 0) {
      const lats = list.map((u) => u.lat);
      const lngs = list.map((u) => u.lng);
      setRegion({
        bounds: [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
      });
      return;
    }

    regionBounds(names)
      .then((r) => r && setRegion(r))
      .catch((err) => {
        console.error("error finding region: ", err);
        notifications.show({ color: "yellow", message: "Wilayah tidak bisa difokuskan di peta" });
      });
  }
}
