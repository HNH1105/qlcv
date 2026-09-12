// ĐÍCH: src/components/providers/NavProgressProvider.tsx
// LƯU Ý: đây là hạ tầng DÙNG CHUNG cho cả app, không riêng Nhiệm vụ — cần bọc quanh {children} ở
// root layout (src/app/layout.tsx), đặt trong <body>, bên NGOÀI mọi children khác:
//
//   <NavProgressProvider>
//     {children}
//   </NavProgressProvider>
//
// Next.js App Router KHÔNG có sự kiện "bắt đầu điều hướng" chính thức (khác Pages Router có
// router.events) — nên cách làm ở đây là: nơi nào gọi router.push()/router.refresh() thì TỰ báo
// hiệu bằng cách gọi startNavProgress() ngay trước đó; thanh loading tự tắt khi pathname/
// searchParams thực sự đổi (Next.js chỉ cập nhật 2 hook này SAU KHI trang mới đã render xong).
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NavProgressContext = createContext<(() => void) | null>(null);

export function NavProgressProvider({ children }: { children: React.ReactNode }) {
  const [phanTram, setPhanTram] = useState(0);
  const [dangChay, setDangChay] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function batDau() {
    setDangChay(true);
    setPhanTram(15);
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Tăng dần nhưng chậm lại khi gần 90% — mô phỏng cảm giác "đang tải", không bao giờ tự chạm
    // 100% (chỉ chạm 100% thật khi route đã đổi xong, xem effect bên dưới).
    intervalRef.current = setInterval(() => {
      setPhanTram((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
    }, 200);
  }

  useEffect(() => {
    if (!dangChay) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhanTram(100);
    const t = setTimeout(() => {
      setDangChay(false);
      setPhanTram(0);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <NavProgressContext.Provider value={batDau}>
      {dangChay && (
        <div className="fixed left-0 top-0 z-[99999] h-[3px] w-full bg-transparent">
          <div
            className="h-full bg-brand-500 transition-all duration-200 ease-out"
            style={{ width: `${phanTram}%` }}
          />
        </div>
      )}
      {children}
    </NavProgressContext.Provider>
  );
}

/** Gọi hàm này NGAY TRƯỚC router.push()/router.refresh() ở bất kỳ đâu cần báo hiệu đang điều hướng. */
export function useNavProgress() {
  const start = useContext(NavProgressContext);
  if (!start) {
    throw new Error("useNavProgress() phải được gọi bên trong <NavProgressProvider>.");
  }
  return start;
}
