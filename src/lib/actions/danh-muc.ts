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
    select: { maNV: true, hoTen: true, maPhong: true },
  });
}
