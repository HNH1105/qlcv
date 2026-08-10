"use client";

import { useEffect, useRef, RefObject } from "react";

/**
 * Trả về 1 ref để gắn vào phần tử bao ngoài (wrapper) của 1 dropdown/panel bất kỳ.
 * Khi người dùng click/chạm ra NGOÀI phần tử đó, `onOutside` sẽ được gọi (thường dùng để đóng
 * dropdown lại) — đây chính là phần MultiSelect cũ đang thiếu, khiến dropdown bị "treo" không
 * đóng khi bấm ra ngoài.
 *
 * Dùng cả "mousedown" lẫn "touchstart" để hoạt động đúng trên mobile (touch) lẫn desktop (chuột).
 */
export function useClickOutside<T extends HTMLElement>(
  onOutside: () => void
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [onOutside]);

  return ref;
}
