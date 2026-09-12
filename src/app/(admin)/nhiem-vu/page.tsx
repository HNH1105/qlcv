// ĐÍCH: src/app/nhiem-vu/page.tsx
import NhiemVuCuaToiBoard from "@/components/nhiem-vu/NhiemVuCuaToiBoard";

export default function NhiemVuCuaToiPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Nhiệm vụ của tôi</h1>
      <NhiemVuCuaToiBoard />
    </div>
  );
}
