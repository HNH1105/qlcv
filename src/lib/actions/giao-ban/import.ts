// ĐÍCH: src/lib/actions/giao-ban/import.ts
//
// CỘT EXCEL (đọc từ dòng 2 trở đi, dòng 1 là tiêu đề, bỏ qua dòng trống):
//   A: STT            — không dùng, chỉ để người nhập dễ theo dõi
//   B: Nội dung        — BẮT BUỘC
//   C: Phòng phụ trách — BẮT BUỘC, phải khớp ĐÚNG tenPhong trong danh mục (không phân biệt hoa/
//                        thường, tự bỏ khoảng trắng thừa)
//   D: Người xử lý     — không bắt buộc, nhiều người cách nhau bằng dấu phẩy ","; khớp theo hoTen
//                        TRONG ĐÚNG phòng phụ trách ở cột C — không khớp thì bỏ qua riêng người đó
//                        (không làm hỏng cả dòng), có cảnh báo
//   E: Hạn xử lý       — BẮT BUỘC, định dạng dd/mm/yyyy (hoặc ô Excel kiểu Date)
//   F: Ghi chú         — không bắt buộc
//
// KHÔNG import: mức độ ưu tiên (luôn để mặc định TRUNGBINH vì cột này bắt buộc ở DB nhưng đặc tả
// yêu cầu không đưa vào file import), trạng thái hoàn thành, người hoàn thành, thời gian hoàn
// thành, log. Dòng lỗi báo riêng, KHÔNG rollback các dòng hợp lệ khác (chỉ Admin thao tác nên
// không cần ràng buộc chặt).
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import * as XLSX from "xlsx";
import { ghiLog } from "./helpers";

type DongLoi = { dong: number; lyDo: string };

export type KetQuaImportGiaoBan = {
  tongSoDong: number;
  thanhCong: number;
  loi: DongLoi[];
  canhBao: DongLoi[]; // dòng vẫn import được nhưng có phần bị bỏ qua (VD: người xử lý không khớp)
};

function parseNgay(cell: unknown): Date | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return new Date(Date.UTC(cell.getFullYear(), cell.getMonth(), cell.getDate()));
  }
  if (typeof cell === "number") {
    // Excel serial date (trường hợp sheet không bật cellDates)
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

function chuanHoaTen(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function importGiaoBanExcel(
  cuocHopGiaoBanId: number,
  formData: FormData
): Promise<KetQuaImportGiaoBan> {
  const session = await requireSession();
  if (!session.isAdmin) throw new Error("Chỉ Admin mới được import Excel.");

  const cuocHop = await prisma.cuocHopGiaoBan.findUniqueOrThrow({ where: { id: cuocHopGiaoBanId } });
  if (cuocHop.trangThai !== "DANG_MO") {
    throw new Error("Cuộc giao ban đã chốt, không thể import thêm nội dung.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Không nhận được file.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  // Bỏ dòng tiêu đề (dòng 1)
  const dataRows = raw.slice(1);

  const [phongList, nhanVienList] = await Promise.all([
    prisma.phong.findMany({ where: { hoatDong: true }, select: { maPhong: true, tenPhong: true } }),
    prisma.nhanVien.findMany({ where: { hoatDong: true }, select: { maNV: true, hoTen: true, maPhong: true } }),
  ]);

  const ketQua: KetQuaImportGiaoBan = { tongSoDong: dataRows.length, thanhCong: 0, loi: [], canhBao: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const soDong = i + 2; // +2 vì dòng 1 là tiêu đề, mảng bắt đầu từ 0
    const row = dataRows[i];
    const [, noiDungCell, phongCell, nguoiXuLyCell, hanCell, ghiChuCell] = row;

    const noiDung = typeof noiDungCell === "string" ? noiDungCell.trim() : "";
    if (!noiDung) {
      ketQua.loi.push({ dong: soDong, lyDo: "Thiếu Nội dung." });
      continue;
    }

    const tenPhong = typeof phongCell === "string" ? phongCell.trim() : "";
    const phong = phongList.find((p) => chuanHoaTen(p.tenPhong) === chuanHoaTen(tenPhong));
    if (!phong) {
      ketQua.loi.push({ dong: soDong, lyDo: `Không khớp Phòng phụ trách: "${tenPhong || "(trống)"}".` });
      continue;
    }

    const hanHoanThanh = parseNgay(hanCell);
    if (!hanHoanThanh) {
      ketQua.loi.push({ dong: soDong, lyDo: "Hạn xử lý trống hoặc sai định dạng (cần dd/mm/yyyy)." });
      continue;
    }

    const ghiChu = typeof ghiChuCell === "string" && ghiChuCell.trim() ? ghiChuCell.trim() : null;

    // Người xử lý — khớp lỏng, tên không khớp thì bỏ qua riêng người đó, không làm hỏng cả dòng.
    const tenNguoiXuLyList =
      typeof nguoiXuLyCell === "string"
        ? nguoiXuLyCell
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const nguoiXuLyIds: string[] = [];
    const tenKhongKhop: string[] = [];
    for (const ten of tenNguoiXuLyList) {
      const nv = nhanVienList.find((n) => n.maPhong === phong.maPhong && chuanHoaTen(n.hoTen) === chuanHoaTen(ten));
      if (nv) nguoiXuLyIds.push(nv.maNV);
      else tenKhongKhop.push(ten);
    }
    if (tenKhongKhop.length > 0) {
      ketQua.canhBao.push({
        dong: soDong,
        lyDo: `Không khớp người xử lý trong phòng "${phong.tenPhong}": ${tenKhongKhop.join(", ")} — đã bỏ qua (những người) này, dòng vẫn được import.`,
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.noiDungGiaoBan.create({
          data: {
            cuocHopGiaoBanId,
            noiDung,
            phongXuLyId: phong.maPhong,
            hanHoanThanh,
            mucDoUuTien: "TRUNGBINH", // mặc định — không import từ Excel
            ghiChu,
            createdById: session.maNV,
            nguoiXuLys: { create: nguoiXuLyIds.map((maNV) => ({ nhanVienId: maNV })) },
          },
        });
        await ghiLog(tx, created.id, session.maNV, "TAO_NOI_DUNG");
      });
      ketQua.thanhCong++;
    } catch (e) {
      ketQua.loi.push({ dong: soDong, lyDo: e instanceof Error ? e.message : "Lỗi không xác định khi lưu." });
    }
  }

  return ketQua;
}
