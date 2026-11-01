import {
  ActionIcon,
  Loader,
  Paper,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";

// Address/place search through OSM Nominatim (free, no API key). Its usage policy allows ~1 request
// per second and no search-as-you-type, so it only searches on Enter or the search icon.
// onSelect({ lat, lng, name, bounds }) with bounds as [[south, west], [north, east]].
// Not a <form>: this also renders inside UmkmForm, and forms can't nest.
export default function PlaceSearch({ onSelect, className, style }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = nothing searched yet
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  return (
    <div className={className} style={style}>
      <TextInput
        placeholder="Cari alamat atau tempat"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // keep Enter from submitting the surrounding form
            search();
          }
        }}
        leftSection={
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={search}
            aria-label="Cari"
          >
            {loading ? <Loader size={14} /> : <IconSearch size={16} />}
          </ActionIcon>
        }
        rightSection={
          query && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={clear}
              aria-label="Hapus pencarian"
            >
              <IconX size={14} />
            </ActionIcon>
          )
        }
      />

      {results && (
        <Paper withBorder shadow="md" mt={4} style={{ maxHeight: 260, overflow: "auto" }}>
          {results.length === 0 ? (
            <Text size="sm" c="dimmed" p="sm">
              Tempat tidak ditemukan
            </Text>
          ) : (
            results.map((item) => (
              <UnstyledButton
                key={item.place_id}
                onClick={() => select(item)}
                p="xs"
                style={{ display: "block", width: "100%" }}
              >
                <Text size="sm" lineClamp={2}>
                  {item.display_name}
                </Text>
              </UnstyledButton>
            ))
          )}
        </Paper>
      )}
    </div>
  );

  async function search() {
    const q = query.trim();
    if (!q) return;

    // a newer search cancels the one still in flight, so an old answer can't overwrite it
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        q,
        format: "jsonv2",
        countrycodes: "id",
        limit: "5",
        "accept-language": "id",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("status " + res.status);
      setResults(await res.json());
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("error searching place: ", err);
      notifications.show({
        color: "red",
        message: "Pencarian alamat gagal, coba lagi",
      });
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  function select(item) {
    const [south, north, west, east] = item.boundingbox.map(Number);
    onSelect({
      lat: Number(item.lat),
      lng: Number(item.lon),
      name: item.display_name,
      bounds: [
        [south, west],
        [north, east],
      ],
    });
    setResults(null);
    setQuery(item.display_name.split(",")[0]);
  }

  function clear() {
    abortRef.current?.abort();
    setLoading(false);
    setQuery("");
    setResults(null);
  }
}
