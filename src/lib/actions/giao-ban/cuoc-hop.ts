// ĐÍCH: src/lib/actions/giao-ban/cuoc-hop.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export async function getCuocHopGiaoBanList() {
  await requireSession();
  return prisma.cuocHopGiaoBan.findMany({
    orderBy: [{ nam: "desc" }, { tuan: "desc" }],
    include: {
      createdBy: { select: { hoTen: true } },
      _count: { select: { noiDungs: { where: { isDeleted: false } } } },
    },
  });
}

// Tạo cuộc họp tuần mới — chỉ Admin.
export async function taoCuocHopGiaoBan(nam: number, tuan: number, ngayHop: Date) {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được tạo cuộc giao ban mới.");

  const existed = await prisma.cuocHopGiaoBan.findUnique({ where: { nam_tuan: { nam, tuan } } });
  if (existed) throw new Error(`Tuần ${tuan}/${nam} đã có cuộc giao ban.`);

  return prisma.cuocHopGiaoBan.create({
    data: { nam, tuan, ngayHop, createdById: session.maNV },
  });
}

// Chốt cuộc giao ban — không cho chốt nếu còn nội dung daKetThuc=false (mục 25).
export async function chotCuocHopGiaoBan(id: number) {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được chốt cuộc giao ban.");

  const conDoDang = await prisma.noiDungGiaoBan.count({
    where: { cuocHopGiaoBanId: id, isDeleted: false, daKetThuc: false },
  });
  if (conDoDang > 0) {
    throw new Error(
      "Cuộc giao ban còn nội dung chưa kết thúc. Vui lòng hoàn thành, hủy/không theo dõi hoặc chuyển tuần trước khi chốt cuộc giao ban."
    );
  }

  return prisma.cuocHopGiaoBan.update({
    where: { id },
    data: { trangThai: "DA_CHOT" },
  });
}

// Tìm cuộc họp DANG_MO gần nhất — dùng làm gợi ý đích khi Nhiệm vụ/Kế hoạch phòng (module khác)
// muốn chuyển sang giao ban mà không bắt người dùng tự chọn tuần.
export async function getCuocHopGiaoBanDangMoGanNhat() {
  await requireSession();
  return prisma.cuocHopGiaoBan.findFirst({
    where: { trangThai: "DANG_MO" },
    orderBy: [{ nam: "desc" }, { tuan: "desc" }],
  });
}
