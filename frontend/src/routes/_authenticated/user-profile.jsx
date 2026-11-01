import { useAuth } from "@/contexts/AuthContexts";
import { http } from "@/lib/http-client";
import { profileSchema } from "@/validation-schemas/profile.schema";
import { Button, Card, Divider, PasswordInput, Text, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/user-profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      name: auth.user?.name ?? "",
      phone: auth.user?.phone ?? "",
      oldPassword: "",
      password: "",
      confirmPassword: "",
    },
    validate: schemaResolver(profileSchema, { sync: true }),
  });

  return (
    <Card withBorder padding="lg" shadow="sm" radius="md" className="mt-4">
      <Card.Section className="mt-4">
        <Text fz="h3" className="text-center font-extrabold">
          PROFIL SAYA
        </Text>
      </Card.Section>
      <Divider className="my-4" />
      <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
        <TextInput
          withAsterisk
          label="Nama"
          placeholder="Nama"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />
        <TextInput label="Email" mt="md" value={auth.user?.email ?? ""} disabled />
        <TextInput
          withAsterisk
          mt="md"
          label="Nomor Telepon"
          placeholder="08123456789"
          key={form.key("phone")}
          {...form.getInputProps("phone")}
        />
        <Divider className="my-4" label="Ganti password (kosongkan jika tidak diganti)" />
        <PasswordInput
          label="Password Lama"
          key={form.key("oldPassword")}
          {...form.getInputProps("oldPassword")}
        />
        <PasswordInput
          mt="md"
          label="Password Baru"
          key={form.key("password")}
          {...form.getInputProps("password")}
        />
        <PasswordInput
          mt="md"
          label="Konfirmasi Password Baru"
          key={form.key("confirmPassword")}
          {...form.getInputProps("confirmPassword")}
        />
        <Divider className="my-2" />
        <Button type="submit" fullWidth>
          Simpan
        </Button>
      </form>
      <Divider className="my-4" />
      <Button variant="outline" color="red" fullWidth onClick={handleLogout}>
        Keluar
      </Button>
    </Card>
  );

  async function handleLogout() {
    // failure toast comes from the http interceptor; stay on the page if it fails
    await auth
      .logout()
      .then(() => navigate({ to: "/" }))
      .catch(() => {});
  }

  async function handleSubmit(values) {
    const payload = { name: values.name, phone: values.phone };
    if (values.password) {
      payload.password = values.password;
      payload.old_password = values.oldPassword;
    }

    await http
      .post("/auth/update", payload)
      .then(async () => {
        await auth.refresh();
        form.setValues({ oldPassword: "", password: "", confirmPassword: "" });
      })
      .catch((err) => {
        console.error("error updating profile: ", err);
      });
  }
}
