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

  // "Theo quyền được cấp" cho LĐ phòng (mục 13) — hiện chốt bằng suaThongTin (Admin/LĐ phòng đúng
  // phòng). Nếu sau này cần tách quyền huỷ riêng khỏi sửa thông tin, thêm field riêng ở helpers.ts.
  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaThongTin) throw new Error("Bạn không có quyền hủy/không theo dõi nội dung này.");

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
