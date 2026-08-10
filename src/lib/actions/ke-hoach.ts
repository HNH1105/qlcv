"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { CapDoKeHoach, LoaiGhiNhan } from "@prisma/client";

export type KeHoachRow = {
  id: number;
  noiDung: string;
  ketQua: string | null;
  ghiChu: string | null;
  daHoanThanh: boolean;
  daChuyenPhong: boolean; // true nếu đã có bản Kế hoạch Phòng được tạo từ dòng này
  nguoiPhoiHop: { maNV: string; hoTen: string }[];
};

function revalidateAllLienQuan() {
  revalidatePath("/ca-nhan/ke-hoach");
  revalidatePath("/ca-nhan/bao-cao");
  revalidatePath("/phong/ke-hoach");
}

// ==================== NHẬP (1 mục/lần — đúng theo modal Thêm mới) ====================
export async function submitKeHoachCaNhan(params: {
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  noiDung: string;
  ketQua?: string;
  ghiChu?: string;
  nguoiPhoiHopIds?: string[];
  chuyenThanhKeHoachPhong?: boolean; // chỉ có tác dụng khi loai === KEHOACH
}) {
  const user = await requireSession();
  const noiDung = params.noiDung.trim();
  if (!noiDung) throw new Error("Vui lòng nhập nội dung");

  const created = await prisma.keHoachTuan.create({
    data: {
      nam: params.nam,
      tuan: params.tuan,
      loai: params.loai,
      capDo: CapDoKeHoach.CANHAN,
      maPhong: user.maPhong,
      maNV: user.maNV,
      noiDung,
      ketQua: params.ketQua?.trim() || null,
      ghiChu: params.ghiChu?.trim() || null,
      nguoiCapNhatId: user.maNV,
      nguoiPhoiHop:
        params.nguoiPhoiHopIds && params.nguoiPhoiHopIds.length > 0
          ? { create: params.nguoiPhoiHopIds.map((maNV) => ({ maNV })) }
          : undefined,
    },
  });

  // Đồng thời tạo bản Kế hoạch Phòng — giống hệt nút "Chuyển thành Kế hoạch Phòng" bên Apps Script,
  // chỉ khác là làm ngay lúc nhập nếu người dùng tick chọn, không cần vào tab Xem lại thao tác thêm.
  if (params.chuyenThanhKeHoachPhong && params.loai === "KEHOACH") {
    await prisma.keHoachTuan.create({
      data: {
        nam: params.nam,
        tuan: params.tuan,
        loai: "KEHOACH",
        capDo: CapDoKeHoach.PHONG,
        maPhong: user.maPhong,
        maNV: user.maNV,
        noiDung,
        nguonId: created.id,
        nguoiCapNhatId: user.maNV,
      },
    });
  }

  revalidateAllLienQuan();
  return { success: true, id: created.id };
}

// ==================== XEM LẠI (chỉ đúng người đang đăng nhập, đúng tuần/loại) ====================
export async function getKeHoachCaNhan(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachRow[]> {
  const user = await requireSession();

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, capDo: CapDoKeHoach.CANHAN, maNV: user.maNV },
    orderBy: { id: "asc" },
    include: {
      nguoiPhoiHop: { include: { nhanVien: { select: { hoTen: true } } } },
      banChuyen: { select: { id: true } }, // các bản Kế hoạch Phòng đã tạo TỪ dòng này (nếu có)
    },
  });

  return rows.map((r) => ({
    id: r.id,
    noiDung: r.noiDung,
    ketQua: r.ketQua,
    ghiChu: r.ghiChu,
    daHoanThanh: r.daHoanThanh,
    daChuyenPhong: r.banChuyen.length > 0,
    nguoiPhoiHop: r.nguoiPhoiHop.map((p) => ({ maNV: p.maNV, hoTen: p.nhanVien.hoTen })),
  }));
}

// ==================== ĐÁNH DẤU HOÀN THÀNH ====================
export async function markHoanThanh(ids: number[], value: boolean) {
  await requireSession();
  if (ids.length === 0) return { success: true, updated: 0 };

  const result = await prisma.keHoachTuan.updateMany({
    where: { id: { in: ids } },
    data: { daHoanThanh: value },
  });

  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== CẬP NHẬT KẾT QUẢ / GHI CHÚ ====================
export async function updateKetQuaGhiChu(
  ids: number[],
  ketQua: string | null,
  ghiChu: string | null
) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, updated: 0 };

  const data: { ketQua?: string; ghiChu?: string; nguoiCapNhatId: string } = {
    nguoiCapNhatId: user.maNV,
  };
  if (ketQua !== null) data.ketQua = ketQua;
  if (ghiChu !== null) data.ghiChu = ghiChu;

  const result = await prisma.keHoachTuan.updateMany({ where: { id: { in: ids } }, data });
  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== CHUYỂN THÀNH KẾ HOẠCH PHÒNG (sau khi đã nhập, từ menu hành động) ====================
// Chống trùng: nếu dòng này đã từng được chuyển trước đó thì bỏ qua, không tạo bản thứ 2.
export async function convertCaNhanToPhong(id: number) {
  const user = await requireSession();

  const row = await prisma.keHoachTuan.findUnique({ where: { id } });
  if (!row) throw new Error("Không tìm thấy dòng kế hoạch này");
  if (row.loai !== "KEHOACH") throw new Error("Chỉ Kế hoạch mới chuyển được thành Kế hoạch Phòng");

  const daCo = await prisma.keHoachTuan.findFirst({ where: { nguonId: id } });
  if (daCo) return { success: true, alreadyConverted: true };

  await prisma.keHoachTuan.create({
    data: {
      nam: row.nam,
      tuan: row.tuan,
      loai: "KEHOACH",
      capDo: CapDoKeHoach.PHONG,
      maPhong: row.maPhong,
      maNV: user.maNV,
      noiDung: row.noiDung,
      nguonId: row.id,
      nguoiCapNhatId: user.maNV,
    },
  });

  revalidateAllLienQuan();
  return { success: true, alreadyConverted: false };
}
