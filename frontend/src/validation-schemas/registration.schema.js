import { z } from "zod/v4";

export const registrationSchema = z
  .object({
    name: z
      .string()
      .min(3, { error: "Nama harus 3-50 karakter" })
      .max(50, { error: "Nama harus 3-50 karakter" }),
    email: z.email({ error: "Email tidak valid" }),
    password: z
      .string()
      .min(8, { error: "Minimal Password 8 Karakter" })
      .max(20, { error: "Maksimal Password 20 Karakter" }),
    confirmPassword: z.string(),
    phone: z.string().min(10, { error: "Minimal Nomor Telepon 10 Karakter" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Konfirmasi Password tidak sama",
    path: ["confirmPassword"],
  });
