"use client";

import type { KeHoachToanPhongRow } from "@/lib/actions/ke-hoach";

// Dùng chung cho 2 trang mới ở menu lãnh đạo: "Kế hoạch (Toàn bộ phòng)" và "Báo cáo (Toàn bộ
// phòng)". Trước đây phần này nằm trong tab "Toàn bộ" của KeHoachBaoCaoBoard — nay tách hẳn ra
// trang riêng theo yêu cầu (bắt vào menu bên trái, không bắt theo tab nữa).
//
// - Kế hoạch: lãnh đạo CHỈ có hành động "Chuyển thành Kế hoạch Phòng" cho từng dòng, KHÔNG được
//   sửa/cập nhật nội dung của cá nhân (đúng yêu cầu, giữ nguyên hành vi cũ).
// - Báo cáo: chỉ xem, không có hành động gì cả (truyền onConvert={undefined}).
//
// Nhãn "Đã chuyển Phòng" dùng ĐÚNG style badge tím giống bên card cá nhân (KehoachBaoCaoItemCard)
// để đồng bộ giao diện giữa 2 nơi.
export default function ToanBoPhongList({
  rows,
  onConvert,
  loai,
}: {
  rows: KeHoachToanPhongRow[];
  onConvert?: (id: number) => void;
  // Báo cáo KHÔNG có khái niệm "hoàn thành/chưa hoàn thành" (đó là field mặc định false trong DB,
  // chỉ có ý nghĩa với Kế hoạch) — dùng loai để ẩn dòng trạng thái này khi render Báo cáo, tránh
  // hiện nhầm "Chưa hoàn thành" cho mọi báo cáo như bug vừa gặp.
  loai: "KEHOACH" | "BAOCAO";
}) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-400">Chưa có dữ liệu nào trong tuần này.</p>;
  }

  // Gom nhóm theo nhân viên cho dễ theo dõi
  const groups = new Map<string, { hoTen: string; items: KeHoachToanPhongRow[] }>();
  for (const r of rows) {
    const key = r.nguoiThucHien?.maNV ?? "khac";
    if (!groups.has(key)) {
      groups.set(key, { hoTen: r.nguoiThucHien?.hoTen ?? "Không rõ", items: [] });
    }
    groups.get(key)!.items.push(r);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([maNV, group]) => (
        <div key={maNV}>
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {group.hoTen}
          </p>
          <div className="space-y-2">
            {group.items.map((row) => (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm text-gray-800 dark:text-white/90">
                    {row.noiDung}
                    {row.daChuyenPhong && (
                      <span className="ml-2 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 align-middle text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                        Đã chuyển Phòng
                      </span>
                    )}
                  </p>
                  {row.ketQua && (
                    <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                      Kết quả: {row.ketQua}
                    </p>
                  )}
                  {row.ghiChu && (
                    <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                      Ghi chú: {row.ghiChu}
                    </p>
                  )}
                  {loai === "KEHOACH" && (
                    <p
                      className={`mt-1 text-xs ${row.daHoanThanh ? "text-success-600" : "text-error-600"}`}
                    >
                      {row.daHoanThanh ? "Đã hoàn thành" : "Chưa hoàn thành"}
                    </p>
                  )}
                </div>
                {onConvert && !row.daChuyenPhong && (
                  <button
                    onClick={() => onConvert(row.id)}
                    className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 dark:bg-white/5 dark:text-gray-300"
                  >
                    → Chuyển {loai === "KEHOACH" ? "KH" : "BC"} Phòng
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
