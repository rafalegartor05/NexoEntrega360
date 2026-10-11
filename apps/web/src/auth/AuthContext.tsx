
import {
  createContext,
  useContext,
  useState,
  type ReactNode
} from "react";
import { api } from "../api";

export type Role =
  | "SOLICITANTE"
  | "COORDINADOR"
  | "BODEGA"
  | "AUDITOR";

export type User = {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function login(email: string, password: string) {
    const result = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    sessionStorage.setItem("nexo_token", result.token);
    setUser(result.user);
  }

  function logout() {
    sessionStorage.removeItem("nexo_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
