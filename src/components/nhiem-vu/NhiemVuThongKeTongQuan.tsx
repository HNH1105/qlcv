// ĐÍCH: src/components/nhiem-vu/NhiemVuThongKeTongQuan.tsx
"use client";

import { useEffect, useState } from "react";
import { getThongKeTongQuan, type ThongKeTongQuan } from "@/lib/actions/nhiem-vu";
import { TrangThaiNhiemVuBadge } from "./NhiemVuBadges";
import { TrangThaiNhiemVu } from "@prisma/client";

const CAC_TRANG_THAI: TrangThaiNhiemVu[] = ["CHO_PHAN_CONG", "DANGXULY", "CHO_DUYET", "HOANTHANH", "TAMDUNG", "HUY"];

export default function NhiemVuThongKeTongQuan() {
  const [tk, setTk] = useState<ThongKeTongQuan | null>(null);

  useEffect(() => {
    getThongKeTongQuan().then(setTk);
  }, []);

  if (!tk) {
    return <div className="py-8 text-center text-gray-400">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardSo label="Tổng số" value={tk.tongSo} />
        <CardSo label="Đang xử lý" value={tk.theoTrangThai.DANGXULY ?? 0} />
        <CardSo label="Chờ duyệt" value={tk.theoTrangThai.CHO_DUYET ?? 0} />
        <CardSo label="Hoàn thành" value={tk.theoTrangThai.HOANTHANH ?? 0} />
        <CardSo label="Quá hạn" value={tk.soQuaHan} nhan="error" />
        <CardSo label="Chưa phân công" value={tk.theoTrangThai.CHO_PHAN_CONG ?? 0} />
        <CardSo label="Tạm dừng" value={tk.theoTrangThai.TAMDUNG ?? 0} />
        <CardSo label="Đã huỷ" value={tk.theoTrangThai.HUY ?? 0} />
      </div>

      {tk.theoPhong.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Theo phòng</p>
          <div className="space-y-3">
            {tk.theoPhong.map((p) => (
              <div key={p.maPhong}>
                <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">{p.tenPhong}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {CAC_TRANG_THAI.filter((t) => p.theoTrangThai[t]).map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs">
                      <TrangThaiNhiemVuBadge trangThai={t} />
                      <span className="text-gray-500 dark:text-gray-400">×{p.theoTrangThai[t]}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardSo({ label, value, nhan }: { label: string; value: number; nhan?: "error" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${nhan === "error" ? "text-error-600" : "text-gray-800 dark:text-white/90"}`}>
        {value}
      </p>
    </div>
  );
}
