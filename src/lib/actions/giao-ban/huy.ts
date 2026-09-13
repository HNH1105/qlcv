// ĐÍCH: src/lib/actions/giao-ban/huy.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { kiemTraKhoa, tinhQuyenNoiDung, ghiLog } from "./helpers";

export async function huyKhongTheoDoi(id: number, lyDo?: string) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  // Dùng đúng quyền loaiKhoiDanhSach (Admin/LĐ phòng đúng phòng) — tách riêng khỏi suaNoiDung để
  // rõ ràng theo yêu cầu "đừng gộp chung", dù điều kiện tính hiện đang giống nhau.
  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.loaiKhoiDanhSach) throw new Error("Bạn không có quyền hủy/không theo dõi nội dung này.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.noiDungGiaoBan.update({
      where: { id },
      data: {
        daHoanThanh: false,
        daKetThuc: true,
        deNghiChuyenTuan: false,
        ...(lyDo ? { ghiChu: lyDo } : {}),
      },
    });
    await ghiLog(tx, id, session.maNV, "HUY_KHONG_THEO_DOI", lyDo ? { giaTriMoi: lyDo } : undefined);
    return updated;
  });
}
