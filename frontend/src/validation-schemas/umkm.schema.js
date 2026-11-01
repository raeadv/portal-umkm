import { z } from "zod/v4";

// mirrors the Go UmkmInput binding rules; lat/lng bounds are rough Indonesia
export const umkmSchema = z.object({
  nama: z
    .string()
    .min(1, { error: "Nama wajib diisi" })
    .max(200, { error: "Maksimal Nama 200 Karakter" }),
  kategori_id: z.string().min(1, { error: "Kategori wajib dipilih" }),
  jenis_usaha: z.enum(["barang", "jasa"], {
    error: "Jenis usaha wajib dipilih",
  }),
  alamat: z.string(),
  no_telepon: z.string().max(20, { error: "Maksimal Nomor Telepon 20 Karakter" }),
  media_sosial: z
    .string()
    .max(255, { error: "Maksimal Media Sosial 255 Karakter" }),
  keterangan: z.string(),
  lat: z
    .number({ error: "Lokasi wajib dipilih di peta" })
    .min(-11, { error: "Latitude di luar Indonesia" })
    .max(6, { error: "Latitude di luar Indonesia" }),
  lng: z
    .number({ error: "Lokasi wajib dipilih di peta" })
    .min(95, { error: "Longitude di luar Indonesia" })
    .max(141, { error: "Longitude di luar Indonesia" }),
  provinsi_id: z.string(),
  kabkota_id: z.string(),
  kecamatan_id: z.string(),
  lurahdesa_id: z.string(),
});
