"use client";

// Dòng chữ "Tuần 47 (16-22/11/2026)" (số tuần hiện tại) hiển thị dưới chữ "Hệ thống QLCV" (thanh bên trên web và
// thanh đầu trang trên mobile).
//
// Tính theo NGÀY GIỜ CỦA TRÌNH DUYỆT người dùng (giờ Việt Nam), không tính ở server — server có
// thể chạy giờ UTC, lệch 7 tiếng, sáng thứ 2 sẽ hiện nhầm tuần cũ. Vì vậy:
// - Lúc render ở server trả về null (getServerSnapshot) → không lệch nội dung khi hydrate.
// - Ở trình duyệt tự kiểm tra lại mỗi phút, để trang mở qua nửa đêm Chủ nhật → thứ 2 tự đổi tuần.
import { useSyncExternalStore } from "react";
import { getCurrentWeekInfo, getISOWeekStart, getISOWeekEnd } from "@/lib/week";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// VD: "Tuần 47 (16-22/11/2026)" — cùng tháng "16-22/11/2026"; khác tháng "30/11-06/12/2026"; khác năm "29/12/2025-04/01/2026".
function taoNhanTuanHienTai(): string {
  const { nam, tuan } = getCurrentWeekInfo();
  const s = getISOWeekStart(nam, tuan);
  const e = getISOWeekEnd(nam, tuan);
  const [sd, sm, sy] = [s.getUTCDate(), s.getUTCMonth() + 1, s.getUTCFullYear()];
  const [ed, em, ey] = [e.getUTCDate(), e.getUTCMonth() + 1, e.getUTCFullYear()];

  let khoang: string;
  if (sy !== ey) khoang = `${pad(sd)}/${pad(sm)}/${sy}-${pad(ed)}/${pad(em)}/${ey}`;
  else if (sm !== em) khoang = `${pad(sd)}/${pad(sm)}-${pad(ed)}/${pad(em)}/${ey}`;
  else khoang = `${pad(sd)}-${pad(ed)}/${pad(em)}/${ey}`;

  return `Tuần ${tuan} (${khoang})`;
}

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

export default function TuanHienTaiLabel({ className }: { className?: string }) {
  const nhan = useSyncExternalStore(subscribe, taoNhanTuanHienTai, () => null);
  if (!nhan) return null;
  return <span className={className}>{nhan}</span>;
}
