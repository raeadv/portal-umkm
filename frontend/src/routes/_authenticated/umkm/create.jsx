import UmkmForm from "@/components/UmkmForm";
import { http } from "@/lib/http-client";
import { Card, Divider, Text } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/umkm/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <Card withBorder padding="lg" shadow="sm" radius="md" className="mt-4">
      <Card.Section className="mt-4">
        <Text fz="h3" className="text-center font-extrabold">
          TAMBAH UMKM
        </Text>
      </Card.Section>
      <Divider className="my-4" />
      <UmkmForm onSubmit={handleSubmit} />
    </Card>
  );

  // save the business first, then photos are added on its page: a failed upload never loses the record
  async function handleSubmit(payload) {
    await http
      .post("/umkm", payload)
      .then((res) => {
        navigate({ to: "/umkm/$id", params: { id: res.data.umkm.id } });
      })
      .catch((err) => {
        console.error("error creating umkm: ", err);
      });
  }
}
