// Port lại nguyên logic tính tuần ISO 8601 (Thứ 2 = ngày đầu tuần) từ Utils.gs bản Apps Script cũ,
// để giữ đúng cách đánh số tuần mà mọi người trong đơn vị đã quen dùng — không tự đổi sang cách
// tính khác (VD: tuần bắt đầu Chủ nhật) dù JS mặc định getDay() coi Chủ nhật là ngày đầu tuần.

export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Thứ 2=1 ... Chủ nhật=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // đưa về Thứ 5 của tuần đó
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function getISOWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return start;
}

export function getISOWeekEnd(year: number, week: number): Date {
  const start = getISOWeekStart(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return end;
}

export function isoWeeksInYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getISOWeek(dec28).week;
}

export function formatDateVN(d: Date): string {
  // Chỉ dùng phần ngày/tháng/năm UTC (d luôn được tạo ở 00:00 UTC) — tránh lệch ngày do múi giờ
  // trình duyệt khi format.
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Dùng cho các mốc thời gian THẬT (taoLuc, ngayCapNhat...) — khác với formatDateVN ở trên (chỉ
// dùng cho ranh giới tuần, luôn chuẩn hoá UTC 00:00). Ở đây dùng giờ local của trình duyệt vì đây
// là thời điểm thao tác thực tế, cần hiển thị đúng giờ người dùng đang thấy.
export function formatDateTimeVN(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
}

export function getWeekDateRangeLabel(nam: number, tuan: number): string {
  const start = getISOWeekStart(nam, tuan);
  const end = getISOWeekEnd(nam, tuan);
  return `${formatDateVN(start)} đến ${formatDateVN(end)}`;
}

export function getCurrentWeekInfo(): { nam: number; tuan: number } {
  const { week, year } = getISOWeek(new Date());
  return { nam: year, tuan: week };
}

// ==========================================================================================
// ====================   TUẦN KẾ TIẾP TUẦN HIỆN TẠI (xử lý vắt năm)   =====================
// ==========================================================================================
// Trước đây logic "tuần hiện tại + 1, vắt năm thì về Tuần 1 năm sau" được viết TAY, RIÊNG, ngay
// trong AddKeHoachBaoCaoPhongModal.tsx (biến defaultNamTuan). Nay tách ra đây thành 1 hàm dùng
// chung — vì logic NÀY, đúng y hệt, còn cần dùng lại ở isTrongKhungSuaFull() bên dưới (xác định
// khung được phép sửa full của Kế hoạch). Tách chung để không có 2 nơi tính "tuần kế tiếp" theo
// 2 cách viết khác nhau rồi một lúc nào đó lệch nhau.
export function getNextWeekInfo(): { nam: number; tuan: number } {
  const { nam: namHT, tuan: tuanHT } = getCurrentWeekInfo();
  let t = tuanHT + 1;
  let n = namHT;
  if (t > isoWeeksInYear(namHT)) {
    t = 1;
    n = namHT + 1;
  }
  return { nam: n, tuan: t };
}

// ==========================================================================================
// ====================   KHUNG "SỬA FULL" (Nội dung/Người phối hợp/Hạn xử lý)   ============
// ==========================================================================================
// NGHIỆP VỤ: 1 dòng Kế hoạch/Báo cáo chỉ được sửa FULL (Nội dung + Người phối hợp + Hạn xử lý,
// ngoài Kết quả/Ghi chú/Tiến độ vốn luôn sửa được) khi (nam, tuan) CỦA CHÍNH DÒNG ĐÓ khớp đúng:
//   - loai = BAOCAO  → đúng tuần HIỆN TẠI thực      (getCurrentWeekInfo())
//   - loai = KEHOACH → đúng tuần KẾ TIẾP tuần hiện tại thực (getNextWeekInfo())
// "Tuần hiện tại thực" ở đây LUÔN tính theo ngày giờ thật của môi trường đang chạy hàm này (client
// hoặc server), KHÔNG liên quan gì đến tuần người dùng đang chọn xem trên WeekSelect của board.
//
// Hàm này PHẢI được gọi ở CẢ HAI phía:
// - Client (component sửa): chỉ để quyết định ẩn/hiện các ô Nội dung/Người phối hợp/Hạn xử lý —
//   thuần UX, KHÔNG phải chốt chặn bảo mật.
// - Server Action (updateKetQuaGhiChu trong ke-hoach.ts): chốt chặn THẬT SỰ — bắt buộc tự truy vấn
//   lại (nam, tuan, loai) của dòng từ DB rồi gọi lại đúng hàm này trước khi cho phép ghi đè Nội
//   dung/Người phối hợp/Hạn xử lý, để chặn trường hợp gọi thẳng server action bỏ qua UI.
export function isTrongKhungSuaFull(
  loai: "KEHOACH" | "BAOCAO",
  nam: number,
  tuan: number
): boolean {
  if (loai === "BAOCAO") {
    const ht = getCurrentWeekInfo();
    return nam === ht.nam && tuan === ht.tuan;
  }
  const nw = getNextWeekInfo();
  return nam === nw.nam && tuan === nw.tuan;
}

// ==========================================================================================
// ====================   CÙNG NGÀY HÔM NAY (dùng cho tính năng XOÁ)   =====================
// ==========================================================================================
// Dùng cho quy tắc "chỉ được xoá trong đúng ngày vừa nhập": so sánh theo NĂM/THÁNG/NGÀY local
// (giờ của môi trường đang chạy hàm này) — CHỈ dùng để ẩn/hiện nút Xoá ở client cho gọn; chốt chặn
// THẬT SỰ nằm ở server action xoaKeHoachBaoCao (ke-hoach.ts), tự so sánh lại y hệt cách này.
export function isCungNgayHomNay(d: Date | string): boolean {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// ==========================================================================================
// ====================   DANH SÁCH "TUẦN" GỘP CHUNG (KHÔNG CẦN CHỌN NĂM)  =================
// ==========================================================================================
// Trước đây UI có 2 dropdown riêng "Năm" + "Tuần". Nay gộp thành 1 dropdown "Tuần" duy nhất cho
// gọn — nhưng vẫn phải xử lý được trường hợp cuối năm (VD: đang ở tuần 52/2026, cần lập Kế hoạch
// cho "Tuần 1" của năm 2027). Giải pháp: liệt kê hết các tuần của năm `namGoc`, rồi nối thêm vài
// tuần đầu của năm kế tiếp vào cuối danh sách (đánh dấu rõ năm trong label để không nhầm).
export type TuanOption = { nam: number; tuan: number; label: string; value: string };

export function getTuanOptions(
  namGoc: number,
  options?: {
    // Số tuần đầu năm SAU được nối thêm vào cuối danh sách — dùng cho Kế hoạch (được phép lập cho
    // tương lai). Mặc định 0 = không nối (dùng cho Báo cáo, vì không báo cáo trước được).
    forwardExtraWeeksNextYear?: number;
    // Giới hạn chỉ liệt kê tới tuần này trong năm `namGoc` — dùng cho Báo cáo để chặn không cho
    // chọn tuần tương lai (VD: chỉ tới tuần hiện tại).
    maxTuan?: number;
  }
): TuanOption[] {
  const forwardExtra = options?.forwardExtraWeeksNextYear ?? 0;
  const tongSoTuan = isoWeeksInYear(namGoc);
  const gioiHanTuan = Math.min(options?.maxTuan ?? tongSoTuan, tongSoTuan);

  const list: TuanOption[] = [];
  for (let t = 1; t <= gioiHanTuan; t++) {
    list.push({ nam: namGoc, tuan: t, label: `Tuần ${t}`, value: `${namGoc}-${t}` });
  }

  // Chỉ nối thêm tuần đầu năm sau khi danh sách năm nay không bị giới hạn dở dang (maxTuan không
  // cắt trước khi hết năm) — đúng tinh thần "cho phép nhập tuần kế tiếp của năm sau" khi đã ở
  // cuối năm hiện tại.
  if (forwardExtra > 0 && gioiHanTuan >= tongSoTuan) {
    for (let t = 1; t <= forwardExtra; t++) {
      list.push({
        nam: namGoc + 1,
        tuan: t,
        label: `Tuần ${t} · ${namGoc + 1}`,
        value: `${namGoc + 1}-${t}`,
      });
    }
  }

  return list;
}

export function parseTuanOptionValue(value: string): { nam: number; tuan: number } {
  const [namStr, tuanStr] = value.split("-");
  return { nam: Number(namStr), tuan: Number(tuanStr) };
}
