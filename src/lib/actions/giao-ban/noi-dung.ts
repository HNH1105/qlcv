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
  const session = await requireSession();

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id } });
  const xemToanBo = session.isAdmin || session.quyen === "LANHDAODONVI";

  const rows = await prisma.noiDungGiaoBan.findMany({
    where: {
      cuocHopGiaoBanId: id,
      isDeleted: false,
      ...(xemToanBo ? {} : { phongXuLyId: session.maPhong }),
    },
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
    xemToanBo,
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
// CẬP NHẬT NỘI DUNG — mỗi field sửa ghi 1 log riêng (mục 29). Chỉ nhận field nào thực sự được
// truyền lên (partial update).
// ============================================================================================

export async function capNhatNoiDungGiaoBan(
  id: number,
  patch: {
    noiDung?: string;
    phongXuLyId?: string;
    hanHoanThanh?: Date;
    mucDoUuTien?: MucDoUuTienGiaoBan;
    ghiChu?: string | null;
  }
) {
  const session = await requireSession();

  const row = await prisma.noiDungGiaoBan.findUniqueOrThrow({
    where: { id },
    include: { cuocHopGiaoBan: true },
  });
  kiemTraKhoa(row.cuocHopGiaoBan.trangThai, row.daKetThuc);

  const quyen = tinhQuyenNoiDung(session, row.phongXuLyId);
  const chiSuaGhiChu =
    patch.noiDung === undefined &&
    patch.phongXuLyId === undefined &&
    patch.hanHoanThanh === undefined &&
    patch.mucDoUuTien === undefined;

  if (chiSuaGhiChu) {
    if (!quyen.capNhatGhiChuVaHoanThanh) throw new Error("Bạn không có quyền cập nhật ghi chú.");
  } else if (!quyen.suaThongTin) {
    throw new Error("Bạn không có quyền sửa thông tin nội dung này.");
  }

  if (patch.phongXuLyId && patch.phongXuLyId !== row.phongXuLyId) {
    if (!isAdminHoacLanhDaoPhong(session, patch.phongXuLyId)) {
      throw new Error("Bạn không có quyền chuyển nội dung sang phòng đích này.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const data: Prisma.NoiDungGiaoBanUpdateInput = {};
    if (patch.noiDung !== undefined) data.noiDung = patch.noiDung;
    if (patch.phongXuLyId !== undefined) data.phongXuLy = { connect: { maPhong: patch.phongXuLyId } };
    if (patch.hanHoanThanh !== undefined) data.hanHoanThanh = patch.hanHoanThanh;
    if (patch.mucDoUuTien !== undefined) data.mucDoUuTien = patch.mucDoUuTien;
    if (patch.ghiChu !== undefined) data.ghiChu = patch.ghiChu;

    const updated = await tx.noiDungGiaoBan.update({ where: { id }, data });

    if (patch.noiDung !== undefined && patch.noiDung !== row.noiDung) {
      await ghiLog(tx, id, session.maNV, "CAP_NHAT_NOI_DUNG", {
        truongDuocSua: "noiDung",
        giaTriCu: row.noiDung,
        giaTriMoi: patch.noiDung,
      });
    }
    if (patch.phongXuLyId !== undefined && patch.phongXuLyId !== row.phongXuLyId) {
      await ghiLog(tx, id, session.maNV, "SUA_PHONG_XU_LY", {
        truongDuocSua: "phongXuLyId",
        giaTriCu: row.phongXuLyId,
        giaTriMoi: patch.phongXuLyId,
      });
    }
    if (patch.hanHoanThanh !== undefined && patch.hanHoanThanh.getTime() !== row.hanHoanThanh.getTime()) {
      await ghiLog(tx, id, session.maNV, "SUA_HAN_HOAN_THANH", {
        truongDuocSua: "hanHoanThanh",
        giaTriCu: row.hanHoanThanh.toISOString(),
        giaTriMoi: patch.hanHoanThanh.toISOString(),
      });
    }
    if (patch.mucDoUuTien !== undefined && patch.mucDoUuTien !== row.mucDoUuTien) {
      await ghiLog(tx, id, session.maNV, "SUA_MUC_DO_UU_TIEN", {
        truongDuocSua: "mucDoUuTien",
        giaTriCu: row.mucDoUuTien,
        giaTriMoi: patch.mucDoUuTien,
      });
    }
    if (patch.ghiChu !== undefined && patch.ghiChu !== row.ghiChu) {
      await ghiLog(tx, id, session.maNV, "CAP_NHAT_GHI_CHU", {
        truongDuocSua: "ghiChu",
        giaTriCu: row.ghiChu,
        giaTriMoi: patch.ghiChu,
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
