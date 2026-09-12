// src/components/nhiem-vu/NhiemVuCard.tsx
//
// Dùng cho /nhiem-vu (của tôi) — số lượng ít, cần thao tác nhanh, giữ đúng phong cách card đã có
// của KehoachBaoCaoItemCard (bo góc, ProgressStrip full-bleed đáy card, dark mode đồng bộ).
"use client";

import Link from "next/link";
import { TrangThaiNhiemVuBadge, UuTienBadge, tinhQuaHan } from "./NhiemVuBadges";
import { formatDateVN } from "@/lib/week";
import { useNavProgress } from "@/components/providers/NavProgressProvider";
import type { NhiemVuRow } from "@/lib/actions/nhiem-vu";

export default function NhiemVuCard({
  row,
  // MỚI — chỉ true khi card này đang hiển thị trong tab "Phối hợp" của /nhiem-vu (của tôi). Khi
  // đó, thêm 1 badge riêng thể hiện trạng thái PHẦN VIỆC CỦA RIÊNG người xem (daHoanThanhPhanViecCuaToi)
  // — khác hẳn TrangThaiNhiemVuBadge phía trên vốn hiện trạng thái CHUNG của cả nhiệm vụ, có thể
  // gây hiểu nhầm nếu chỉ nhìn 1 badge đó (VD: nhiệm vụ vẫn "Đang xử lý" chung nhưng người phối hợp
  // này đã xong phần của họ từ lâu).
  hienThiTrangThaiPhoiHop = false,
}: {
  row: NhiemVuRow;
  hienThiTrangThaiPhoiHop?: boolean;
}) {
  const batDauDieuHuong = useNavProgress();
  const quaHan = tinhQuaHan(row.hanXuLy, row.trangThai);

  return (
    <Link
      href={`/nhiem-vu/${row.id}`}
      onClick={batDauDieuHuong}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <UuTienBadge mucDo={row.mucDoUuTien} />
            <TrangThaiNhiemVuBadge trangThai={row.trangThai} />
            {hienThiTrangThaiPhoiHop && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  row.daHoanThanhPhanViecCuaToi
                    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
              >
                {row.daHoanThanhPhanViecCuaToi ? "Đã phối hợp" : "Chưa phối hợp"}
              </span>
            )}
          </div>
          <p className="line-clamp-2 break-words text-sm font-medium text-gray-800 dark:text-white/90">
            {row.tieuDe}
          </p>
          <p className="mt-1 text-xs text-gray-400">{row.tenPhongChuTri}</p>
        </div>

        {row.hanXuLy && (
          <div className="shrink-0 text-right">
            <p className={`text-xs font-medium ${quaHan ? "text-error-600" : "text-gray-500 dark:text-gray-400"}`}>
              {formatDateVN(row.hanXuLy)}
            </p>
            {quaHan && <p className="text-[11px] text-error-500">Quá hạn</p>}
          </div>
        )}
      </div>

      {/* Thanh tiến độ full-bleed đáy card, cùng phong cách ProgressStrip đã có ở Kế hoạch/Báo cáo */}
      <div className="mt-3 -mx-4 -mb-4 h-2 overflow-hidden rounded-b-xl bg-gray-100 dark:bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-success-500 transition-all duration-300"
          style={{ width: `${row.tienDoPhanTram}%` }}
        />
      </div>
    </Link>
  );
}
