// ĐÍCH: src/lib/actions/giao-ban/helpers.ts
//
// Dùng chung giữa các file action trong thư mục này (cuoc-hop.ts, noi-dung.ts, nguoi-xu-ly.ts,
// hoan-thanh.ts, chuyen-tuan.ts, huy.ts, nguon.ts). KHÔNG gắn "use server" — file này chỉ được
// import từ SERVER, không phải điểm vào (entrypoint) gọi trực tiếp từ Client Component.

import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";
import { TrangThaiCuocHopGiaoBan, HanhDongGiaoBan, Prisma } from "@prisma/client";

import type { PrismaTx } from "@/lib/prisma";
// ============================================================================================
// PHÂN QUYỀN — 7 chức năng tách riêng, KHÔNG gộp chung:
//   - Xem chi tiết, Xem lịch sử: TẤT CẢ mọi người, không điều kiện gì thêm.
//   - suaNoiDung (Nội dung/Hạn/Ưu tiên/Người xử lý), chuyenTuanSau, loaiKhoiDanhSach (huỷ):
//     CHỈ Admin hoặc LĐ phòng ĐÚNG phòng xử lý.
//   - capNhatGhiChu, danhDauHoanThanh: Admin, LĐ phòng, VÀ CHUYÊN VIÊN — chuyên viên CHỈ có 2
//     quyền này, không có 3 quyền còn lại. Tất cả đều phải ĐÚNG phòng xử lý.
//   - "Admin/Lãnh đạo hệ thống" CHỈ xác định bằng TaiKhoan.isAdmin, KHÔNG dùng quyen=LANHDAODONVI.
//   - XEM checklist (không nằm trong QuyenNoiDung): TẤT CẢ mọi người xem TOÀN BỘ, không lọc phòng.
// ============================================================================================

export type QuyenNoiDung = {
  suaNoiDung: boolean; // Nội dung / Hạn hoàn thành / Mức độ ưu tiên / Người xử lý
  capNhatGhiChu: boolean;
  danhDauHoanThanh: boolean;
  chuyenTuanSau: boolean;
  loaiKhoiDanhSach: boolean; // huỷ / không theo dõi
};

export function tinhQuyenNoiDung(session: SessionPayload, phongXuLyId: string): QuyenNoiDung {
  const isAdmin = session.isAdmin;
  const cungPhong = session.maPhong === phongXuLyId;
  const isLanhDaoPhong = !isAdmin && session.quyen === "LANHDAOPHONG" && cungPhong;
  const isChuyenVien = !isAdmin && session.quyen === "USER" && cungPhong;
  const laLanhDaoHoacAdmin = isAdmin || isLanhDaoPhong;

  return {
    suaNoiDung: laLanhDaoHoacAdmin,
    chuyenTuanSau: laLanhDaoHoacAdmin,
    loaiKhoiDanhSach: laLanhDaoHoacAdmin,
    capNhatGhiChu: laLanhDaoHoacAdmin || isChuyenVien,
    danhDauHoanThanh: laLanhDaoHoacAdmin || isChuyenVien,
  };
}

export function isAdminHoacLanhDaoPhong(session: SessionPayload, phongXuLyId: string) {
  return session.isAdmin || (session.quyen === "LANHDAOPHONG" && session.maPhong === phongXuLyId);
}

// ============================================================================================
// KHOÁ NGHIỆP VỤ (mục 28, 37.14, 37.15)
// ============================================================================================

export function kiemTraKhoa(cuocHopTrangThai: TrangThaiCuocHopGiaoBan, daKetThuc: boolean) {
  if (cuocHopTrangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể thao tác.");
  }
  if (daKetThuc) {
    throw new Error("Nội dung này đã kết thúc theo dõi, không thể thao tác.");
  }
}

// ============================================================================================
// AUDIT LOG (mục 29) — 1 hành động = 1 log
// ============================================================================================

export async function ghiLog(
  tx: PrismaTx,
  noiDungGiaoBanId: number,
  nguoiThucHienId: string,
  thaoTac: HanhDongGiaoBan,
  chiTiet?: { truongDuocSua?: string; giaTriCu?: string | null; giaTriMoi?: string | null }
) {
  await tx.noiDungGiaoBanLog.create({
    data: {
      noiDungGiaoBanId,
      nguoiThucHienId,
      thaoTac,
      truongDuocSua: chiTiet?.truongDuocSua,
      giaTriCu: chiTiet?.giaTriCu ?? null,
      giaTriMoi: chiTiet?.giaTriMoi ?? null,
    },
  });
}

// ============================================================================================
// TÌM NỘI DUNG GIAO BAN "ĐANG SỐNG" CỦA 1 NGUỒN (mục 17, 22) — dùng chung cho cả chống trùng khi
// tạo mới (nguon.ts) LẪN tìm bản ghi cần đồng bộ khi nguồn hoàn thành (hoan-thanh.ts). Đây cũng là
// hàm mà module Nhiệm vụ/Kế hoạch phòng (AI khác) nên import khi cần biết "Nhiệm vụ X đã có đang
// theo dõi ở Giao ban chưa" để ẩn/hiện nút "Chuyển thành nội dung giao ban".
// ============================================================================================

export function timNoiDungGiaoBanDangSongTuNhiemVu(nhiemVuId: number) {
  return prisma.noiDungGiaoBan.findFirst({
    where: { nhiemVuId, daKetThuc: false, isDeleted: false },
  });
}

export function timNoiDungGiaoBanDangSongTuKeHoach(keHoachTuanId: number) {
  return prisma.noiDungGiaoBan.findFirst({
    where: { keHoachTuanId, daKetThuc: false, isDeleted: false },
  });
}
