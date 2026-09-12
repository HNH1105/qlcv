// ĐÍCH: src/components/nhiem-vu/NhiemVuToiGiaoBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getNhiemVuToiGiao, type NhiemVuRow } from "@/lib/actions/nhiem-vu";
import { TrangThaiNhiemVu } from "@prisma/client";
import NhiemVuTable from "./NhiemVuTable";
import Pagination from "./Pagination";

type LocTrangThai = "tatCa" | TrangThaiNhiemVu;

const TABS: { key: LocTrangThai; label: string }[] = [
  { key: "tatCa", label: "Tất cả" },
  { key: "CHO_PHAN_CONG", label: "Chờ phân công" },
  { key: "DANGXULY", label: "Đang xử lý" },
  { key: "CHO_DUYET", label: "Chờ duyệt" },
  { key: "HOANTHANH", label: "Hoàn thành" },
  { key: "TAMDUNG", label: "Tạm dừng" },
  { key: "HUY", label: "Đã huỷ" },
];

export default function NhiemVuToiGiaoBoard() {
  const [rows, setRows] = useState<NhiemVuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loc, setLoc] = useState<LocTrangThai>("tatCa");
  const [trang, setTrang] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    getNhiemVuToiGiao()
      .then(setRows)
      .finally(() => setIsLoading(false));
  }, []);

  const rowsLoc = useMemo(
    () => (loc === "tatCa" ? rows : rows.filter((r) => r.trangThai === loc)),
    [rows, loc]
  );

  useEffect(() => setTrang(1), [loc, pageSize]);

  const tongSoTrang = Math.max(1, Math.ceil(rowsLoc.length / pageSize));
  const rowsTrangHienTai = rowsLoc.slice((trang - 1) * pageSize, trang * pageSize);

  // Đếm theo từng trạng thái để hiện số ngay trên tab, giúp người giao nắm nhanh bao nhiêu việc
  // đang ở đâu mà không cần bấm qua từng tab.
  const dem = useMemo(() => {
    const m = new Map<LocTrangThai, number>();
    for (const r of rows) m.set(r.trangThai, (m.get(r.trangThai) ?? 0) + 1);
    return m;
  }, [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nhiệm vụ tôi giao</h1>
      <p className="text-sm text-gray-400">
        Theo dõi tiến độ các nhiệm vụ bạn đứng tên người giao — dù người xử lý ở phòng nào.
      </p>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setLoc(t.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              loc === t.key
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300"
            }`}
          >
            {t.label}
            {t.key !== "tatCa" && dem.get(t.key) ? ` (${dem.get(t.key)})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : (
        <>
          <NhiemVuTable rows={rowsTrangHienTai} />
          {rowsLoc.length > 0 && (
            <Pagination
              currentPage={trang}
              totalPages={tongSoTrang}
              totalRecords={rowsLoc.length}
              pageSize={pageSize}
              onPageChange={setTrang}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}
    </div>
  );
}
