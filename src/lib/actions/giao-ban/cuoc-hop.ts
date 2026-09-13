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

// Danh sách dạng bảng có phân trang cho trang /giao-ban — sắp mới tạo lên trước (createdAt desc),
// kèm Tiến độ % (đã hoàn thành / tổng số nội dung, tính bằng groupBy để tránh N+1 query).
export async function getCuocHopGiaoBanListPhanTrang(input: { trang: number; soDongMoiTrang: number }) {
  await requireSession();
  const { trang, soDongMoiTrang } = input;

  const [tongSo, items] = await Promise.all([
    prisma.cuocHopGiaoBan.count(),
    prisma.cuocHopGiaoBan.findMany({
      orderBy: { createdAt: "desc" },
      skip: (trang - 1) * soDongMoiTrang,
      take: soDongMoiTrang,
      include: { createdBy: { select: { hoTen: true } } },
    }),
  ]);

  const ids = items.map((c) => c.id);
  const nhom = ids.length
    ? await prisma.noiDungGiaoBan.groupBy({
        by: ["cuocHopGiaoBanId", "daHoanThanh"],
        where: { cuocHopGiaoBanId: { in: ids }, isDeleted: false },
        _count: true,
      })
    : [];

  const tienDoMap = new Map<number, { tong: number; daHoanThanh: number }>();
  for (const n of nhom) {
    const cur = tienDoMap.get(n.cuocHopGiaoBanId) ?? { tong: 0, daHoanThanh: 0 };
    cur.tong += n._count;
    if (n.daHoanThanh) cur.daHoanThanh += n._count;
    tienDoMap.set(n.cuocHopGiaoBanId, cur);
  }

  const rows = items.map((c) => {
    const td = tienDoMap.get(c.id) ?? { tong: 0, daHoanThanh: 0 };
    return {
      ...c,
      tongNoiDung: td.tong,
      soDaHoanThanh: td.daHoanThanh,
      tienDoPhanTram: td.tong === 0 ? 0 : Math.round((td.daHoanThanh / td.tong) * 100),
    };
  });

  return { rows, tongSo };
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
