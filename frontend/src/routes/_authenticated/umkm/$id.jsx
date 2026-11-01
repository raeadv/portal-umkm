import UmkmForm from "@/components/UmkmForm";
import { http } from "@/lib/http-client";
import { Button, Card, Divider, Text } from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/umkm/$id")({
  loader: async ({ params }) => {
    const res = await http.get(`/umkm/${params.id}`);
    return res.data.umkm;
  },
  errorComponent: () => <Text className="mt-4">UMKM tidak ditemukan</Text>,
  component: RouteComponent,
});

function RouteComponent() {
  const umkm = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();

  const initialValues = {
    nama: umkm.nama,
    kategori_id: String(umkm.kategori_id),
    jenis_usaha: umkm.jenis_usaha,
    alamat: umkm.alamat,
    no_telepon: umkm.no_telepon,
    media_sosial: umkm.media_sosial,
    keterangan: umkm.keterangan,
    lat: umkm.lat,
    lng: umkm.lng,
    provinsi_id: umkm.provinsi_id,
    kabkota_id: umkm.kabkota_id,
    kecamatan_id: umkm.kecamatan_id,
    lurahdesa_id: umkm.lurahdesa_id,
  };

  return (
    <>
      <Card withBorder padding="lg" shadow="sm" radius="md" className="mt-4">
        <Card.Section className="mt-4">
          <Text fz="h3" className="text-center font-extrabold">
            EDIT UMKM
          </Text>
        </Card.Section>
        <Divider className="my-4" />
        {/* new key after each save so the form picks up the saved values */}
        <UmkmForm
          key={umkm.updated_at}
          initialValues={initialValues}
          onSubmit={handleSubmit}
        />
      </Card>

      <Button
        fullWidth
        mt="md"
        mb="xl"
        color="red"
        variant="light"
        onClick={handleDelete}
      >
        Hapus UMKM
      </Button>
    </>
  );

  async function handleSubmit(payload) {
    await http
      .put(`/umkm/${umkm.id}`, payload)
      .then(() => router.invalidate())
      .catch((err) => {
        console.error("error updating umkm: ", err);
      });
  }

  async function handleDelete() {
    if (!window.confirm("Hapus UMKM ini beserta semua fotonya?")) return;

    await http
      .delete(`/umkm/${umkm.id}`)
      .then(() => navigate({ to: "/umkm" }))
      .catch((err) => {
        console.error("error deleting umkm: ", err);
      });
  }
}
