import MainLayout from "@/components/layouts/main";
import AppNavigation from "@/components/layouts/navigation";

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => (
    <MainLayout navigationComponent={<AppNavigation />}>
      <Outlet />
    </MainLayout>
  ),
});
