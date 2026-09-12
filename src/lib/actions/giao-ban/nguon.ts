// ĐÍCH: src/lib/actions/giao-ban/nguon.ts
//
// ĐIỂM TÍCH HỢP CHO MODULE NHIỆM VỤ / KẾ HOẠCH PHÒNG (AI khác đang làm song song):
// Gắn nút "Chuyển thành nội dung giao ban" ở trang chi tiết Nhiệm vụ / Kế hoạch phòng, gọi thẳng
// 2 hàm dưới đây — không cần biết gì thêm về schema Giao ban. Cả 2 đều tự kiểm tra quyền + chống
// trùng theo đúng mục 22 đặc tả (không cho tạo mới nếu đã có 1 bản ghi "đang sống" từ nguồn đó).
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { MucDoUuTienGiaoBan } from "@prisma/client";
import {
  isAdminHoacLanhDaoPhong,
  ghiLog,
  timNoiDungGiaoBanDangSongTuNhiemVu,
  timNoiDungGiaoBanDangSongTuKeHoach,
} from "./helpers";

// Kiểm tra nhanh (không throw) — module Nhiệm vụ dùng để ẩn/hiện nút hoặc hiển thị badge "Đã đưa
// vào Giao ban tuần X" thay vì nút "Chuyển thành nội dung giao ban".
export async function kiemTraDaCoGiaoBanDangSong(loai: "NHIEM_VU" | "KE_HOACH", nguonId: number) {
  const dangSong =
    loai === "NHIEM_VU"
      ? await timNoiDungGiaoBanDangSongTuNhiemVu(nguonId)
      : await timNoiDungGiaoBanDangSongTuKeHoach(nguonId);
  return dangSong
    ? { daCo: true as const, noiDungGiaoBanId: dangSong.id, cuocHopGiaoBanId: dangSong.cuocHopGiaoBanId }
    : { daCo: false as const };
}

// Mục 7 — Chuyển Nhiệm vụ thành nội dung giao ban.
export async function chuyenNhiemVuThanhGiaoBan(input: {
  nhiemVuId: number;
  cuocHopGiaoBanId: number;
  phongXuLyId: string;
  nguoiXuLyIds: string[];
  hanHoanThanh: Date;
  mucDoUuTien: MucDoUuTienGiaoBan;
}) {
  const session = await requireSession();

  // 1. Kiểm tra quyền
  if (!isAdminHoacLanhDaoPhong(session, input.phongXuLyId)) {
    throw new Error("Bạn không có quyền chuyển nội dung cho phòng này.");
  }

  // 2. Kiểm tra cuộc họp đang mở
  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id: input.cuocHopGiaoBanId } });
  if (cuocHop.trangThai !== "DANG_MO") throw new Error("Cuộc giao ban đích đã chốt, không thể thêm nội dung.");

  // 3. Kiểm tra nguồn tồn tại + lấy nội dung để sao chép
  const nhiemVu = await prisma.nhiemVu.findUniqueOrThrow({
    where: { id: input.nhiemVuId },
    select: { id: true, tieuDe: true, noiDung: true },
  });

  // 4. Kiểm tra đã có nội dung đang sống hay chưa (mục 22, 37.18)
  const dangSong = await timNoiDungGiaoBanDangSongTuNhiemVu(input.nhiemVuId);
  if (dangSong) {
    throw new Error(
      `Nhiệm vụ này đã có nội dung giao ban đang được theo dõi (ID ${dangSong.id}), không thể tạo chuỗi mới.`
    );
  }

  // Người xử lý phải thuộc đúng phòng xử lý (điều chỉnh đã chốt).
  if (input.nguoiXuLyIds.length > 0) {
    const soDungPhong = await prisma.nhanVien.count({
      where: { maNV: { in: input.nguoiXuLyIds }, maPhong: input.phongXuLyId },
    });
    if (soDungPhong !== input.nguoiXuLyIds.length) {
      throw new Error("Người xử lý phải thuộc đúng phòng xử lý đã chọn.");
    }
  }

  return prisma.$transaction(async (tx) => {
    // 5. Tạo NoiDungGiaoBan
    const row = await tx.noiDungGiaoBan.create({
      data: {
        cuocHopGiaoBanId: input.cuocHopGiaoBanId,
        noiDung: nhiemVu.noiDung || nhiemVu.tieuDe,
        nhiemVuId: input.nhiemVuId,
        phongXuLyId: input.phongXuLyId,
        hanHoanThanh: input.hanHoanThanh,
        mucDoUuTien: input.mucDoUuTien,
        createdById: session.maNV,
        // 6. Tạo người xử lý
        nguoiXuLys: { create: input.nguoiXuLyIds.map((maNV) => ({ nhanVienId: maNV })) },
      },
    });
    // 7. Ghi log
    await ghiLog(tx, row.id, session.maNV, "CHUYEN_TU_NHIEM_VU");
    return row;
  });
}

// Mục 8 — Chuyển Kế hoạch phòng thành nội dung giao ban. Cùng cấu trúc với trên.
export async function chuyenKeHoachThanhGiaoBan(input: {
  keHoachTuanId: number;
  cuocHopGiaoBanId: number;
  phongXuLyId: string;
  nguoiXuLyIds: string[];
  hanHoanThanh: Date;
  mucDoUuTien: MucDoUuTienGiaoBan;
}) {
  const session = await requireSession();

  if (!isAdminHoacLanhDaoPhong(session, input.phongXuLyId)) {
    throw new Error("Bạn không có quyền chuyển nội dung cho phòng này.");
  }

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id: input.cuocHopGiaoBanId } });
  if (cuocHop.trangThai !== "DANG_MO") throw new Error("Cuộc giao ban đích đã chốt, không thể thêm nội dung.");

  const keHoach = await prisma.keHoachTuan.findUniqueOrThrow({
    where: { id: input.keHoachTuanId },
    select: { id: true, noiDung: true },
  });

  const dangSong = await timNoiDungGiaoBanDangSongTuKeHoach(input.keHoachTuanId);
  if (dangSong) {
    throw new Error(
      `Kế hoạch phòng này đã có nội dung giao ban đang được theo dõi (ID ${dangSong.id}), không thể tạo chuỗi mới.`
    );
  }

  if (input.nguoiXuLyIds.length > 0) {
    const soDungPhong = await prisma.nhanVien.count({
      where: { maNV: { in: input.nguoiXuLyIds }, maPhong: input.phongXuLyId },
    });
    if (soDungPhong !== input.nguoiXuLyIds.length) {
      throw new Error("Người xử lý phải thuộc đúng phòng xử lý đã chọn.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.noiDungGiaoBan.create({
      data: {
        cuocHopGiaoBanId: input.cuocHopGiaoBanId,
        noiDung: keHoach.noiDung,
        keHoachTuanId: input.keHoachTuanId,
        phongXuLyId: input.phongXuLyId,
        hanHoanThanh: input.hanHoanThanh,
        mucDoUuTien: input.mucDoUuTien,
        createdById: session.maNV,
        nguoiXuLys: { create: input.nguoiXuLyIds.map((maNV) => ({ nhanVienId: maNV })) },
      },
    });
    await ghiLog(tx, row.id, session.maNV, "CHUYEN_TU_KE_HOACH_PHONG");
    return row;
  });
}
