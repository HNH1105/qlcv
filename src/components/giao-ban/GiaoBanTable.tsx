// ĐÍCH: src/components/giao-ban/GiaoBanTable.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateVN } from "@/lib/week";
import { useAuth } from "@/context/AuthContext";
import { tinhQuyenClient } from "@/lib/giao-ban/quyen-client";
import { UuTienGiaoBanBadge } from "./GiaoBanBadges";

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

export type HanhDongHang = "chi-tiet" | "sua" | "ghi-chu" | "chuyen-tuan" | "huy" | "lich-su";

export default function GiaoBanTable({
  rows,
  dangCheck,
  onToggleHoanThanh,
  onHanhDong,
}: {
  rows: NoiDungGiaoBanRow[];
  dangCheck?: number | null;
  onToggleHoanThanh: (row: NoiDungGiaoBanRow) => void;
  onHanhDong: (row: NoiDungGiaoBanRow, hanhDong: HanhDongHang) => void;
}) {
  const user = useAuth();

  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Chưa có nội dung nào.</p>;
  }

  return (
    // KHÔNG dùng overflow-hidden ở đây nữa — đó là lý do menu "..." bị che trước đây. Bo góc vẫn
    // giữ bằng rounded-xl, chỉ phần scroll ngang mới cần overflow-x-auto (đặt ở div con), còn menu
    // dropdown tự thoát ra bằng portal (xem RowActionsMenu) nên không còn bị ảnh hưởng bởi việc
    // cắt overflow của container nữa.
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1040px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-14 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">STT</TableCell>
                <TableCell isHeader className="w-[34%] px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nội dung</TableCell>
                <TableCell isHeader className="w-[14%] px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ghi chú / Kết quả</TableCell>
                <TableCell isHeader className="w-32 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Phòng xử lý</TableCell>
                <TableCell isHeader className="w-28 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Chuyên viên</TableCell>
                <TableCell isHeader className="w-28 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Hạn</TableCell>
                <TableCell isHeader className="w-24 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ưu tiên</TableCell>
                <TableCell isHeader className="w-10 px-2 py-3">{null}</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r, idx) => {
                const quyen = tinhQuyenClient(user, r.phongXuLy.maPhong);
                const quaHan = !r.daKetThuc && new Date(r.hanHoanThanh) < new Date();
                const dangXuLyDong = dangCheck === r.id;
                const tenChuyenVien = r.nguoiXuLys.map((x) => x.nhanVien.hoTen);

                return (
                  <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-4 py-4 text-start align-top">
                      <div className="flex items-center gap-2.5">
                        <span className="text-theme-sm text-gray-500">{idx + 1}</span>
                        <button
                          type="button"
                          disabled={!quyen.danhDauHoanThanh || dangXuLyDong}
                          onClick={() => onToggleHoanThanh(r)}
                          title={r.daHoanThanh ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            r.daHoanThanh
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white hover:border-brand-400 dark:border-gray-600 dark:bg-transparent"
                          } ${!quyen.danhDauHoanThanh ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                        >
                          {r.daHoanThanh && (
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                              <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top">
                      <button onClick={() => onHanhDong(r, "chi-tiet")} className="text-left">
                        <p
                          className={`whitespace-normal break-words text-theme-sm font-medium ${
                            r.daHoanThanh ? "text-gray-400 line-through" : "text-gray-800 dark:text-white/90"
                          }`}
                        >
                          {r.noiDung}
                        </p>
                      </button>
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top">
                      <p className="line-clamp-2 whitespace-normal break-words text-xs text-gray-500 dark:text-gray-400">
                        {r.ghiChu || <span className="italic text-gray-300 dark:text-gray-600">—</span>}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.phongXuLy.tenPhong}
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {tenChuyenVien.length === 0 ? (
                        <span className="italic text-gray-400">—</span>
                      ) : tenChuyenVien.length === 1 ? (
                        <span className="truncate">{tenChuyenVien[0]}</span>
                      ) : (
                        <button onClick={() => onHanhDong(r, "chi-tiet")} className="underline decoration-dotted underline-offset-2">
                          {tenChuyenVien[0]} +{tenChuyenVien.length - 1}
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top text-start text-theme-sm">
                      <span className={quaHan ? "font-medium text-error-600" : "text-gray-500 dark:text-gray-400"}>
                        {formatDateVN(new Date(r.hanHoanThanh))}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 align-top">
                      <UuTienGiaoBanBadge mucDo={r.mucDoUuTien} />
                    </TableCell>

                    <TableCell className="px-2 py-3 align-top text-end">
                      <RowActionsMenu quyen={quyen} daKetThuc={r.daKetThuc} daNghiChuyenTuan={r.deNghiChuyenTuan} onChon={(h) => onHanhDong(r, h)} />
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

// Menu "..." — render qua PORTAL vào document.body, định vị bằng toạ độ thật của nút bấm. Đây là
// cách sửa dứt điểm lỗi menu bị che bởi overflow của bảng cuộn ngang: dropdown không còn là con
// DOM của bất kỳ container nào có overflow/scroll cắt nó nữa.
function RowActionsMenu({
  quyen,
  daKetThuc,
  daNghiChuyenTuan,
  onChon,
}: {
  quyen: { suaNoiDung: boolean; capNhatGhiChu: boolean; loaiKhoiDanhSach: boolean; chuyenTuanSau: boolean };
  daKetThuc: boolean;
  daNghiChuyenTuan: boolean;
  onChon: (hanhDong: HanhDongHang) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function moMenu() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right - window.scrollX });
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const item = (label: string, hanhDong: HanhDongHang, opts?: { danger?: boolean; disabled?: boolean }) => (
    <button
      onClick={() => {
        setIsOpen(false);
        onChon(hanhDong);
      }}
      disabled={opts?.disabled}
      className={`block w-full px-3 py-2 text-left text-sm disabled:opacity-40 ${
        opts?.danger
          ? "text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : moMenu())}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
        aria-label="Thao tác khác"
      >
        ⋯
      </button>
      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "absolute", top: pos.top, right: pos.right }}
            className="z-[99999] w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark"
          >
            {item("👁 Xem chi tiết", "chi-tiet")}
            {item("🕘 Xem lịch sử", "lich-su")}
            {quyen.suaNoiDung && item("✏️ Sửa nội dung / hạn / ưu tiên / người xử lý", "sua")}
            {quyen.capNhatGhiChu && item("📝 Cập nhật ghi chú", "ghi-chu")}
            {quyen.chuyenTuanSau && !daKetThuc && item(daNghiChuyenTuan ? "Đã đề nghị chuyển tuần" : "→ Chuyển tuần sau", "chuyen-tuan", { disabled: daNghiChuyenTuan })}
            {quyen.loaiKhoiDanhSach && !daKetThuc && item("✕ Loại khỏi danh sách", "huy", { danger: true })}
          </div>,
          document.body
        )}
    </>
  );
}
