// ĐÍCH: src/components/nhiem-vu/ThongBaoTatCaBoard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getThongBaoCuaToiPhanTrang,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
  type ThongBaoRow,
} from "@/lib/actions/thong-bao";
import { useNavProgress } from "@/components/providers/NavProgressProvider";
import { formatDateTimeVN } from "@/lib/week";
import Pagination from "./Pagination";

export default function ThongBaoTatCaBoard() {
  const batDauDieuHuong = useNavProgress();
  const [rows, setRows] = useState<ThongBaoRow[]>([]);
  const [tongSo, setTongSo] = useState(0);
  const [trang, setTrang] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const tongSoTrang = Math.max(1, Math.ceil(tongSo / pageSize));

  const taiLai = useCallback(() => {
    setIsLoading(true);
    getThongBaoCuaToiPhanTrang(trang, pageSize)
      .then((res) => {
        setRows(res.rows);
        setTongSo(res.tongSo);
      })
      .finally(() => setIsLoading(false));
  }, [trang, pageSize]);

  useEffect(() => {
    taiLai();
  }, [taiLai]);

  // Đổi số bản ghi/trang -> quay về trang 1, tránh đứng ở 1 trang không còn tồn tại.
  useEffect(() => {
    setTrang(1);
  }, [pageSize]);

  const soChuaDoc = rows.filter((r) => !r.daDoc).length;

  async function handleClick(tb: ThongBaoRow) {
    if (!tb.daDoc) {
      await danhDauDaDoc(tb.id);
      setRows((prev) => prev.map((x) => (x.id === tb.id ? { ...x, daDoc: true } : x)));
    }
    if (tb.duongDan) batDauDieuHuong();
  }

  async function handleDanhDauTatCa() {
    await danhDauTatCaDaDoc();
    setRows((prev) => prev.map((x) => ({ ...x, daDoc: true })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tất cả thông báo</h1>
        {soChuaDoc > 0 && (
          <button onClick={handleDanhDauTatCa} className="text-sm font-medium text-brand-500 hover:underline">
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-400">Chưa có thông báo nào.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((tb) => (
                <Link
                  key={tb.id}
                  href={tb.duongDan ?? "#"}
                  onClick={() => handleClick(tb)}
                  className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                    !tb.daDoc ? "bg-brand-50/50 dark:bg-brand-500/5" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      tb.daDoc ? "bg-gray-300 dark:bg-gray-600" : "bg-brand-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{tb.tieuDe}</p>
                    {tb.noiDung && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{tb.noiDung}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{formatDateTimeVN(tb.taoLuc)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Pagination
            currentPage={trang}
            totalPages={tongSoTrang}
            totalRecords={tongSo}
            pageSize={pageSize}
            onPageChange={setTrang}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
