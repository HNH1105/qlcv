// ĐÍCH: src/app/(admin)/giao-ban/[id]/page.tsx
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import GiaoBanChecklistBoard from "@/components/giao-ban/GiaoBanChecklistBoard";

export default async function GiaoBanChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const cuocHopGiaoBanId = Number(id);
  if (!Number.isInteger(cuocHopGiaoBanId)) notFound();

  return (
    <div className="p-4 sm:p-6">
      <GiaoBanChecklistBoard cuocHopGiaoBanId={cuocHopGiaoBanId} />
    </div>
  );
}
