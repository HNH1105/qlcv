// Tải TOÀN BỘ số liệu trang "Nhắc việc" trong 1 LẦN GỌI duy nhất.
//
// Trước đây mỗi khối (Xử lý chính, Phối hợp, Quản lý, Kế hoạch cá nhân, Kế hoạch phòng) tự gọi 1
// server action riêng — Next.js chạy các server action từ cùng 1 trang LẦN LƯỢT từng cái, nên phải
// chờ 5-6 lượt đi-về nối đuôi, lượt nào cũng kiểm tra đăng nhập lại. Giờ: 1 lượt, 1 lần kiểm tra
// đăng nhập, các phép đếm chạy SONG SONG ở server.
"use server";

import { requireSession } from "@/lib/auth/session";
import { mocThoiGianVN } from "./moc-thoi-gian";
import {
  demNhiemVu,
  demPhoiHop,
  demKeHoach,
  dieuKienPhamViNhiemVu,
  dieuKienKeHoach,
  type TongQuanXuLyChinh,
  type TongQuanPhoiHop,
  type TongQuanKeHoach,
} from "./dem";

export type TongQuanNhacViec = {
  xuLyChinh: TongQuanXuLyChinh;
  phoiHop: TongQuanPhoiHop;
  // Chỉ có với LĐ phòng ("phong") / LĐ đơn vị ("coquan"); người khác = null.
  quanLy: { phamvi: "phong" | "coquan"; tk: TongQuanXuLyChinh } | null;
  keHoachCaNhan: TongQuanKeHoach;
  keHoachPhong: TongQuanKeHoach;
  namNhiemVu: number; // năm dương lịch áp cho việc đã đóng (hoàn thành / huỷ)
  namKeHoach: number; // năm của tuần hiện tại, áp cho Kế hoạch
};

export async function getTongQuanNhacViec(): Promise<TongQuanNhacViec> {
  const session = await requireSession();
  const { namDuongLich, namTuanHienTai } = mocThoiGianVN();

  const phamviQuanLy =
    session.quyen === "LANHDAOPHONG" ? "phong" : session.quyen === "LANHDAODONVI" ? "coquan" : null;

  const [xuLyChinh, phoiHop, quanLyTk, keHoachCaNhan, keHoachPhong] = await Promise.all([
    demNhiemVu(dieuKienPhamViNhiemVu("canhan", session)),
    demPhoiHop(session.maNV),
    phamviQuanLy ? demNhiemVu(dieuKienPhamViNhiemVu(phamviQuanLy, session)) : Promise.resolve(null),
    demKeHoach(dieuKienKeHoach("canhan", session)),
    demKeHoach(dieuKienKeHoach("phong", session)),
  ]);

  return {
    xuLyChinh,
    phoiHop,
    quanLy: phamviQuanLy && quanLyTk ? { phamvi: phamviQuanLy, tk: quanLyTk } : null,
    keHoachCaNhan,
    keHoachPhong,
    namNhiemVu: namDuongLich,
    namKeHoach: namTuanHienTai,
  };
}
