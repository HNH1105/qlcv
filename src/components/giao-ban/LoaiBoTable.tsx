// ĐÍCH: src/components/giao-ban/LoaiBoTable.tsx
"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN } from "@/lib/week";
import type { NoiDungGiaoBanRow } from "./GiaoBanTable";

export default function LoaiBoTable({
  rows,
  dangKhoiPhucId,
  onKhoiPhuc,
  onXemChiTiet,
}: {
  rows: NoiDungGiaoBanRow[];
  dangKhoiPhucId?: number | null;
  onKhoiPhuc: (row: NoiDungGiaoBanRow) => void;
  onXemChiTiet: (row: NoiDungGiaoBanRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Không có nội dung nào bị loại bỏ.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[820px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-14 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">STT</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nội dung</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Phòng xử lý</TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Lý do loại bỏ</TableCell>
                <TableCell isHeader className="w-28 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Hạn cũ</TableCell>
                <TableCell isHeader className="w-32 px-4 py-3">{null}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r, idx) => (
                <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500">{idx + 1}</TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <button onClick={() => onXemChiTiet(r)} className="text-left text-theme-sm font-medium text-gray-600 hover:text-brand-500 dark:text-gray-300">
                      {r.noiDung}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-theme-sm text-gray-500 dark:text-gray-400">{r.phongXuLy.tenPhong}</TableCell>
                  <TableCell className="px-4 py-3 align-top text-xs text-gray-500 dark:text-gray-400">
                    {r.ghiChu || <span className="italic text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-theme-sm text-gray-500 dark:text-gray-400">
                    {formatDateVN(new Date(r.hanHoanThanh))}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-end">
                    <button
                      onClick={() => onKhoiPhuc(r)}
                      disabled={dangKhoiPhucId === r.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      {dangKhoiPhucId === r.id ? "Đang khôi phục..." : "↩ Khôi phục"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
