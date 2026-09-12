// ĐÍCH: src/components/nhiem-vu/NhiemVuCanhBaoWidget.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCanhBaoHanNhiemVu, type CanhBaoRow } from "@/lib/actions/nhiem-vu";
import { formatDateVN } from "@/lib/week";

const NHAN: Record<CanhBaoRow["loai"], string> = {
  SAP_DEN_HAN: "Sắp đến hạn",
  QUA_HAN: "Quá hạn",
  DINH_KY_SAP_NHAC: "Sắp tới đợt nhắc",
};

export default function NhiemVuCanhBaoWidget() {
  const [ds, setDs] = useState<CanhBaoRow[]>([]);
  const [daTai, setDaTai] = useState(false);

  useEffect(() => {
    getCanhBaoHanNhiemVu()
      .then(setDs)
      .finally(() => setDaTai(true));
  }, []);

  if (!daTai || ds.length === 0) return null; // không có gì cảnh báo -> không chiếm chỗ giao diện

  return (
    <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/20 dark:bg-warning-500/10">
      <p className="mb-2 text-sm font-semibold text-warning-700 dark:text-warning-400">
        ⚠️ Cảnh báo hạn xử lý ({ds.length})
      </p>
      <div className="space-y-1.5">
        {ds.slice(0, 8).map((c) => (
          <Link
            key={`${c.loai}-${c.id}`}
            href={`/nhiem-vu/${c.id}`}
            className="flex items-center justify-between gap-2 text-sm hover:underline"
          >
            <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{c.tieuDe}</span>
            <span className={`shrink-0 text-xs font-medium ${c.loai === "QUA_HAN" ? "text-error-600" : "text-warning-600"}`}>
              {NHAN[c.loai]} — {formatDateVN(c.moc)}
            </span>
          </Link>
        ))}
        {ds.length > 8 && <p className="text-xs text-gray-400">và {ds.length - 8} mục khác...</p>}
      </div>
    </div>
  );
}
