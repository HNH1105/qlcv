"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Alert from "@/components/ui/alert/Alert";

type ToastVariant = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; variant: ToastVariant; title: string; message: string };

const ToastContext = createContext<{
  show: (variant: ToastVariant, title: string, message: string) => void;
} | null>(null);

// Dùng ở bất kỳ component con nào nằm trong <ToastProvider> (card, modal...) để bắn toast mà
// không cần truyền callback qua từng lớp props.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được gọi bên trong <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((variant: ToastVariant, title: string, message: string) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, variant, title, message }]);
    // Tự ẩn sau 3.5s — đúng yêu cầu "hiển thị rồi mất"
    setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 3500);
  }, []);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      {/* Chuyển từ góc trên-phải sang góc DƯỚI-phải theo yêu cầu. flex-col-reverse để toast mới
          nhất luôn nằm gần mép dưới (dễ nhìn thấy ngay), toast cũ hơn bị đẩy dần lên trên. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100000] flex flex-col-reverse items-end gap-3 sm:inset-x-auto sm:right-4 sm:left-auto">
        {items.map((it) => (
          <div key={it.id} className="pointer-events-auto w-full sm:w-96" onClick={() => dismiss(it.id)}>
            <Alert variant={it.variant} title={it.title} message={it.message} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
