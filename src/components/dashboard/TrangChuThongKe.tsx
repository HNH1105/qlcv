// ĐÍCH: src/components/dashboard/TrangChuThongKe.tsx
//
// Gộp 3 khối trên CÙNG 1 trang: Nhiệm vụ (tái dùng nguyên component đã có ở /nhiem-vu/thong-ke,
// KHÔNG viết lại) + Kế hoạch cá nhân (mới) + Kế hoạch phòng (mới). Đây là trang MẶC ĐỊNH hiển thị
// sau khi đăng nhập — xem ghi chú cách gắn route ở cuối file.
//
// CHƯA làm: bấm vào con số để chuyển sang danh sách lọc tương ứng — theo đúng yêu cầu "khoan hãy
// viết tính năng nhấp vào", chỉ hiển thị số liệu tĩnh ở bản này.
"use client";

import NhiemVuCanhBaoWidget from "@/components/nhiem-vu/NhiemVuCanhBaoWidget";
import NhiemVuThongKeTongQuan from "@/components/nhiem-vu/NhiemVuThongKeTongQuan";
import KeHoachThongKeSection from "./KeHoachThongKeSection";
import { getThongKeKeHoachCaNhan, getThongKeKeHoachPhong } from "@/lib/actions/ke-hoach-thong-ke";

export default function TrangChuThongKe() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tổng quan công việc</h1>

      <NhiemVuCanhBaoWidget />

      <section>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Nhiệm vụ</p>
        <NhiemVuThongKeTongQuan />
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <KeHoachThongKeSection tieuDe="Kế hoạch cá nhân" taiDuLieu={getThongKeKeHoachCaNhan} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <KeHoachThongKeSection tieuDe="Kế hoạch phòng" taiDuLieu={getThongKeKeHoachPhong} />
      </div>
    </div>
  );
}
