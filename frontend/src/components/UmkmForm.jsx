import { umkmSchema } from "@/validation-schemas/umkm.schema";
import {
  Button,
  Divider,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { useOptions } from "@/lib/use-options";
import LocationPicker from "./LocationPicker";

const emptyUmkm = {
  nama: "",
  kategori_id: "",
  jenis_usaha: "",
  alamat: "",
  no_telepon: "",
  media_sosial: "",
  keterangan: "",
  lat: "",
  lng: "",
  provinsi_id: "",
  kabkota_id: "",
  kecamatan_id: "",
  lurahdesa_id: "",
};

// Shared by create and edit. onSubmit(payload) must return a promise so the button can
// stay disabled while saving (a double click would otherwise create two UMKM).
export default function UmkmForm({ initialValues = emptyUmkm, onSubmit }) {
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues,
    validate: schemaResolver(umkmSchema, { sync: true }),
  });

  const kategori = useOptions("/kategori", "kategori", {}, "id", "name");
  const provinsi = useOptions("/wilayah/provinsi", "provinsi", {});
  const kabkota = useOptions("/wilayah/kabkota", "kabkota", form.values.provinsi_id && {
    kode_provinsi: form.values.provinsi_id,
  });
  const kecamatan = useOptions("/wilayah/kecamatan", "kecamatan", form.values.kabkota_id && {
    kode_kabkota: form.values.kabkota_id,
  });
  const lurahdesa = useOptions("/wilayah/lurahdesa", "lurahdesa", form.values.kecamatan_id && {
    kode_kecamatan: form.values.kecamatan_id,
  });

  // picking a parent clears every level below it, otherwise a stale child code would be saved
  const pickWilayah = (field, children) => (value) => {
    form.setFieldValue(field, value ?? "");
    children.forEach((child) => form.setFieldValue(child, ""));
  };

  return (
    <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
      <TextInput
        withAsterisk
        label="Nama UMKM"
        placeholder="Kopi Asiang"
        key={form.key("nama")}
        {...form.getInputProps("nama")}
      />
      <Select
        withAsterisk
        mt="md"
        label="Kategori"
        placeholder="Pilih kategori"
        data={kategori}
        allowDeselect={false}
        key={form.key("kategori_id")}
        {...form.getInputProps("kategori_id")}
      />
      <Select
        withAsterisk
        mt="md"
        label="Jenis Usaha"
        placeholder="Pilih jenis usaha"
        data={[
          { value: "barang", label: "Barang" },
          { value: "jasa", label: "Jasa" },
        ]}
        allowDeselect={false}
        key={form.key("jenis_usaha")}
        {...form.getInputProps("jenis_usaha")}
      />
      <TextInput
        mt="md"
        label="Nomor Telepon"
        placeholder="08123456789"
        key={form.key("no_telepon")}
        {...form.getInputProps("no_telepon")}
      />
      <TextInput
        mt="md"
        label="Media Sosial"
        placeholder="@kopiasiang"
        key={form.key("media_sosial")}
        {...form.getInputProps("media_sosial")}
      />
      <Textarea
        mt="md"
        autosize
        minRows={2}
        label="Keterangan"
        placeholder="Barang/jasa yang ditawarkan"
        key={form.key("keterangan")}
        {...form.getInputProps("keterangan")}
      />

      <Divider className="my-4" label="Alamat" />
      <Select
        label="Provinsi"
        placeholder="Pilih provinsi"
        data={provinsi}
        searchable
        clearable
        key={form.key("provinsi_id")}
        {...form.getInputProps("provinsi_id")}
        onChange={pickWilayah("provinsi_id", ["kabkota_id", "kecamatan_id", "lurahdesa_id"])}
      />
      <Select
        mt="md"
        label="Kabupaten/Kota"
        placeholder="Pilih kabupaten/kota"
        data={kabkota}
        disabled={!form.values.provinsi_id}
        searchable
        clearable
        key={form.key("kabkota_id")}
        {...form.getInputProps("kabkota_id")}
        onChange={pickWilayah("kabkota_id", ["kecamatan_id", "lurahdesa_id"])}
      />
      <Select
        mt="md"
        label="Kecamatan"
        placeholder="Pilih kecamatan"
        data={kecamatan}
        disabled={!form.values.kabkota_id}
        searchable
        clearable
        key={form.key("kecamatan_id")}
        {...form.getInputProps("kecamatan_id")}
        onChange={pickWilayah("kecamatan_id", ["lurahdesa_id"])}
      />
      <Select
        mt="md"
        label="Kelurahan/Desa"
        placeholder="Pilih kelurahan/desa"
        data={lurahdesa}
        disabled={!form.values.kecamatan_id}
        searchable
        clearable
        key={form.key("lurahdesa_id")}
        {...form.getInputProps("lurahdesa_id")}
      />
      <Textarea
        mt="md"
        autosize
        minRows={2}
        label="Alamat Lengkap"
        placeholder="Jl. Merdeka No. 10"
        key={form.key("alamat")}
        {...form.getInputProps("alamat")}
      />

      <Divider className="my-4" label="Lokasi" />
      <LocationPicker
        lat={form.values.lat}
        lng={form.values.lng}
        onChange={(lat, lng) => {
          form.setFieldValue("lat", lat);
          form.setFieldValue("lng", lng);
        }}
      />
      <div className="flex gap-2 mt-2">
        <NumberInput
          withAsterisk
          label="Latitude"
          decimalScale={6}
          hideControls
          key={form.key("lat")}
          {...form.getInputProps("lat")}
        />
        <NumberInput
          withAsterisk
          label="Longitude"
          decimalScale={6}
          hideControls
          key={form.key("lng")}
          {...form.getInputProps("lng")}
        />
      </div>
      <Text size="xs" c="dimmed" mt={4}>
        Klik peta atau geser pin untuk mengubah lokasi.
      </Text>

      <Divider className="my-2" />
      <Button type="submit" fullWidth loading={saving}>
        Simpan
      </Button>
    </form>
  );

  async function handleSubmit(values) {
    setSaving(true);
    // Select values are strings, the API wants kategori_id as a number
    await onSubmit({ ...values, kategori_id: Number(values.kategori_id) }).finally(() =>
      setSaving(false),
    );
  }
}
