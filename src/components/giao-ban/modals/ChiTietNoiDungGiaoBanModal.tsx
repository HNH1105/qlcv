// ĐÍCH: src/components/giao-ban/modals/ChiTietNoiDungGiaoBanModal.tsx
"use client";

import { Modal } from "@/components/ui/modal";
import { formatDateVN, formatDateTimeVN } from "@/lib/week";
import { UuTienGiaoBanBadge } from "../GiaoBanBadges";
import type { NoiDungGiaoBanRow } from "../GiaoBanTable";

export default function ChiTietNoiDungGiaoBanModal({
  isOpen,
  onClose,
  row,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: NoiDungGiaoBanRow | null;
}) {
  if (!row) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <div className="mb-3 flex items-center gap-2">
        <UuTienGiaoBanBadge mucDo={row.mucDoUuTien} />
        {row.daHoanThanh && (
          <span className="rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-400">
            Đã hoàn thành
          </span>
        )}
      </div>

      <p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-white/90">{row.noiDung}</p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-gray-400">Phòng xử lý</p>
          <p className="text-gray-800 dark:text-white/90">{row.phongXuLy.tenPhong}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400">Hạn hoàn thành</p>
          <p className="text-gray-800 dark:text-white/90">{formatDateVN(new Date(row.hanHoanThanh))}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-gray-400">Chuyên viên xử lý</p>
          <p className="text-gray-800 dark:text-white/90">
            {row.nguoiXuLys.length === 0 ? (
              <span className="italic text-gray-400">Chưa phân công</span>
            ) : (
              row.nguoiXuLys.map((x) => x.nhanVien.hoTen).join(", ")
            )}
          </p>
        </div>
        {row.ghiChu && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-400">Ghi chú / Kết quả</p>
            <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-white/90">{row.ghiChu}</p>
          </div>
        )}
      </div>

      {row.nguoiHoanThanh && (
        <p className="mt-4 text-xs text-gray-400">
          Hoàn thành bởi {row.nguoiHoanThanh.hoTen}
          {row.thoiGianHoanThanh && ` lúc ${formatDateTimeVN(row.thoiGianHoanThanh)}`}
        </p>
      )}
    </Modal>
  );
}
