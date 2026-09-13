// ĐÍCH: src/lib/giao-ban/quyen-client.ts
//
// Bản sao NHẸ của tinhQuyenNoiDung() phía server (src/lib/actions/giao-ban/helpers.ts) — dùng
// được ở Client Component vì không đụng Prisma. CHỈ để ẩn/hiện nút; quyết định thật luôn nằm ở
// server action.

export type QuyenNoiDungClient = {
  suaNoiDung: boolean;
  capNhatGhiChu: boolean;
  danhDauHoanThanh: boolean;
  chuyenTuanSau: boolean;
  loaiKhoiDanhSach: boolean;
};

export function tinhQuyenClient(
  user: { isAdmin: boolean; quyen: string; maPhong: string } | null | undefined,
  phongXuLyId: string
): QuyenNoiDungClient {
  if (!user) {
    return { suaNoiDung: false, capNhatGhiChu: false, danhDauHoanThanh: false, chuyenTuanSau: false, loaiKhoiDanhSach: false };
  }
  const isAdmin = user.isAdmin;
  const cungPhong = user.maPhong === phongXuLyId;
  const isLanhDaoPhong = !isAdmin && user.quyen === "LANHDAOPHONG" && cungPhong;
  const isChuyenVien = !isAdmin && user.quyen === "USER" && cungPhong;
  const laLanhDaoHoacAdmin = isAdmin || isLanhDaoPhong;

  return {
    suaNoiDung: laLanhDaoHoacAdmin,
    chuyenTuanSau: laLanhDaoHoacAdmin,
    loaiKhoiDanhSach: laLanhDaoHoacAdmin,
    capNhatGhiChu: laLanhDaoHoacAdmin || isChuyenVien,
    danhDauHoanThanh: laLanhDaoHoacAdmin || isChuyenVien,
  };
}
