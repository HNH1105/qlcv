import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { LoaiGhiNhan } from "@prisma/client";
import { getWeekDateRangeLabel } from "@/lib/week";
import type { TraCuuRow } from "@/lib/actions/tra-cuu";

// Xuất Word CHO BẢNG CẤP PHÒNG — CHỈ lấy noiDung, KHÔNG kèm kết quả/ghi chú/phối hợp/trạng thái,
// đúng yêu cầu và đúng định dạng file mẫu (KeHoach_Tuan_33_2026.docx):
//   KẾ HOẠCH TUẦN 33 - NĂM 2026
//   Từ ngày 10/08/2026 đến ngày 16/08/2026
//
//   1/ Văn phòng
//   1. ...nội dung...
//   2. ...nội dung...
export async function buildKeHoachBaoCaoPhongDocx(params: {
  loai: LoaiGhiNhan;
  nam: number;
  tuan: number;
  // Đã lọc capDo=PHONG từ trước (xem traCuuKeHoachBaoCao) — có thể là 1 phòng hoặc nhiều phòng,
  // GIỮ NGUYÊN thứ tự đã sort theo thuTu của phòng, không sort lại ở đây.
  rows: TraCuuRow[];
}): Promise<Buffer> {
  const { loai, nam, tuan, rows } = params;
  const tenLoai = loai === "BAOCAO" ? "BÁO CÁO" : "KẾ HOẠCH";
  const tieuDe = `${tenLoai} TUẦN ${tuan} - NĂM ${nam}`;
  const [tuNgay, denNgay] = getWeekDateRangeLabel(nam, tuan).split(" đến ");

  // Gom theo phòng — KHÔNG dùng Map theo maPhong vì rows đã sort sẵn theo thuTu của phòng, chỉ cần
  // gom các dòng liên tiếp cùng tenPhong lại (giữ đúng thứ tự phòng đã cấu hình).
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
      children: [new TextRun({ text: tieuDe, bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Từ ngày ${tuNgay.trim()} đến ngày ${denNgay.trim()}`,
          italics: true,
        }),
      ],
    }),
  ];

  if (groups.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: "Không có dữ liệu.", italics: true })] })
    );
  }

  groups.forEach((g, gi) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text: `${gi + 1}/ ${g.tenPhong}`, bold: true, size: 24 })],
      })
    );
    g.items.forEach((noiDung, i) => {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: `${i + 1}. ${noiDung}` })],
        })
      );
    });
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
