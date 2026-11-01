import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email({ error: "Email tidak valid" }),
  password: z
    .string()
    .min(8, { error: "Minimal Password 8 Karakter" })
    .max(20, { error: "Maksimal Password 20 Karakter" }),
});
