import KeHoachToanPhongBoard from "@/components/ca-nhan/KeHoachToanPhongBoard";

// GHI CHÚ: chưa có source page.tsx gốc (VD: /ca-nhan/ke-hoach/page.tsx) nên đây chỉ là bản khung
// tối thiểu, đoán theo đúng pattern "1 route = 1 board component" đang dùng trong dự án. Nếu trang
// gốc có bọc thêm PageBreadcrumb / metadata riêng, bác chỉnh lại cho khớp.
export default function Page() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Kế hoạch (Toàn bộ phòng)
      </h1>
      <KeHoachToanPhongBoard />
    </div>
  );
}
