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
  taoLuc: Date;
  ngayCapNhat: Date;
  nguoiCapNhat: { maNV: string; hoTen: string } | null;
};

// Dòng kế hoạch của TOÀN PHÒNG — dùng riêng cho tab "Toàn bộ" (chỉ lãnh đạo phòng/đơn vị xem được),
// giống hệt KeHoachRow nhưng có thêm thông tin người thực hiện (chuyên viên) vì đây là xem của
// nhiều người khác nhau trong phòng, không riêng người đang đăng nhập.
export type KeHoachToanPhongRow = KeHoachRow & {
  nguoiThucHien: { maNV: string; hoTen: string } | null;
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
      nguoiCapNhat: { select: { maNV: true, hoTen: true } },
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
    taoLuc: r.taoLuc,
    ngayCapNhat: r.ngayCapNhat,
    nguoiCapNhat: r.nguoiCapNhat
      ? { maNV: r.nguoiCapNhat.maNV, hoTen: r.nguoiCapNhat.hoTen }
      : null,
  }));
}

// ==================== XEM TOÀN BỘ KẾ HOẠCH CỦA PHÒNG (chỉ lãnh đạo phòng/đơn vị) ====================
// Dùng cho tab "Toàn bộ" — lãnh đạo xem hết kế hoạch cá nhân của mọi chuyên viên trong phòng mình,
// để có thể chuyển bất kỳ dòng nào sang Kế hoạch Phòng.
//
// LƯU Ý: hàm này giả định requireSession() trả về kèm field `quyen` (Quyen enum: USER |
// LANHDAOPHONG | LANHDAODONVI) giống hệt field `quyen` trên model NhanVien. Nếu session hiện tại
// CHƯA có field này, cần bổ sung vào chỗ tạo session tương ứng thì tab "Toàn bộ" mới hoạt động
// đúng quyền.
export async function getKeHoachToanPhong(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachToanPhongRow[]> {
  const user = await requireSession();

  if (user.quyen !== "LANHDAOPHONG" && user.quyen !== "LANHDAODONVI") {
    throw new Error("Bạn không có quyền xem toàn bộ kế hoạch của phòng");
  }

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, capDo: CapDoKeHoach.CANHAN, maPhong: user.maPhong },
    orderBy: [{ maNV: "asc" }, { id: "asc" }],
    include: {
      nhanVien: { select: { maNV: true, hoTen: true } },
      nguoiPhoiHop: { include: { nhanVien: { select: { hoTen: true } } } },
      nguoiCapNhat: { select: { maNV: true, hoTen: true } },
      banChuyen: { select: { id: true } },
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
    taoLuc: r.taoLuc,
    ngayCapNhat: r.ngayCapNhat,
    nguoiCapNhat: r.nguoiCapNhat
      ? { maNV: r.nguoiCapNhat.maNV, hoTen: r.nguoiCapNhat.hoTen }
      : null,
    nguoiThucHien: r.nhanVien ? { maNV: r.nhanVien.maNV, hoTen: r.nhanVien.hoTen } : null,
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

  // Đồng thời đánh dấu hoàn thành cho các bản Kế hoạch Phòng tương ứng (đã được tạo ra từ những
  // dòng này) — áp dụng tự động cho các mục "Đã chuyển Phòng", không cần chọn thêm gì (đúng hành
  // vi mặc định của bản Apps Script cũ).
  await prisma.keHoachTuan.updateMany({
    where: { nguonId: { in: ids } },
    data: { daHoanThanh: value },
  });

  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== CẬP NHẬT NỘI DUNG / KẾT QUẢ / GHI CHÚ ====================
// Quy ước: field nào truyền `null` nghĩa là "không đổi" (giữ nguyên), truyền chuỗi (kể cả chuỗi
// rỗng) nghĩa là "đặt lại giá trị này". Áp dụng cho cả noiDung, ketQua, ghiChu.
export async function updateKetQuaGhiChu(
  ids: number[],
  params: { noiDung?: string | null; ketQua: string | null; ghiChu: string | null }
) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, updated: 0 };

  const data: { noiDung?: string; ketQua?: string; ghiChu?: string; nguoiCapNhatId: string } = {
    nguoiCapNhatId: user.maNV,
  };
  if (params.noiDung !== null && params.noiDung !== undefined) {
    const noiDung = params.noiDung.trim();
    if (!noiDung) throw new Error("Nội dung không được để trống");
    data.noiDung = noiDung;
  }
  if (params.ketQua !== null) data.ketQua = params.ketQua;
  if (params.ghiChu !== null) data.ghiChu = params.ghiChu;

  const result = await prisma.keHoachTuan.updateMany({ where: { id: { in: ids } }, data });

  // Đồng thời cập nhật Kết quả/Ghi chú này cho Kế hoạch Phòng tương ứng (áp dụng cho các mục đã
  // "Đã chuyển Phòng") — tự động, không cần bật thêm tuỳ chọn nào (bản Apps Script cũ có nút check
  // riêng cho việc này, nay bỏ đi vì chuyển sang CSDL nên mặc định luôn đồng bộ).
  // Lưu ý: KHÔNG đồng bộ noiDung sang bản Phòng — nội dung bên Phòng do lãnh đạo tự chỉnh, không
  // để bản cá nhân ghi đè.
  if (params.ketQua !== null || params.ghiChu !== null) {
    const phongData: { ketQua?: string; ghiChu?: string; nguoiCapNhatId: string } = {
      nguoiCapNhatId: user.maNV,
    };
    if (params.ketQua !== null) phongData.ketQua = params.ketQua;
    if (params.ghiChu !== null) phongData.ghiChu = params.ghiChu;

    await prisma.keHoachTuan.updateMany({
      where: { nguonId: { in: ids } },
      data: phongData,
    });
  }

  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== CHUYỂN THÀNH KẾ HOẠCH PHÒNG (1 dòng, từ menu hành động) ====================
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

// ==================== CHUYỂN THÀNH KẾ HOẠCH PHÒNG (HÀNG LOẠT — dùng cho checkbox chọn nhiều) ====
export async function convertCaNhanToPhongBulk(ids: number[]) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, converted: 0, boQua: 0 };

  const rows = await prisma.keHoachTuan.findMany({ where: { id: { in: ids } } });
  const hopLe = rows.filter((r) => r.loai === "KEHOACH");

  let converted = 0;
  for (const row of hopLe) {
    const daCo = await prisma.keHoachTuan.findFirst({ where: { nguonId: row.id } });
    if (daCo) continue;

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
    converted++;
  }

  revalidateAllLienQuan();
  return { success: true, converted, boQua: hopLe.length - converted };
}
