// src/components/nhiem-vu/NhiemVuTable.tsx
//
// Dùng cho /nhiem-vu/phong và /nhiem-vu/tra-cuu (đã chốt: table cho 2 trang này vì LĐ phòng/BGĐ cần
// scan nhanh nhiều dòng, sort/so sánh — khác /nhiem-vu (của tôi) dùng card vì số lượng ít, cần thao
// tác nhanh trên từng item).
//
// Responsive: theo ĐÚNG pattern sẵn có của template (BasicTableOne) — bọc overflow-x-auto + min-w
// cố định, cho cuộn ngang trên mobile, KHÔNG dựng thêm 1 bộ render card song song chỉ cho riêng
// component này (khác đề xuất ban đầu "table đổi thành card dưới md:" — điều chỉnh lại để nhất
// quán với cách các bảng khác trong dự án đang làm, đỡ phải bảo trì 2 luồng render).
"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TrangThaiNhiemVuBadge, UuTienBadge, tinhQuaHan } from "./NhiemVuBadges";
import { formatDateVN } from "@/lib/week";
import { useNavProgress } from "@/components/providers/NavProgressProvider";
import type { NhiemVuRow } from "@/lib/actions/nhiem-vu";

export default function NhiemVuTable({ rows }: { rows: NhiemVuRow[] }) {
  const batDauDieuHuong = useNavProgress();

  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Chưa có nhiệm vụ nào.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[920px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Tiêu đề
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Phòng chủ trì
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Người xử lý chính
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Ưu tiên
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Trạng thái
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Hạn xử lý
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Tiến độ
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r) => {
                const quaHan = tinhQuaHan(r.hanXuLy, r.trangThai);
                return (
                  <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 text-start">
                      <Link
                        href={`/nhiem-vu/${r.id}`}
                        onClick={batDauDieuHuong}
                        className="line-clamp-2 max-w-[280px] text-theme-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                      >
                        {r.tieuDe}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.tenPhongChuTri}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.nguoiXuLyChinh?.hoTen ?? (
                        <span className="italic text-gray-400">Chưa phân công</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <UuTienBadge mucDo={r.mucDoUuTien} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <TrangThaiNhiemVuBadge trangThai={r.trangThai} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm">
                      {r.hanXuLy ? (
                        <span className={quaHan ? "font-medium text-error-600" : "text-gray-500 dark:text-gray-400"}>
                          {formatDateVN(r.hanXuLy)}
                          {quaHan && " (quá hạn)"}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.tienDoPhanTram}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
