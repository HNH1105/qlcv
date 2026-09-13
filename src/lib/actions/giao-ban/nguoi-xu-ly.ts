// ĐÍCH: src/lib/actions/giao-ban/nguoi-xu-ly.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { kiemTraKhoa, tinhQuyenNoiDung, ghiLog } from "./helpers";

// THAY THẾ TOÀN BỘ danh sách người xử lý bằng danh sách mới trong 1 lần gọi duy nhất — dùng cho
// modal "Sửa nội dung" với nút Lưu tường minh (KHÔNG tự lưu theo từng click chọn/bỏ chọn như
// trước đây, vì đó chính là nguyên nhân gây lỗi khi nhấp ra ngoài dropdown: mỗi lần toggle bắn 1
// request riêng, dễ chồng chéo/race giữa các request khi người dùng thao tác nhanh).
export async function capNhatNguoiXuLy(noiDungGiaoBanId: number, nhanVienIds: string[]) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id: noiDungGiaoBanId },
    include: { cuocHopGiaoBan: true, nguoiXuLys: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaNoiDung) throw new Error("Bạn không có quyền sửa người xử lý.");

  const idsHopLe = Array.from(new Set(nhanVienIds));
  if (idsHopLe.length > 0) {
    const soDungPhong = await prisma.nhanVien.count({
      where: { maNV: { in: idsHopLe }, maPhong: row.phongXuLyId },
    });
    if (soDungPhong !== idsHopLe.length) {
      throw new Error("Người xử lý phải thuộc đúng phòng xử lý đã chọn.");
    }
  }

  const truoc = row.nguoiXuLys.map((x) => x.nhanVienId);
  const themMoi = idsHopLe.filter((id) => !truoc.includes(id));
  const boBot = truoc.filter((id) => !idsHopLe.includes(id));

  if (themMoi.length === 0 && boBot.length === 0) return { daDoi: false as const };

  return prisma.$transaction(async (tx) => {
    if (boBot.length > 0) {
      await tx.noiDungGiaoBanNguoiXuLy.deleteMany({
        where: { noiDungGiaoBanId, nhanVienId: { in: boBot } },
      });
    }
    if (themMoi.length > 0) {
      await tx.noiDungGiaoBanNguoiXuLy.createMany({
        data: themMoi.map((maNV) => ({ noiDungGiaoBanId, nhanVienId: maNV })),
      });
    }
    // Ghi 1 log tổng hợp duy nhất thay vì N log riêng lẻ cho từng người.
    await ghiLog(tx, noiDungGiaoBanId, session.maNV, "THEM_NGUOI_XU_LY", {
      truongDuocSua: "nguoiXuLy",
      giaTriCu: truoc.join(", ") || "(trống)",
      giaTriMoi: idsHopLe.join(", ") || "(trống)",
    });
    return { daDoi: true as const };
  });
}
