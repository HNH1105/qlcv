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

// Dòng Kế hoạch/Báo cáo CẤP PHÒNG (capDo=PHONG) — dùng cho 2 màn hình mới "/phong/ke-hoach" và
// "/phong/bao-cao". Khác KeHoachRow (cá nhân) ở chỗ có thêm `nguoiTao`: vì ở cấp phòng, nhiều
// người khác nhau trong phòng có thể là người tạo ra dòng đó (tự nhập trực tiếp, hoặc do được
// chuyển từ kế hoạch/báo cáo cá nhân của ai đó) — cần hiển thị rõ trên card "của ai tạo".
export type KeHoachPhongRow = KeHoachRow & {
  nguoiTao: { maNV: string; hoTen: string } | null;
};

function revalidateAllLienQuan() {
  revalidatePath("/ca-nhan/ke-hoach");
  revalidatePath("/ca-nhan/bao-cao");
  revalidatePath("/phong/ke-hoach");
  revalidatePath("/phong/bao-cao");
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
  // Trước đây field này chỉ có tác dụng khi loai === KEHOACH — nay áp dụng cho cả BAOCAO (checkbox
  // "Đồng thời chuyển thành Báo cáo Phòng" trong modal Thêm báo cáo), giữ tên cũ để không phải sửa
  // chỗ gọi, nhưng bản chất giờ là "chuyển thành [Kế hoạch|Báo cáo] Phòng" tuỳ theo params.loai.
  chuyenThanhKeHoachPhong?: boolean;
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

  // Đồng thời tạo bản Kế hoạch/Báo cáo Phòng — giống hệt nút "Chuyển thành ... Phòng" bên Apps
  // Script, chỉ khác là làm ngay lúc nhập nếu người dùng tick chọn, không cần vào tab Xem lại thao
  // tác thêm. Dùng params.loai thay vì hard-code "KEHOACH" để áp dụng được cho cả Báo cáo.
  if (params.chuyenThanhKeHoachPhong) {
    await prisma.keHoachTuan.create({
      data: {
        nam: params.nam,
        tuan: params.tuan,
        loai: params.loai,
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

// ==================== NHẬP TRỰC TIẾP Ở CẤP PHÒNG (2 màn "/phong/ke-hoach" và "/phong/bao-cao") ===
// Khác submitKeHoachCaNhan ở chỗ: tạo thẳng capDo=PHONG (không phải CANHAN), maNV lưu lại là NGƯỜI
// TẠO (để hiển thị "Người tạo: ..." trên card, vì ở cấp phòng có nhiều người khác nhau cùng nhập).
// Không có tuỳ chọn "chuyển thành phòng" vì bản thân dòng này đã là cấp phòng rồi.
export async function submitKeHoachPhong(params: {
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  noiDung: string;
  ketQua?: string;
  ghiChu?: string;
  nguoiPhoiHopIds?: string[];
}) {
  const user = await requireSession();
  const noiDung = params.noiDung.trim();
  if (!noiDung) throw new Error("Vui lòng nhập nội dung");

  const created = await prisma.keHoachTuan.create({
    data: {
      nam: params.nam,
      tuan: params.tuan,
      loai: params.loai,
      capDo: CapDoKeHoach.PHONG,
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

  revalidateAllLienQuan();
  return { success: true, id: created.id };
}

// ==================== XEM KẾ HOẠCH/BÁO CÁO CẤP PHÒNG (mọi người trong phòng đều xem/thao tác) ===
// KHÔNG giới hạn theo quyen (khác getKeHoachToanPhong ở trên vốn chỉ dành cho lãnh đạo xem kế
// hoạch CÁ NHÂN của người khác) — đây là bảng CHUNG của cả phòng, ai trong phòng cũng xem và thao
// tác được (đánh dấu hoàn thành / cập nhật kết quả), miễn đăng nhập đúng phòng đó. Vết cập nhật vẫn
// lưu đúng người thao tác qua nguoiCapNhatId, hiển thị được "ai vừa cập nhật" như bên cá nhân.
export async function getKeHoachPhong(
  nam: number,
  tuan: number,
  loai: LoaiGhiNhan
): Promise<KeHoachPhongRow[]> {
  const user = await requireSession();

  const rows = await prisma.keHoachTuan.findMany({
    where: { nam, tuan, loai, capDo: CapDoKeHoach.PHONG, maPhong: user.maPhong },
    orderBy: { id: "asc" },
    include: {
      nhanVien: { select: { maNV: true, hoTen: true } }, // người tạo
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
    daChuyenPhong: r.banChuyen.length > 0, // giữ field để khớp type KeHoachRow, không dùng ở UI Phòng
    nguoiPhoiHop: r.nguoiPhoiHop.map((p) => ({ maNV: p.maNV, hoTen: p.nhanVien.hoTen })),
    taoLuc: r.taoLuc,
    ngayCapNhat: r.ngayCapNhat,
    nguoiCapNhat: r.nguoiCapNhat
      ? { maNV: r.nguoiCapNhat.maNV, hoTen: r.nguoiCapNhat.hoTen }
      : null,
    nguoiTao: r.nhanVien ? { maNV: r.nhanVien.maNV, hoTen: r.nhanVien.hoTen } : null,
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

// ==================== CHUYỂN THÀNH KẾ HOẠCH/BÁO CÁO PHÒNG (1 dòng, từ menu hành động) ==========
// Chống trùng: nếu dòng này đã từng được chuyển trước đó thì bỏ qua, không tạo bản thứ 2.
//
// TRƯỚC ĐÂY hàm này CHỈ cho phép Kế hoạch (chặn cứng Báo cáo bằng throw Error). Nay MỞ RỘNG cho cả
// Báo cáo — giữ nguyên `row.loai` khi tạo bản Phòng thay vì hard-code "KEHOACH", để chuẩn bị sẵn
// dữ liệu "Báo cáo Phòng" cho tính năng bên Phòng sẽ làm sau (chỉ thêm 1 dòng dữ liệu, không tốn gì
// thêm ở tầng DB vì loai/capDo là 2 field độc lập, đã có sẵn từ trước).
export async function convertCaNhanToPhong(id: number) {
  const user = await requireSession();

  const row = await prisma.keHoachTuan.findUnique({ where: { id } });
  if (!row) throw new Error("Không tìm thấy dòng này");

  const daCo = await prisma.keHoachTuan.findFirst({ where: { nguonId: id } });
  if (daCo) return { success: true, alreadyConverted: true };

  await prisma.keHoachTuan.create({
    data: {
      nam: row.nam,
      tuan: row.tuan,
      loai: row.loai,
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

// ==================== CHUYỂN THÀNH PHÒNG (HÀNG LOẠT — dùng cho checkbox chọn nhiều) ============
// Cũng mở rộng tương tự convertCaNhanToPhong ở trên — không còn lọc chỉ giữ lại "KEHOACH" nữa.
export async function convertCaNhanToPhongBulk(ids: number[]) {
  const user = await requireSession();
  if (ids.length === 0) return { success: true, converted: 0, boQua: 0 };

  const rows = await prisma.keHoachTuan.findMany({ where: { id: { in: ids } } });

  let converted = 0;
  for (const row of rows) {
    const daCo = await prisma.keHoachTuan.findFirst({ where: { nguonId: row.id } });
    if (daCo) continue;

    await prisma.keHoachTuan.create({
      data: {
        nam: row.nam,
        tuan: row.tuan,
        loai: row.loai,
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
  return { success: true, converted, boQua: rows.length - converted };
}
