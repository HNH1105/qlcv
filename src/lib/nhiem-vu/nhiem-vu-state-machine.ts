// src/lib/nhiem-vu/state-machine.ts
//
// Enum chỉ ĐỊNH NGHĨA các trạng thái — nó KHÔNG tự đảm bảo transition hợp lệ (VD: nếu không chặn ở
// đây, code vẫn có thể vô tình cho phép HOANTHANH -> DANGXULY trực tiếp mà bỏ qua MO_LAI). Mọi
// Server Action đổi trangThai của NhiemVu BẮT BUỘC gọi qua validateTransition() trước khi update DB.

import { HanhDongNhiemVu, TrangThaiNhiemVu } from "@prisma/client";

export type NguoiThucHienContext = {
  // CỐ Ý dùng string thay vì enum Quyen của Prisma — session.quyen (từ requireSession()) trả về
  // kiểu string thuần, không phải $Enums.Quyen, nên khai báo Quyen ở đây gây lỗi biên dịch
  // "Type 'string' is not assignable to type 'Quyen'" mỗi khi gọi validateTransition(). So sánh
  // bằng string literal ("LANHDAODONVI"/"LANHDAOPHONG") vẫn đúng logic dù kiểu khai báo là string.
  quyen: string;
  // true nếu người thực hiện là LĐ phòng ĐÚNG BẰNG phongChuTriId của nhiệm vụ đang xét — tính ở
  // Server Action trước khi gọi hàm này (so sánh session.maPhong với nhiemVu.phongChuTriId).
  laLanhDaoPhongChuTri: boolean;
};

type QuyDinhTransition = {
  hanhDong: HanhDongNhiemVu;
  batBuocLyDo: boolean;
  // Trả về true nếu người này ĐƯỢC PHÉP thực hiện hành động — kiểm tra thêm ngoài quyền cơ bản
  // (VD: BGĐ luôn được, LĐ phòng chỉ khi đúng phòng chủ trì).
  kiemTraQuyen: (ctx: NguoiThucHienContext) => boolean;
};

const BGD_HOAC_LD_PHONG_CHU_TRI = (ctx: NguoiThucHienContext) =>
  ctx.quyen === "LANHDAODONVI" || (ctx.quyen === "LANHDAOPHONG" && ctx.laLanhDaoPhongChuTri);

// Danh sách transition hợp lệ — chìa khoá là `${tuTrangThai}->${denTrangThai}`. Trạng thái không có
// trong map này ⇒ KHÔNG hợp lệ, chặn ngay không cần xét tiếp.
const TRANSITIONS: Record<string, QuyDinhTransition> = {
  "CHO_PHAN_CONG->DANGXULY": {
    hanhDong: "PHAN_CONG",
    batBuocLyDo: false,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "DANGXULY->CHO_DUYET": {
    hanhDong: "BAO_CAO_HOANTHANH",
    batBuocLyDo: false,
    // Người xử lý chính tự báo cáo — kiểm tra maNV === nguoiXuLyChinhId làm ở Server Action, không
    // phải theo Quyen, nên hàm này luôn trả true (quyền thật kiểm ở nơi gọi, tách theo bản chất
    // khác — hành động cá nhân, không phải hành động quản lý).
    kiemTraQuyen: () => true,
  },
  "CHO_DUYET->HOANTHANH": {
    hanhDong: "DUYET_HOANTHANH",
    batBuocLyDo: false,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "CHO_DUYET->DANGXULY": {
    hanhDong: "YEU_CAU_XULY_LAI",
    batBuocLyDo: true,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "HOANTHANH->DANGXULY": {
    hanhDong: "MO_LAI",
    batBuocLyDo: false,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "TAMDUNG->DANGXULY": {
    hanhDong: "MO_LAI",
    batBuocLyDo: false,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "DANGXULY->TAMDUNG": {
    hanhDong: "TAMDUNG",
    batBuocLyDo: true,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "CHO_PHAN_CONG->TAMDUNG": {
    hanhDong: "TAMDUNG",
    batBuocLyDo: true,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "DANGXULY->HUY": {
    hanhDong: "HUY",
    batBuocLyDo: true,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  "CHO_PHAN_CONG->HUY": {
    hanhDong: "HUY",
    batBuocLyDo: true,
    kiemTraQuyen: BGD_HOAC_LD_PHONG_CHU_TRI,
  },
  // HUY là trạng thái CUỐI — cố ý KHÔNG có "HUY->bất kỳ đâu" trong map này.
};

export type KetQuaValidate =
  | { hopLe: true; hanhDong: HanhDongNhiemVu }
  | { hopLe: false; loi: string };

export function validateTransition(
  tuTrangThai: TrangThaiNhiemVu,
  denTrangThai: TrangThaiNhiemVu,
  lyDo: string | null | undefined,
  ctx: NguoiThucHienContext
): KetQuaValidate {
  const quyDinh = TRANSITIONS[`${tuTrangThai}->${denTrangThai}`];

  if (!quyDinh) {
    return {
      hopLe: false,
      loi: `Không thể chuyển từ "${tuTrangThai}" sang "${denTrangThai}" — transition không hợp lệ.`,
    };
  }

  if (!quyDinh.kiemTraQuyen(ctx)) {
    return {
      hopLe: false,
      loi: "Bạn không có quyền thực hiện hành động này (chỉ BGĐ hoặc LĐ phòng chủ trì).",
    };
  }

  if (quyDinh.batBuocLyDo && !lyDo?.trim()) {
    return {
      hopLe: false,
      loi: `Hành động "${quyDinh.hanhDong}" bắt buộc phải nhập lý do.`,
    };
  }

  return { hopLe: true, hanhDong: quyDinh.hanhDong };
}
