// ĐÍCH: src/lib/actions/giao-ban/helpers.ts
//
// Dùng chung giữa các file action trong thư mục này (cuoc-hop.ts, noi-dung.ts, nguoi-xu-ly.ts,
// hoan-thanh.ts, chuyen-tuan.ts, huy.ts, nguon.ts). KHÔNG gắn "use server" — file này chỉ được
// import từ SERVER, không phải điểm vào (entrypoint) gọi trực tiếp từ Client Component.

import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";
import { TrangThaiCuocHopGiaoBan, HanhDongGiaoBan, Prisma } from "@prisma/client";

// ============================================================================================
// PHÂN QUYỀN — đúng bảng mục 13 đặc tả + 4 điều chỉnh đã chốt:
//   - "Admin/Lãnh đạo hệ thống" CHỈ xác định bằng TaiKhoan.isAdmin, KHÔNG dùng quyen=LANHDAODONVI.
//   - LANHDAODONVI (isAdmin=false): XEM TOÀN BỘ (không cần cùng phòng), nhưng KHÔNG sửa/hoàn
//     thành/hủy/chuyển tuần — thuần xem, không tính là "1 phòng" trong bảng quyền.
//   - Lãnh đạo/Chuyên viên phòng xử lý: phải CÙNG phongXuLyId với nội dung.
// ============================================================================================

export type QuyenNoiDung = {
  xemDuoc: boolean;
  suaThongTin: boolean; // sửa nội dung/phòng xử lý/thêm-xoá chuyên viên/hạn/ưu tiên/đề nghị chuyển tuần/huỷ
  capNhatGhiChuVaHoanThanh: boolean; // cập nhật ghi chú + đánh dấu (bỏ) hoàn thành
};

export function tinhQuyenNoiDung(session: SessionPayload, phongXuLyId: string): QuyenNoiDung {
  const isAdmin = session.isAdmin;
  const laLanhDaoDonVi = !isAdmin && session.quyen === "LANHDAODONVI";
  const cungPhong = session.maPhong === phongXuLyId;
  const isLanhDaoPhong = !isAdmin && session.quyen === "LANHDAOPHONG" && cungPhong;
  const isChuyenVien = !isAdmin && session.quyen === "USER" && cungPhong;

  return {
    xemDuoc: isAdmin || laLanhDaoDonVi || cungPhong,
    suaThongTin: isAdmin || isLanhDaoPhong,
    capNhatGhiChuVaHoanThanh: isAdmin || isLanhDaoPhong || isChuyenVien,
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
  tx: Prisma.TransactionClient,
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
