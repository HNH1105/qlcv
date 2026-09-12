// ĐÍCH: src/lib/actions/giao-ban/hoan-thanh.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { kiemTraKhoa, tinhQuyenNoiDung, ghiLog, timNoiDungGiaoBanDangSongTuNhiemVu, timNoiDungGiaoBanDangSongTuKeHoach } from "./helpers";

export async function hoanThanhNoiDung(id: number, ghiChu?: string) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.capNhatGhiChuVaHoanThanh) throw new Error("Bạn không có quyền đánh dấu hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.noiDungGiaoBan.update({
      where: { id },
      data: {
        daHoanThanh: true,
        nguoiHoanThanhId: session.maNV,
        thoiGianHoanThanh: new Date(),
        daKetThuc: true,
        deNghiChuyenTuan: false,
        ...(ghiChu !== undefined ? { ghiChu } : {}),
      },
    });
    await ghiLog(tx, id, session.maNV, "HOAN_THANH");
    return updated;
  });
}

export async function boHoanThanh(id: number) {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  // Không dùng kiemTraKhoa() thẳng vì bản ghi vừa hoàn thành sẽ có daKetThuc=true — chỉ cần chặn
  // theo trạng thái cuộc họp (mục 15).
  if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể bỏ hoàn thành.");
  }

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.capNhatGhiChuVaHoanThanh) throw new Error("Bạn không có quyền bỏ hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.noiDungGiaoBan.update({
      where: { id },
      data: {
        daHoanThanh: false,
        nguoiHoanThanhId: null,
        thoiGianHoanThanh: null,
        daKetThuc: false,
      },
    });
    await ghiLog(tx, id, session.maNV, "BO_HOAN_THANH");
    return updated;
  });
}

// ============================================================================================
// ĐỒNG BỘ MỘT CHIỀU TỪ NGUỒN (mục 16, 17, 18, 37.22-24) — ĐIỂM TÍCH HỢP CHO MODULE KHÁC.
//
// AI đang làm Nhiệm vụ/Nhắc việc: hàm này KHÔNG cần biết caller là ai, không yêu cầu session, vì
// đây là hành động HỆ THỐNG chạy kèm theo lúc Nhiệm vụ/Kế hoạch phòng được đánh dấu hoàn thành ở
// module của bạn — không phải người dùng bấm trực tiếp trên giao diện Giao ban. Gọi hàm này NGAY
// SAU KHI bạn đã commit thành công trạng thái hoàn thành ở NhiemVu/KeHoachTuan (best-effort, có
// thể đặt trong cùng transaction Prisma của bạn nếu dùng chung 1 PrismaClient, hoặc gọi rời — nếu
// gọi rời và lỗi, không rollback bên Nhiệm vụ, chỉ cần log lỗi vì đây là tác vụ PHỤ THUỘC MỘT
// CHIỀU, không phải nguồn sự thật).
//
// Cách dùng:
//   import { dongBoHoanThanhTuNguon } from "@/lib/actions/giao-ban/hoan-thanh";
//   await dongBoHoanThanhTuNguon({ loai: "NHIEM_VU", nguonId: nhiemVu.id, nguoiHoanThanhId, thoiGianHoanThanh });
//
// Nếu KHÔNG có nội dung giao ban đang sống ứng với nguồn đó thì hàm này KHÔNG làm gì cả (trả về
// null) — im lặng bỏ qua, không throw, không mở lại bản ghi cũ (mục 17, 23).
// ============================================================================================

export async function dongBoHoanThanhTuNguon(input: {
  loai: "NHIEM_VU" | "KE_HOACH";
  nguonId: number;
  nguoiHoanThanhId: string;
  thoiGianHoanThanh?: Date;
}) {
  const dangSong =
    input.loai === "NHIEM_VU"
      ? await timNoiDungGiaoBanDangSongTuNhiemVu(input.nguonId)
      : await timNoiDungGiaoBanDangSongTuKeHoach(input.nguonId);

  if (!dangSong) return null; // không có bản ghi đang theo dõi -> không làm gì, không mở lại bản ghi cũ

  return prisma.$transaction(async (tx) => {
    // KHÔNG đụng vào ghiChu — bảo toàn ghi chú người dùng đã nhập tại giao ban (mục 18).
    const updated = await tx.noiDungGiaoBan.update({
      where: { id: dangSong.id },
      data: {
        daHoanThanh: true,
        nguoiHoanThanhId: input.nguoiHoanThanhId,
        thoiGianHoanThanh: input.thoiGianHoanThanh ?? new Date(),
        daKetThuc: true,
        deNghiChuyenTuan: false,
      },
    });
    await ghiLog(tx, dangSong.id, input.nguoiHoanThanhId, "DONG_BO_HOAN_THANH");
    return updated;
  });
}
