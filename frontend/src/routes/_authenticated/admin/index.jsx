import { http } from "@/lib/http-client";
import {
  Badge,
  Button,
  Card,
  Loader,
  Progress,
  SimpleGrid,
  Table,
  Text,
} from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: RouteComponent,
});

const jenisLabel = { barang: "Barang", jasa: "Jasa" };
const fmtDate = (s) =>
  new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function StatCard({ label, value, hint }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz={28} fw={800}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

// Horizontal bars, each relative to `total` (share of all UMKM).
function Breakdown({ title, rows, total, labelOf = (n) => n }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Text fw={700} mb="sm">
        {title}
      </Text>
      {rows.length === 0 && (
        <Text size="sm" c="dimmed">
          Belum ada data
        </Text>
      )}
      {rows.map((r) => (
        <div key={r.nama} className="mb-3">
          <div className="flex justify-between text-sm">
            <span>{labelOf(r.nama)}</span>
            <span className="font-bold">{r.total}</span>
          </div>
          <Progress value={total ? (r.total / total) * 100 : 0} size="sm" />
        </div>
      ))}
    </Card>
  );
}

function RouteComponent() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    http
      .get("/umkm/stats", { silent: true })
      .then((res) => setStats(res.data.stats))
      .catch((err) => {
        console.error("error loading stats: ", err);
        setFailed(true);
      });
  }, []);

  if (failed) return <Text className="mt-4">Gagal memuat ringkasan data.</Text>;
  if (!stats) return <Loader className="mt-4" />;

  const pctFoto = stats.total ? Math.round((stats.dengan_foto / stats.total) * 100) : 0;

  return (
    <div className="mt-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <Text fz="h3" className="font-extrabold">
          DASHBOARD
        </Text>
        <Button component={Link} to="/umkm/create">
          Tambah UMKM
        </Button>
      </div>

      <SimpleGrid cols={{ base: 2, md: 4 }} mb="md">
        <StatCard label="Total UMKM" value={stats.total} />
        <StatCard label="Baru (30 hari)" value={stats.baru_30_hari} />
        <StatCard
          label="Punya foto"
          value={`${pctFoto}%`}
          hint={`${stats.dengan_foto} dari ${stats.total} UMKM`}
        />
        <StatCard label="Total foto" value={stats.total_foto} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} mb="md">
        <Breakdown title="Per kategori" rows={stats.per_kategori} total={stats.total} />
        <Breakdown
          title="Barang / Jasa"
          rows={stats.per_jenis}
          total={stats.total}
          labelOf={(n) => jenisLabel[n] ?? n}
        />
        <Breakdown title="Provinsi teratas" rows={stats.per_provinsi} total={stats.total} />
      </SimpleGrid>

      <Card withBorder radius="md" padding="md">
        <div className="flex items-center justify-between mb-2">
          <Text fw={700}>UMKM terbaru</Text>
          <Link to="/umkm" className="text-sm">
            Lihat semua
          </Link>
        </div>
        <Table.ScrollContainer minWidth={400}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nama</Table.Th>
                <Table.Th>Kategori</Table.Th>
                <Table.Th>Jenis</Table.Th>
                <Table.Th>Ditambahkan</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.terbaru.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Link to="/detail/$id" params={{ id: u.id }}>
                      {u.nama}
                    </Link>
                  </Table.Td>
                  <Table.Td>{u.kategori?.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={u.jenis_usaha === "jasa" ? "grape" : "blue"}>
                      {jenisLabel[u.jenis_usaha] ?? u.jenis_usaha}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{fmtDate(u.created_at)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </div>
  );
}
