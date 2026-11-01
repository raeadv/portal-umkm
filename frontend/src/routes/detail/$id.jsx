import { useAuth } from "@/contexts/AuthContexts";
import { http } from "@/lib/http-client";
import FotoUploader from "@/components/FotoUploader";
import { Badge, Button, Container, Image, SimpleGrid, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

// public, read-only: details + photo gallery of one UMKM
export const Route = createFileRoute("/detail/$id")({
  loader: ({ params }) => http.get(`/umkm/${params.id}`).then((res) => res.data.umkm),
  component: DetailPage,
});

function DetailPage() {
  const umkm = Route.useLoaderData();
  const auth = useAuth();
  const router = useRouter();
  const [uploaderOpen, uploader] = useDisclosure(false);

  return (
    <Container size="md" py="md">
      <Button component={Link} to="/" variant="subtle" size="xs" mb="sm">
        &larr; Kembali ke peta
      </Button>
      {auth.isAuthenticated && (
        <Button component={Link} to="/umkm/$id" params={{ id: umkm.id }} size="xs" ml="xs">
          Edit
        </Button>
      )}
      <Title order={2}>{umkm.nama}</Title>
      <div className="my-2 flex gap-2">
        <Badge>{umkm.kategori?.name}</Badge>
        <Badge variant="light">{umkm.jenis_usaha}</Badge>
      </div>

      {umkm.alamat && <Text mt="sm">{umkm.alamat}</Text>}
      {umkm.no_telepon && <Text mt="xs">Telepon: <a href={`tel:${umkm.no_telepon}`}>{umkm.no_telepon}</a></Text>}
      {umkm.media_sosial && (
        <Text mt="xs">
          Media sosial:{" "}
          {/^https?:/.test(umkm.media_sosial) ? (
            <a href={umkm.media_sosial} target="_blank" rel="noreferrer">{umkm.media_sosial}</a>
          ) : (
            umkm.media_sosial
          )}
        </Text>
      )}
      {umkm.keterangan && <Text mt="sm" c="dimmed">{umkm.keterangan}</Text>}
      <Button
        mt="sm" size="xs" variant="light" component="a" target="_blank" rel="noreferrer"
        href={`https://www.openstreetmap.org/?mlat=${umkm.lat}&mlon=${umkm.lng}#map=18/${umkm.lat}/${umkm.lng}`}
      >
        Lihat di peta
      </Button>

      <div className="mt-6 mb-2 flex items-center justify-between">
        <Title order={4}>Galeri</Title>
        {auth.isAuthenticated && (
          <Button size="xs" onClick={uploader.open}>
            Upload Foto
          </Button>
        )}
      </div>
      {auth.isAuthenticated && (
        <FotoUploader
          umkmId={umkm.id}
          opened={uploaderOpen}
          onClose={uploader.close}
          onUploaded={() => router.invalidate()}
        />
      )}
      {umkm.fotos.length === 0 ? (
        <Text c="dimmed" size="sm">Belum ada foto.</Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          {umkm.fotos.map((f) => (
            <div key={f.id}>
              <Image src={f.url} alt={f.caption || umkm.nama} radius="sm" h={160} fit="cover" />
              {f.caption && <Text size="xs" mt={4}>{f.caption}</Text>}
              {auth.isAuthenticated && (
                <div className="mt-1 flex gap-1">
                  <Button size="compact-xs" variant="light" onClick={() => handleEditCaption(f)}>
                    Ubah Caption
                  </Button>
                  <Button size="compact-xs" color="red" variant="light" onClick={() => handleDelete(f.id)}>
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );

  async function handleEditCaption(foto) {
    const caption = window.prompt("Caption foto:", foto.caption ?? "");
    if (caption === null || caption === foto.caption) return;
    await http
      .patch(`/foto/${foto.id}`, { caption: caption.trim() })
      .then(() => router.invalidate())
      .catch((err) => console.error("error update caption: ", err));
  }

  async function handleDelete(id) {
    if (!window.confirm("Hapus foto ini?")) return;
    await http
      .delete(`/foto/${id}`)
      .then(() => router.invalidate())
      .catch((err) => console.error("error delete foto: ", err));
  }
}
