// ĐÍCH: src/app/(admin)/nguoi-dung/page.tsx
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import NguoiDungBoard from "@/components/nguoi-dung/NguoiDungBoard";

export default async function NguoiDungPage() {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/");

  return (
    <div className="p-4 sm:p-6">
      <NguoiDungBoard />
    </div>
  );
}
