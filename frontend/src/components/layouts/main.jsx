import { AppShell, Container, Title } from "@mantine/core";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

function MainLayout({ navigationComponent = null, children = null, ...props }) {
  return (
    <AppShell header={{ height: 56 }} padding={0}>
      {navigationComponent}
      <AppShell.Main pl={8} pr={8} style={{ height: "100dvh" }}>
        <Container fluid>{children}</Container>
      </AppShell.Main>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </AppShell>
  );
}

export default MainLayout;
