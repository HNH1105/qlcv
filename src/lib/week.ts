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

export function getWeekDateRangeLabel(nam: number, tuan: number): string {
  const start = getISOWeekStart(nam, tuan);
  const end = getISOWeekEnd(nam, tuan);
  return `${formatDateVN(start)} đến ${formatDateVN(end)}`;
}

export function getCurrentWeekInfo(): { nam: number; tuan: number } {
  const { week, year } = getISOWeek(new Date());
  return { nam: year, tuan: week };
}
