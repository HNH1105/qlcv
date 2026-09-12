// ĐÍCH: src/components/nhiem-vu/NguoiXuLyChinhSelect.tsx
"use client";

import { useMemo, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

type Option = { value: string; text: string };

function boDauVaThuong(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Autocomplete CHỌN 1 người — cùng phong cách với NguoiPhoiHopSelect (multi) nhưng đơn giản hơn:
// không có checkbox/chip, bấm 1 lần là chọn luôn và đóng dropdown.
export default function NguoiXuLyChinhSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "— Chưa phân công —",
}: {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tuKhoa, setTuKhoa] = useState("");
  const ref = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
    setTuKhoa("");
  });

  const daChon = options.find((o) => o.value === value);

  const dsHienThi = useMemo(() => {
    if (!tuKhoa.trim()) return options;
    const key = boDauVaThuong(tuKhoa);
    return options.filter((o) => boDauVaThuong(o.text).includes(key));
  }, [options, tuKhoa]);

  function chon(v: string) {
    onChange(v);
    setIsOpen(false);
    setTuKhoa("");
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-transparent px-4 text-left text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      >
        <span className={`truncate ${daChon ? "" : "text-gray-400"}`}>{daChon ? daChon.text : placeholder}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark">
          <div className="border-b border-gray-100 p-1.5 dark:border-white/[0.05]">
            <input
              autoFocus
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              placeholder="Gõ để tìm..."
              className="h-8 w-full rounded-md border-0 bg-gray-50 px-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-300 dark:bg-white/5 dark:text-white/90"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={() => chon("")}
              className="block w-full rounded-md px-3 py-2 text-left text-sm italic text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              {placeholder}
            </button>
            {dsHienThi.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy ai khớp</p>
            ) : (
              dsHienThi.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => chon(o.value)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 ${
                    o.value === value ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {o.text}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
