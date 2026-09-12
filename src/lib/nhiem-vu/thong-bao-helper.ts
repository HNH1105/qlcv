// ĐÍCH: src/lib/nhiem-vu/thong-bao-helper.ts
//
// CỐ Ý KHÔNG có "use server" ở đầu file — đây là hàm nội bộ (plain function), được GỌI TỪ BÊN
// TRONG transaction của các Server Action khác (VD: taoNhiemVu, phanCongBoSung...), KHÔNG phải 1
// Server Action độc lập cho client gọi trực tiếp. Đúng nguyên tắc đã chốt ở spec: "Tạo ThongBao
// CÙNG transaction với sự kiện nghiệp vụ sinh ra nó" — để tránh retry do lỗi mạng sinh ra 2 thông
// báo trùng cho cùng 1 sự kiện.
import type { PrismaTx } from "@/lib/prisma";
import { LoaiThongBao } from "@prisma/client";

export async function taoThongBaoTrongTx(
  tx: PrismaTx,
  data: {
    nguoiNhanId: string;
    tieuDe: string;
    noiDung?: string;
    loai: LoaiThongBao;
    duongDan?: string;
  }
) {
  await tx.thongBao.create({
    data: {
      nguoiNhanId: data.nguoiNhanId,
      tieuDe: data.tieuDe,
      noiDung: data.noiDung ?? null,
      loai: data.loai,
      duongDan: data.duongDan ?? null,
    },
  });
}

/** Gửi cho NHIỀU người cùng lúc (VD: mọi LĐ phòng chủ trì khi có nhiệm vụ chờ duyệt — 1 phòng có
 * thể có nhiều hơn 1 LĐ). Bỏ qua danh sách rỗng, không lỗi gì nếu không tìm thấy người nhận. */
export async function taoThongBaoNhieuNguoiTrongTx(
  tx: PrismaTx,
  nguoiNhanIds: string[],
  data: Omit<Parameters<typeof taoThongBaoTrongTx>[1], "nguoiNhanId">
) {
  for (const nguoiNhanId of nguoiNhanIds) {
    await taoThongBaoTrongTx(tx, { ...data, nguoiNhanId });
  }
}
