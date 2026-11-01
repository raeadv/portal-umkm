import axios from "axios";
import { notifications } from "@mantine/notifications";

// Shared axios instance. In dev, Vite proxies /api to the Go server (vite.config.js).
// withCredentials sends the HttpOnly session cookie on every request.
export const http = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// The Go API replies { message } on errors; fall back for network/timeout failures.
export function getErrorMessage(
  error,
  fallback = "Terjadi kesalahan, coba lagi",
) {
  return error?.response?.data?.message ?? fallback;
}

const errorTitles = {
  400: "Permintaan tidak valid",
  401: "Belum login",
  403: "Akses ditolak",
  404: "Tidak ditemukan",
  409: "Data sudah ada",
  422: "Data tidak valid",
  429: "Terlalu banyak permintaan",
};

// Opt out per request with { silent: true }, e.g. http.get("/auth/me", { silent: true }).
http.interceptors.response.use(
  (response) => {
    const message = response.data?.message;
    // GET successes are usually page loads, not user actions: stay quiet.
    if (
      message &&
      response.config.method !== "get" &&
      !response.config.silent
    ) {
      notifications.show({ color: "green", title: "Berhasil", message });
    }
    return response;
  },
  (error) => {
    if (!error.config?.silent) {
      const status = error.response?.status;
      notifications.show({
        color: "red",
        title: !status
          ? "Koneksi bermasalah"
          : (errorTitles[status] ??
            (status >= 500 ? "Kesalahan server" : "Gagal")),
        message: !status
          ? "Tidak dapat terhubung ke server, periksa koneksi Anda"
          : getErrorMessage(error),
      });
    }
    return Promise.reject(error);
  },
);
