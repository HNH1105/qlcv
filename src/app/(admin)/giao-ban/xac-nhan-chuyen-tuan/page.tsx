// ĐÍCH: src/app/(admin)/giao-ban/xac-nhan-chuyen-tuan/page.tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import XacNhanChuyenTuanBoard from "@/components/giao-ban/XacNhanChuyenTuanBoard";

export default async function XacNhanChuyenTuanPage() {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/giao-ban");

  return (
    <div className="p-4 sm:p-6">
      <XacNhanChuyenTuanBoard />
    </div>
  );
}
