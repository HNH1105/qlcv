"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaiGhiNhan } from "@prisma/client";
import { getCurrentWeekInfo, isoWeeksInYear, getWeekDateRangeLabel } from "@/lib/week";
import { getKeHoachCaNhan, type KeHoachRow } from "@/lib/actions/ke-hoach";
import { useModal } from "@/hooks/useModal";
import AddKeHoachBaoCaoModal from "./AddKeHoachBaoCaoModal";
import KehoachBaoCaoItemCard from "./KehoachBaoCaoItemCard";
import KeHoachBaoCaoItemCard from "./KehoachBaoCaoItemCard";
type WeekTab = "hienTai" | "sau" | "khac";

export default function KeHoachBaoCaoBoard({ loai }: { loai: LoaiGhiNhan }) {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();

  // Xử lý "Tuần sau" đúng cách, có vắt qua năm mới (tuần 52/53 -> tuần 1 năm sau)
  let tuanSau = tuanHienTai + 1;
  let namSau = namHienTai;
  if (tuanSau > isoWeeksInYear(namHienTai)) {
    tuanSau = 1;
    namSau = namHienTai + 1;
  }

  // Mặc định: BÁO CÁO -> Tuần hiện tại (báo cáo việc đã làm trong tuần); KẾ HOẠCH -> Tuần sau
  // (lên kế hoạch cho tuần sắp tới) — đúng quy ước của bản Apps Script cũ, không dùng chung 1 mặc
  // định cho cả 2 loại.
  const defaultTab: WeekTab = loai === "KEHOACH" ? "sau" : "hienTai";
  const [weekTab, setWeekTab] = useState<WeekTab>(defaultTab);
  const [customNam, setCustomNam] = useState(namHienTai);
  const [customTuan, setCustomTuan] = useState(tuanHienTai);

  const nam = weekTab === "hienTai" ? namHienTai : weekTab === "sau" ? namSau : customNam;
  const tuan = weekTab === "hienTai" ? tuanHienTai : weekTab === "sau" ? tuanSau : customTuan;

  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useModal();

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachCaNhan(nam, tuan, loai)
      .then(setRows)
      .finally(() => setIsLoading(false));
  }, [nam, tuan, loai]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isBaoCao = loai === "BAOCAO";
  const tenLoai = isBaoCao ? "Báo cáo" : "Kế hoạch";

  return (
    // Tự dựng khung "card" trắng bo góc thay vì bọc trong ComponentCard có sẵn — vì không cần
    // hiện lại tiêu đề (PageBreadcrumb ở trên đã có rồi); phần đầu container này giờ là hàng
    // tab + nút Thêm, đúng như cấu trúc trong ảnh tham khảo (Task List).
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-white/[0.05]">
        <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-white/5">
          <button
            onClick={() => setWeekTab("hienTai")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              weekTab === "hienTai"
                ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Tuần hiện tại
          </button>
          <button
            onClick={() => setWeekTab("sau")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              weekTab === "sau"
                ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Tuần sau
          </button>
          <button
            onClick={() => setWeekTab("khac")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              weekTab === "khac"
                ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Tuần khác
          </button>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Thêm {tenLoai} <span className="text-lg leading-none">+</span>
        </button>
      </div>

      <div className="space-y-6 p-6">
        {weekTab === "khac" && (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Năm
              </label>
              <select
                value={customNam}
                onChange={(e) => setCustomNam(Number(e.target.value))}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {[namHienTai - 1, namHienTai, namHienTai + 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tuần
              </label>
              <select
                value={customTuan}
                onChange={(e) => setCustomTuan(Number(e.target.value))}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {Array.from({ length: 53 }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>
                    Tuần {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {isLoading ? (
          <p className="py-12 text-center text-gray-400">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-gray-400">
            Chưa có dữ liệu nào cho tuần {tuan}/{nam}. Bấm &quot;Thêm {tenLoai}&quot; để bắt đầu.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <KeHoachBaoCaoItemCard key={row.id} row={row} loai={loai} onChanged={reload} />
            ))}
          </div>
        )}
      </div>

      <AddKeHoachBaoCaoModal
        isOpen={isOpen}
        onClose={closeModal}
        nam={nam}
        tuan={tuan}
        loai={loai}
        onAdded={reload}
      />
    </div>
  );
}
