// ĐÍCH: src/lib/actions/giao-ban/import.ts
//
// CỘT EXCEL (dòng 1 là tiêu đề, dữ liệu từ dòng 2):
//   A: STT              — không dùng
//   B: Nội dung          — BẮT BUỘC
//   C: Mã phòng phụ trách — BẮT BUỘC, PHẢI khớp CHÍNH XÁC `maPhong` trong danh mục (không dùng tên
//                          phòng nữa — tên dễ gõ sai/trùng, mã mới khớp đúng khoá trong CSDL)
//   D: Mã người xử lý     — không bắt buộc, nhiều mã cách nhau bằng dấu phẩy ","; PHẢI là `maNV`
//                          hợp lệ và thuộc ĐÚNG phòng ở cột C
//   E: Hạn xử lý          — BẮT BUỘC, dd/mm/yyyy
//   F: Ghi chú            — không bắt buộc
//
// QUY TRÌNH 2 BƯỚC (không import thẳng rồi mới báo lỗi):
//   1. xemTruocImportGiaoBan() — CHỈ đọc + validate, KHÔNG ghi DB. Trả về từng dòng kèm cờ hợp lệ
//      + lý do nếu không hợp lệ, để hiển thị bảng xem trước cho Admin duyệt mắt trước khi bấm
//      "Xác nhận import".
//   2. xacNhanImportGiaoBan() — nhận lại đúng danh sách dòng đã xem trước (không đọc lại file),
//      chỉ ghi những dòng `hopLe: true`. Validate lại tối thiểu (phòng chưa bị xoá) để tránh dữ
//      liệu bị đổi giữa lúc xem trước và lúc xác nhận, nhưng KHÔNG parse Excel lần 2.
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import * as XLSX from "xlsx";
import { ghiLog } from "./helpers";

export type DongExcelDaXuLy = {
  dong: number;
  hopLe: boolean;
  lyDo?: string;
  noiDung: string;
  maPhong: string;
  tenPhong?: string;
  maNguoiXuLy: string[];
  tenNguoiXuLy?: string[]; // để hiển thị cho dễ đọc ở bảng xem trước
  hanHoanThanhISO: string | null; // truyền qua lại client dạng chuỗi ISO, parse thành Date ở server khi commit
  ghiChu: string | null;
};

export type KetQuaImportGiaoBan = {
  tongSoDong: number;
  thanhCong: number;
  loi: { dong: number; lyDo: string }[];
};

function parseNgay(cell: unknown): Date | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return new Date(Date.UTC(cell.getFullYear(), cell.getMonth(), cell.getDate()));
  }
  if (typeof cell === "number") {
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  if (typeof cell === "string") {
    const m = cell.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ============================================================================================
// BƯỚC 1 — XEM TRƯỚC (không ghi DB)
// ============================================================================================

export async function xemTruocImportGiaoBan(formData: FormData): Promise<DongExcelDaXuLy[]> {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được import Excel.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Không nhận được file.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  const dataRows = raw.slice(1);

  const [phongList, nhanVienList] = await Promise.all([
    prisma.phong.findMany({ where: { hoatDong: true }, select: { maPhong: true, tenPhong: true } }),
    prisma.nhanVien.findMany({ where: { hoatDong: true }, select: { maNV: true, hoTen: true, maPhong: true } }),
  ]);
  const phongMap = new Map(phongList.map((p) => [p.maPhong, p.tenPhong]));
  const nhanVienMap = new Map(nhanVienList.map((n) => [n.maNV, n]));

  const ketQua: DongExcelDaXuLy[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const soDong = i + 2;
    const row = dataRows[i];
    const [, noiDungCell, maPhongCell, maNguoiXuLyCell, hanCell, ghiChuCell] = row;

    const noiDung = typeof noiDungCell === "string" ? noiDungCell.trim() : "";
    const maPhong = typeof maPhongCell === "string" ? maPhongCell.trim() : "";
    const ghiChu = typeof ghiChuCell === "string" && ghiChuCell.trim() ? ghiChuCell.trim() : null;
    const han = parseNgay(hanCell);

    const maNguoiXuLyRaw =
      typeof maNguoiXuLyCell === "string"
        ? maNguoiXuLyCell.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    let hopLe = true;
    let lyDo: string | undefined;

    if (!noiDung) {
      hopLe = false;
      lyDo = "Thiếu Nội dung.";
    } else if (!maPhong || !phongMap.has(maPhong)) {
      hopLe = false;
      lyDo = `Mã phòng "${maPhong || "(trống)"}" không tồn tại trong danh mục.`;
    } else if (!han) {
      hopLe = false;
      lyDo = "Hạn xử lý trống hoặc sai định dạng (cần dd/mm/yyyy).";
    }

    // Kiểm tra từng mã người xử lý — mã sai thì đánh dấu CẢ DÒNG không hợp lệ (khác bản trước đây
    // chỉ cảnh báo riêng lẻ) — vì giờ dùng mã, gõ sai mã gần như chắc chắn là lỗi nhập liệu thật
    // sự, không giống lỗi chính tả tên nên không nên "lượng thứ" bằng cách âm thầm bỏ qua.
    const maKhongHopLe = maNguoiXuLyRaw.filter((ma) => !nhanVienMap.has(ma) || nhanVienMap.get(ma)!.maPhong !== maPhong);
    if (hopLe && maKhongHopLe.length > 0) {
      hopLe = false;
      lyDo = `Mã người xử lý không hợp lệ hoặc không thuộc phòng ${maPhong}: ${maKhongHopLe.join(", ")}`;
    }

    ketQua.push({
      dong: soDong,
      hopLe,
      lyDo,
      noiDung,
      maPhong,
      tenPhong: phongMap.get(maPhong),
      maNguoiXuLy: hopLe ? maNguoiXuLyRaw : [],
      tenNguoiXuLy: maNguoiXuLyRaw.map((ma) => nhanVienMap.get(ma)?.hoTen ?? ma),
      hanHoanThanhISO: han ? han.toISOString() : null,
      ghiChu,
    });
  }

  return ketQua;
}

// ============================================================================================
// BƯỚC 2 — XÁC NHẬN IMPORT (chỉ ghi những dòng hopLe:true, không parse lại Excel)
// ============================================================================================

export async function xacNhanImportGiaoBan(
  cuocHopGiaoBanId: number,
  rows: DongExcelDaXuLy[]
): Promise<KetQuaImportGiaoBan> {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được import Excel.");

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id: cuocHopGiaoBanId } });
  if (cuocHop.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể import thêm nội dung.");
  }

  const ketQua: KetQuaImportGiaoBan = { tongSoDong: rows.length, thanhCong: 0, loi: [] };

  for (const r of rows) {
    if (!r.hopLe) continue; // không import dòng đã đánh dấu lỗi ở bước xem trước

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.noiDungGiaoBan.create({
          data: {
            cuocHopGiaoBanId,
            noiDung: r.noiDung,
            phongXuLyId: r.maPhong,
            hanHoanThanh: new Date(r.hanHoanThanhISO!),
            mucDoUuTien: "TRUNGBINH",
            ghiChu: r.ghiChu,
            createdById: session.maNV,
            nguoiXuLys: { create: r.maNguoiXuLy.map((maNV) => ({ nhanVienId: maNV })) },
          },
        });
        await ghiLog(tx, created.id, session.maNV, "TAO_NOI_DUNG");
      });
      ketQua.thanhCong++;
    } catch (e) {
      ketQua.loi.push({ dong: r.dong, lyDo: e instanceof Error ? e.message : "Lỗi không xác định khi lưu." });
    }
  }

  return ketQua;
}
