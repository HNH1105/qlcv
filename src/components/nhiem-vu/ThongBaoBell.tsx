// ĐÍCH: src/components/nhiem-vu/ThongBaoBell.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClickOutside } from "@/hooks/useClickOutside";
import {
  getThongBaoCuaToi,
  getSoThongBaoChuaDoc,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
  type ThongBaoRow,
} from "@/lib/actions/thong-bao";
import { formatDateTimeVN } from "@/lib/week";
import { useNavProgress } from "@/components/providers/NavProgressProvider";

const KHOANG_LAM_MOI_MS = 30000; // poll đơn giản mỗi 30s — đã ghi rõ ở spec: đủ dùng cho bản đầu,
// nếu sau này cần thật sự real-time thì thay bằng WebSocket/SSE, không cần đổi gì ở phần dữ liệu.

export default function ThongBaoBell() {
  const batDauDieuHuong = useNavProgress();
  const [isOpen, setIsOpen] = useState(false);
  const [dsThongBao, setDsThongBao] = useState<ThongBaoRow[]>([]);
  const [soChuaDoc, setSoChuaDoc] = useState(0);
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  useEffect(() => {
    function lamMoiSoDem() {
      getSoThongBaoChuaDoc().then(setSoChuaDoc);
    }
    lamMoiSoDem();
    const timer = setInterval(lamMoiSoDem, KHOANG_LAM_MOI_MS);
    return () => clearInterval(timer);
  }, []);

  function moDropdown() {
    setIsOpen((v) => !v);
    if (!isOpen) {
      getThongBaoCuaToi().then(setDsThongBao);
    }
  }

  async function handleClickThongBao(tb: ThongBaoRow) {
    if (!tb.daDoc) {
      await danhDauDaDoc(tb.id);
      setSoChuaDoc((n) => Math.max(0, n - 1));
      setDsThongBao((prev) => prev.map((x) => (x.id === tb.id ? { ...x, daDoc: true } : x)));
    }
    setIsOpen(false);
    if (tb.duongDan) batDauDieuHuong();
  }

  async function handleDanhDauTatCa() {
    await danhDauTatCaDaDoc();
    setSoChuaDoc(0);
    setDsThongBao((prev) => prev.map((x) => ({ ...x, daDoc: true })));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={moDropdown}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        title="Thông báo"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 17a1.5 1.5 0 003 0h-3z" />
        </svg>
        {soChuaDoc > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-medium text-white">
            {soChuaDoc > 99 ? "99+" : soChuaDoc}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 max-h-[420px] w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.05]">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Thông báo</p>
            {soChuaDoc > 0 && (
              <button onClick={handleDanhDauTatCa} className="text-xs text-brand-500 hover:underline">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {dsThongBao.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có thông báo nào.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {dsThongBao.map((tb) => (
                <Link
                  key={tb.id}
                  href={tb.duongDan ?? "#"}
                  onClick={() => handleClickThongBao(tb)}
                  className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                    !tb.daDoc ? "bg-brand-50/50 dark:bg-brand-500/5" : ""
                  }`}
                >
                  <p className="line-clamp-2 text-sm text-gray-800 dark:text-white/90">{tb.tieuDe}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateTimeVN(tb.taoLuc)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
