import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import AdminShell from "@/layout/AdminShell";
import { NavProgressProvider } from "@/components/providers/NavProgressProvider";
import Footer from "@/components/common/Footer";

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
      <NavProgressProvider>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            <AdminShell>{children}</AdminShell>
          </div>

          <Footer />
        </div>
      </NavProgressProvider>
    </AuthProvider>
  );
}