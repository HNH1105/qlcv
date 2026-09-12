// src/app/nhiem-vu/[id]/page.tsx

import { notFound } from "next/navigation";
import { getNhiemVuChiTiet } from "@/lib/actions/nhiem-vu";
import NhiemVuChiTietView from "@/components/nhiem-vu/NhiemVuChiTietView";

export default async function ChiTietNhiemVuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    notFound();
  }

  try {
    const nv = await getNhiemVuChiTiet(id);

    if (!nv) {
      notFound();
    }

    return <NhiemVuChiTietView nvBanDau={nv} />;
  } catch {
    notFound();
  }
}