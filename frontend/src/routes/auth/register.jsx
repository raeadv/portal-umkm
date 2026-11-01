import { http } from "@/lib/http-client";
import { registrationSchema } from "@/validation-schemas/registration.schema";
import {
  Button,
  Card,
  Divider,
  PasswordInput,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    },
    validate: schemaResolver(registrationSchema, { sync: true }),
  });

  return (
    <div className="w-full flex justify-center">
      <Card
        withBorder
        padding="lg"
        shadow="sm"
        radius="md"
        className="mt-4 w-full max-w-2xl"
      >
        <Card.Section className="mt-4">
          <Text fz="h3" className="text-center font-extrabold">
            REGISTER
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
          <TextInput
            withAsterisk
            mt="md"
            label="Email"
            placeholder="user@mail.com"
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <TextInput
            withAsterisk
            mt="md"
            label="Nomor Telepon"
            placeholder="08123456789"
            key={form.key("phone")}
            {...form.getInputProps("phone")}
          />
          <PasswordInput
            withAsterisk
            mt="md"
            label="Password"
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <PasswordInput
            withAsterisk
            mt="md"
            label="Konfirmasi Password"
            key={form.key("confirmPassword")}
            {...form.getInputProps("confirmPassword")}
          />
          <Divider className="my-2" />
          <div className="flex flex-col gap-2">
            <Button type="submit">Submit</Button>
            <Link to="/auth/login" className="text-sm text-right">
              Login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );

  async function handleSubmit(payload) {
    await http
      .post("/auth/register", payload)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.error("error registering user: ", err);
      });
  }
}
