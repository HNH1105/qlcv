// src/components/nhiem-vu/NhiemVuBadges.tsx
import Badge from "@/components/ui/badge/Badge";
import { MucDoUuTien, TrangThaiNhiemVu } from "@prisma/client";

// LƯU Ý: map màu dựa theo bộ color chuẩn của Badge trong theme TailAdmin (primary/success/warning/
// error/info/light/dark). Nếu Badge trong dự án chỉ support tập con (VD: chỉ success/warning/error
// như ví dụ BasicTableOne), cần rút gọn lại map bên dưới cho khớp — kiểm tra type ColorVariant của
// Badge trước khi build.

const TRANG_THAI_LABEL: Record<TrangThaiNhiemVu, string> = {
  CHO_PHAN_CONG: "Chờ phân công",
  DANGXULY: "Đang xử lý",
  CHO_DUYET: "Chờ duyệt",
  HOANTHANH: "Hoàn thành",
  TAMDUNG: "Tạm dừng",
  HUY: "Đã huỷ",
};

const TRANG_THAI_COLOR: Record<TrangThaiNhiemVu, "warning" | "info" | "primary" | "success" | "light" | "error"> = {
  CHO_PHAN_CONG: "warning",
  DANGXULY: "info",
  CHO_DUYET: "primary",
  HOANTHANH: "success",
  TAMDUNG: "light",
  HUY: "error",
};

export function TrangThaiNhiemVuBadge({ trangThai }: { trangThai: TrangThaiNhiemVu }) {
  return (
    <Badge size="sm" color={TRANG_THAI_COLOR[trangThai]}>
      {TRANG_THAI_LABEL[trangThai]}
    </Badge>
  );
}

// UI chỉ hiển thị 2 mức (THUONG/KHAN) theo đúng quyết định đã chốt — HOATOC vẫn có trong enum DB
// (giữ chỗ mở rộng sau) nhưng không map nhãn hiển thị riêng ở đây, rơi vào nhánh mặc định.
const UU_TIEN_LABEL: Record<MucDoUuTien, string> = {
  THUONG: "Thường",
  KHAN: "Khẩn",
  HOATOC: "Khẩn", // chưa dùng thật, hiển thị tạm giống KHAN nếu lỡ có dữ liệu cũ
};

export function UuTienBadge({ mucDo }: { mucDo: MucDoUuTien }) {
  return (
    <Badge size="sm" color={mucDo === "THUONG" ? "light" : "error"}>
      {UU_TIEN_LABEL[mucDo]}
    </Badge>
  );
}

// "Quá hạn" tính ĐỘNG lúc render — KHÔNG lưu cứng field boolean nào (đúng nguyên tắc đã chốt: đảm
// bảo MO_LAI không làm mất cảnh báo quá hạn vì không có gì để "reset").
export function tinhQuaHan(hanXuLy: Date | null, trangThai: TrangThaiNhiemVu): boolean {
  if (!hanXuLy) return false;
  if (trangThai === "HOANTHANH" || trangThai === "HUY") return false;
  return hanXuLy.getTime() < new Date().setHours(0, 0, 0, 0);
}
