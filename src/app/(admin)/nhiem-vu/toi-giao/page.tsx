// ĐÍCH: src/app/nhiem-vu/toi-giao/page.tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import NhiemVuToiGiaoBoard from "@/components/nhiem-vu/NhiemVuToiGiaoBoard";

export default async function NhiemVuToiGiaoPage() {
  const session = await requireSession();
  if (session.quyen !== "LANHDAODONVI" && session.quyen !== "LANHDAOPHONG") {
    redirect("/nhiem-vu");
  }

  return (
    <div className="p-4 sm:p-6">
      <NhiemVuToiGiaoBoard />
    </div>
  );
}
