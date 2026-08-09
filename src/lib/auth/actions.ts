"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import { createSession, deleteSession } from "./session";
import { SO_LAN_SAI_TOI_DA } from "./constants";
import { redirect } from "next/navigation";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const tenDangNhap = String(formData.get("tenDangNhap") || "").trim();
  const matKhau = String(formData.get("matKhau") || "");

  if (!tenDangNhap || !matKhau) {
    return { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" };
  }

  const taiKhoan = await prisma.taiKhoan.findUnique({
    where: { tenDangNhap },
    include: { nhanVien: { include: { phong: true } } },
  });

  if (!taiKhoan) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng" };
  }

  // LƯU Ý: tài khoản ADMIN01 được seed với hoatDong=false (để ẩn khỏi dropdown chọn người xử
  // lý/phối hợp) — nên ở đây phải MIỄN TRỪ cho tài khoản admin, không thì chính admin cũng bị
  // chặn đăng nhập. Nhân viên thường (không phải admin) mà hoatDong=false (đã nghỉ việc...) thì
  // vẫn chặn đăng nhập như bình thường.
  if (!taiKhoan.nhanVien.hoatDong && !taiKhoan.isAdmin) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng" };
  }

  if (taiKhoan.biKhoa) {
    return { error: "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên." };
  }

  const dungMatKhau = await verifyPassword(matKhau, taiKhoan.matKhauHash);

  if (!dungMatKhau) {
    const soLanSai = taiKhoan.soLanDangNhapSaiLienTiep + 1;
    const seBiKhoa = soLanSai >= SO_LAN_SAI_TOI_DA;

    await prisma.taiKhoan.update({
      where: { id: taiKhoan.id },
      data: {
        soLanDangNhapSaiLienTiep: soLanSai,
        biKhoa: seBiKhoa,
        khoaLuc: seBiKhoa ? new Date() : undefined,
        lyDoKhoa: seBiKhoa
          ? `Tự động khoá do đăng nhập sai ${SO_LAN_SAI_TOI_DA} lần liên tiếp`
          : undefined,
      },
    });

    if (seBiKhoa) {
      return { error: "Sai mật khẩu quá nhiều lần. Tài khoản đã bị khoá." };
    }
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng" };
  }

  // Đăng nhập đúng — reset bộ đếm sai liên tiếp, cập nhật lần đăng nhập cuối
  await prisma.taiKhoan.update({
    where: { id: taiKhoan.id },
    data: { soLanDangNhapSaiLienTiep: 0, lanDangNhapCuoi: new Date() },
  });

  await createSession({
    maNV: taiKhoan.maNV,
    hoTen: taiKhoan.nhanVien.hoTen,
    tenDangNhap: taiKhoan.tenDangNhap,
    maPhong: taiKhoan.nhanVien.maPhong,
    tenPhong: taiKhoan.nhanVien.phong.tenPhong,
    quyen: taiKhoan.nhanVien.quyen,
    isAdmin: taiKhoan.isAdmin,
  });

  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/signin");
}