// ĐÍCH: src/lib/actions/danh-muc.ts (GHI ĐÈ file cũ — chỉ thêm 1 field `quyen`, không đổi gì khác)
"use server";

import { prisma } from "@/lib/prisma";

export async function getPhongList() {
  return prisma.phong.findMany({
    where: { hoatDong: true },
    orderBy: { thuTu: "asc" },
    select: { maPhong: true, tenPhong: true },
  });
}

export async function getNhanVienList() {
  return prisma.nhanVien.findMany({
    where: { hoatDong: true },
    orderBy: [{ maPhong: "asc" }, { thuTu: "asc" }],
    // MỚI: thêm `quyen` — cần cho form "Giao nhiệm vụ" (lọc "Người giao" = LĐ đúng phòng chủ trì +
    // toàn bộ BGĐ). KHÔNG phá vỡ các chỗ gọi cũ (VD: AddKeHoachBaoCaoModal tự định nghĩa type
    // NhanVien cục bộ chỉ có 3 field maNV/hoTen/maPhong) — vì đây là gán giá trị từ kết quả hàm trả
    // về qua biến trung gian, TypeScript không áp dụng "excess property check" (chỉ áp dụng cho
    // object literal gõ trực tiếp), nên có thêm field `quyen` không gây lỗi type ở nơi khác.
    select: { maNV: true, hoTen: true, maPhong: true, quyen: true },
  });
}
