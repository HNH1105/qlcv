// ĐÍCH: src/components/nhiem-vu/NhiemVuCuaToiBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getNhiemVuCuaToi, type NhiemVuRow } from "@/lib/actions/nhiem-vu";
import { TrangThaiNhiemVu } from "@prisma/client";
import NhiemVuCard from "./NhiemVuCard";
import Pagination from "./Pagination";

type Tab = "xuLyChinh" | "phoiHop";

// Xử lý chính: lọc theo ĐÚNG trạng thái chi tiết (không gộp CHO_DUYET vào "đã xử lý" nữa — đây là
// trang chính của cá nhân, cần thấy rõ đang chờ duyệt hay đã thật sự xong). Không có CHO_PHAN_CONG
// vì hễ đã là xử lý chính thì trạng thái tự động không còn ở mức đó (đã chuyển DANGXULY khi phân
// công) — không cần tab thừa.
type LocXuLyChinh = "tatCa" | TrangThaiNhiemVu;

const TABS_XU_LY_CHINH: { key: LocXuLyChinh; label: string }[] = [
  { key: "tatCa", label: "Tất cả" },
  { key: "DANGXULY", label: "Đang xử lý" },
  { key: "CHO_DUYET", label: "Chờ duyệt" },
  { key: "HOANTHANH", label: "Hoàn thành" },
  { key: "TAMDUNG", label: "Tạm dừng" },
  { key: "HUY", label: "Đã huỷ" },
];

// Phối hợp: chỉ có 1 trục dữ liệu khả dụng là "đã/chưa xong phần việc CỦA RIÊNG người xem"
// (daHoanThanhPhanViecCuaToi) — không phải trạng thái chung của nhiệm vụ (người phối hợp không sở
// hữu trạng thái đó). Trạng thái chung vẫn hiện trên từng card (badge có sẵn) để tham khảo thêm.
type LocPhoiHop = "tatCa" | "chuaXuLy" | "daXuLy";

const TABS_PHOI_HOP: { key: LocPhoiHop; label: string }[] = [
  { key: "tatCa", label: "Tất cả" },
  { key: "chuaXuLy", label: "Chưa phối hợp" },
  { key: "daXuLy", label: "Đã phối hợp" },
];

export default function NhiemVuCuaToiBoard() {
  const [tab, setTab] = useState<Tab>("xuLyChinh");
  const [locXuLyChinh, setLocXuLyChinh] = useState<LocXuLyChinh>("tatCa");
  const [locPhoiHop, setLocPhoiHop] = useState<LocPhoiHop>("tatCa");
  const [rows, setRows] = useState<NhiemVuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trang, setTrang] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    getNhiemVuCuaToi(tab)
      .then(setRows)
      .finally(() => setIsLoading(false));
  }, [tab]);

  // Đổi tab chính thì reset cả 2 bộ lọc phụ về "Tất cả" — 2 tab có ý nghĩa lọc khác hẳn nhau, giữ
  // lại lọc cũ khi đổi tab dễ gây hiểu lầm.
  useEffect(() => {
    setLocXuLyChinh("tatCa");
    setLocPhoiHop("tatCa");
    setTrang(1);
  }, [tab]);

  useEffect(() => setTrang(1), [locXuLyChinh, locPhoiHop, pageSize]);

  const rowsLoc = useMemo(() => {
    if (tab === "xuLyChinh") {
      return locXuLyChinh === "tatCa" ? rows : rows.filter((r) => r.trangThai === locXuLyChinh);
    }
    if (locPhoiHop === "tatCa") return rows;
    return rows.filter((r) => (locPhoiHop === "chuaXuLy" ? !r.daHoanThanhPhanViecCuaToi : r.daHoanThanhPhanViecCuaToi));
  }, [rows, tab, locXuLyChinh, locPhoiHop]);

  // Đếm số lượng theo từng trạng thái để hiện ngay trên tab — giúp nắm nhanh không cần bấm qua
  // từng tab một, đúng yêu cầu "đếm thêm số lượng nhiệm vụ theo trạng thái".
  const tongSoTrang = Math.max(1, Math.ceil(rowsLoc.length / pageSize));
  const rowsTrangHienTai = rowsLoc.slice((trang - 1) * pageSize, trang * pageSize);

  const demTheoTrangThai = useMemo(() => {
    const m = new Map<TrangThaiNhiemVu, number>();
    for (const r of rows) m.set(r.trangThai, (m.get(r.trangThai) ?? 0) + 1);
    return m;
  }, [rows]);

  const demPhoiHop = useMemo(() => {
    let chuaXuLy = 0;
    let daXuLy = 0;
    for (const r of rows) (r.daHoanThanhPhanViecCuaToi ? daXuLy++ : chuaXuLy++);
    return { chuaXuLy, daXuLy };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            { key: "xuLyChinh", label: "Xử lý chính" },
            { key: "phoiHop", label: "Phối hợp" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              tab === t.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3 dark:border-white/[0.05]">
        {tab === "xuLyChinh"
          ? TABS_XU_LY_CHINH.map((t) => {
              const soLuong = t.key === "tatCa" ? rows.length : demTheoTrangThai.get(t.key) ?? 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setLocXuLyChinh(t.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    locXuLyChinh === t.key
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {t.label} {t.key !== "tatCa" && `(${soLuong})`}
                </button>
              );
            })
          : TABS_PHOI_HOP.map((t) => {
              const soLuong = t.key === "tatCa" ? rows.length : t.key === "chuaXuLy" ? demPhoiHop.chuaXuLy : demPhoiHop.daXuLy;
              return (
                <button
                  key={t.key}
                  onClick={() => setLocPhoiHop(t.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    locPhoiHop === t.key
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {t.label} {t.key !== "tatCa" && `(${soLuong})`}
                </button>
              );
            })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : rowsLoc.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          {tab === "xuLyChinh" ? "Không có nhiệm vụ nào trong mục này." : "Không có nhiệm vụ phối hợp nào trong mục này."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rowsTrangHienTai.map((row) => (
            <NhiemVuCard key={row.id} row={row} hienThiTrangThaiPhoiHop={tab === "phoiHop"} />
          ))}
        </div>
      )}
      {!isLoading && rowsLoc.length > 0 && (
        <Pagination
          currentPage={trang}
          totalPages={tongSoTrang}
          totalRecords={rowsLoc.length}
          pageSize={pageSize}
          onPageChange={setTrang}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
