// ĐÍCH: src/components/giao-ban/NoiDungGiaoBanLichSu.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDateTimeVN } from "@/lib/week";
import { getLichSuNoiDungGiaoBan } from "@/lib/actions/giao-ban";
import { HanhDongGiaoBan } from "@prisma/client";

const NHAN_HANH_DONG: Record<HanhDongGiaoBan, string> = {
  TAO_NOI_DUNG: "Tạo nội dung",
  CHUYEN_TU_NHIEM_VU: "Chuyển từ Nhiệm vụ",
  CHUYEN_TU_KE_HOACH_PHONG: "Chuyển từ Kế hoạch phòng",
  CAP_NHAT_NOI_DUNG: "Sửa nội dung",
  SUA_PHONG_XU_LY: "Đổi phòng xử lý",
  THEM_NGUOI_XU_LY: "Thêm chuyên viên xử lý",
  XOA_NGUOI_XU_LY: "Xoá chuyên viên xử lý",
  SUA_HAN_HOAN_THANH: "Đổi hạn hoàn thành",
  SUA_MUC_DO_UU_TIEN: "Đổi mức độ ưu tiên",
  CAP_NHAT_GHI_CHU: "Cập nhật ghi chú",
  HOAN_THANH: "Đánh dấu hoàn thành",
  BO_HOAN_THANH: "Bỏ hoàn thành",
  CHUYEN_TUAN_SAU: "Đề nghị chuyển tuần sau",
  XAC_NHAN_CHUYEN_TUAN: "Xác nhận chuyển tuần",
  HUY_KHONG_THEO_DOI: "Huỷ / không theo dõi",
  DONG_BO_HOAN_THANH: "Đồng bộ hoàn thành từ nguồn",
  KHOI_PHUC: "Khôi phục (đem lại checklist)",
};

type Log = Awaited<ReturnType<typeof getLichSuNoiDungGiaoBan>>[number];

export default function NoiDungGiaoBanLichSu({ noiDungGiaoBanId }: { noiDungGiaoBanId: number }) {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    setLogs(null);
    getLichSuNoiDungGiaoBan(noiDungGiaoBanId).then(setLogs);
  }, [noiDungGiaoBanId]);

  if (logs === null) {
    return <p className="py-4 text-center text-xs text-gray-400">Đang tải lịch sử...</p>;
  }
  if (logs.length === 0) {
    return <p className="py-4 text-center text-xs text-gray-400">Chưa có lịch sử.</p>;
  }

  return (
    <ul className="max-h-64 space-y-3 overflow-y-auto text-xs">
      {logs.map((l) => (
        <li key={l.id} className="border-l-2 border-gray-200 pl-3 dark:border-white/10">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            {NHAN_HANH_DONG[l.thaoTac]} <span className="font-normal text-gray-400">— {l.nguoiThucHien.hoTen}</span>
          </p>
          <p className="text-gray-400">{formatDateTimeVN(l.thoiGian)}</p>
          {l.truongDuocSua && (l.giaTriCu != null || l.giaTriMoi != null) && (
            <p className="mt-0.5 text-gray-500 dark:text-gray-400">
              {l.giaTriCu != null && <span className="line-through">{l.giaTriCu}</span>}
              {l.giaTriCu != null && l.giaTriMoi != null && " → "}
              {l.giaTriMoi != null && <span>{l.giaTriMoi}</span>}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
