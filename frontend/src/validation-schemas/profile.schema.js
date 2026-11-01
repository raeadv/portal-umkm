import { z } from "zod/v4";

// password stays empty unless the user wants to change it; then old + confirmation are required
export const profileSchema = z
  .object({
    name: z
      .string()
      .min(3, { error: "Nama harus 3-50 karakter" })
      .max(50, { error: "Nama harus 3-50 karakter" }),
    phone: z.string().min(10, { error: "Minimal Nomor Telepon 10 Karakter" }),
    oldPassword: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.password) return;
    if (data.password.length < 8 || data.password.length > 20)
      ctx.addIssue({ code: "custom", path: ["password"], message: "Password harus 8-20 karakter" });
    if (!data.oldPassword)
      ctx.addIssue({ code: "custom", path: ["oldPassword"], message: "Password lama wajib diisi" });
    if (data.password !== data.confirmPassword)
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Konfirmasi Password tidak sama" });
  });
