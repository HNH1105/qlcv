// ĐÍCH: src/lib/giao-ban/trang-thai.ts
//
// Tách riêng KHỎI thư mục actions/ vì đây là hàm THUẦN (không async, không đụng DB) — dùng được cả
// ở Client Component (GiaoBanTable, GiaoBanBadges...) lẫn ở bất kỳ AI/module nào khác cần suy ra
// trạng thái mà không muốn kéo theo toàn bộ Prisma Client. KHÔNG đặt "use server" ở file này.

export type TrangThaiGiaoBanHienThi = "DANG_XU_LY" | "DA_HOAN_THANH" | "DA_CHUYEN_TUAN" | "DA_HUY";

// Suy ra trạng thái hiển thị (đặc tả mục 27, 32) — KHÔNG lưu cột riêng trong DB.
// `duocChuyenThanh` phải được include từ quan hệ tự tham chiếu khi query (xem noi-dung.ts).
export function tinhTrangThaiGiaoBan(row: {
  daHoanThanh: boolean;
  daKetThuc: boolean;
  duocChuyenThanh?: { id: number } | null;
}): TrangThaiGiaoBanHienThi {
  if (!row.daKetThuc) return "DANG_XU_LY";
  if (row.daHoanThanh) return "DA_HOAN_THANH";
  if (row.duocChuyenThanh != null) return "DA_CHUYEN_TUAN";
  return "DA_HUY";
}
