"use client";

import { useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import {
  getCurrentWeekInfo,
  getWeekDateRangeLabel,
  getTuanOptions,
  isoWeeksInYear,
  parseTuanOptionValue,
} from "@/lib/week";

export default function WeekSelect({
  nam,
  tuan,
  onChange,
}: {
  nam: number;
  tuan: number;
  onChange: (nam: number, tuan: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftNam, setDraftNam] = useState(nam);
  const [draftTuan, setDraftTuan] = useState(tuan);
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  // Bỏ dropdown "Năm" riêng — chỉ còn 1 dropdown "Tuần" duy nhất. Danh sách tuần lấy theo năm đang
  // xem (draftNam) và tự nối thêm vài tuần đầu năm sau vào cuối, để vẫn xem/chọn được xuyên năm mà
  // không cần chọn năm thủ công.
  const tuanOptions = getTuanOptions(draftNam, { forwardExtraWeeksNextYear: 12 });

  function openPanel() {
    setDraftNam(nam);
    setDraftTuan(tuan);
    setIsOpen(true);
  }

  function apply(n: number, t: number) {
    onChange(n, t);
    setIsOpen(false);
  }

  function chonTuanNay() {
    const { nam: n, tuan: t } = getCurrentWeekInfo();
    apply(n, t);
  }

  function chonTuanSau() {
    const { nam: n, tuan: t } = getCurrentWeekInfo();
    let tuanSau = t + 1;
    let namSau = n;
    if (tuanSau > isoWeeksInYear(n)) {
      tuanSau = 1;
      namSau = n + 1;
    }
    apply(namSau, tuanSau);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        Tuần {tuan}, {nam}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-40 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={chonTuanNay}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300"
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={chonTuanSau}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300"
            >
              Tuần sau
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tuần</label>
            <select
              value={`${draftNam}-${draftTuan}`}
              onChange={(e) => {
                const { nam: n, tuan: t } = parseTuanOptionValue(e.target.value);
                setDraftNam(n);
                setDraftTuan(t);
              }}
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {tuanOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-gray-400">{getWeekDateRangeLabel(draftNam, draftTuan)}</p>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => apply(draftNam, draftTuan)}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
