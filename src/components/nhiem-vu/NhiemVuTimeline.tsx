// ĐÍCH: src/components/nhiem-vu/NhiemVuTimeline.tsx
"use client";

import { formatDateTimeVN } from "@/lib/week";
import { HanhDongNhiemVu } from "@prisma/client";

const NHAN_HANH_DONG: Record<HanhDongNhiemVu, string> = {
  TAO_MOI: "Tạo nhiệm vụ",
  PHAN_CONG: "Phân công",
  CHUYEN_TIEP: "Chuyển tiếp",
  CAP_NHAT_TIENDO: "Cập nhật tiến độ",
  DONG_GOP_PHOIHOP: "Ghi chú đóng góp",
  BAO_CAO_HOANTHANH: "Báo cáo hoàn thành",
  YEU_CAU_XULY_LAI: "Yêu cầu xử lý lại",
  DUYET_HOANTHANH: "Duyệt hoàn thành",
  MO_LAI: "Mở lại",
  TAMDUNG: "Tạm dừng",
  HUY: "Huỷ",
  THAY_DOI_HAN: "Đổi hạn xử lý",
  THAY_DOI_NGUOIXULY: "Đổi người xử lý chính",
  THAY_DOI_PHONG_CHU_TRI: "Đổi phòng chủ trì",
  THAY_DOI_NOI_DUNG: "Sửa nội dung",
  THAY_DOI_UU_TIEN: "Đổi mức ưu tiên",
  HOAN_THANH_DOT_DINH_KY: "Hoàn thành 1 đợt (định kỳ)",
};

type LogRow = {
  id: number;
  thoiGian: Date;
  hanhDong: HanhDongNhiemVu;
  tuGiaTri: string | null;
  denGiaTri: string | null;
  ghiChu: string | null;
  nguoiThucHien: { hoTen: string };
};

export default function NhiemVuTimeline({ logs }: { logs: LogRow[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-400">Chưa có lịch sử thao tác.</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log, idx) => (
        <div key={log.id} className="relative flex gap-3 pl-1">
          {/* Cột dọc nối các mốc — ẩn ở dòng cuối */}
          {idx < logs.length - 1 && (
            <span className="absolute left-[7px] top-5 h-full w-px bg-gray-200 dark:bg-white/10" />
          )}
          <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-500 bg-white dark:bg-gray-dark" />
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {NHAN_HANH_DONG[log.hanhDong]}
              {log.tuGiaTri && log.denGiaTri && (
                <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">
                  ({log.tuGiaTri} → {log.denGiaTri})
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {formatDateTimeVN(log.thoiGian)} — {log.nguoiThucHien.hoTen}
            </p>
            {log.ghiChu && (
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">
                {log.ghiChu}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
