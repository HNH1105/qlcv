// ĐÍCH: src/app/nhiem-vu/thong-ke/page.tsx
import NhiemVuCanhBaoWidget from "@/components/nhiem-vu/NhiemVuCanhBaoWidget";
import NhiemVuThongKeTongQuan from "@/components/nhiem-vu/NhiemVuThongKeTongQuan";

export default function ThongKeNhiemVuPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Thống kê Nhiệm vụ</h1>
      <NhiemVuCanhBaoWidget />
      <NhiemVuThongKeTongQuan />
    </div>
  );
}
