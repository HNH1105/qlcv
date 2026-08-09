import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import AdminShell from "@/layout/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <AuthProvider user={session}>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}