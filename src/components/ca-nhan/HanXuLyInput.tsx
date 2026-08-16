"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// Input "Hạn xử lý" dùng lịch thật (flatpickr) thay vì <input type="date"> thô — hiển thị dd/mm/yyyy
// cho người dùng (altInput) nhưng vẫn giữ giá trị thật bên trong ở dạng "yyyy-mm-dd" (dateFormat)
// để không phải đổi state/logic gửi lên server ở nơi gọi.
export default function HanXuLyInput({
  value,
  onChange,
  placeholder = "Chọn ngày...",
}: {
  value: string; // "" = trống (không có hạn), hoặc "yyyy-mm-dd"
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  // Giữ onChange mới nhất trong ref để không phải huỷ/tạo lại flatpickr mỗi lần component cha
  // re-render (tránh mất focus/đóng lịch giữa chừng khi gõ ở chỗ khác trong form).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    fpRef.current = flatpickr(inputRef.current, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      allowInput: false,
      locale: { firstDayOfWeek: 1 }, // Thứ 2 đầu tuần, khớp quy ước tuần ISO đang dùng trong app
      defaultDate: value || undefined,
      onChange: (_dates, dateStr) => onChangeRef.current(dateStr),
    });
    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ lại khi value bị đổi từ BÊN NGOÀI (VD: modal reset về rỗng lúc mở lại) — flatpickr
  // không tự biết prop value đổi vì nó quản lý DOM input trực tiếp, không qua React re-render.
  //
  // LƯU Ý (sửa lỗi build TS2345): flatpickr.Instance.setDate() có kiểu tham số là
  // `DateOption | DateOption[]`, KHÔNG chấp nhận `null` — bản cũ gọi `setDate(value || null, false)`
  // nên TypeScript báo lỗi ở bước build. Phải tách rõ 2 nhánh: có giá trị thì setDate(value),
  // rỗng thì gọi clear() (API riêng của flatpickr để xoá ngày đang chọn) thay vì cố nhét null vào
  // setDate.
  useEffect(() => {
    if (!fpRef.current) return;
    if (fpRef.current.input.value === value) return;
    if (value) {
      fpRef.current.setDate(value, false);
    } else {
      // clear(triggerChange = false) — xoá ngày đang chọn mà KHÔNG tự bắn lại onChange, vì effect
      // này chạy để PHẢN ỨNG với việc value đã đổi từ bên ngoài rồi, không cần báo ngược lại lần
      // nữa (tránh gọi thừa onChangeRef.current("")).
      fpRef.current.clear(false);
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        placeholder={placeholder}
        className="h-10 w-full min-w-[150px] rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            fpRef.current?.clear();
            onChangeRef.current("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Xoá hạn xử lý"
        >
          ×
        </button>
      )}
    </div>
  );
}