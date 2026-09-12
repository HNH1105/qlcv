// ĐÍCH: src/app/nhiem-vu/phong/page.tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import NhiemVuPhongBoard from "@/components/nhiem-vu/NhiemVuPhongBoard";

export default async function NhiemVuPhongPage() {
  const session = await requireSession();
  if (session.quyen !== "LANHDAOPHONG") {
    redirect("/nhiem-vu");
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Nhiệm vụ Phòng</h1>
      <NhiemVuPhongBoard />
    </div>
  );
}
