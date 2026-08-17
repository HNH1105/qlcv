"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { LoaiGhiNhan } from "@prisma/client";

// ==========================================================================================
// ====================                  ĐỌC THÊM                        =================
// ==========================================================================================
// File này đã được VIẾT LẠI HOÀN TOÀN theo schema mới (bỏ capDo/nguonId, thêm laCuaCaNhan/
// laCuaPhong). Khác biệt cốt lõi so với bản cũ:
// - TRƯỚC: "chuyển thành Phòng" = TẠO 1 dòng MỚI (capDo=PHONG) trỏ nguonId về dòng cá nhân gốc —
//   2 dòng phải giữ đồng bộ nhau bằng code (nguồn gây conflict dữ liệu bác gặp phải).
// - NAY: "chuyển thành Phòng" = chỉ set laCuaPhong=true NGAY TRÊN DÒNG ĐÓ — không còn dòng thứ 2,
//   không còn gì phải đồng bộ. Cùng 1 nội dung/kết quả/ghi chú hiển thị ở cả 2 nơi (Cá nhân VÀ
//   Phòng) vì đó là CÙNG 1 DÒNG.
// - "Loại khỏi phòng" = set laCuaPhong=false, laCuaCaNhan=true — không phân biệt dòng đó vốn dĩ có
//   mặt ở cá nhân hay không (khác hẳn 2 nhánh TH1/TH2 phức tạp ở bản cũ).
// - Mọi query đều phải lọc isDeleted:false (soft-delete, không xoá vật lý nữa).

export type KeHoachRow = {
  id: number;
  noiDung: string;
  ketQua: string | null;
  ghiChu: string | null;
  daHoanThanh: boolean;
  thoiGianHoanThanh: Date | null; // thời điểm đánh dấu hoàn thành gần nhất — khác ngayCapNhat
  laCuaCaNhan: boolean;
  laCuaPhong: boolean;
  hanXuLy: Date | null; // chỉ có ý nghĩa với Kế hoạch
  tienDo: number | null; // chỉ có ý nghĩa với Kế hoạch; null = chưa nhập (khác 0 = đã nhập, đang 0%)
  nguoiPhoiHop: { maNV: string; hoTen: string }[];
  taoLuc: Date;
  ngayCapNhat: Date;
  nguoiCapNhat: { maNV: string; hoTen: string } | null;
  // Người sở hữu/người nhập — LUÔN CÓ (maNV bắt buộc từ schema mới). Dùng để hiển thị "Người tạo"
  // ở bảng Phòng, và để gom nhóm theo người ở các màn xem tổng hợp/tra cứu.
  nguoiTao: { maNV: string; hoTen: string };
  // Audit "đánh dấu/loại khỏi phòng" — chỉ có giá trị nếu đã từng xảy ra, chỉ lưu LẦN GẦN NHẤT.
  nguoiDanhDauPhong: { maNV: string; hoTen: string } | null;
  thoiGianDanhDauPhong: Date | null;
  nguoiLoaiKhoiPhong: { maNV: string; hoTen: string } | null;
  thoiGianLoaiKhoiPhong: Date | null;
};

// GHI CHÚ CHO VÒNG SỬA UI SẮP TỚI: 3 type cũ (KeHoachRow/KeHoachToanPhongRow/KeHoachPhongRow) giờ
// gộp làm 1 vì mọi dòng đều luôn có nguoiTao (maNV bắt buộc) — không còn phân biệt cấu trúc dữ liệu
// theo ngữ cảnh xem nữa, chỉ khác nhau ở ĐIỀU KIỆN LỌC (laCuaCaNhan/laCuaPhong) lúc query.

const KE_HOACH_INCLUDE = {
  nhanVien: { select: { maNV: true, hoTen: true } },
  nguoiPhoiHop: { include: { nhanVien: { select: { hoTen: true } } } },
  nguoiCapNhat: { select: { maNV: true, hoTen: true } },
  nguoiDanhDauPhong: { select: { maNV: true, hoTen: true } },
  nguoiLoaiKhoiPhong: { select: { maNV: true, hoTen: true } },
} as const;

type RowWithIncludes = Awaited<ReturnType<typeof prisma.keHoachTuan.findFirstOrThrow<{
  include: typeof KE_HOACH_INCLUDE;
}>>>;

function mapRow(r: RowWithIncludes): KeHoachRow {
  return {
    id: r.id,
    noiDung: r.noiDung,
    ketQua: r.ketQua,
    ghiChu: r.ghiChu,
    daHoanThanh: r.daHoanThanh,
    thoiGianHoanThanh: r.thoiGianHoanThanh,
    laCuaCaNhan: r.laCuaCaNhan,
    laCuaPhong: r.laCuaPhong,
    hanXuLy: r.hanXuLy,
    tienDo: r.tienDo,
    nguoiPhoiHop: r.nguoiPhoiHop.map((p) => ({ maNV: p.maNV, hoTen: p.nhanVien.hoTen })),
    taoLuc: r.taoLuc,
    ngayCapNhat: r.ngayCapNhat,
    nguoiCapNhat: r.nguoiCapNhat
      ? { maNV: r.nguoiCapNhat.maNV, hoTen: r.nguoiCapNhat.hoTen }
      : null,
    nguoiTao: { maNV: r.nhanVien.maNV, hoTen: r.nhanVien.hoTen },
    nguoiDanhDauPhong: r.nguoiDanhDauPhong
      ? { maNV: r.nguoiDanhDauPhong.maNV, hoTen: r.nguoiDanhDauPhong.hoTen }
      : null,
    thoiGianDanhDauPhong: r.thoiGianDanhDauPhong,
    nguoiLoaiKhoiPhong: r.nguoiLoaiKhoiPhong
      ? { maNV: r.nguoiLoaiKhoiPhong.maNV, hoTen: r.nguoiLoaiKhoiPhong.hoTen }
      : null,
    thoiGianLoaiKhoiPhong: r.thoiGianLoaiKhoiPhong,
  };
}

function revalidateAllLienQuan() {
  revalidatePath("/ca-nhan/ke-hoach");
  revalidatePath("/ca-nhan/bao-cao");
  revalidatePath("/phong/ke-hoach");
  revalidatePath("/phong/bao-cao");
}

// ==================== NHẬP (CÁ NHÂN — modal Thêm mới) ====================
export async function submitKeHoachCaNhan(params: {
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  noiDung: string;
  ketQua?: string;
  ghiChu?: string;
  nguoiPhoiHopIds?: string[];
  hanXuLy?: Date | null;
  // Đánh dấu NGAY LÚC TẠO là cũng thuộc về Phòng — TRƯỚC ĐÂY tạo thêm 1 dòng PHONG riêng, NAY chỉ
  // set laCuaPhong=true ngay trên dòng vừa tạo (1 lần insert duy nhất, không còn insert thứ 2).
  danhDauLaCuaPhong?: boolean;
}) {
  const user = await requireSession();
  const noiDung = params.noiDung.trim();
  if (!noiDung) throw new Error("Vui lòng nhập nội dung");

  const laCuaPhong = !!params.danhDauLaCuaPhong;

  const created = await prisma.keHoachTuan.create({
    data: {
      nam: params.nam,
      tuan: params.tuan,
      loai: params.loai,
      maPhong: user.maPhong,
      maNV: user.maNV,
      noiDung,
      ketQua: params.ketQua?.trim() || null,
      ghiChu: params.ghiChu?.trim() || null,
      hanXuLy: params.hanXuLy ?? null,
      laCuaCaNhan: true,
      laCuaPhong,
      // Nếu đánh dấu luôn là của Phòng ngay lúc tạo, ghi audit luôn trong CÙNG 1 lần insert.
      nguoiDanhDauPhongId: laCuaPhong ? user.maNV : null,
      thoiGianDanhDauPhong: laCuaPhong ? new Date() : null,
      nguoiCapNhatId: user.maNV,
      nguoiPhoiHop:
        params.nguoiPhoiHopIds && params.nguoiPhoiHopIds.length > 0
          ? { create: params.nguoiPhoiHopIds.map((maNV) => ({ maNV })) }
          : undefined,
    },
  });

  revalidateAllLienQuan();
  return { success: true, id: created.id };
}

// ==================== NHẬP TRỰC TIẾP Ở CẤP PHÒNG (2 màn "/phong/ke-hoach" và "/phong/bao-cao") ===
// laCuaCaNhan=false: mục này KHÔNG hiện trong danh sách Kế hoạch/Báo cáo cá nhân của người tạo —
// đúng bản chất "nhập thẳng cho phòng", khác với nhập cá nhân rồi tự đánh dấu thêm.
export async function submitKeHoachPhong(params: {
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  noiDung: string;
  ketQua?: string;
  ghiChu?: string;
  nguoiPhoiHopIds?: string[];
  hanXuLy?: Date | null;
}) {
  const user = await requireSession();
  const noiDung = params.noiDung.trim();
  if (!noiDung) throw new Error("Vui lòng nhập nội dung");

  const created = await prisma.keHoachTuan.create({
    data: {
      nam: params.nam,
      tuan: params.tuan,
      loai: params.loai,
      maPhong: user.maPhong,
      maNV: user.maNV,
      noiDung,
      ketQua: params.ketQua?.trim() || null,
      ghiChu: params.ghiChu?.trim() || null,
      hanXuLy: params.hanXuLy ?? null,
      laCuaCaNhan: false,
      laCuaPhong: true,
      nguoiDanhDauPhongId: user.maNV,
      thoiGianDanhDauPhong: new Date(),
      nguoiCapNhatId: user.maNV,
      nguoiPhoiHop:
        params.nguoiPhoiHopIds && params.nguoiPhoiHopIds.length > 0
          ? { create: params.nguoiPhoiHopIds.map((maNV) => ({ maNV })) }
          : undefined,
    },
  });

  revalidateAllLienQuan();
  return { success: true, id: created.id };
}

// ==================== XEM: KẾ HOẠCH/BÁO CÁO CÁ NHÂN CỦA CHÍNH MÌNH ====================
export async function getKeHoachCaNhan(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachRow[]> {
  const user = await requireSession();

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, maNV: user.maNV, laCuaCaNhan: true, isDeleted: false },
    orderBy: { id: "asc" },
    include: KE_HOACH_INCLUDE,
  });

  return rows.map(mapRow);
}

// ==================== XEM: TOÀN BỘ KẾ HOẠCH/BÁO CÁO CÁ NHÂN CỦA CẢ PHÒNG (chỉ lãnh đạo) ========
// Dùng cho "Cá nhân" -> "Kế hoạch/Báo cáo (Toàn bộ phòng)" — lãnh đạo xem hết kế hoạch/báo cáo cá
// nhân (laCuaCaNhan=true) của mọi người trong phòng mình.
export async function getKeHoachToanPhong(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachRow[]> {
  const user = await requireSession();

  if (user.quyen !== "LANHDAOPHONG" && user.quyen !== "LANHDAODONVI") {
    throw new Error("Bạn không có quyền xem toàn bộ kế hoạch của phòng");
  }

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, maPhong: user.maPhong, laCuaCaNhan: true, isDeleted: false },
    orderBy: [{ nhanVien: { thuTu: "asc" } }, { id: "asc" }],
    include: KE_HOACH_INCLUDE,
  });

  return rows.map(mapRow);
}

// ==================== XEM: KẾ HOẠCH/BÁO CÁO CẤP PHÒNG (mọi người trong phòng xem/thao tác) =====
export async function getKeHoachPhong(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachRow[]> {
  const user = await requireSession();

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, maPhong: user.maPhong, laCuaPhong: true, isDeleted: false },
    orderBy: { id: "asc" },
    include: KE_HOACH_INCLUDE,
  });

  return rows.map(mapRow);
}

// ==================== ĐÁNH DẤU HOÀN THÀNH ====================
// TRƯỚC ĐÂY: phải updateMany 2 lần (dòng gốc + dòng con nguonId trỏ tới). NAY: chỉ 1 lần, vì không
// còn dòng con nào cả — laCuaCaNhan/laCuaPhong chỉ là 2 cờ trên CÙNG 1 dòng.
export async function markHoanThanh(ids: number[], value: boolean) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, updated: 0 };

  const result = await prisma.keHoachTuan.updateMany({
    where: { id: { in: ids }, isDeleted: false },
    // Đánh dấu HOÀN THÀNH -> tự set luôn tienDo=100 + thoiGianHoanThanh=lúc này.
    // Bỏ đánh dấu (value=false) -> KHÔNG tự giảm tienDo (giữ nguyên, tránh mất dữ liệu người dùng
    // đã nhập tay), nhưng xoá thoiGianHoanThanh về null (đúng nghĩa: không còn hoàn thành thì
    // không còn "thời điểm hoàn thành" nào cả).
    data: {
      daHoanThanh: value,
      nguoiCapNhatId: user.maNV,
      thoiGianHoanThanh: value ? new Date() : null,
      ...(value ? { tienDo: 100 } : {}),
    },
  });

  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== CẬP NHẬT KẾT QUẢ / GHI CHÚ / TIẾN ĐỘ ====================
// Quy ước với ketQua/ghiChu: `null` = không đổi, chuỗi (kể cả rỗng) = đặt lại giá trị.
// Quy ước RIÊNG cho tienDo: `undefined` = không đổi, số 0-100 = đặt lại (0 là giá trị hợp lệ nên
// không dùng null cho "không đổi" được).
// TRƯỚC ĐÂY: phải updateMany thêm 1 lần nữa cho dòng con (nguonId). NAY: chỉ 1 lần updateMany duy
// nhất, vì Kết quả/Ghi chú của "bản Phòng" và "bản Cá nhân" giờ LÀ CÙNG 1 CỘT DỮ LIỆU.
export async function updateKetQuaGhiChu(
  ids: number[],
  params: {
    noiDung?: string | null;
    ketQua: string | null;
    ghiChu: string | null;
    tienDo?: number;
  }
) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, updated: 0 };

  const data: {
    noiDung?: string;
    ketQua?: string;
    ghiChu?: string;
    tienDo?: number;
    nguoiCapNhatId: string;
  } = {
    nguoiCapNhatId: user.maNV,
  };
  if (params.noiDung !== null && params.noiDung !== undefined) {
    const noiDung = params.noiDung.trim();
    if (!noiDung) throw new Error("Nội dung không được để trống");
    data.noiDung = noiDung;
  }
  if (params.ketQua !== null) data.ketQua = params.ketQua;
  if (params.ghiChu !== null) data.ghiChu = params.ghiChu;
  if (params.tienDo !== undefined) {
    data.tienDo = Math.max(0, Math.min(100, Math.round(params.tienDo)));
  }

  const result = await prisma.keHoachTuan.updateMany({
    where: { id: { in: ids }, isDeleted: false },
    data,
  });

  revalidateAllLienQuan();
  return { success: true, updated: result.count };
}

// ==================== ĐÁNH DẤU LÀ CỦA PHÒNG (1 dòng — tên cũ: convertCaNhanToPhong) ============
// TRƯỚC ĐÂY: tạo 1 dòng MỚI (capDo=PHONG) trỏ nguonId về dòng này. NAY: chỉ set laCuaPhong=true
// NGAY TRÊN DÒNG NÀY + ghi audit (nguoiDanhDauPhongId/thoiGianDanhDauPhong) — không tạo thêm gì cả.
export async function danhDauLaCuaPhong(id: number) {
  const user = await requireSession();

  const row = await prisma.keHoachTuan.findUnique({ where: { id } });
  if (!row || row.isDeleted) throw new Error("Không tìm thấy dòng này");
  if (row.laCuaPhong) return { success: true, alreadyMarked: true };

  await prisma.keHoachTuan.update({
    where: { id },
    data: {
      laCuaPhong: true,
      nguoiDanhDauPhongId: user.maNV,
      thoiGianDanhDauPhong: new Date(),
      nguoiCapNhatId: user.maNV,
    },
  });

  revalidateAllLienQuan();
  return { success: true, alreadyMarked: false };
}

// ==================== ĐÁNH DẤU LÀ CỦA PHÒNG (HÀNG LOẠT — tên cũ: convertCaNhanToPhongBulk) =====
export async function danhDauLaCuaPhongBulk(ids: number[]) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, updated: 0, boQua: 0 };

  const result = await prisma.keHoachTuan.updateMany({
    where: { id: { in: ids }, isDeleted: false, laCuaPhong: false },
    data: {
      laCuaPhong: true,
      nguoiDanhDauPhongId: user.maNV,
      thoiGianDanhDauPhong: new Date(),
      nguoiCapNhatId: user.maNV,
    },
  });

  revalidateAllLienQuan();
  return { success: true, updated: result.count, boQua: ids.length - result.count };
}

// ==================== LOẠI KHỎI PHÒNG (chỉ lãnh đạo của ĐÚNG phòng đó) ==========================
// TRƯỚC ĐÂY: 2 nhánh TH1/TH2 phức tạp (xoá dòng Phòng, hoặc tạo dòng Cá nhân mới rồi xoá), phải
// $transaction, phải chèn text ghi chú thủ công. NAY: chỉ 1 update duy nhất —
// laCuaPhong=false, laCuaCaNhan=true, ghi audit vào 2 cột riêng (không chèn text vào ghiChu nữa).
export async function loaiKhoiPhong(id: number) {
  const user = await requireSession();

  const row = await prisma.keHoachTuan.findUnique({ where: { id } });
  if (!row || row.isDeleted) throw new Error("Không tìm thấy dòng này");
  if (!row.laCuaPhong) throw new Error("Dòng này hiện không thuộc về Phòng");

  const isLanhDao = user.quyen === "LANHDAOPHONG" || user.quyen === "LANHDAODONVI";
  if (!isLanhDao || user.maPhong !== row.maPhong) {
    throw new Error("Bạn không có quyền loại mục này khỏi phòng");
  }

  await prisma.keHoachTuan.update({
    where: { id },
    data: {
      laCuaPhong: false,
      laCuaCaNhan: true,
      nguoiLoaiKhoiPhongId: user.maNV,
      thoiGianLoaiKhoiPhong: new Date(),
      nguoiCapNhatId: user.maNV,
    },
  });

  revalidateAllLienQuan();
  return { success: true };
}
