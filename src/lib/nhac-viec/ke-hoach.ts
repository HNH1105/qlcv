// ĐÍCH: src/lib/nhac-viec/ke-hoach.ts (MỚI)
// Cùng nguyên tắc với nhac-viec/nhiem-vu.ts: viết ĐỘC LẬP, không import/sửa src/lib/actions/ke-hoach.ts.
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export type TongQuanKeHoach = {
  tong: number;
  chuaxuly: number;
  chuaxulyquahan: number;
  hoanthanh: number;
  hoanthanhDungHan: number;
  hoanthanhQuaHan: number;
};

export type KeHoachNhacViecRow = {
  id: number;
  nam: number;
  tuan: number;
  noiDung: string;
  tenPhong: string;
  nguoiTao: string;
  hanXuLy: Date | null;
  daHoanThanh: boolean;
};

// Đúng hạn nếu: không đặt hạn, hoặc hoàn thành trước/trong ngày hạn (23:59:59 ngày đó).
function laDungHan(hanXuLy: Date | null, thoiGianHoanThanh: Date | null): boolean {
  if (!hanXuLy || !thoiGianHoanThanh) return true;
  const hanCuoiNgay = new Date(hanXuLy);
  hanCuoiNgay.setHours(23, 59, 59, 999);
  return thoiGianHoanThanh.getTime() <= hanCuoiNgay.getTime();
}

function tinhTongQuan(
  rows: { daHoanThanh: boolean; hanXuLy: Date | null; thoiGianHoanThanh: Date | null }[]
): TongQuanKeHoach {
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);
  const tk: TongQuanKeHoach = {
    tong: rows.length, chuaxuly: 0, chuaxulyquahan: 0, hoanthanh: 0, hoanthanhDungHan: 0, hoanthanhQuaHan: 0,
  };
  for (const r of rows) {
    if (r.daHoanThanh) {
      tk.hoanthanh++;
      laDungHan(r.hanXuLy, r.thoiGianHoanThanh) ? tk.hoanthanhDungHan++ : tk.hoanthanhQuaHan++;
    } else {
      tk.chuaxuly++;
      if (r.hanXuLy && r.hanXuLy < homNay) tk.chuaxulyquahan++;
    }
  }
  return tk;
}

/** Kế hoạch CÁ NHÂN của người đang đăng nhập — toàn bộ (không giới hạn tuần), chỉ loai=KEHOACH. */
export async function getTongQuanKeHoachCaNhan(): Promise<TongQuanKeHoach> {
  const session = await requireSession();
  const rows = await prisma.keHoachTuan.findMany({
    where: { loai: "KEHOACH", laCuaCaNhan: true, maNV: session.maNV, isDeleted: false },
    select: { daHoanThanh: true, hanXuLy: true, thoiGianHoanThanh: true },
  });
  return tinhTongQuan(rows);
}

/** Kế hoạch PHÒNG của phòng người đang đăng nhập — ai trong phòng cũng xem được, giống nguyên tắc
 * đã áp dụng ở KeHoachBaoCaoPhongBoard, không giới hạn riêng cho lãnh đạo. */
export async function getTongQuanKeHoachPhong(): Promise<TongQuanKeHoach> {
  const session = await requireSession();
  const rows = await prisma.keHoachTuan.findMany({
    where: { loai: "KEHOACH", laCuaPhong: true, maPhong: session.maPhong, isDeleted: false },
    select: { daHoanThanh: true, hanXuLy: true, thoiGianHoanThanh: true },
  });
  return tinhTongQuan(rows);
}

// ============================== CHI TIẾT (dùng chung cho /nhac-viec/chi-tiet) ==============================

export type PhamViKeHoach = "canhan" | "phong";

export async function getChiTietKeHoach(phamvi: PhamViKeHoach, tinhtrang: string): Promise<KeHoachNhacViecRow[]> {
  const session = await requireSession();
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { loai: "KEHOACH", isDeleted: false };
  if (phamvi === "canhan") {
    where.laCuaCaNhan = true;
    where.maNV = session.maNV;
  } else {
    where.laCuaPhong = true;
    where.maPhong = session.maPhong;
  }

  switch (tinhtrang) {
    case "chuaxuly":
      where.daHoanThanh = false;
      break;
    case "chuaxulyquahan":
      where.daHoanThanh = false;
      where.hanXuLy = { lt: homNay };
      break;
    case "hoanthanh":
    case "hoanthanh-dunghan":
    case "hoanthanh-quahan":
      where.daHoanThanh = true;
      break;
  }

  const rows = await prisma.keHoachTuan.findMany({
    where,
    select: {
      id: true, nam: true, tuan: true, noiDung: true, hanXuLy: true,
      daHoanThanh: true, thoiGianHoanThanh: true,
      phong: { select: { tenPhong: true } },
      nhanVien: { select: { hoTen: true } },
    },
    orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
  });

  const rowsSauLoc =
    tinhtrang === "hoanthanh-dunghan"
      ? rows.filter((r) => laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
      : tinhtrang === "hoanthanh-quahan"
        ? rows.filter((r) => !laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
        : rows;

  return rowsSauLoc.map((r) => ({
    id: r.id, nam: r.nam, tuan: r.tuan, noiDung: r.noiDung,
    tenPhong: r.phong.tenPhong, nguoiTao: r.nhanVien.hoTen,
    hanXuLy: r.hanXuLy, daHoanThanh: r.daHoanThanh,
  }));
}
