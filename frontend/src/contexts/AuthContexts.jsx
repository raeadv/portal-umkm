import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { http } from "@/lib/http-client";

const AuthContext = createContext(undefined);

// The session cookie is HttpOnly, so the server is the only source of truth:
// ask GET /auth/me instead of storing any login flag client-side.
async function fetchMe() {
  try {
    const { data } = await http.get("/auth/me", { silent: true });
    return { user: data.user };
  } catch (e) {
    if (e.response?.status === 401) return { user: null };
    // network error / offline (PWA): not the same as logged out
    return { error: true };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await fetchMe();
    if (!r.error) setUser(r.user); // on error keep last known user
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (payload) => {
    const { data } = await http.post("/auth/login", payload);
    setUser(data.user);
  };

  const logout = async () => {
    await http.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
