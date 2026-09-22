// ĐÍCH: src/lib/actions/nguoi-dung.ts
//
// LƯU Ý: giả định project dùng bcryptjs để hash mật khẩu (`bcrypt.hash`) — khớp với cách
// TaiKhoan.matKhauHash đang được xác thực lúc đăng nhập. Nếu login/register hiện tại dùng thư
// viện khác (argon2, bcrypt gốc thay vì bcryptjs...), PHẢI đổi lại đúng thư viện đó ở đây, nếu
// không mật khẩu reset sẽ không khớp lúc đăng nhập dù DB đã lưu.
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import bcrypt from "bcryptjs";

function kiemTraAdmin(session: { isAdmin: boolean }) {
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được truy cập chức năng này.");
}

// Sinh mật khẩu ngẫu nhiên 10 ký tự, bỏ các ký tự dễ nhầm khi đọc qua điện thoại (0/O, 1/l/I).
function taoMatKhauNgauNhien(): string {
  const BANG_KY_TU = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += BANG_KY_TU[Math.floor(Math.random() * BANG_KY_TU.length)];
  return s;
}

export async function getDanhSachNguoiDung(input: { maPhong?: string; tuKhoa?: string }) {
  const session = await requireSession();
  kiemTraAdmin(session);

  const tuKhoa = input.tuKhoa?.trim();

  return prisma.nhanVien.findMany({
    where: {
      ...(input.maPhong ? { maPhong: input.maPhong } : {}),
      ...(tuKhoa
        ? {
            OR: [
              { hoTen: { contains: tuKhoa, mode: "insensitive" } },
              { taiKhoan: { tenDangNhap: { contains: tuKhoa, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ maPhong: "asc" }, { thuTu: "asc" }],
    select: {
      maNV: true,
      hoTen: true,
      chucVu: true,
      hoatDong: true,
      maPhong: true,
      phong: { select: { tenPhong: true } },
      taiKhoan: {
        select: { tenDangNhap: true, isAdmin: true, biKhoa: true, lanDangNhapCuoi: true },
      },
    },
  });
}

// Reset mật khẩu — sinh mật khẩu mới, hash, ghi đè. ĐỒNG THỜI mở khoá nếu tài khoản đang bị khoá
// do đăng nhập sai liên tiếp (hợp lý vì reset mật khẩu thường đi kèm nhu cầu "cho đăng nhập lại
// được ngay" — nếu bạn muốn tách riêng 2 việc này, bỏ đoạn biKhoa/soLanDangNhapSaiLienTiep bên
// dưới ra 1 action "moKhoaTaiKhoan" riêng).
export async function resetMatKhau(maNV: string) {
  const session = await requireSession();
  kiemTraAdmin(session);

  const nv = await prisma.nhanVien.findUnique({ where: { maNV }, include: { taiKhoan: true } });
  if (!nv) throw new Error("Không tìm thấy nhân viên.");
  if (!nv.taiKhoan) throw new Error("Nhân viên này chưa có tài khoản đăng nhập.");

  const matKhauMoi = taoMatKhauNgauNhien();
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);

  await prisma.taiKhoan.update({
    where: { maNV },
    data: {
      matKhauHash,
      biKhoa: false,
      soLanDangNhapSaiLienTiep: 0,
      khoaLuc: null,
      lyDoKhoa: null,
    },
  });

  // Trả mật khẩu THUẦN VĂN BẢN (plain text) về cho Admin xem — CHỈ hiển thị đúng 1 lần ngay sau
  // khi reset, không lưu lại plain text ở đâu cả (không log, không ghi bảng nào khác).
  return { hoTen: nv.hoTen, tenDangNhap: nv.taiKhoan.tenDangNhap, matKhauMoi };
}

// ============================================================================================
// TẠO NGƯỜI DÙNG MỚI — tạo đồng thời NhanVien + TaiKhoan (1 nhân viên luôn gắn đúng 1 tài khoản
// ngay từ lúc tạo, không có khái niệm "nhân viên chưa có tài khoản" ở luồng tạo mới — trường hợp
// "Chưa có tài khoản" hiển thị ở bảng là cho dữ liệu cũ tạo tay/import trước đây).
// ============================================================================================

export async function taoNguoiDung(input: {
  maNV: string;
  hoTen: string;
  maPhong: string;
  chucVu?: string;
  tenDangNhap: string;
}) {
  const session = await requireSession();
  kiemTraAdmin(session);

  const maNV = input.maNV.trim();
  const hoTen = input.hoTen.trim();
  const tenDangNhap = input.tenDangNhap.trim();
  if (!maNV || !hoTen || !input.maPhong || !tenDangNhap) {
    throw new Error("Vui lòng nhập đầy đủ Mã nhân viên, Họ tên, Phòng, Tên đăng nhập.");
  }

  const [trungMaNV, trungTenDangNhap] = await Promise.all([
    prisma.nhanVien.findUnique({ where: { maNV } }),
    prisma.taiKhoan.findUnique({ where: { tenDangNhap } }),
  ]);
  if (trungMaNV) throw new Error(`Mã nhân viên "${maNV}" đã tồn tại.`);
  if (trungTenDangNhap) throw new Error(`Tên đăng nhập "${tenDangNhap}" đã được dùng, vui lòng chọn tên khác.`);

  const matKhauMoi = taoMatKhauNgauNhien();
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);

  await prisma.nhanVien.create({
    data: {
      maNV,
      hoTen,
      maPhong: input.maPhong,
      chucVu: input.chucVu?.trim() || null,
      taiKhoan: { create: { tenDangNhap, matKhauHash } },
    },
  });

  // Cùng shape với resetMatKhau() — dùng chung 1 modal hiển thị mật khẩu ở phía UI cho cả 2 luồng.
  return { hoTen, tenDangNhap, matKhauMoi };
}

// ============================================================================================
// SỬA THÔNG TIN CƠ BẢN — Họ tên / Phòng / Chức vụ. KHÔNG đụng tới tenDangNhap/mật khẩu ở đây (đổi
// tên đăng nhập là việc nhạy cảm hơn, nếu cần thì làm action riêng sau).
// ============================================================================================

export async function suaThongTinNguoiDung(
  maNV: string,
  input: { hoTen: string; maPhong: string; chucVu?: string }
) {
  const session = await requireSession();
  kiemTraAdmin(session);

  const hoTen = input.hoTen.trim();
  if (!hoTen || !input.maPhong) throw new Error("Vui lòng nhập đầy đủ Họ tên và Phòng.");

  return prisma.nhanVien.update({
    where: { maNV },
    data: { hoTen, maPhong: input.maPhong, chucVu: input.chucVu?.trim() || null },
  });
}