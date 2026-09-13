// ĐÍCH: src/lib/actions/giao-ban/noi-dung.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { MucDoUuTienGiaoBan, Prisma } from "@prisma/client";
import { kiemTraKhoa, tinhQuyenNoiDung, isAdminHoacLanhDaoPhong, ghiLog } from "./helpers";

// ============================================================================================
// CHI TIẾT CHECKLIST — lọc theo quyền (mục 12), kèm thống kê (mục 31)
// ============================================================================================

export async function getCuocHopGiaoBanChiTiet(id: number) {
  await requireSession();

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id } });

  // SỬA: mọi người (kể cả chuyên viên) đều xem TOÀN BỘ checklist — không lọc theo phòng nữa.
  // Phân quyền thật sự nằm ở HÀNH ĐỘNG (sửa/hoàn thành), xem chi tiết ở helpers.ts.
  const rows = await prisma.noiDungGiaoBan.findMany({
    where: { cuocHopGiaoBanId: id, isDeleted: false },
    orderBy: { id: "asc" },
    include: {
      phongXuLy: { select: { maPhong: true, tenPhong: true } },
      nguoiHoanThanh: { select: { hoTen: true } },
      createdBy: { select: { hoTen: true } },
      nguoiXuLys: { include: { nhanVien: { select: { maNV: true, hoTen: true } } } },
      nhiemVu: { select: { id: true, tieuDe: true } },
      keHoachTuan: { select: { id: true, noiDung: true } },
      // Quan hệ tự tham chiếu 1-1: KHÔNG có scalar FK riêng ở phía này — include rồi kiểm tra
      // khác null để biết bản ghi này đã "chuyển tuần thành" bản ghi mới hay chưa.
      duocChuyenThanh: { select: { id: true } },
    },
  });

  const tong = rows.length;
  const daHoanThanh = rows.filter((r) => r.daHoanThanh).length;
  const dangXuLy = rows.filter((r) => !r.daKetThuc).length;
  const daChuyenTuan = rows.filter((r) => r.daKetThuc && !r.daHoanThanh && r.duocChuyenThanh != null).length;
  const daHuy = rows.filter((r) => r.daKetThuc && !r.daHoanThanh && r.duocChuyenThanh == null).length;

  return {
    cuocHop,
    rows,
    thongKe: {
      tong,
      daHoanThanh,
      dangXuLy,
      daChuyenTuan,
      daHuy,
      tyLeHoanThanh: tong === 0 ? 0 : Math.round((daHoanThanh / tong) * 100),
    },
  };
}

// ============================================================================================
// THÊM NỘI DUNG — NHẬP TRỰC TIẾP (mục 9). Nguồn Nhiệm vụ/Kế hoạch phòng: xem nguon.ts.
// ============================================================================================

export async function themNoiDungTrucTiep(input: {
  cuocHopGiaoBanId: number;
  noiDung: string;
  phongXuLyId: string;
  hanHoanThanh: Date;
  mucDoUuTien: MucDoUuTienGiaoBan;
  ghiChu?: string;
  nguoiXuLyIds: string[];
}) {
  const session = await requireSession();

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({
    where: { id: input.cuocHopGiaoBanId },
  });
  if (cuocHop.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể thêm nội dung.");
  }
  if (!isAdminHoacLanhDaoPhong(session, input.phongXuLyId)) {
    throw new Error("Bạn không có quyền thêm nội dung cho phòng này.");
  }
  if (!input.noiDung.trim()) throw new Error("Vui lòng nhập nội dung.");

  // Người xử lý phải thuộc đúng phòng xử lý đã chọn (điều chỉnh đã chốt với người dùng).
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
        noiDung: input.noiDung,
        phongXuLyId: input.phongXuLyId,
        hanHoanThanh: input.hanHoanThanh,
        mucDoUuTien: input.mucDoUuTien,
        ghiChu: input.ghiChu || null,
        createdById: session.maNV,
        nguoiXuLys: { create: input.nguoiXuLyIds.map((maNV) => ({ nhanVienId: maNV })) },
      },
    });
    await ghiLog(tx, row.id, session.maNV, "TAO_NOI_DUNG");
    return row;
  });
}

// ============================================================================================
// SỬA NỘI DUNG — Nội dung / Hạn hoàn thành / Mức độ ưu tiên (KHÔNG gồm ghi chú — xem
// capNhatGhiChuGiaoBan riêng, và KHÔNG gồm người xử lý — xem capNhatNguoiXuLy() ở nguoi-xu-ly.ts).
// Tách hẳn 3 hành động thành 3 action riêng theo đúng yêu cầu "đừng gộp chung", mỗi cái ứng với 1
// modal riêng ở giao diện.
// ============================================================================================

export async function suaNoiDungGiaoBan(
  id: number,
  patch: { noiDung: string; hanHoanThanh: Date; mucDoUuTien: MucDoUuTienGiaoBan; phongXuLyId?: string }
) {
  const session = await requireSession();

  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.suaNoiDung) throw new Error("Bạn không có quyền sửa nội dung này.");

  if (patch.phongXuLyId && patch.phongXuLyId !== row.phongXuLyId) {
    if (!isAdminHoacLanhDaoPhong(session, patch.phongXuLyId)) {
      throw new Error("Bạn không có quyền chuyển nội dung sang phòng đích này.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const data: Prisma.NoiDungGiaoBanUpdateInput = {
      noiDung: patch.noiDung,
      hanHoanThanh: patch.hanHoanThanh,
      mucDoUuTien: patch.mucDoUuTien,
    };
    if (patch.phongXuLyId !== undefined) data.phongXuLy = { connect: { maPhong: patch.phongXuLyId } };

    const updated = await tx.noiDungGiaoBan.update({ where: { id }, data });

    if (patch.noiDung !== row.noiDung) {
      await ghiLog(tx, id, session.maNV, "CAP_NHAT_NOI_DUNG", {
        truongDuocSua: "noiDung", giaTriCu: row.noiDung, giaTriMoi: patch.noiDung,
      });
    }
    if (patch.phongXuLyId !== undefined && patch.phongXuLyId !== row.phongXuLyId) {
      await ghiLog(tx, id, session.maNV, "SUA_PHONG_XU_LY", {
        truongDuocSua: "phongXuLyId", giaTriCu: row.phongXuLyId, giaTriMoi: patch.phongXuLyId,
      });
    }
    if (patch.hanHoanThanh.getTime() !== row.hanHoanThanh.getTime()) {
      await ghiLog(tx, id, session.maNV, "SUA_HAN_HOAN_THANH", {
        truongDuocSua: "hanHoanThanh", giaTriCu: row.hanHoanThanh.toISOString(), giaTriMoi: patch.hanHoanThanh.toISOString(),
      });
    }
    if (patch.mucDoUuTien !== row.mucDoUuTien) {
      await ghiLog(tx, id, session.maNV, "SUA_MUC_DO_UU_TIEN", {
        truongDuocSua: "mucDoUuTien", giaTriCu: row.mucDoUuTien, giaTriMoi: patch.mucDoUuTien,
      });
    }

    return updated;
  });
}

// ============================================================================================
// CẬP NHẬT GHI CHÚ — riêng biệt, Admin/LĐ phòng/Chuyên viên đúng phòng đều dùng được.
// ============================================================================================

export async function capNhatGhiChuGiaoBan(id: number, ghiChu: string | null) {
  const session = await requireSession();

  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  if (!quyen.capNhatGhiChu) throw new Error("Bạn không có quyền cập nhật ghi chú.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.noiDungGiaoBan.update({ where: { id }, data: { ghiChu } });
    if (ghiChu !== row.ghiChu) {
      await ghiLog(tx, id, session.maNV, "CAP_NHAT_GHI_CHU", {
        truongDuocSua: "ghiChu", giaTriCu: row.ghiChu, giaTriMoi: ghiChu,
      });
    }
    return updated;
  });
}

// ============================================================================================
// LỊCH SỬ (mục 29) — đọc NoiDungGiaoBanLog, chỉ đọc, không sửa
// ============================================================================================

export async function getLichSuNoiDungGiaoBan(noiDungGiaoBanId: number) {
  await requireSession();
  return prisma.noiDungGiaoBanLog.findMany({
    where: { noiDungGiaoBanId },
    orderBy: { thoiGian: "desc" },
    include: { nguoiThucHien: { select: { hoTen: true } } },
  });
}
