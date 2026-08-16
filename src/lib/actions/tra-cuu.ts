"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { LoaiGhiNhan } from "@prisma/client";

// Dòng dữ liệu dùng riêng cho trang "Tra cứu" — có thêm maPhong/tenPhong (vì tra cứu có thể xem
// NHIỀU PHÒNG cùng lúc, cần biết dòng nào thuộc phòng nào để gom nhóm "1/ Tên Phòng").
export type TraCuuRow = {
  id: number;
  noiDung: string;
  ketQua: string | null;
  ghiChu: string | null;
  daHoanThanh: boolean;
  nguoiPhoiHop: { maNV: string; hoTen: string }[];
  taoLuc: Date;
  ngayCapNhat: Date;
  nguoiCapNhat: { maNV: string; hoTen: string } | null;
  maPhong: string;
  tenPhong: string;
  // Người sở hữu/người nhập — LUÔN CÓ (maNV bắt buộc từ schema mới).
  nguoiTao: { maNV: string; hoTen: string };
  hanXuLy: Date | null;
  tienDo: number | null;
};

// KHÔNG giới hạn theo quyen/maPhong của người xem — đây là công cụ TRA CỨU TOÀN CƠ QUAN, ai đăng
// nhập cũng xem được kế hoạch/báo cáo của bất kỳ phòng nào (chỉ cần requireSession() để chặn truy
// cập ẩn danh). Nếu sau này cần giới hạn phạm vi xem theo quyền, thêm điều kiện ở đây.
export async function traCuuKeHoachBaoCao(params: {
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  // Thay cho capDo cũ — "canhan" lọc laCuaCaNhan=true, "phong" lọc laCuaPhong=true. 1 dòng có thể
  // xuất hiện ở CẢ HAI nếu nó vừa là của cá nhân vừa đã được đánh dấu thuộc Phòng (đúng bản chất
  // schema mới: không còn 2 dòng tách biệt).
  phamVi: "canhan" | "phong";
  // undefined/không truyền = TẤT CẢ CÁC PHÒNG (toàn cơ quan). Truyền mã 1 phòng = chỉ phòng đó.
  maPhong?: string;
}): Promise<TraCuuRow[]> {
  await requireSession();
  const { nam, tuan, loai, phamVi, maPhong } = params;

  const rows = await prisma.keHoachTuan.findMany({
    where: {
      nam,
      tuan,
      loai,
      isDeleted: false,
      ...(phamVi === "canhan" ? { laCuaCaNhan: true } : { laCuaPhong: true }),
      ...(maPhong ? { maPhong } : {}),
    },
    // Cá nhân: sắp theo thứ tự phòng -> thứ tự nhân viên (gom nhóm theo người liền mạch). Phòng:
    // chỉ cần theo thứ tự phòng, không có khái niệm gom theo người.
    orderBy:
      phamVi === "canhan"
        ? [{ phong: { thuTu: "asc" } }, { nhanVien: { thuTu: "asc" } }, { id: "asc" }]
        : [{ phong: { thuTu: "asc" } }, { id: "asc" }],
    include: {
      phong: { select: { tenPhong: true } },
      nhanVien: { select: { maNV: true, hoTen: true } },
      nguoiPhoiHop: { include: { nhanVien: { select: { hoTen: true } } } },
      nguoiCapNhat: { select: { maNV: true, hoTen: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    noiDung: r.noiDung,
    ketQua: r.ketQua,
    ghiChu: r.ghiChu,
    daHoanThanh: r.daHoanThanh,
    nguoiPhoiHop: r.nguoiPhoiHop.map((p) => ({ maNV: p.maNV, hoTen: p.nhanVien.hoTen })),
    taoLuc: r.taoLuc,
    ngayCapNhat: r.ngayCapNhat,
    nguoiCapNhat: r.nguoiCapNhat
      ? { maNV: r.nguoiCapNhat.maNV, hoTen: r.nguoiCapNhat.hoTen }
      : null,
    maPhong: r.maPhong,
    tenPhong: r.phong.tenPhong,
    nguoiTao: { maNV: r.nhanVien.maNV, hoTen: r.nhanVien.hoTen },
    hanXuLy: r.hanXuLy,
    tienDo: r.tienDo,
  }));
}
