import UmkmFilter, { emptyFilter } from "@/components/UmkmFilter";
import { http } from "@/lib/http-client";
import { Button, Pagination, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/umkm/")({
  component: RouteComponent,
});

const PER_PAGE = 10;

function RouteComponent() {
  const [draft, setDraft] = useState(emptyFilter); // what the selects show
  const [applied, setApplied] = useState(emptyFilter);
  const [q, setQ] = useState("");
  const [debouncedQ] = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // any change of search/filter goes back to page 1
  useEffect(() => setPage(1), [debouncedQ, applied]);

  useEffect(() => {
    let stale = false;
    const params = {
      ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)),
      q: debouncedQ,
      page,
      per_page: PER_PAGE,
    };
    http
      .get("/umkm/table", { params, silent: true })
      .then((res) => {
        if (stale) return;
        setRows(res.data.umkm);
        setTotal(res.data.total);
      })
      .catch((err) => console.error("error loading umkm: ", err));
    return () => {
      stale = true;
    };
  }, [applied, debouncedQ, page]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <Text fz="h3" className="font-extrabold">
          DATA UMKM
        </Text>
        <Button component={Link} to="/umkm/create">
          Tambah UMKM
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput
          className="sm:col-span-2 lg:col-span-4"
          placeholder="Cari nama UMKM"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        <UmkmFilter value={draft} onChange={setDraft} />
        <Button onClick={() => setApplied(draft)}>Terapkan Filter</Button>
      </div>

      {rows.length === 0 ? (
        <Text c="dimmed">Tidak ada data UMKM.</Text>
      ) : (
        <Table.ScrollContainer minWidth={500}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nama</Table.Th>
                <Table.Th>Kategori</Table.Th>
                <Table.Th>Jenis</Table.Th>
                <Table.Th>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.nama}</Table.Td>
                  <Table.Td>{item.kategori?.name ?? "-"}</Table.Td>
                  <Table.Td className="capitalize">{item.jenis_usaha}</Table.Td>
                  <Table.Td>
                    <div className="flex gap-2">
                      <Button component={Link} to="/detail/$id" params={{ id: item.id }} size="xs" variant="default">
                        Detail
                      </Button>
                      <Button component={Link} to="/umkm/$id" params={{ id: item.id }} size="xs">
                        Edit
                      </Button>
                    </div>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Text size="sm" c="dimmed">{total} UMKM</Text>
        <Pagination value={page} onChange={setPage} total={Math.ceil(total / PER_PAGE)} />
      </div>
    </div>
  );
}
