// ĐÍCH: src/components/giao-ban/ThongKeGiaoBanModal.tsx
"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatDateTimeVN } from "@/lib/week";
import type { NoiDungGiaoBanRow } from "./GiaoBanTable";

export default function ThongKeGiaoBanModal({
  isOpen,
  onClose,
  rows,
}: {
  isOpen: boolean;
  onClose: () => void;
  rows: NoiDungGiaoBanRow[];
}) {
  const [phongMoRong, setPhongMoRong] = useState<string | null>(null);

  const tongTheoPhong = useMemo(() => {
    const map = new Map<string, { tenPhong: string; tong: number; daHoanThanh: number; rows: NoiDungGiaoBanRow[] }>();
    for (const r of rows) {
      const key = r.phongXuLy.maPhong;
      if (!map.has(key)) map.set(key, { tenPhong: r.phongXuLy.tenPhong, tong: 0, daHoanThanh: 0, rows: [] });
      const item = map.get(key)!;
      item.tong++;
      if (r.daHoanThanh) item.daHoanThanh++;
      item.rows.push(r);
    }
    return Array.from(map.entries())
      .map(([maPhong, v]) => ({ maPhong, ...v, tyLe: v.tong === 0 ? 0 : Math.round((v.daHoanThanh / v.tong) * 100) }))
      .sort((a, b) => a.tenPhong.localeCompare(b.tenPhong));
  }, [rows]);

  const tongToanBo = rows.length;
  const hoanThanhToanBo = rows.filter((r) => r.daHoanThanh).length;
  const tyLeToanBo = tongToanBo === 0 ? 0 : Math.round((hoanThanhToanBo / tongToanBo) * 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Thống kê hoàn thành</h4>

      <div className="mb-5 rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Tổng công việc các phòng là <b>{tongToanBo}</b>. Đã hoàn thành{" "}
          <b>
            {hoanThanhToanBo}/{tongToanBo}
          </b>{" "}
          — chiếm tỷ lệ <b className="text-brand-600">{tyLeToanBo}%</b>.
        </p>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {tongTheoPhong.map((p) => (
          <div key={p.maPhong} className="rounded-lg border border-gray-200 dark:border-white/[0.05]">
            <button
              onClick={() => setPhongMoRong((cur) => (cur === p.maPhong ? null : p.maPhong))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{p.tenPhong}</p>
                <p className="text-xs text-gray-400">
                  {p.daHoanThanh}/{p.tong} đầu việc — {p.tyLe}%
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div className="h-full bg-brand-500" style={{ width: `${p.tyLe}%` }} />
                </div>
                <span className="text-gray-400">{phongMoRong === p.maPhong ? "▾" : "▸"}</span>
              </div>
            </button>

            {phongMoRong === p.maPhong && (
              <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-white/[0.05]">
                {p.rows.map((r) => (
                  <div key={r.id} className="text-xs">
                    <p className={`font-medium ${r.daHoanThanh ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}`}>
                      {r.noiDung}
                    </p>
                    {r.daHoanThanh ? (
                      <p className="text-success-600">
                        ✓ {r.nguoiHoanThanh?.hoTen ?? "?"} — {r.thoiGianHoanThanh ? formatDateTimeVN(r.thoiGianHoanThanh) : ""}
                      </p>
                    ) : (
                      <p className="text-gray-400">Chưa hoàn thành</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
