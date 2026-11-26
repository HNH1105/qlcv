// ĐÍCH: src/lib/nhac-viec/ke-hoach.ts
// Cùng nguyên tắc với nhac-viec/nhiem-vu.ts: viết ĐỘC LẬP, không import/sửa src/lib/actions/ke-hoach.ts.
// Chỉ tính Kế hoạch của NĂM CỦA TUẦN HIỆN TẠI (trường nam) — xem dieuKienKeHoach() ở ./dem.ts.
"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { mocThoiGianVN, laDungHan } from "./moc-thoi-gian";
import { demKeHoach, dieuKienKeHoach, type TongQuanKeHoach } from "./dem";
import { getKeHoachTheoIds, type KeHoachRow } from "@/lib/actions/ke-hoach";

export type { TongQuanKeHoach };

export type KeHoachNhacViecRow = {
  id: number;
  nam: number;
  tuan: number;
  noiDung: string;
  tenPhong: string;
  nguoiTao: string;
  hanXuLy: Date | null;
  daHoanThanh: boolean;
};

/** Kế hoạch CÁ NHÂN của người đang đăng nhập — năm của tuần hiện tại, chỉ loai=KEHOACH. */
export async function getTongQuanKeHoachCaNhan(): Promise<TongQuanKeHoach> {
  const session = await requireSession();
  return demKeHoach(dieuKienKeHoach("canhan", session));
}

/** Kế hoạch PHÒNG của phòng người đang đăng nhập — ai trong phòng cũng xem được. */
export async function getTongQuanKeHoachPhong(): Promise<TongQuanKeHoach> {
  const session = await requireSession();
  return demKeHoach(dieuKienKeHoach("phong", session));
}

// ============================== CHI TIẾT (dùng chung cho /nhac-viec/chi-tiet) ==============================

export type PhamViKeHoach = "canhan" | "phong";

export async function getChiTietKeHoach(phamvi: PhamViKeHoach, tinhtrang: string): Promise<KeHoachNhacViecRow[]> {
  const session = await requireSession();
  const { homNay } = mocThoiGianVN();

  // Cùng điều kiện với phần đếm (phạm vi + năm của tuần hiện tại) để số dòng khớp con số đã bấm.
  const dk: Prisma.KeHoachTuanWhereInput[] = [dieuKienKeHoach(phamvi, session)];
  switch (tinhtrang) {
    case "chuaxuly":
      dk.push({ daHoanThanh: false });
      break;
    case "chuaxulyquahan":
      dk.push({ daHoanThanh: false, hanXuLy: { lt: homNay } });
      break;
    case "hoanthanh":
    case "hoanthanh-dunghan":
    case "hoanthanh-quahan":
      dk.push({ daHoanThanh: true });
      break;
  }

  const rows = await prisma.keHoachTuan.findMany({
    where: { AND: dk },
    select: {
      id: true, nam: true, tuan: true, noiDung: true, hanXuLy: true,
      daHoanThanh: true, thoiGianHoanThanh: true,
      phong: { select: { tenPhong: true } },
      nhanVien: { select: { hoTen: true } },
    },
    orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
  });

  const rowsSauLoc =
    tinhtrang === "hoanthanh-dunghan"
      ? rows.filter((r) => laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
      : tinhtrang === "hoanthanh-quahan"
        ? rows.filter((r) => !laDungHan(r.hanXuLy, r.thoiGianHoanThanh))
        : rows;

  return rowsSauLoc.map((r) => ({
    id: r.id, nam: r.nam, tuan: r.tuan, noiDung: r.noiDung,
    tenPhong: r.phong.tenPhong, nguoiTao: r.nhanVien.hoTen,
    hanXuLy: r.hanXuLy, daHoanThanh: r.daHoanThanh,
  }));
}

// [MỚI] Như getChiTietKeHoach nhưng trả về DÒNG ĐẦY ĐỦ (KeHoachRow) — để trang chi tiết hiển thị
// bằng card KeHoachBaoCaoItemCard có menu thao tác (hoàn thành, cập nhật kết quả, sửa...). Lọc +
// sắp xếp giữ y hệt getChiTietKeHoach (khớp con số đã bấm), sau đó lấy dữ liệu đầy đủ theo id.
// Cố ý dùng lại hàm của lib/actions/ke-hoach.ts để card nhận đúng cấu trúc dữ liệu nó cần.
export async function getChiTietKeHoachDayDu(phamvi: PhamViKeHoach, tinhtrang: string): Promise<KeHoachRow[]> {
  const ds = await getChiTietKeHoach(phamvi, tinhtrang);
  // Gom theo tuần (tuần mới nhất lên đầu) để trang chi tiết hiện tiêu đề "Tuần x/y" liền mạch;
  // trong cùng tuần giữ nguyên thứ tự theo hạn xử lý (sort ổn định).
  const theoTuan = [...ds].sort((a, b) => b.nam - a.nam || b.tuan - a.tuan);
  return getKeHoachTheoIds(theoTuan.map((r) => r.id));
}
