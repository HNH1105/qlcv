// ĐÍCH: cần bạn TỰ CHỌN 1 trong 2 cách gắn dưới đây, tuỳ cấu trúc routing/đăng nhập thật của bạn —
// tôi không có file middleware/login-redirect để biết chính xác route nào đang là "trang mặc định
// sau đăng nhập".
//
// CÁCH 1 — nếu bạn CHƯA có trang chủ riêng, tạo route mới:
//   src/app/dashboard/page.tsx  (nội dung y hệt dưới đây), rồi sửa chỗ redirect sau khi đăng nhập
//   (thường trong action xử lý login) trỏ sang "/dashboard".
//
// CÁCH 2 — nếu bạn ĐÃ có trang chủ (VD: src/app/page.tsx hoặc src/app/(admin)/page.tsx) đang hiển
//   thị mặc định sau đăng nhập, chỉ cần THAY NỘI DUNG file đó bằng đúng nội dung dưới đây — không
//   cần tạo route mới.
import TrangChuThongKe from "@/components/dashboard/TrangChuThongKe";

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6">
      <TrangChuThongKe />
    </div>
  );
}
