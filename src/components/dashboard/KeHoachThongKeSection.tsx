// ĐÍCH: src/components/dashboard/KeHoachThongKeSection.tsx
"use client";

import { useEffect, useState } from "react";
import type { KeHoachThongKe } from "@/lib/actions/ke-hoach-thong-ke";

export default function KeHoachThongKeSection({
  tieuDe,
  taiDuLieu,
}: {
  tieuDe: string;
  taiDuLieu: () => Promise<KeHoachThongKe>;
}) {
  const [tk, setTk] = useState<KeHoachThongKe | null>(null);

  useEffect(() => {
    taiDuLieu().then(setTk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{tieuDe}</p>
      {!tk ? (
        <div className="py-6 text-center text-sm text-gray-400">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardSo label="Tổng số" value={tk.tongSo} />
          <CardSo label="Chưa xử lý" value={tk.chuaXuLy} />
          <CardSo label="Chưa xử lý quá hạn" value={tk.chuaXuLyQuaHan} nhan="error" />
          <CardSo label="Hoàn thành" value={tk.hoanThanh} nhan="success" />
        </div>
      )}
    </div>
  );
}

function CardSo({ label, value, nhan }: { label: string; value: number; nhan?: "error" | "success" }) {
  const mauChu =
    nhan === "error"
      ? "text-error-600"
      : nhan === "success"
        ? "text-success-600"
        : "text-gray-800 dark:text-white/90";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${mauChu}`}>{value}</p>
    </div>
  );
}
