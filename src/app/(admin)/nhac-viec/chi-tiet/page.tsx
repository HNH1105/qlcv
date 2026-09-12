// ĐÍCH: src/app/nhac-viec/chi-tiet/page.tsx
// LƯU Ý: ChiTietNhacViecBoard dùng useSearchParams() — Next.js App Router BẮT BUỘC bọc Suspense,
// nếu không sẽ lỗi build "useSearchParams() should be wrapped in a suspense boundary".
import { Suspense } from "react";
import ChiTietNhacViecBoard from "@/components/nhac-viec/ChiTietNhacViecBoard";

export default function NhacViecChiTietPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<div className="py-12 text-center text-gray-400">Đang tải...</div>}>
        <ChiTietNhacViecBoard />
      </Suspense>
    </div>
  );
}
