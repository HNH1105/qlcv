// ĐÍCH: src/app/(admin)/giao-ban/page.tsx
import { requireSession } from "@/lib/auth/session";
import CuocHopGiaoBanBoard from "@/components/giao-ban/CuocHopGiaoBanBoard";

export default async function GiaoBanPage() {
  // Mọi role đều xem được danh sách (phạm vi dữ liệu bên trong từng cuộc họp mới lọc theo quyền) —
  // không redirect ở đây, khác /nhiem-vu/toi-giao vốn CHỈ dành cho LĐ.
  await requireSession();

  return (
    <div className="p-4 sm:p-6">
      <CuocHopGiaoBanBoard />
    </div>
  );
}
