import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));

  const setToken = (nextToken: string | null) => {
    setTokenState(nextToken);
    if (nextToken) localStorage.setItem("token", nextToken);
    else localStorage.removeItem("token");
  };

  const value = useMemo(() => ({ token, setToken, logout: () => setToken(null) }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
