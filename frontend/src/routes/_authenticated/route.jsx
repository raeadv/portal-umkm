import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// guards every route under /_authenticated/*; UX only, Gin middleware enforces for real
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
  },
  component: Outlet,
});
