// ĐÍCH: src/components/ca-nhan/NguoiPhoiHopSelect.tsx (GHI ĐÈ file gốc — chỉ thêm ô tìm kiếm,
// không đổi API/props nên KHÔNG ảnh hưởng bất kỳ nơi nào đang dùng component này)
"use client";

import { useMemo, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

type Option = { value: string; text: string };

// Bỏ dấu tiếng Việt để gõ "phong" vẫn tìm ra "Phòng"/"Phong" — không phân biệt hoa/thường.
function boDauVaThuong(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function NguoiPhoiHopSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tuKhoa, setTuKhoa] = useState("");
  const ref = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
    setTuKhoa("");
  });

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  // MỚI — lọc theo từ khoá gõ vào (autocomplete). Trước đây chỉ cuộn tay trong danh sách cố định,
  // giờ gõ vài ký tự là lọc ngay, hữu ích khi danh sách nhân viên dài.
  const dsHienThi = useMemo(() => {
    if (!tuKhoa.trim()) return options;
    const key = boDauVaThuong(tuKhoa);
    return options.filter((o) => boDauVaThuong(o.text).includes(key));
  }, [options, tuKhoa]);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-left text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900"
      >
        <span className="truncate text-gray-500 dark:text-gray-400">
          {selectedOptions.length === 0
            ? "Chọn người phối hợp..."
            : selectedOptions.length <= 2
              ? selectedOptions.map((o) => o.text).join(", ")
              : `Đã chọn ${selectedOptions.length} người`}
        </span>
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
          {/* Ô tìm kiếm MỚI — autoFocus để gõ được ngay khi vừa mở dropdown */}
          <div className="border-b border-gray-100 p-1.5 dark:border-white/[0.05]">
            <input
              autoFocus
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              placeholder="Gõ để tìm..."
              className="h-8 w-full rounded-md border-0 bg-gray-50 px-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-300 dark:bg-white/5 dark:text-white/90"
            />
          </div>
          <div className="max-h-40 overflow-y-auto p-1.5">
            {dsHienThi.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">
                {options.length === 0 ? "Không có đồng nghiệp cùng phòng" : "Không tìm thấy ai khớp"}
              </p>
            ) : (
              dsHienThi.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  {o.text}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            >
              {o.text}
              <button
                type="button"
                onClick={() => toggle(o.value)}
                className="leading-none hover:text-brand-800 dark:hover:text-brand-300"
                aria-label={`Bỏ chọn ${o.text}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
