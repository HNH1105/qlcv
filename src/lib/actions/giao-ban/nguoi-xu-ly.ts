// ĐÍCH: src/lib/actions/giao-ban/nguoi-xu-ly.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { kiemTraKhoa, tinhQuyenNoiDung, ghiLog } from "./helpers";

// Người xử lý phải thuộc đúng phongXuLyId (điều chỉnh đã chốt với người dùng).
export async function themNguoiXuLy(noiDungGiaoBanId: number, nhanVienId: string) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id: noiDungGiaoBanId },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaThongTin) throw new Error("Bạn không có quyền thêm chuyên viên xử lý.");

  const nv = await prisma.nhanVien.findUnique({ where: { maNV: nhanVienId } });
  if (!nv || nv.maPhong !== row.phongXuLyId) {
    throw new Error("Người xử lý phải thuộc đúng phòng xử lý đã chọn.");
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.noiDungGiaoBanNguoiXuLy.create({
      data: { noiDungGiaoBanId, nhanVienId },
    });
    await ghiLog(tx, noiDungGiaoBanId, session.maNV, "THEM_NGUOI_XU_LY", {
      truongDuocSua: "nguoiXuLy",
      giaTriMoi: nhanVienId,
    });
    return created;
  });
}

export async function xoaNguoiXuLy(noiDungGiaoBanId: number, nhanVienId: string) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id: noiDungGiaoBanId },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaThongTin) throw new Error("Bạn không có quyền xoá chuyên viên xử lý.");

  return prisma.$transaction(async (tx) => {
    await tx.noiDungGiaoBanNguoiXuLy.delete({
      where: { noiDungGiaoBanId_nhanVienId: { noiDungGiaoBanId, nhanVienId } },
    });
    await ghiLog(tx, noiDungGiaoBanId, session.maNV, "XOA_NGUOI_XU_LY", {
      truongDuocSua: "nguoiXuLy",
      giaTriCu: nhanVienId,
    });
  });
}
