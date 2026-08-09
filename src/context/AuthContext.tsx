"use client";

import { createContext, useContext } from "react";
import type { SessionPayload } from "@/lib/auth/session";

const AuthContext = createContext<SessionPayload | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: SessionPayload | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

// Dùng trong bất kỳ Client Component nào (Sidebar, UserDropdown...) để biết ai đang đăng nhập
export function useAuth() {
  return useContext(AuthContext);
}