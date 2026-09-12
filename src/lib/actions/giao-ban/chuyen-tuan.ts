// ĐÍCH: src/lib/actions/giao-ban/chuyen-tuan.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { kiemTraKhoa, tinhQuyenNoiDung, ghiLog } from "./helpers";

export async function deNghiChuyenTuan(id: number) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaThongTin) throw new Error("Bạn không có quyền đề nghị chuyển tuần.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.noiDungGiaoBan.update({
      where: { id },
      data: { deNghiChuyenTuan: true },
    });
    await ghiLog(tx, id, session.maNV, "CHUYEN_TUAN_SAU");
    return updated;
  });
}

// Chỉ Admin. Tạo bản ghi mới ở cuộc họp đích, kết thúc bản ghi cũ, copy field theo mục 20.
export async function xacNhanChuyenTuan(noiDungCuId: number, cuocHopGiaoBanMoiId: number) {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được xác nhận chuyển tuần.");

  const cuCu = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id: noiDungCuId },
    include: { nguoiXuLys: true, duocChuyenThanh: true },
  });
  if (!cuCu.deNghiChuyenTuan) throw new Error("Nội dung này chưa được đề nghị chuyển tuần.");
  if (cuCu.duocChuyenThanh) throw new Error("Nội dung này đã được chuyển tuần trước đó.");

  const cuocHopMoi = await prisma.cuocHopGiaoBan.findUniqueOrThrow({
    where: { id: cuocHopGiaoBanMoiId },
  });
  if (cuocHopMoi.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đích chưa mở, không thể chuyển tuần vào đây.");
  }

  return prisma.$transaction(async (tx) => {
    const moi = await tx.noiDungGiaoBan.create({
      data: {
        cuocHopGiaoBanId: cuocHopGiaoBanMoiId,
        noiDung: cuCu.noiDung,
        // Giữ nguyên nhiemVuId/keHoachTuanId + chuoiNoiDungId trên mọi bản ghi trong chuỗi (mục 6, 20)
        nhiemVuId: cuCu.nhiemVuId,
        keHoachTuanId: cuCu.keHoachTuanId,
        chuoiNoiDungId: cuCu.chuoiNoiDungId,
        nguonNoiDungGiaoBanId: cuCu.id,
        phongXuLyId: cuCu.phongXuLyId,
        hanHoanThanh: cuCu.hanHoanThanh,
        mucDoUuTien: cuCu.mucDoUuTien,
        createdById: session.maNV,
        nguoiXuLys: { create: cuCu.nguoiXuLys.map((nx) => ({ nhanVienId: nx.nhanVienId })) },
      },
    });

    await tx.noiDungGiaoBan.update({
      where: { id: cuCu.id },
      data: { daKetThuc: true, deNghiChuyenTuan: false },
    });

    await ghiLog(tx, moi.id, session.maNV, "XAC_NHAN_CHUYEN_TUAN", {
      truongDuocSua: "nguonNoiDungGiaoBanId",
      giaTriMoi: String(cuCu.id),
    });

    return moi;
  });
}

// Danh sách các nội dung đang chờ Admin xác nhận chuyển tuần — dùng cho trang xác nhận riêng.
export async function getDanhSachChoXacNhanChuyenTuan() {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới xem được danh sách này.");

  return prisma.noiDungGiaoBan.findMany({
    where: { deNghiChuyenTuan: true, daKetThuc: false, isDeleted: false },
    include: {
      cuocHopGiaoBan: { select: { id: true, nam: true, tuan: true } },
      phongXuLy: { select: { tenPhong: true } },
    },
    orderBy: { id: "asc" },
  });
}
