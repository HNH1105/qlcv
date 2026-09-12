// ĐÍCH: src/components/giao-ban/GiaoBanTable.tsx
"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN } from "@/lib/week";
import { tinhTrangThaiGiaoBan } from "@/lib/giao-ban/trang-thai";
import { TrangThaiGiaoBanBadge, UuTienGiaoBanBadge } from "./GiaoBanBadges";

// Kiểu dữ liệu 1 dòng — khớp với `rows` trả về từ getCuocHopGiaoBanChiTiet() (đủ field include).
export type NoiDungGiaoBanRow = {
  id: number;
  noiDung: string;
  hanHoanThanh: Date;
  mucDoUuTien: "CAO" | "TRUNGBINH" | "THAP";
  daHoanThanh: boolean;
  daKetThuc: boolean;
  deNghiChuyenTuan: boolean;
  ghiChu: string | null;
  nguoiHoanThanh: { hoTen: string } | null;
  thoiGianHoanThanh: Date | null;
  phongXuLy: { maPhong: string; tenPhong: string };
  nguoiXuLys: { nhanVien: { maNV: string; hoTen: string } }[];
  duocChuyenThanh: { id: number } | null;
};

export default function GiaoBanTable({
  rows,
  hienPhong = true,
  onXemChiTiet,
}: {
  rows: NoiDungGiaoBanRow[];
  hienPhong?: boolean; // ẩn cột Phòng xử lý khi đang xem checklist của đúng 1 phòng
  onXemChiTiet: (row: NoiDungGiaoBanRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Chưa có nội dung nào trong cuộc giao ban này.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[960px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-12 px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">STT</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nội dung giao việc</TableCell>
                {hienPhong && (
                  <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Phòng xử lý</TableCell>
                )}
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Chuyên viên xử lý</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Hạn hoàn thành</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ưu tiên</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Trạng thái</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r, idx) => {
                const trangThai = tinhTrangThaiGiaoBan(r);
                const quaHan = !r.daKetThuc && new Date(r.hanHoanThanh) < new Date();
                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]" onClick={() => onXemChiTiet(r)}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">{idx + 1}</TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <p className="line-clamp-2 max-w-[320px] text-theme-sm font-medium text-gray-800 dark:text-white/90">{r.noiDung}</p>
                    </TableCell>
                    {hienPhong && (
                      <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                        {r.phongXuLy.tenPhong}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.nguoiXuLys.length === 0 ? (
                        <span className="italic text-gray-400">Chưa phân công</span>
                      ) : (
                        r.nguoiXuLys.map((x) => x.nhanVien.hoTen).join(", ")
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm">
                      <span className={quaHan ? "font-medium text-error-600" : "text-gray-500 dark:text-gray-400"}>
                        {formatDateVN(new Date(r.hanHoanThanh))}
                        {quaHan && " (quá hạn)"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <UuTienGiaoBanBadge mucDo={r.mucDoUuTien} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <TrangThaiGiaoBanBadge trangThai={trangThai} />
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
