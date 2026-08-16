"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWeekInfo, isoWeeksInYear, getWeekDateRangeLabel } from "@/lib/week";
import {
  getKeHoachToanPhong,
  danhDauLaCuaPhong,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import WeekSelect from "./WeekSelect";
import ToanBoPhongList from "./ToanBoPhongList";
import ToastProvider, { useToast } from "./ToastProvider";

// Trang mới, gắn vào menu bên trái: "Cá nhân" -> "Kế hoạch (Toàn bộ phòng)". Trước đây đây là tab
// "Toàn bộ" nằm chung trong KeHoachBaoCaoBoard — nay tách hẳn thành trang riêng theo yêu cầu, chỉ
// hiển thị cho lãnh đạo phòng/đơn vị (điều hướng menu đã lọc theo quyen, nhưng vẫn giữ nguyên
// server action getKeHoachToanPhong tự kiểm tra quyền lần nữa để an toàn).
//
// Mặc định hiển thị TUẦN SAU (đúng tinh thần xem "kế hoạch sắp tới" của cả phòng), vẫn có thể đổi
// tuần bằng dropdown Tuần y hệt các trang khác.
export default function KeHoachToanPhongBoard() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}

type StatusFilter = "tatCa" | "daChuyenPhong" | "chuaChuyenPhong";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "tatCa", label: "Tất cả trạng thái" },
  { key: "daChuyenPhong", label: "Đã đánh dấu Phòng" },
  { key: "chuaChuyenPhong", label: "Chưa đánh dấu Phòng" },
];

// Bộ lọc THỨ 2 — theo yêu cầu, thêm để lãnh đạo dễ xem việc ai đã xử lý/chưa xử lý, độc lập với
// bộ lọc "đã đánh dấu Phòng" ở trên (2 chiều lọc khác nhau, có thể kết hợp cùng lúc).
type XuLyFilter = "tatCa" | "daXuLy" | "chuaXuLy";

const XU_LY_FILTERS: { key: XuLyFilter; label: string }[] = [
  { key: "tatCa", label: "Tất cả (đã/chưa xử lý)" },
  { key: "daXuLy", label: "Đã xử lý" },
  { key: "chuaXuLy", label: "Chưa xử lý" },
];

function Content() {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  let tuanSauMacDinh = tuanHienTai + 1;
  let namSauMacDinh = namHienTai;
  if (tuanSauMacDinh > isoWeeksInYear(namHienTai)) {
    tuanSauMacDinh = 1;
    namSauMacDinh = namHienTai + 1;
  }

  const { show } = useToast();
  const [nam, setNam] = useState(namSauMacDinh);
  const [tuan, setTuan] = useState(tuanSauMacDinh);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tatCa");
  const [xuLyFilter, setXuLyFilter] = useState<XuLyFilter>("tatCa");
  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachToanPhong(nam, tuan, "KEHOACH")
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredRows = useMemo(() => {
    let result = rows;
    switch (statusFilter) {
      case "daChuyenPhong":
        result = result.filter((r) => r.laCuaPhong);
        break;
      case "chuaChuyenPhong":
        result = result.filter((r) => !r.laCuaPhong);
        break;
    }
    switch (xuLyFilter) {
      case "daXuLy":
        result = result.filter((r) => r.daHoanThanh);
        break;
      case "chuaXuLy":
        result = result.filter((r) => !r.daHoanThanh);
        break;
    }
    return result;
  }, [rows, statusFilter, xuLyFilter]);

  async function handleConvert(id: number) {
    try {
      await danhDauLaCuaPhong(id);
      show("success", "Đã đánh dấu thành công", "Đã đánh dấu là Kế hoạch Phòng");
      reload();
    } catch (e) {
      show("error", "Đánh dấu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-3">
          <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={xuLyFilter}
            onChange={(e) => setXuLyFilter(e.target.value as XuLyFilter)}
            className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {XU_LY_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
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
          <ToanBoPhongList rows={filteredRows} onConvert={handleConvert} loai="KEHOACH" />
        )}
      </div>
    </div>
  );
}
