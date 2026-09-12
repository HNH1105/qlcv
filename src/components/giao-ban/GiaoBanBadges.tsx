// ĐÍCH: src/components/giao-ban/GiaoBanBadges.tsx
import { MucDoUuTienGiaoBan } from "@prisma/client";
import { tinhTrangThaiGiaoBan } from "@/lib/giao-ban/trang-thai";

type TrangThaiHienThi = ReturnType<typeof tinhTrangThaiGiaoBan>;

const TRANG_THAI_STYLE: Record<TrangThaiHienThi, { label: string; className: string }> = {
  DANG_XU_LY: { label: "Đang xử lý", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  DA_HOAN_THANH: { label: "Đã hoàn thành", className: "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  DA_CHUYEN_TUAN: { label: "Đã chuyển tuần", className: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  DA_HUY: { label: "Đã hủy", className: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400" },
};

export function TrangThaiGiaoBanBadge({ trangThai }: { trangThai: TrangThaiHienThi }) {
  const s = TRANG_THAI_STYLE[trangThai];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

const UU_TIEN_STYLE: Record<MucDoUuTienGiaoBan, { label: string; className: string }> = {
  CAO: { label: "Cao", className: "bg-error-100 text-error-700 dark:bg-error-500/15 dark:text-error-400" },
  TRUNGBINH: { label: "Trung bình", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400" },
  THAP: { label: "Thấp", className: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400" },
};

export function UuTienGiaoBanBadge({ mucDo }: { mucDo: MucDoUuTienGiaoBan }) {
  const s = UU_TIEN_STYLE[mucDo];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
