import { useAuth } from "@/contexts/AuthContexts";
import { loginSchema } from "@/validation-schemas/login.schema";
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  PasswordInput,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const auth = useAuth();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: schemaResolver(loginSchema, { sync: true }),
  });

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.navigate({ to: "/admin" });
    }
  }, [auth.isAuthenticated]);

  return (
    <div className="w-full flex justify-center">
      <Card
        withBorder
        padding="md"
        shadow="sm"
        radius="md"
        className="mt-4 w-full max-w-96"
      >
        <Card.Section className="mt-4">
          <Text fz="h3" className="text-center font-extrabold">
            LOGIN
          </Text>
        </Card.Section>
        <Divider className="my-4" />
        <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
          <TextInput
            withAsterisk
            label="Email"
            placeholder="user@mail.com"
            key={form.key("email")}
            {...form.getInputProps("email")}
          />
          <PasswordInput
            withAsterisk
            label="Password"
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <Divider className="my-2" />
          <div className="flex flex-col gap-2">
            <Button type="submit">Submit</Button>
            <Link to="/auth/register" className="text-sm text-right">
              Register
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );

  async function handleSubmit(payload) {
    // login() sets the context user; the effect above then navigates
    await auth.login(payload).catch(() => {}); // interceptor already toasts the error
  }
}
