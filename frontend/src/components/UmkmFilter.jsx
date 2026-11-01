import { useOptions } from "@/lib/use-options";
import { Select } from "@mantine/core";

export const emptyFilter = { kategori: "", jenis: "", provinsi: "", kabkota: "", kecamatan: "", lurahdesa: "" };

const jenisOptions = [
  { value: "barang", label: "Barang" },
  { value: "jasa", label: "Jasa" },
];

// The select stack shared by the public map and the admin table. `value` is the draft filter,
// `onChange` receives the next one; the parent decides when to apply it.
export default function UmkmFilter({ value, onChange, onPickLabel }) {
  const kategori = useOptions("/kategori", "kategori", {}, "id", "name");
  const provinsi = useOptions("/wilayah/provinsi", "provinsi", {});
  const kabkota = useOptions("/wilayah/kabkota", "kabkota", value.provinsi && { kode_provinsi: value.provinsi });
  const kecamatan = useOptions("/wilayah/kecamatan", "kecamatan", value.kabkota && { kode_kabkota: value.kabkota });
  const lurahdesa = useOptions("/wilayah/lurahdesa", "lurahdesa", value.kecamatan && { kode_kecamatan: value.kecamatan });

  // picking a parent clears every level below it, otherwise a stale child code would filter wrongly
  const pick = (field, children = []) => (v, option) => {
    onPickLabel?.(field, option?.label);
    onChange({ ...value, [field]: v ?? "", ...Object.fromEntries(children.map((c) => [c, ""])) });
  };

  return (
    <>
      <Select placeholder="Kategori UMKM" data={kategori} clearable value={value.kategori || null} onChange={pick("kategori")} />
      <Select placeholder="Jenis Usaha" data={jenisOptions} clearable value={value.jenis || null} onChange={pick("jenis")} />
      <Select placeholder="Provinsi" data={provinsi} searchable clearable value={value.provinsi || null}
        onChange={pick("provinsi", ["kabkota", "kecamatan", "lurahdesa"])} />
      <Select placeholder="Kab/Kota" data={kabkota} searchable clearable disabled={!value.provinsi} value={value.kabkota || null}
        onChange={pick("kabkota", ["kecamatan", "lurahdesa"])} />
      <Select placeholder="Kecamatan" data={kecamatan} searchable clearable disabled={!value.kabkota} value={value.kecamatan || null}
        onChange={pick("kecamatan", ["lurahdesa"])} />
      <Select placeholder="Kelurahan/Desa" data={lurahdesa} searchable clearable disabled={!value.kecamatan} value={value.lurahdesa || null}
        onChange={pick("lurahdesa")} />
    </>
  );
}
