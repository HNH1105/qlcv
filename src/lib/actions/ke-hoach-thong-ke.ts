// ĐÍCH: src/lib/actions/ke-hoach-thong-ke.ts (MỚI — không đụng vào ke-hoach.ts đang chạy tốt)
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export type KeHoachThongKe = {
  tongSo: number;
  chuaXuLy: number;
  chuaXuLyQuaHan: number;
  hoanThanh: number;
};

function tinhThongKe(rows: { daHoanThanh: boolean; hanXuLy: Date | null }[]): KeHoachThongKe {
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);

  let chuaXuLy = 0;
  let chuaXuLyQuaHan = 0;
  let hoanThanh = 0;

  for (const r of rows) {
    if (r.daHoanThanh) {
      hoanThanh++;
    } else {
      chuaXuLy++;
      if (r.hanXuLy && r.hanXuLy < homNay) chuaXuLyQuaHan++;
    }
  }

  return { tongSo: rows.length, chuaXuLy, chuaXuLyQuaHan, hoanThanh };
}

/** Kế hoạch CÁ NHÂN của người đang đăng nhập — toàn bộ (không giới hạn tuần), chỉ loai=KEHOACH
 * (Báo cáo không có hanXuLy/quá hạn nên không đưa vào thống kê dạng này). */
export async function getThongKeKeHoachCaNhan(): Promise<KeHoachThongKe> {
  const session = await requireSession();
  const rows = await prisma.keHoachTuan.findMany({
    where: { loai: "KEHOACH", laCuaCaNhan: true, maNV: session.maNV, isDeleted: false },
    select: { daHoanThanh: true, hanXuLy: true },
  });
  return tinhThongKe(rows);
}

/** Kế hoạch PHÒNG của phòng người đang đăng nhập — cùng nguyên tắc trên. */
export async function getThongKeKeHoachPhong(): Promise<KeHoachThongKe> {
  const session = await requireSession();
  const rows = await prisma.keHoachTuan.findMany({
    where: { loai: "KEHOACH", laCuaPhong: true, maPhong: session.maPhong, isDeleted: false },
    select: { daHoanThanh: true, hanXuLy: true },
  });
  return tinhThongKe(rows);
}
