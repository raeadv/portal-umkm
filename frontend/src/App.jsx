import { useEffect } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuth } from "./contexts/AuthContexts";

const router = createRouter({
  routeTree,
  defaultViewTransition: true, // native View Transitions API: crossfade on every navigation
  context: {
    auth: undefined, // injected in <App />
  },
});

export default function App() {
  const auth = useAuth();

  // re-run beforeLoad guards when login state flips (login/logout)
  useEffect(() => {
    if (!auth.isLoading) router.invalidate();
  }, [auth.isAuthenticated, auth.isLoading]);

  // hold the router until the first /auth/me answers, else guards see "logged out"
  if (auth.isLoading) return <div>Loading...</div>;

  return <RouterProvider router={router} context={{ auth }} />;
}
