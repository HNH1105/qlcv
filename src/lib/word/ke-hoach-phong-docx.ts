import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { LoaiGhiNhan } from "@prisma/client";
import { getWeekDateRangeLabel } from "@/lib/week";
import type { TraCuuRow } from "@/lib/actions/tra-cuu";

// Xuất Word CHO BẢNG CẤP PHÒNG — CHỈ lấy noiDung, KHÔNG kèm kết quả/ghi chú/phối hợp/trạng thái.
//
//   TÓM TẮT KẾ HOẠCH TUẦN 47 - NĂM 2026
//   Từ ngày 16/11/2026 đến ngày 22/11/2026
//
//   1/ Văn phòng (07 nhiệm vụ)
//   - ...nội dung...
//   - ...nội dung...
//
// Căn lề / phông / cỡ chữ / giãn đoạn lấy ĐÚNG theo file mẫu "Thông báo kết luận giao ban tuần 47"
// (phần "II. Kế hoạch của các Phòng, Chi cục"):
//   - Lề trang: trên 2,03cm, dưới 2,03cm, trái 2,54cm, phải 2,03cm.
//   - Phông Times New Roman, cỡ 14pt, căn đều 2 bên.
//   - Dòng tên phòng: in đậm, thụt đầu dòng 1cm, cách trên 6pt (từ phòng thứ 2: 10pt), cách dưới 6pt.
//   - Dòng nội dung "- ...": thụt đầu dòng 1cm, cách dưới 4pt.
// Đơn vị: docx tính cỡ chữ theo nửa point (28 = 14pt), khoảng cách & lề theo twip (1cm ≈ 567).

const FONT = "Times New Roman";
const CO_CHU = 28; // 14pt
const THUT_DAU_DONG = 567; // 1cm

const LE_TRANG = { top: 1152, bottom: 1152, left: 1440, right: 1152 }; // 2,03 / 2,03 / 2,54 / 2,03 cm

export async function buildKeHoachBaoCaoPhongDocx(params: {
  loai: LoaiGhiNhan;
  nam: number;
  tuan: number;
  // Đã lọc/sắp sẵn theo thứ tự phòng — GIỮ NGUYÊN thứ tự, không sort lại ở đây. Chỉ cần tenPhong +
  // noiDung (Pick) để cả route xuất thường lẫn route "xuất theo danh sách đã biên tập" dùng chung.
  rows: Pick<TraCuuRow, "tenPhong" | "noiDung">[];
}): Promise<Buffer> {
  const { loai, nam, tuan, rows } = params;
  const tenLoai = loai === "BAOCAO" ? "BÁO CÁO" : "KẾ HOẠCH";
  const tieuDe = `TÓM TẮT ${tenLoai} TUẦN ${tuan} - NĂM ${nam}`;
  const [tuNgay, denNgay] = getWeekDateRangeLabel(nam, tuan).split(" đến ");

  // Gom các dòng liên tiếp cùng tenPhong (rows đã sort sẵn theo thuTu của phòng).
  const groups: { tenPhong: string; items: string[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.tenPhong === r.tenPhong) {
      last.items.push(r.noiDung);
    } else {
      groups.push({ tenPhong: r.tenPhong, items: [r.noiDung] });
    }
  }

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: tieuDe, bold: true, size: CO_CHU })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Từ ngày ${tuNgay.trim()} đến ngày ${denNgay.trim()}`,
          italics: true,
          size: CO_CHU,
        }),
      ],
    }),
  ];

  if (groups.length === 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: THUT_DAU_DONG },
        children: [new TextRun({ text: "Không có dữ liệu.", italics: true, size: CO_CHU })],
      })
    );
  }

  groups.forEach((g, gi) => {
    // "1/ Văn phòng (07 nhiệm vụ)" — số lượng luôn 2 chữ số.
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: THUT_DAU_DONG },
        spacing: { before: gi === 0 ? 120 : 200, after: 120 },
        children: [
          new TextRun({
            text: `${gi + 1}/ ${g.tenPhong} (${String(g.items.length).padStart(2, "0")} nhiệm vụ)`,
            bold: true,
            size: CO_CHU,
          }),
        ],
      })
    );
    g.items.forEach((noiDung) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: THUT_DAU_DONG },
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: `- ${noiDung}`, size: CO_CHU })],
        })
      );
    });
  });

  const doc = new Document({
    // Mặc định toàn văn bản: Times New Roman 14pt (áp cả cho chỗ nào lỡ không đặt riêng).
    styles: { default: { document: { run: { font: FONT, size: CO_CHU } } } },
    sections: [{ properties: { page: { margin: LE_TRANG } }, children }],
  });
  return Packer.toBuffer(doc);
}
