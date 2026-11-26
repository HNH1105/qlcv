// Mốc thời gian dùng chung cho tính năng "Nhắc việc" — LUÔN tính theo GIỜ VIỆT NAM (UTC+7), không
// phụ thuộc múi giờ của máy chủ (máy chủ thường chạy UTC: trước đây dùng setHours() theo giờ máy
// chủ nên từ 0h-7h sáng giờ VN, các mốc "hôm nay / quá hạn / sắp đến hạn" bị lệch 1 ngày).
//
// File thường (KHÔNG "use server") — chỉ chứa hàm đồng bộ, được import bởi các file server.

const LECH_GIO_VN_MS = 7 * 60 * 60 * 1000;
const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
export const SO_NGAY_SAP_DEN_HAN = 3;

// Năm ISO của 1 ngày (tính theo phần ngày UTC của đối số) — cùng quy tắc getISOWeek() ở lib/week.ts
// (Thứ 2 đầu tuần, tuần chứa Thứ 5 thuộc năm nào thì tuần đó thuộc năm đó).
function namISO(ngayUTC: Date): number {
  const d = new Date(ngayUTC.getTime());
  const thu = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - thu);
  return d.getUTCFullYear();
}

export function mocThoiGianVN() {
  const bayGioVN = new Date(Date.now() + LECH_GIO_VN_MS);
  const y = bayGioVN.getUTCFullYear();
  const m = bayGioVN.getUTCMonth();
  const d = bayGioVN.getUTCDate();

  // Cột hạn xử lý là kiểu DATE (lưu 00:00 UTC của ngày đó) -> so sánh với "ngày hôm nay" cũng ở
  // dạng 00:00 UTC của ngày hôm nay theo giờ VN.
  const homNay = new Date(Date.UTC(y, m, d));
  const mocSapDenHan = new Date(Date.UTC(y, m, d + SO_NGAY_SAP_DEN_HAN));

  // Năm dương lịch hiện tại theo giờ VN: [00:00 ngày 01/01, 00:00 ngày 01/01 năm sau) — dạng thời
  // điểm thật (để so với ngày giờ hoàn thành, ngày giao...).
  const dauNam = new Date(Date.UTC(y, 0, 1) - LECH_GIO_VN_MS);
  const dauNamSau = new Date(Date.UTC(y + 1, 0, 1) - LECH_GIO_VN_MS);

  return {
    homNay,
    mocSapDenHan,
    namDuongLich: y,
    dauNam,
    dauNamSau,
    // Năm của TUẦN HIỆN TẠI (theo cách đánh số tuần ISO của hệ thống) — dùng cho Kế hoạch (lưu theo
    // nam/tuan). Tuần vắt năm (VD 28/12/2026-03/01/2027 là Tuần 53/2026; 29/12/2025-04/01/2026 là Tuần 1/2026) thuộc trọn về 1 năm, nên
    // tuần đang diễn ra luôn được tính, không bị cắt đôi.
    namTuanHienTai: namISO(homNay),
  };
}

// Hoàn thành "đúng hạn" nếu: không đặt hạn, hoặc xong trước 24:00 (giờ VN) của ngày hạn.
export function laDungHan(hanXuLy: Date | null, thoiGianHoanThanh: Date | null): boolean {
  if (!hanXuLy || !thoiGianHoanThanh) return true;
  const hetNgayHanVN = hanXuLy.getTime() + MOT_NGAY_MS - LECH_GIO_VN_MS; // 00:00 VN ngày hôm sau
  return thoiGianHoanThanh.getTime() < hetNgayHanVN;
}
