// ĐÍCH: src/app/nhiem-vu/tao-moi/page.tsx (thay đúng đường dẫn route group thật của bạn, VD:
// src/app/(admin)/nhiem-vu/tao-moi/page.tsx)
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getPhongList, getNhanVienList } from "@/lib/actions/danh-muc";
import NhiemVuTaoMoiForm from "@/components/nhiem-vu/NhiemVuTaoMoiForm";

export default async function GiaoNhiemVuPage({
  searchParams,
}: {
  // Next.js 15: searchParams giờ là Promise, PHẢI await trước khi đọc property — đây chính là lỗi
  // bạn gặp ("searchParams is a Promise and must be unwrapped").
  searchParams: Promise<{ phong?: string }>;
}) {
  const { phong } = await searchParams;
  const session = await requireSession();
  if (session.quyen !== "LANHDAODONVI" && session.quyen !== "LANHDAOPHONG") {
    redirect("/nhiem-vu");
  }

  // Tải sẵn danh mục Phòng/Nhân viên NGAY TRONG Server Component này — tránh việc form phải tự
  // gọi Server Action lúc mount (mỗi lần gọi tốn 1 round-trip riêng, cộng dồn với độ trễ DB có thể
  // lên tới cả giây; xem giải thích đầy đủ ở phần trả lời kèm theo). Kết quả tải 1 lần ở đây,
  // truyền thẳng xuống làm state khởi tạo cho form — nhanh hơn đáng kể.
  const [dsPhongBanDau, dsNhanVienBanDau] = await Promise.all([getPhongList(), getNhanVienList()]);

  return (
    <div className="p-4 sm:p-6">
      <NhiemVuTaoMoiForm
        phongMacDinh={phong}
        dsPhongBanDau={dsPhongBanDau}
        dsNhanVienBanDau={dsNhanVienBanDau}
      />
    </div>
  );
}
