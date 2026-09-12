// ĐÍCH: src/lib/nhac-viec/nhiem-vu.ts (MỚI)
// File RIÊNG cho tính năng "Nhắc việc" — KHÔNG import/sửa gì từ src/lib/actions/nhiem-vu.ts, viết
// độc lập bằng Prisma trực tiếp. Lý do: có AI khác đang viết song song checklist Giao ban, tách hẳn
// thư mục lib để tránh xung đột khi ráp code 2 bên.
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

const SO_NGAY_SAP_DEN_HAN = 3;

export type NhiemVuNhacViecRow = {
  id: number;
  tieuDe: string;
  tenPhongChuTri: string;
  nguoiXuLyChinh: string | null;
  hanXuLy: Date | null;
  trangThai: string;
};

export type TongQuanXuLyChinh = {
  tong: number; chophancong: number; choduyet: number; dangxuly: number;
  sapdenhan: number; quahan: number; tamdung: number; dahuy: number;
  hoanthanh: number; hoanthanhDungHan: number; hoanthanhQuaHan: number;
};

export type TongQuanPhoiHop = {
  tong: number; chuaxuly: number; sapdenhan: number; quahan: number; hoanthanh: number;
};

function ngayMoc() {
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);
  const moc = new Date(homNay);
  moc.setDate(moc.getDate() + SO_NGAY_SAP_DEN_HAN);
  return { homNay, moc };
}

// Đúng hạn nếu: không đặt hạn, hoặc hoàn thành trước/trong ngày hạn (23:59:59 ngày đó).
function laDungHan(hanXuLy: Date | null, thoiGianHoanThanh: Date | null): boolean {
  if (!hanXuLy || !thoiGianHoanThanh) return true;
  const hanCuoiNgay = new Date(hanXuLy);
  hanCuoiNgay.setHours(23, 59, 59, 999);
  return thoiGianHoanThanh.getTime() <= hanCuoiNgay.getTime();
}

function tinhTongQuanXuLyChinh(
  rows: { trangThai: string; hanXuLy: Date | null; thoiGianHoanThanh: Date | null }[]
): TongQuanXuLyChinh {
  const { homNay, moc } = ngayMoc();
  const tk: TongQuanXuLyChinh = {
    tong: rows.length, chophancong: 0, choduyet: 0, dangxuly: 0, sapdenhan: 0,
    quahan: 0, tamdung: 0, dahuy: 0, hoanthanh: 0, hoanthanhDungHan: 0, hoanthanhQuaHan: 0,
  };
  for (const r of rows) {
    if (r.trangThai === "CHO_PHAN_CONG") tk.chophancong++;
    if (r.trangThai === "CHO_DUYET") tk.choduyet++;
    if (r.trangThai === "DANGXULY") tk.dangxuly++;
    if (r.trangThai === "TAMDUNG") tk.tamdung++;
    if (r.trangThai === "HUY") tk.dahuy++;
    if (r.trangThai === "HOANTHANH") {
      tk.hoanthanh++;
      laDungHan(r.hanXuLy, r.thoiGianHoanThanh) ? tk.hoanthanhDungHan++ : tk.hoanthanhQuaHan++;
    }
    if (r.trangThai !== "HOANTHANH" && r.trangThai !== "HUY" && r.hanXuLy) {
      if (r.hanXuLy < homNay) tk.quahan++;
      else if (r.hanXuLy <= moc) tk.sapdenhan++;
    }
  }
  return tk;
}

/** Phạm vi CÁ NHÂN — vai trò XỬ LÝ CHÍNH. Luôn của chính người xem, không cần kiểm tra quyền thêm. */
export async function getTongQuanNhiemVuXuLyChinh(): Promise<TongQuanXuLyChinh> {
  const session = await requireSession();
  const rows = await prisma.nhiemVu.findMany({
    where: { nguoiXuLyChinhId: session.maNV, isDeleted: false },
    select: { trangThai: true, hanXuLy: true, thoiGianHoanThanh: true },
  });
  return tinhTongQuanXuLyChinh(rows);
}

/** Phạm vi CÁ NHÂN — vai trò PHỐI HỢP. Bộ tình trạng RIÊNG (khác Xử lý chính) theo đúng đặc tả. */
export async function getTongQuanNhiemVuPhoiHop(): Promise<TongQuanPhoiHop> {
  const session = await requireSession();
  const { homNay, moc } = ngayMoc();
  const rows = await prisma.nhiemVu.findMany({
    where: { isDeleted: false, nguoiPhoiHop: { some: { maNV: session.maNV } } },
    select: {
      hanXuLy: true,
      nguoiPhoiHop: { where: { maNV: session.maNV }, select: { daHoanThanhPhanViec: true } },
    },
  });
  const tk: TongQuanPhoiHop = { tong: rows.length, chuaxuly: 0, sapdenhan: 0, quahan: 0, hoanthanh: 0 };
  for (const r of rows) {
    const daXong = r.nguoiPhoiHop[0]?.daHoanThanhPhanViec ?? false;
    if (daXong) {
      tk.hoanthanh++;
    } else {
      tk.chuaxuly++;
      if (r.hanXuLy) {
        if (r.hanXuLy < homNay) tk.quahan++;
        else if (r.hanXuLy <= moc) tk.sapdenhan++;
      }
    }
  }
  return tk;
}

/** Phạm vi QUẢN LÝ — "phong" (chỉ LĐ phòng, đúng phòng mình) hoặc "coquan" (chỉ LĐ cơ quan).
 * Backend TỰ kiểm tra quyền — phamvi chỉ là YÊU CẦU xem, KHÔNG phải cấp quyền (mục 11 đặc tả). */
export async function getTongQuanQuanLyNhiemVu(phamvi: "phong" | "coquan"): Promise<TongQuanXuLyChinh> {
  const session = await requireSession();
  if (phamvi === "phong" && session.quyen !== "LANHDAOPHONG") {
    throw new Error("Chỉ Lãnh đạo phòng được xem mục này.");
  }
  if (phamvi === "coquan" && session.quyen !== "LANHDAODONVI") {
    throw new Error("Chỉ Lãnh đạo cơ quan được xem mục này.");
  }
  const where = phamvi === "phong" ? { phongChuTriId: session.maPhong, isDeleted: false } : { isDeleted: false };
  const rows = await prisma.nhiemVu.findMany({
    where,
    select: { trangThai: true, hanXuLy: true, thoiGianHoanThanh: true },
  });
  return tinhTongQuanXuLyChinh(rows);
}

// ============================== CHI TIẾT (dùng chung cho /nhac-viec/chi-tiet) ==============================

export type PhamViNhiemVu = "canhan" | "phong" | "coquan";

/** vaiTro CHỈ áp dụng khi phamvi=canhan — phân biệt Xử lý chính / Phối hợp (2 bộ tình trạng khác nhau). */
export async function getChiTietNhiemVu(
  phamvi: PhamViNhiemVu,
  tinhtrang: string,
  vaiTro?: "xulychinh" | "phoihop"
): Promise<NhiemVuNhacViecRow[]> {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isDeleted: false };

  if (phamvi === "canhan") {
    if (vaiTro === "phoihop") where.nguoiPhoiHop = { some: { maNV: session.maNV } };
    else where.nguoiXuLyChinhId = session.maNV;
  } else if (phamvi === "phong") {
    if (session.quyen !== "LANHDAOPHONG") throw new Error("Chỉ Lãnh đạo phòng được xem mục này.");
    where.phongChuTriId = session.maPhong;
  } else if (phamvi === "coquan") {
    if (session.quyen !== "LANHDAODONVI") throw new Error("Chỉ Lãnh đạo cơ quan được xem mục này.");
  }

  const { homNay, moc } = ngayMoc();

  if (phamvi === "canhan" && vaiTro === "phoihop") {
    if (tinhtrang === "chuaxuly") {
      where.nguoiPhoiHop = { some: { maNV: session.maNV, daHoanThanhPhanViec: false } };
    } else if (tinhtrang === "hoanthanh") {
      where.nguoiPhoiHop = { some: { maNV: session.maNV, daHoanThanhPhanViec: true } };
    } else if (tinhtrang === "sapdenhan") {
      where.nguoiPhoiHop = { some: { maNV: session.maNV, daHoanThanhPhanViec: false } };
      where.hanXuLy = { gte: homNay, lte: moc };
    } else if (tinhtrang === "quahan") {
      where.nguoiPhoiHop = { some: { maNV: session.maNV, daHoanThanhPhanViec: false } };
      where.hanXuLy = { lt: homNay };
    }
  } else {
    switch (tinhtrang) {
      case "chophancong": where.trangThai = "CHO_PHAN_CONG"; break;
      case "choduyet": where.trangThai = "CHO_DUYET"; break;
      case "dangxuly": where.trangThai = "DANGXULY"; break;
      case "tamdung": where.trangThai = "TAMDUNG"; break;
      case "dahuy": where.trangThai = "HUY"; break;
      case "hoanthanh":
      case "hoanthanh-dunghan":
      case "hoanthanh-quahan":
        where.trangThai = "HOANTHANH";
        break;
      case "sapdenhan":
        where.trangThai = { notIn: ["HOANTHANH", "HUY"] };
        where.hanXuLy = { gte: homNay, lte: moc };
        break;
      case "quahan":
        where.trangThai = { notIn: ["HOANTHANH", "HUY"] };
        where.hanXuLy = { lt: homNay };
        break;
    }
  }

  const rows = await prisma.nhiemVu.findMany({
    where,
    select: {
      id: true, tieuDe: true, trangThai: true, hanXuLy: true, thoiGianHoanThanh: true,
      phongChuTri: { select: { tenPhong: true } },
      nguoiXuLyChinh: { select: { hoTen: true } },
    },
    orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
  });

  // Prisma không so sánh field-vs-field trực tiếp trong where -> lọc thêm ở JS cho 2 tình trạng
  // cần so sánh thoiGianHoanThanh với hanXuLy. Chấp nhận được ở quy mô vài chục người dùng.
  const rowsSauLoc =
    tinhtrang === "hoanthanh-dunghan"
      ? rows.filter((r) => laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
      : tinhtrang === "hoanthanh-quahan"
        ? rows.filter((r) => !laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
        : rows;

  return rowsSauLoc.map((r) => ({
    id: r.id,
    tieuDe: r.tieuDe,
    tenPhongChuTri: r.phongChuTri.tenPhong,
    nguoiXuLyChinh: r.nguoiXuLyChinh?.hoTen ?? null,
    hanXuLy: r.hanXuLy,
    trangThai: r.trangThai,
  }));
}
