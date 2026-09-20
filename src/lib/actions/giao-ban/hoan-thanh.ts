// ĐÍCH: src/lib/actions/giao-ban/hoan-thanh.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import {
  tinhQuyenNoiDung,
  ghiLog,
  dongBoNguocChuoiTuan,
  timNoiDungGiaoBanDangSongTuNhiemVu,
  timNoiDungGiaoBanDangSongTuKeHoach,
} from "./helpers";

export type KetQuaHoanThanh = { thanhCong: true } | { thanhCong: false; lyDo: string };

// ============================================================================================
// ĐƠN LẺ (giữ lại để chỗ khác còn dùng, VD dongBoHoanThanhTuNguon) — checkbox trên bảng giờ dùng
// capNhatHoanThanhHangLoat() bên dưới (hỗ trợ debounce + gộp batch).
// ============================================================================================

export async function hoanThanhNoiDung(id: number, ghiChu?: string): Promise<KetQuaHoanThanh> {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({ where: { id }, include: { cuocHopGiaoBan: true } });
  if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") throw new Error("Cuộc giao ban đã chốt, không thể thao tác.");
  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.danhDauHoanThanh) throw new Error("Bạn không có quyền đánh dấu hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const ketQua = await tx.noiDungGiaoBan.updateMany({
      where: { id, daHoanThanh: false, daKetThuc: false },
      data: {
        daHoanThanh: true, nguoiHoanThanhId: session.maNV, thoiGianHoanThanh: new Date(),
        daKetThuc: true, deNghiChuyenTuan: false, ...(ghiChu !== undefined ? { ghiChu } : {}),
      },
    });
    if (ketQua.count === 0) {
      return { thanhCong: false as const, lyDo: "Nội dung này vừa được người khác đánh dấu hoàn thành." };
    }
    await ghiLog(tx, id, session.maNV, "HOAN_THANH");
    await dongBoNguocChuoiTuan(tx, id, true);
    return { thanhCong: true as const };
  });
}

export async function boHoanThanh(id: number): Promise<KetQuaHoanThanh> {
  const session = await requireSession();
  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({ where: { id }, include: { cuocHopGiaoBan: true } });
  if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") throw new Error("Cuộc giao ban đã chốt, không thể bỏ hoàn thành.");
  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.danhDauHoanThanh) throw new Error("Bạn không có quyền bỏ hoàn thành.");

  return prisma.$transaction(async (tx) => {
    const ketQua = await tx.noiDungGiaoBan.updateMany({
      where: { id, daHoanThanh: true },
      data: { daHoanThanh: false, nguoiHoanThanhId: null, thoiGianHoanThanh: null, daKetThuc: false },
    });
    if (ketQua.count === 0) return { thanhCong: false as const, lyDo: "Nội dung này vừa được người khác cập nhật." };
    await ghiLog(tx, id, session.maNV, "BO_HOAN_THANH");
    await dongBoNguocChuoiTuan(tx, id, false);
    return { thanhCong: true as const };
  });
}

// ============================================================================================
// HÀNG LOẠT — dùng cho checkbox optimistic + debounce gộp batch trên bảng. Xử lý TỪNG dòng độc
// lập (không chung 1 transaction cho cả batch) để 1 dòng lỗi không làm hỏng các dòng còn lại.
// ============================================================================================

export type MucCanCapNhat = { id: number; daHoanThanh: boolean };
export type KetQuaHoanThanhHangLoat = {
  thanhCongIds: number[];
  thatBai: { id: number; noiDung: string; lyDo: string }[];
};

export async function capNhatHoanThanhHangLoat(danhSach: MucCanCapNhat[]): Promise<KetQuaHoanThanhHangLoat> {
  const session = await requireSession();
  const thanhCongIds: number[] = [];
  const thatBai: { id: number; noiDung: string; lyDo: string }[] = [];

  for (const muc of danhSach) {
    try {
      const row = await prisma.noiDungGiaoBan.findUnique({
        where: { id: muc.id },
        include: { cuocHopGiaoBan: true },
      });
      if (!row) {
        thatBai.push({ id: muc.id, noiDung: "?", lyDo: "Không tìm thấy nội dung (có thể đã bị xoá)." });
        continue;
      }
      if (row.cuocHopGiaoBan.trangThai !== "DANG_MO") {
        thatBai.push({ id: muc.id, noiDung: row.noiDung, lyDo: "Cuộc giao ban đã chốt." });
        continue;
      }
      const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
      if (!quyen.danhDauHoanThanh) {
        thatBai.push({ id: muc.id, noiDung: row.noiDung, lyDo: "Bạn không có quyền cho phòng này." });
        continue;
      }

      const thanhCong = await prisma.$transaction(async (tx) => {
        const ketQua = muc.daHoanThanh
          ? await tx.noiDungGiaoBan.updateMany({
              where: { id: muc.id, daHoanThanh: false, daKetThuc: false },
              data: { daHoanThanh: true, nguoiHoanThanhId: session.maNV, thoiGianHoanThanh: new Date(), daKetThuc: true, deNghiChuyenTuan: false },
            })
          : await tx.noiDungGiaoBan.updateMany({
              where: { id: muc.id, daHoanThanh: true },
              data: { daHoanThanh: false, nguoiHoanThanhId: null, thoiGianHoanThanh: null, daKetThuc: false },
            });
        if (ketQua.count === 0) return false;
        await ghiLog(tx, muc.id, session.maNV, muc.daHoanThanh ? "HOAN_THANH" : "BO_HOAN_THANH");
        await dongBoNguocChuoiTuan(tx, muc.id, muc.daHoanThanh);
        return true;
      });

      if (thanhCong) thanhCongIds.push(muc.id);
      else thatBai.push({ id: muc.id, noiDung: row.noiDung, lyDo: "Đã có người khác cập nhật trước đó." });
    } catch (e) {
      thatBai.push({ id: muc.id, noiDung: "?", lyDo: e instanceof Error ? e.message : "Lỗi không xác định." });
    }
  }

  return { thanhCongIds, thatBai };
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
    await dongBoNguocChuoiTuan(tx, dangSong.id, true);
    return tx.noiDungGiaoBan.findUniqueOrThrow({ where: { id: dangSong.id } });
  });
}
