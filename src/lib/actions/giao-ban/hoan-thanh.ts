// ĐÍCH: src/lib/actions/giao-ban/hoan-thanh.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { tinhQuyenNoiDung, ghiLog, timNoiDungGiaoBanDangSongTuNhiemVu, timNoiDungGiaoBanDangSongTuKeHoach } from "./helpers";

// Trả về kết quả có cờ thành công thay vì throw riêng cho trường hợp tranh chấp — file "use server"
// không được export class, và quan trọng hơn: lỗi throw từ Server Action khi tới Client Component
// bị Next.js chuẩn hoá lại thành Error thường, KHÔNG giữ được class con (instanceof sẽ luôn sai).
// Trả object có field phân biệt là cách an toàn duy nhất để client biết chính xác nguyên nhân.
export type KetQuaHoanThanh =
  | { thanhCong: true }
  | { thanhCong: false; lyDo: string };

// ============================================================================================
// CHỐNG 2 NGƯỜI CÙNG CHECK 1 LÚC (race condition): dùng `updateMany` với where CÓ ĐIỀU KIỆN
// daHoanThanh — Postgres đảm bảo chỉ 1 trong 2 request đồng thời khớp điều kiện và update được;
// request còn lại nhận count=0 dù chỉ cách nhau vài mili-giây (row lock thật của DB, không so
// sánh timestamp ở tầng ứng dụng).
// ============================================================================================

export async function hoanThanhNoiDung(id: number, ghiChu?: string): Promise<KetQuaHoanThanh> {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể thao tác.");
  }

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.danhDauHoanThanh) throw new Error("Bạn không có quyền đánh dấu hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const ketQua = await tx.noiDungGiaoBan.updateMany({
      where: { id, daHoanThanh: false, daKetThuc: false },
      data: {
        daHoanThanh: true,
        nguoiHoanThanhId: session.maNV,
        thoiGianHoanThanh: new Date(),
        daKetThuc: true,
        deNghiChuyenTuan: false,
        ...(ghiChu !== undefined ? { ghiChu } : {}),
      },
    });

    if (ketQua.count === 0) {
      return {
        thanhCong: false as const,
        lyDo: "Nội dung này vừa được người khác đánh dấu hoàn thành (hoặc đã thay đổi trạng thái).",
      };
    }

    await ghiLog(tx, id, session.maNV, "HOAN_THANH");
    return { thanhCong: true as const };
  });
}

export async function boHoanThanh(id: number): Promise<KetQuaHoanThanh> {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể bỏ hoàn thành.");
  }

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.danhDauHoanThanh) throw new Error("Bạn không có quyền bỏ hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const ketQua = await tx.noiDungGiaoBan.updateMany({
      where: { id, daHoanThanh: true },
      data: {
        daHoanThanh: false,
        nguoiHoanThanhId: null,
        thoiGianHoanThanh: null,
        daKetThuc: false,
      },
    });

    if (ketQua.count === 0) {
      return { thanhCong: false as const, lyDo: "Nội dung này vừa được người khác cập nhật." };
    }

    await ghiLog(tx, id, session.maNV, "BO_HOAN_THANH");
    return { thanhCong: true as const };
  });
}

// ============================================================================================
// ĐỒNG BỘ MỘT CHIỀU TỪ NGUỒN — điểm tích hợp cho module Nhiệm vụ/Kế hoạch (AI khác).
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

  if (!dangSong) return null;

  return prisma.$transaction(async (tx) => {
    const ketQua = await tx.noiDungGiaoBan.updateMany({
      where: { id: dangSong.id, daHoanThanh: false, daKetThuc: false },
      data: {
        daHoanThanh: true,
        nguoiHoanThanhId: input.nguoiHoanThanhId,
        thoiGianHoanThanh: input.thoiGianHoanThanh ?? new Date(),
        daKetThuc: true,
        deNghiChuyenTuan: false,
      },
    });
    if (ketQua.count === 0) return null;
    await ghiLog(tx, dangSong.id, input.nguoiHoanThanhId, "DONG_BO_HOAN_THANH");
    return tx.noiDungGiaoBan.findUniqueOrThrow({ where: { id: dangSong.id } });
  });
}
