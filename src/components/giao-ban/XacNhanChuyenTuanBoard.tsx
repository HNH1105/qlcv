// ĐÍCH: src/components/giao-ban/XacNhanChuyenTuanBoard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import { formatDateVN } from "@/lib/week";
import {
  getDanhSachChoXacNhanChuyenTuan,
  getCuocHopGiaoBanList,
  xacNhanChuyenTuan,
} from "@/lib/actions/giao-ban";

type Dong = Awaited<ReturnType<typeof getDanhSachChoXacNhanChuyenTuan>>[number];
type CuocHop = Awaited<ReturnType<typeof getCuocHopGiaoBanList>>[number];

export default function XacNhanChuyenTuanBoard() {
  return (
    <ToastProvider>
      <BoardContent />
    </ToastProvider>
  );
}

function BoardContent() {
  const { show } = useToast();
  const [rows, setRows] = useState<Dong[]>([]);
  const [cuocHopDangMo, setCuocHopDangMo] = useState<CuocHop[]>([]);
  const [dichChon, setDichChon] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dangXacNhan, setDangXacNhan] = useState<number | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    Promise.all([getDanhSachChoXacNhanChuyenTuan(), getCuocHopGiaoBanList()])
      .then(([ds, chList]) => {
        setRows(ds);
        const moList = chList.filter((c) => c.trangThai === "DANG_MO");
        setCuocHopDangMo(moList);
        // Gợi ý mặc định: cuộc họp DANG_MO khác với cuộc họp nguồn của dòng đó, ưu tiên tuần gần nhất
        setDichChon((prev) => {
          const next = { ...prev };
          for (const d of ds) {
            if (next[d.id] == null) {
              const goiY = moList.find((c) => c.id !== d.cuocHopGiaoBanId);
              if (goiY) next[d.id] = goiY.id;
            }
          }
          return next;
        });
      })
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleXacNhan(dongId: number) {
    const dichId = dichChon[dongId];
    if (!dichId) return show("error", "Chưa chọn cuộc họp đích", "Vui lòng chọn tuần đích trước khi xác nhận");
    setDangXacNhan(dongId);
    try {
      await xacNhanChuyenTuan(dongId, dichId);
      show("success", "Đã xác nhận", "Đã chuyển sang tuần mới");
      reload();
    } catch (e) {
      show("error", "Xác nhận thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangXacNhan(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Xác nhận chuyển tuần</h1>
        <p className="text-sm text-gray-400">
          Các nội dung đã được đề nghị chuyển sang tuần sau — chọn cuộc giao ban đích rồi xác nhận.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-gray-400">Không có nội dung nào đang chờ xác nhận chuyển tuần.</p>
      ) : cuocHopDangMo.length === 0 ? (
        <p className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
          Chưa có cuộc giao ban nào đang mở để làm đích chuyển tuần. Vui lòng tạo cuộc giao ban tuần
          mới trước.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <div
              key={d.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{d.noiDung}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {d.phongXuLy.tenPhong} — Hạn {formatDateVN(new Date(d.hanHoanThanh))} — Đang ở tuần{" "}
                  {d.cuocHopGiaoBan.tuan}/{d.cuocHopGiaoBan.nam}{" "}
                  <Link href={`/giao-ban/${d.cuocHopGiaoBan.id}`} className="text-brand-500 hover:underline">
                    (xem)
                  </Link>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={dichChon[d.id] ?? ""}
                  onChange={(e) => setDichChon((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))}
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">— Chọn tuần đích —</option>
                  {cuocHopDangMo
                    .filter((c) => c.id !== d.cuocHopGiaoBan.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Tuần {c.tuan}/{c.nam}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => handleXacNhan(d.id)}
                  disabled={dangXacNhan === d.id}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {dangXacNhan === d.id ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
