// ĐÍCH: src/components/giao-ban/GiaoBanTable.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

export type HanhDongHang = "chi-tiet" | "sua" | "ghi-chu" | "chuyen-tuan" | "huy" | "lich-su" | "khoi-phuc";

// ============================================================================================
// KÉO ĐỔI ĐỘ RỘNG CỘT — CHỈ lưu trong state của component (RAM), KHÔNG lưu localStorage. Vậy nên
// F5 lại trang là về đúng độ rộng mặc định, và không ảnh hưởng gì tới người dùng khác (mỗi người
// có state riêng trên máy/tab của họ). Dùng <colgroup> + table-layout: fixed thay vì set width
// trực tiếp trên từng <td> — đây là cách duy nhất để trình duyệt tôn trọng đúng độ rộng cột trong
// bảng HTML thường (không phụ thuộc nội dung dài/ngắn).
// ============================================================================================

// ============================================================================================
// KÉO ĐỔI ĐỘ RỘNG CỘT — CHỈ lưu trong state của component (RAM), KHÔNG lưu localStorage. F5 lại
// trang là về đúng mặc định, không ảnh hưởng người dùng khác.
//
// MẶC ĐỊNH: cột "Nội dung" để `undefined` (KHÔNG set width) — với table-layout: fixed, cột nào
// không có width sẽ tự động CHIẾM HẾT phần còn dư sau khi trừ các cột đã có width cố định, làm
// bảng luôn full chiều rộng container ngay từ đầu (giống hệt bản dùng % lúc trước, chỉ khác cơ
// chế). Khi người dùng tự kéo cột Nội dung, nó mới chuyển sang width cố định từ lúc đó — đo đúng
// độ rộng đang hiển thị tại thời điểm bắt đầu kéo (qua getBoundingClientRect của <th>) làm mốc,
// vì trước đó nó chưa có con số cố định nào để lấy làm mốc cả.
// ============================================================================================

const COT_MAC_DINH: Record<string, number | undefined> = {
  stt: 56,
  noiDung: undefined, // auto — chiếm hết phần còn lại, xem giải thích ở trên
  ghiChu: 160,
  phong: 130,
  chuyenVien: 112,
  han: 112,
  uuTien: 96,
  actions: 44,
};
const COT_MIN = 48;

function useDoRongCot() {
  const [doRong, setDoRong] = useState<Record<string, number | undefined>>(COT_MAC_DINH);

  const batDauKeo = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      // Cột chưa từng bị kéo (VD "Nội dung" lúc đầu) không có con số trong state -> lấy độ rộng
      // ĐANG HIỂN THỊ THẬT của <th> làm mốc bắt đầu, thay vì đọc từ state (đang là undefined).
      const th = (e.currentTarget as HTMLElement).closest("th");
      const startWidth = doRong[key] ?? th?.getBoundingClientRect().width ?? COT_MIN;
      const startX = e.clientX;

      function onMove(ev: MouseEvent) {
        const doRongMoi = Math.max(COT_MIN, startWidth + (ev.clientX - startX));
        setDoRong((cu) => ({ ...cu, [key]: doRongMoi }));
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [doRong]
  );

  return { doRong, batDauKeo };
}

// Tay kéo mỏng ở mép phải mỗi cột header — rê chuột đổi con trỏ thành ↔ để biết kéo được.
function TayKeoCot({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-brand-300/60 active:bg-brand-400"
    />
  );
}

export default function GiaoBanTable({
  rows,
  dangMo,
  dangGuiIds,
  onToggleHoanThanh,
  onHanhDong,
}: {
  rows: NoiDungGiaoBanRow[];
  dangMo: boolean;
  dangGuiIds?: Set<number>;
  onToggleHoanThanh: (row: NoiDungGiaoBanRow) => void;
  onHanhDong: (row: NoiDungGiaoBanRow, hanhDong: HanhDongHang) => void;
}) {
  const user = useAuth();
  const { doRong, batDauKeo } = useDoRongCot();

  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Chưa có nội dung nào.</p>;
  }

  const header = (label: string, key: string, keoDuoc = true) => (
    <th
      className="relative border-b border-gray-100 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:border-white/[0.05] dark:text-gray-400"
    >
      {label}
      {keoDuoc && <TayKeoCot onMouseDown={batDauKeo(key)} />}
    </th>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {Object.entries(doRong).map(([key, w]) => (
              <col key={key} style={w != null ? { width: w } : undefined} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {header("STT", "stt")}
              {header("Nội dung", "noiDung")}
              {header("Ghi chú / Kết quả", "ghiChu")}
              {header("Phòng xử lý", "phong")}
              {header("Chuyên viên", "chuyenVien")}
              {header("Hạn", "han")}
              {header("Ưu tiên", "uuTien")}
              <th className="border-b border-gray-100 px-2 py-3 dark:border-white/[0.05]" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {rows.map((r, idx) => {
              const quyen = tinhQuyenClient(user, r.phongXuLy.maPhong);
              const coTheCheck = dangMo && quyen.danhDauHoanThanh;
              const quaHan = !r.daKetThuc && new Date(r.hanHoanThanh) < new Date();
              const dangGui = dangGuiIds?.has(r.id) ?? false;
              const tenChuyenVien = r.nguoiXuLys.map((x) => x.nhanVien.hoTen);
              const laChuyenTuan = r.duocChuyenThanh != null;

              return (
                <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${dangGui ? "opacity-60" : ""}`}>
                  <td className="overflow-hidden px-4 py-4 align-top">
                    <div className="flex items-center gap-2.5">
                      <span className="text-theme-sm text-gray-500">{idx + 1}</span>
                      {coTheCheck && (
                        <button
                          type="button"
                          onClick={() => onToggleHoanThanh(r)}
                          title={r.daHoanThanh ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
                          className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                            r.daHoanThanh
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white hover:border-brand-400 dark:border-gray-600 dark:bg-transparent"
                          }`}
                        >
                          {r.daHoanThanh && (
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                              <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top">
                    <button onClick={() => onHanhDong(r, "chi-tiet")} className="block w-full text-left">
                      <p
                        className={`whitespace-normal break-words text-theme-sm font-medium ${
                          r.daHoanThanh ? "text-gray-400 line-through" : "text-gray-800 dark:text-white/90"
                        }`}
                      >
                        {r.noiDung}
                      </p>
                    </button>
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top">
                    <p
                      className={`line-clamp-2 whitespace-normal break-words text-xs ${
                        laChuyenTuan ? "font-medium text-error-600" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {r.ghiChu || <span className="italic text-gray-300 dark:text-gray-600">—</span>}
                    </p>
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top text-theme-sm text-gray-500 dark:text-gray-400">
                    <span className="block truncate">{r.phongXuLy.tenPhong}</span>
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top text-theme-sm text-gray-500 dark:text-gray-400">
                    {tenChuyenVien.length === 0 ? (
                      <span className="italic text-gray-400">—</span>
                    ) : tenChuyenVien.length === 1 ? (
                      <span className="block truncate">{tenChuyenVien[0]}</span>
                    ) : (
                      <button onClick={() => onHanhDong(r, "chi-tiet")} className="truncate underline decoration-dotted underline-offset-2">
                        {tenChuyenVien[0]} +{tenChuyenVien.length - 1}
                      </button>
                    )}
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top text-theme-sm">
                    <span className={quaHan ? "font-medium text-error-600" : "text-gray-500 dark:text-gray-400"}>
                      {formatDateVN(new Date(r.hanHoanThanh))}
                    </span>
                  </td>

                  <td className="overflow-hidden px-4 py-3 align-top">
                    <UuTienGiaoBanBadge mucDo={r.mucDoUuTien} />
                  </td>

                  <td className="overflow-hidden px-2 py-3 align-top text-end">
                    <RowActionsMenu
                      quyen={quyen}
                      dangMo={dangMo}
                      daKetThuc={r.daKetThuc}
                      daNghiChuyenTuan={r.deNghiChuyenTuan}
                      onChon={(h) => onHanhDong(r, h)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Menu "..." — render qua PORTAL vào document.body, định vị bằng toạ độ thật của nút bấm, để
// không bị che bởi overflow của bảng cuộn ngang.
function RowActionsMenu({
  quyen,
  dangMo,
  daKetThuc,
  daNghiChuyenTuan,
  onChon,
}: {
  quyen: { suaNoiDung: boolean; capNhatGhiChu: boolean; loaiKhoiDanhSach: boolean; chuyenTuanSau: boolean };
  dangMo: boolean;
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
            {/* Cuộc họp đã chốt -> chỉ giữ 2 mục trên, ẩn hẳn các thao tác chỉnh sửa còn lại. */}
            {dangMo && quyen.suaNoiDung && item("✏️ Sửa nội dung / hạn / ưu tiên / người xử lý", "sua")}
            {dangMo && quyen.capNhatGhiChu && item("📝 Cập nhật ghi chú", "ghi-chu")}
            {dangMo && quyen.chuyenTuanSau && !daKetThuc && item(daNghiChuyenTuan ? "Đã đề nghị chuyển tuần" : "→ Chuyển tuần sau", "chuyen-tuan", { disabled: daNghiChuyenTuan })}
            {dangMo && quyen.loaiKhoiDanhSach && !daKetThuc && item("✕ Loại khỏi danh sách", "huy", { danger: true })}
          </div>,
          document.body
        )}
    </>
  );
}
