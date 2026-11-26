// Phần TÍNH TOÁN của "Nhắc việc" — file thường (KHÔNG "use server"), chỉ được gọi từ các server
// action trong lib/nhac-viec/*.ts SAU KHI đã requireSession() và kiểm tra quyền. Cố ý không export
// từ file "use server": mọi hàm export ở file "use server" đều thành endpoint gọi được từ trình
// duyệt, mà các hàm ở đây nhận thẳng maNV/maPhong làm tham số.
//
// Nguyên tắc tối ưu (so với bản cũ kéo TOÀN BỘ dòng về rồi đếm bằng JS):
//   - Đếm bằng database (count/groupBy), chạy song song bằng Promise.all.
//   - Chỉ "Hoàn thành đúng hạn / quá hạn" phải so 2 cột ngày với nhau (Prisma không so cột-với-cột
//     trong where) -> chỉ tải 2 cột ngày của các dòng ĐÃ HOÀN THÀNH TRONG NĂM (đã giới hạn năm nên
//     số dòng nhỏ), đếm ở JS.
//
// Phạm vi thời gian (đã thống nhất với người dùng):
//   - Nhiệm vụ: việc CÒN DỞ (chờ phân công, đang xử lý, chờ duyệt, tạm dừng, quá hạn, sắp đến hạn)
//     luôn đếm ĐỦ, không giới hạn năm — không bỏ sót việc tồn từ năm trước. Việc ĐÃ ĐÓNG chỉ tính
//     trong NĂM HIỆN TẠI: Hoàn thành theo thời điểm hoàn thành, Đã huỷ theo lần cập nhật cuối.
//     Tổng = còn dở + hoàn thành trong năm + đã huỷ trong năm.
//   - Kế hoạch: chỉ năm của TUẦN HIỆN TẠI (trường nam), xem mocThoiGianVN().namTuanHienTai.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mocThoiGianVN, laDungHan } from "./moc-thoi-gian";

// ------------------------------------------ Kiểu dữ liệu ------------------------------------------

export type TongQuanXuLyChinh = {
  tong: number; chophancong: number; choduyet: number; dangxuly: number;
  sapdenhan: number; quahan: number; tamdung: number; dahuy: number;
  hoanthanh: number; hoanthanhDungHan: number; hoanthanhQuaHan: number;
};

export type TongQuanPhoiHop = {
  tong: number; chuaxuly: number; sapdenhan: number; quahan: number; hoanthanh: number;
};

export type TongQuanKeHoach = {
  tong: number;
  chuaxuly: number;
  chuaxulyquahan: number;
  hoanthanh: number;
  hoanthanhDungHan: number;
  hoanthanhQuaHan: number;
};

const TRANG_THAI_CON_DO = ["CHO_PHAN_CONG", "DANGXULY", "CHO_DUYET", "TAMDUNG"] as const;

// ------------------------------------------ Điều kiện dùng chung ----------------------------------

/** Điều kiện "phạm vi người xem" cho Nhiệm vụ (đã kiểm tra quyền ở server action gọi tới). */
export function dieuKienPhamViNhiemVu(
  phamvi: "canhan" | "phong" | "coquan",
  nguoiXem: { maNV: string; maPhong: string }
): Prisma.NhiemVuWhereInput {
  if (phamvi === "canhan") return { isDeleted: false, nguoiXuLyChinhId: nguoiXem.maNV };
  if (phamvi === "phong") return { isDeleted: false, phongChuTriId: nguoiXem.maPhong };
  return { isDeleted: false };
}

/** Việc đã HOÀN THÀNH trong năm hiện tại (theo thời điểm hoàn thành; thiếu thì theo ngày giao). */
export function dkHoanThanhTrongNam(): Prisma.NhiemVuWhereInput {
  const { dauNam, dauNamSau } = mocThoiGianVN();
  return {
    trangThai: "HOANTHANH",
    OR: [
      { thoiGianHoanThanh: { gte: dauNam, lt: dauNamSau } },
      { thoiGianHoanThanh: null, ngayGiao: { gte: dauNam, lt: dauNamSau } },
    ],
  };
}

/** Việc ĐÃ HUỶ trong năm hiện tại (theo lần cập nhật cuối — chính là lúc huỷ với việc đã huỷ). */
export function dkDaHuyTrongNam(): Prisma.NhiemVuWhereInput {
  const { dauNam, dauNamSau } = mocThoiGianVN();
  return { trangThai: "HUY", ngayCapNhat: { gte: dauNam, lt: dauNamSau } };
}

/** "Tổng" = còn dở (mọi năm) + hoàn thành trong năm + huỷ trong năm. */
export function dkTongNhiemVu(): Prisma.NhiemVuWhereInput {
  return {
    OR: [{ trangThai: { in: [...TRANG_THAI_CON_DO] } }, dkHoanThanhTrongNam(), dkDaHuyTrongNam()],
  };
}

/** Phối hợp: phần việc của người này đã xong TRONG NĂM (thiếu thời điểm thì theo ngày được thêm). */
export function dkPhoiHopDaXongTrongNam(maNV: string): Prisma.NhiemVuNguoiPhoiHopWhereInput {
  const { dauNam, dauNamSau } = mocThoiGianVN();
  return {
    maNV,
    daHoanThanhPhanViec: true,
    OR: [
      { thoiGianHoanThanhPhanViec: { gte: dauNam, lt: dauNamSau } },
      { thoiGianHoanThanhPhanViec: null, ngayThem: { gte: dauNam, lt: dauNamSau } },
    ],
  };
}

/** Kế hoạch trong phạm vi + năm của tuần hiện tại. */
export function dieuKienKeHoach(
  phamvi: "canhan" | "phong",
  nguoiXem: { maNV: string; maPhong: string }
): Prisma.KeHoachTuanWhereInput {
  const { namTuanHienTai } = mocThoiGianVN();
  const coSo: Prisma.KeHoachTuanWhereInput = { loai: "KEHOACH", isDeleted: false, nam: namTuanHienTai };
  return phamvi === "canhan"
    ? { ...coSo, laCuaCaNhan: true, maNV: nguoiXem.maNV }
    : { ...coSo, laCuaPhong: true, maPhong: nguoiXem.maPhong };
}

// ------------------------------------------ Đếm tổng quan -----------------------------------------

export async function demNhiemVu(coSo: Prisma.NhiemVuWhereInput): Promise<TongQuanXuLyChinh> {
  const { homNay, mocSapDenHan } = mocThoiGianVN();
  const conDo: Prisma.NhiemVuWhereInput = { trangThai: { in: [...TRANG_THAI_CON_DO] } };

  const [theoTrangThai, quahan, sapdenhan, dahuy, hoanThanhRows] = await Promise.all([
    prisma.nhiemVu.groupBy({ by: ["trangThai"], where: { AND: [coSo, conDo] }, _count: { _all: true } }),
    prisma.nhiemVu.count({ where: { AND: [coSo, conDo, { hanXuLy: { lt: homNay } }] } }),
    prisma.nhiemVu.count({
      where: { AND: [coSo, conDo, { hanXuLy: { gte: homNay, lte: mocSapDenHan } }] },
    }),
    prisma.nhiemVu.count({ where: { AND: [coSo, dkDaHuyTrongNam()] } }),
    prisma.nhiemVu.findMany({
      where: { AND: [coSo, dkHoanThanhTrongNam()] },
      select: { hanXuLy: true, thoiGianHoanThanh: true },
    }),
  ]);

  const dem = (tt: string) => theoTrangThai.find((g) => g.trangThai === tt)?._count._all ?? 0;
  const hoanthanhDungHan = hoanThanhRows.filter((r) => laDungHan(r.hanXuLy, r.thoiGianHoanThanh)).length;
  const tk: TongQuanXuLyChinh = {
    tong: 0,
    chophancong: dem("CHO_PHAN_CONG"),
    choduyet: dem("CHO_DUYET"),
    dangxuly: dem("DANGXULY"),
    tamdung: dem("TAMDUNG"),
    quahan,
    sapdenhan,
    dahuy,
    hoanthanh: hoanThanhRows.length,
    hoanthanhDungHan,
    hoanthanhQuaHan: hoanThanhRows.length - hoanthanhDungHan,
  };
  tk.tong = tk.chophancong + tk.choduyet + tk.dangxuly + tk.tamdung + tk.hoanthanh + tk.dahuy;
  return tk;
}

export async function demPhoiHop(maNV: string): Promise<TongQuanPhoiHop> {
  const { homNay, mocSapDenHan } = mocThoiGianVN();
  const chuaXong: Prisma.NhiemVuWhereInput = {
    isDeleted: false,
    nguoiPhoiHop: { some: { maNV, daHoanThanhPhanViec: false } },
  };
  const [chuaxuly, quahan, sapdenhan, hoanthanh] = await Promise.all([
    prisma.nhiemVu.count({ where: chuaXong }),
    prisma.nhiemVu.count({ where: { AND: [chuaXong, { hanXuLy: { lt: homNay } }] } }),
    prisma.nhiemVu.count({ where: { AND: [chuaXong, { hanXuLy: { gte: homNay, lte: mocSapDenHan } }] } }),
    prisma.nhiemVu.count({ where: { isDeleted: false, nguoiPhoiHop: { some: dkPhoiHopDaXongTrongNam(maNV) } } }),
  ]);
  return { tong: chuaxuly + hoanthanh, chuaxuly, sapdenhan, quahan, hoanthanh };
}

export async function demKeHoach(coSo: Prisma.KeHoachTuanWhereInput): Promise<TongQuanKeHoach> {
  const { homNay } = mocThoiGianVN();
  const [tong, chuaxuly, chuaxulyquahan, hoanThanhRows] = await Promise.all([
    prisma.keHoachTuan.count({ where: coSo }),
    prisma.keHoachTuan.count({ where: { ...coSo, daHoanThanh: false } }),
    prisma.keHoachTuan.count({ where: { ...coSo, daHoanThanh: false, hanXuLy: { lt: homNay } } }),
    prisma.keHoachTuan.findMany({
      where: { ...coSo, daHoanThanh: true },
      select: { hanXuLy: true, thoiGianHoanThanh: true },
    }),
  ]);
  const hoanthanhDungHan = hoanThanhRows.filter((r) => laDungHan(r.hanXuLy, r.thoiGianHoanThanh)).length;
  return {
    tong,
    chuaxuly,
    chuaxulyquahan,
    hoanthanh: hoanThanhRows.length,
    hoanthanhDungHan,
    hoanthanhQuaHan: hoanThanhRows.length - hoanthanhDungHan,
  };
}
