// src/components/nhiem-vu/NhiemVuPhongBoard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getNhiemVuPhong, type NhiemVuRow } from "@/lib/actions/nhiem-vu";
import { TrangThaiNhiemVu } from "@prisma/client";
import NhiemVuTable from "./NhiemVuTable";
import Pagination from "./Pagination";
import Link from "next/link";
import { useNavProgress } from "@/components/providers/NavProgressProvider";

// Regime lọc trạng thái đơn giản — khớp 3 lựa chọn đã chốt cho trang Phòng: Tất cả / Chưa phân
// công / Chờ duyệt, cộng thêm option xem hết (không giới hạn theo 2 khu nổi bật).
type LocTrangThai = "tatCa" | "chuaPhanCong" | "choDuyet";

export default function NhiemVuPhongBoard() {
  const batDauDieuHuong = useNavProgress();
  const [rows, setRows] = useState<NhiemVuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loc, setLoc] = useState<LocTrangThai>("tatCa");
  const [trang, setTrang] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    getNhiemVuPhong()
      .then(setRows)
      .finally(() => setIsLoading(false));
  }, []);

  const rowsLoc = useMemo(() => {
    switch (loc) {
      case "chuaPhanCong":
        return rows.filter((r) => r.trangThai === ("CHO_PHAN_CONG" as TrangThaiNhiemVu));
      case "choDuyet":
        return rows.filter((r) => r.trangThai === ("CHO_DUYET" as TrangThaiNhiemVu));
      default:
        return rows;
    }
  }, [rows, loc]);

  useEffect(() => setTrang(1), [loc, pageSize]);

  const soDangChuaPhanCong = rows.filter((r) => r.trangThai === "CHO_PHAN_CONG").length;
  const soDangChoDuyet = rows.filter((r) => r.trangThai === "CHO_DUYET").length;

  const tongSoTrang = Math.max(1, Math.ceil(rowsLoc.length / pageSize));
  const rowsTrangHienTai = rowsLoc.slice((trang - 1) * pageSize, trang * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "tatCa", label: "Tất cả" },
              { key: "chuaPhanCong", label: `Chưa phân công (${soDangChuaPhanCong})` },
              { key: "choDuyet", label: `Chờ duyệt (${soDangChoDuyet})` },
            ] as { key: LocTrangThai; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLoc(tab.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
                loc === tab.key
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          href="/nhiem-vu/tao-moi"
          onClick={batDauDieuHuong}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Giao nhiệm vụ <span className="text-lg leading-none">+</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : (
        <>
          <NhiemVuTable rows={rowsTrangHienTai} />
          <Pagination
            currentPage={trang}
            totalPages={tongSoTrang}
            totalRecords={rowsLoc.length}
            pageSize={pageSize}
            onPageChange={setTrang}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
