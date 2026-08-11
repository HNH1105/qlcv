"use client";

import { Modal } from "@/components/ui/modal";
import { formatDateTimeVN } from "@/lib/week";
import type { KeHoachRow } from "@/lib/actions/ke-hoach";
import { LoaiGhiNhan } from "@prisma/client";

export default function ChiTietModal({
  isOpen,
  onClose,
  row,
  loai,
  nguoiTao,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: KeHoachRow | null;
  loai: LoaiGhiNhan;
  // Chỉ có ở bảng cấp Phòng — hiển thị "Người tạo" ngay dưới tiêu đề để biết dòng này của ai.
  nguoiTao?: { maNV: string; hoTen: string } | null;
}) {
  const isBaoCao = loai === "BAOCAO";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
        Chi tiết {isBaoCao ? "báo cáo" : "kế hoạch"}
      </h4>

      {nguoiTao && (
        <p className="-mt-2 mb-4 text-xs text-gray-400">
          Người tạo: <span className="text-gray-600 dark:text-gray-300">{nguoiTao.hoTen}</span>
        </p>
      )}

      {row && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">Nội dung</p>
            <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-white/90">
              {row.noiDung}
            </p>
          </div>

          {row.ketQua && (
            <div>
              <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">Kết quả</p>
              <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-white/90">
                {row.ketQua}
              </p>
            </div>
          )}

          {row.ghiChu && (
            <div>
              <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">Ghi chú</p>
              <p className="whitespace-pre-wrap break-words text-gray-800 dark:text-white/90">
                {row.ghiChu}
              </p>
            </div>
          )}

          {row.nguoiPhoiHop.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">Người phối hợp</p>
              <p className="break-words text-gray-800 dark:text-white/90">
                {row.nguoiPhoiHop.map((p) => p.hoTen).join(", ")}
              </p>
            </div>
          )}

          {!isBaoCao && (
            <div>
              <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">Trạng thái</p>
              <p className={row.daHoanThanh ? "text-success-600" : "text-error-600"}>
                {row.daHoanThanh ? "Đã hoàn thành" : "Chưa hoàn thành"}
                {row.daChuyenPhong && " · Đã chuyển Kế hoạch Phòng"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-white/[0.05]">
            <div>
              <p className="mb-0.5 font-medium text-gray-500 dark:text-gray-400">Tạo lúc</p>
              <p>{formatDateTimeVN(row.taoLuc)}</p>
            </div>
            <div>
              <p className="mb-0.5 font-medium text-gray-500 dark:text-gray-400">Cập nhật lúc</p>
              <p>
                {formatDateTimeVN(row.ngayCapNhat)}
                {row.nguoiCapNhat && ` bởi ${row.nguoiCapNhat.hoTen}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
