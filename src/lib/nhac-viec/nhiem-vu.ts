// ĐÍCH: src/lib/nhac-viec/nhiem-vu.ts
// File RIÊNG cho tính năng "Nhắc việc" — KHÔNG import/sửa gì từ src/lib/actions/nhiem-vu.ts, viết
// độc lập bằng Prisma trực tiếp. Phần đếm nằm ở ./dem.ts (đếm bằng database, có giới hạn năm cho
// việc đã đóng — xem chú thích đầu file dem.ts). Trang tổng quan gọi 1 lần duy nhất qua
// getTongQuanNhacViec() ở ./tong-quan.ts; các hàm getTongQuan* dưới đây giữ lại cho tương thích.
"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { mocThoiGianVN, laDungHan } from "./moc-thoi-gian";
import {
  demNhiemVu,
  demPhoiHop,
  dieuKienPhamViNhiemVu,
  dkHoanThanhTrongNam,
  dkDaHuyTrongNam,
  dkTongNhiemVu,
  dkPhoiHopDaXongTrongNam,
  type TongQuanXuLyChinh,
  type TongQuanPhoiHop,
} from "./dem";

export type { TongQuanXuLyChinh, TongQuanPhoiHop };

export type NhiemVuNhacViecRow = {
  id: number;
  tieuDe: string;
  tenPhongChuTri: string;
  nguoiXuLyChinh: string | null;
  hanXuLy: Date | null;
  trangThai: string;
};

/** Phạm vi CÁ NHÂN — vai trò XỬ LÝ CHÍNH. Luôn của chính người xem. */
export async function getTongQuanNhiemVuXuLyChinh(): Promise<TongQuanXuLyChinh> {
  const session = await requireSession();
  return demNhiemVu(dieuKienPhamViNhiemVu("canhan", session));
}

/** Phạm vi CÁ NHÂN — vai trò PHỐI HỢP. */
export async function getTongQuanNhiemVuPhoiHop(): Promise<TongQuanPhoiHop> {
  const session = await requireSession();
  return demPhoiHop(session.maNV);
}

/** Phạm vi QUẢN LÝ — "phong" (chỉ LĐ phòng, đúng phòng mình) hoặc "coquan" (chỉ LĐ cơ quan).
 * Backend TỰ kiểm tra quyền — phamvi chỉ là YÊU CẦU xem, KHÔNG phải cấp quyền. */
export async function getTongQuanQuanLyNhiemVu(phamvi: "phong" | "coquan"): Promise<TongQuanXuLyChinh> {
  const session = await requireSession();
  if (phamvi === "phong" && session.quyen !== "LANHDAOPHONG") {
    throw new Error("Chỉ Lãnh đạo phòng được xem mục này.");
  }
  if (phamvi === "coquan" && session.quyen !== "LANHDAODONVI") {
    throw new Error("Chỉ Lãnh đạo cơ quan được xem mục này.");
  }
  return demNhiemVu(dieuKienPhamViNhiemVu(phamvi, session));
}

// ============================== CHI TIẾT (dùng chung cho /nhac-viec/chi-tiet) ==============================
// Điều kiện lọc PHẢI khớp đúng với phần đếm ở dem.ts — để bấm vào 1 con số thì danh sách chi tiết
// hiện đúng bấy nhiêu dòng.

export type PhamViNhiemVu = "canhan" | "phong" | "coquan";

/** vaiTro CHỈ áp dụng khi phamvi=canhan — phân biệt Xử lý chính / Phối hợp (2 bộ tình trạng khác nhau). */
export async function getChiTietNhiemVu(
  phamvi: PhamViNhiemVu,
  tinhtrang: string,
  vaiTro?: "xulychinh" | "phoihop"
): Promise<NhiemVuNhacViecRow[]> {
  const session = await requireSession();
  if (phamvi === "phong" && session.quyen !== "LANHDAOPHONG") {
    throw new Error("Chỉ Lãnh đạo phòng được xem mục này.");
  }
  if (phamvi === "coquan" && session.quyen !== "LANHDAODONVI") {
    throw new Error("Chỉ Lãnh đạo cơ quan được xem mục này.");
  }

  const { homNay, mocSapDenHan } = mocThoiGianVN();
  const dk: Prisma.NhiemVuWhereInput[] = [];

  if (phamvi === "canhan" && vaiTro === "phoihop") {
    const chuaXong: Prisma.NhiemVuWhereInput = {
      isDeleted: false,
      nguoiPhoiHop: { some: { maNV: session.maNV, daHoanThanhPhanViec: false } },
    };
    const daXongTrongNam: Prisma.NhiemVuWhereInput = {
      isDeleted: false,
      nguoiPhoiHop: { some: dkPhoiHopDaXongTrongNam(session.maNV) },
    };
    switch (tinhtrang) {
      case "chuaxuly": dk.push(chuaXong); break;
      case "hoanthanh": dk.push(daXongTrongNam); break;
      case "sapdenhan": dk.push(chuaXong, { hanXuLy: { gte: homNay, lte: mocSapDenHan } }); break;
      case "quahan": dk.push(chuaXong, { hanXuLy: { lt: homNay } }); break;
      default: dk.push({ OR: [chuaXong, daXongTrongNam] }); // "tong"
    }
  } else {
    dk.push(dieuKienPhamViNhiemVu(phamvi, session));
    const conDo: Prisma.NhiemVuWhereInput = {
      trangThai: { in: ["CHO_PHAN_CONG", "DANGXULY", "CHO_DUYET", "TAMDUNG"] },
    };
    switch (tinhtrang) {
      case "chophancong": dk.push({ trangThai: "CHO_PHAN_CONG" }); break;
      case "choduyet": dk.push({ trangThai: "CHO_DUYET" }); break;
      case "dangxuly": dk.push({ trangThai: "DANGXULY" }); break;
      case "tamdung": dk.push({ trangThai: "TAMDUNG" }); break;
      case "dahuy": dk.push(dkDaHuyTrongNam()); break;
      case "hoanthanh":
      case "hoanthanh-dunghan":
      case "hoanthanh-quahan":
        dk.push(dkHoanThanhTrongNam());
        break;
      case "sapdenhan": dk.push(conDo, { hanXuLy: { gte: homNay, lte: mocSapDenHan } }); break;
      case "quahan": dk.push(conDo, { hanXuLy: { lt: homNay } }); break;
      default: dk.push(dkTongNhiemVu()); // "tong"
    }
  }

  const rows = await prisma.nhiemVu.findMany({
    where: { AND: dk },
    select: {
      id: true, tieuDe: true, trangThai: true, hanXuLy: true, thoiGianHoanThanh: true,
      phongChuTri: { select: { tenPhong: true } },
      nguoiXuLyChinh: { select: { hoTen: true } },
    },
    orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
  });

  // Prisma không so sánh cột-với-cột trong where -> lọc thêm ở JS cho 2 tình trạng cần so
  // thoiGianHoanThanh với hanXuLy (chỉ trên các việc đã hoàn thành trong năm).
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
