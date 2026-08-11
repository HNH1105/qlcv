"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentWeekInfo, getWeekDateRangeLabel } from "@/lib/week";
import { getKeHoachToanPhong, convertCaNhanToPhong, type KeHoachToanPhongRow } from "@/lib/actions/ke-hoach";
import WeekSelect from "./WeekSelect";
import ToanBoPhongList from "./ToanBoPhongList";
import ToastProvider, { useToast } from "./ToastProvider";

// Trang mới: "Cá nhân" -> "Báo cáo (Toàn bộ phòng)" — lãnh đạo chọn tuần để xem báo cáo của mọi
// chuyên viên trong phòng, và giờ có thêm hành động "Chuyển thành Báo cáo Phòng" cho từng dòng
// (chuẩn bị dữ liệu sẵn cho tính năng Báo cáo Phòng sẽ làm ở màn "Phòng" sau này). Mặc định hiển
// thị TUẦN HIỆN TẠI (đúng bản chất báo cáo việc đã làm trong tuần).
export default function BaoCaoToanPhongBoard() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}

function Content() {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const { show } = useToast();
  const [nam, setNam] = useState(namHienTai);
  const [tuan, setTuan] = useState(tuanHienTai);
  const [rows, setRows] = useState<KeHoachToanPhongRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachToanPhong(nam, tuan, "BAOCAO")
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleConvert(id: number) {
    try {
      await convertCaNhanToPhong(id);
      show("success", "Đã chuyển thành công", "Đã chuyển thành Báo cáo Phòng");
      reload();
    } catch (e) {
      show("error", "Chuyển thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-xs text-gray-400">
          Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Đang tải...
          </div>
        ) : (
          <ToanBoPhongList rows={rows} onConvert={handleConvert} loai="BAOCAO" />
        )}
      </div>
    </div>
  );
}
