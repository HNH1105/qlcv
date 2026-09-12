// ĐÍCH: src/lib/actions/thong-bao.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export type ThongBaoRow = {
  id: number;
  tieuDe: string;
  noiDung: string | null;
  loai: string;
  duongDan: string | null;
  daDoc: boolean;
  taoLuc: Date;
};

/** Lấy N thông báo mới nhất của người đang đăng nhập — dùng cho dropdown chuông thông báo. */
export async function getThongBaoCuaToi(gioiHan = 20): Promise<ThongBaoRow[]> {
  const session = await requireSession();
  return prisma.thongBao.findMany({
    where: { nguoiNhanId: session.maNV },
    orderBy: { taoLuc: "desc" },
    take: gioiHan,
    select: {
      id: true,
      tieuDe: true,
      noiDung: true,
      loai: true,
      duongDan: true,
      daDoc: true,
      taoLuc: true,
    },
  });
}

/** Đếm số chưa đọc — dùng cho badge số đỏ trên icon chuông. */
export async function getSoThongBaoChuaDoc(): Promise<number> {
  const session = await requireSession();
  return prisma.thongBao.count({ where: { nguoiNhanId: session.maNV, daDoc: false } });
}

export async function danhDauDaDoc(id: number) {
  const session = await requireSession();
  // updateMany + điều kiện nguoiNhanId để chặn 1 user đánh dấu đã đọc thông báo của người khác chỉ
  // bằng cách đoán id — an toàn hơn update({ where: { id } }) đơn thuần.
  await prisma.thongBao.updateMany({
    where: { id, nguoiNhanId: session.maNV },
    data: { daDoc: true },
  });
}

export async function danhDauTatCaDaDoc() {
  const session = await requireSession();
  await prisma.thongBao.updateMany({
    where: { nguoiNhanId: session.maNV, daDoc: false },
    data: { daDoc: true },
  });
}

// ------------------------------------------------------------------------------------------
// TRANG "XEM TẤT CẢ THÔNG BÁO" — phân trang server-side (khác dropdown chuông chỉ lấy 20 dòng mới
// nhất) vì thông báo tích luỹ theo thời gian, có thể nhiều hơn nhiều so với 1 dropdown gọn.
// ------------------------------------------------------------------------------------------

const SO_DONG_MOI_TRANG_MAC_DINH = 20;

export async function getThongBaoCuaToiPhanTrang(
  trang: number,
  soDongMoiTrang: number = SO_DONG_MOI_TRANG_MAC_DINH
): Promise<{ rows: ThongBaoRow[]; tongSo: number }> {
  const session = await requireSession();

  const [rows, tongSo] = await Promise.all([
    prisma.thongBao.findMany({
      where: { nguoiNhanId: session.maNV },
      orderBy: { taoLuc: "desc" },
      skip: (trang - 1) * soDongMoiTrang,
      take: soDongMoiTrang,
      select: {
        id: true,
        tieuDe: true,
        noiDung: true,
        loai: true,
        duongDan: true,
        daDoc: true,
        taoLuc: true,
      },
    }),
    prisma.thongBao.count({ where: { nguoiNhanId: session.maNV } }),
  ]);

  return { rows, tongSo };
}
