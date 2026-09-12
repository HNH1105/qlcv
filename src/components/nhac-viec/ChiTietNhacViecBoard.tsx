// ĐÍCH: src/components/nhac-viec/ChiTietNhacViecBoard.tsx
// Trang chi tiết DÙNG CHUNG cho Nhiệm vụ + Kế hoạch cá nhân + Kế hoạch phòng — đọc 3 query param
// nguon/phamvi/tinhtrang (+ vaitro riêng cho nhiệm vụ phạm vi cá nhân), tự suy tiêu đề + gọi đúng
// action, KHÔNG tạo trang riêng cho từng loại (đúng mục 6, 9 đặc tả).
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getChiTietNhiemVu, type NhiemVuNhacViecRow } from "@/lib/nhac-viec/nhiem-vu";
import { getChiTietKeHoach, type KeHoachNhacViecRow } from "@/lib/nhac-viec/ke-hoach";
import { formatDateVN } from "@/lib/week";

const NHAN_NGUON: Record<string, string> = {
  nhiemvu: "Nhiệm vụ",
  "kehoach-canhan": "Kế hoạch cá nhân",
  "kehoach-phong": "Kế hoạch phòng",
};
const NHAN_PHAMVI: Record<string, string> = { canhan: "của tôi", phong: "phòng", coquan: "toàn cơ quan" };
const NHAN_TINHTRANG: Record<string, string> = {
  tong: "Tất cả", chophancong: "Chờ phân công", choduyet: "Chờ duyệt", dangxuly: "Đang xử lý",
  sapdenhan: "Sắp đến hạn", quahan: "Quá hạn", tamdung: "Tạm dừng", dahuy: "Đã huỷ",
  hoanthanh: "Hoàn thành", "hoanthanh-dunghan": "Hoàn thành đúng hạn", "hoanthanh-quahan": "Hoàn thành quá hạn",
  chuaxuly: "Chưa xử lý", chuaxulyquahan: "Chưa xử lý quá hạn",
};

export default function ChiTietNhacViecBoard() {
  const sp = useSearchParams();
  const nguon = sp.get("nguon") ?? "";
  const phamvi = sp.get("phamvi") ?? "";
  const tinhtrang = sp.get("tinhtrang") ?? "tong";
  const vaitro = sp.get("vaitro") as "xulychinh" | "phoihop" | undefined;

  const [dsNhiemVu, setDsNhiemVu] = useState<NhiemVuNhacViecRow[] | null>(null);
  const [dsKeHoach, setDsKeHoach] = useState<KeHoachNhacViecRow[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    setDsNhiemVu(null);
    setDsKeHoach(null);
    setLoi(null);

    if (nguon === "nhiemvu") {
      getChiTietNhiemVu(phamvi as "canhan" | "phong" | "coquan", tinhtrang, vaitro)
        .then(setDsNhiemVu)
        .catch((e) => setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra"));
    } else if (nguon === "kehoach-canhan" || nguon === "kehoach-phong") {
      getChiTietKeHoach(phamvi as "canhan" | "phong", tinhtrang)
        .then(setDsKeHoach)
        .catch((e) => setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra"));
    }
  }, [nguon, phamvi, tinhtrang, vaitro]);

  const tieuDe = `${NHAN_NGUON[nguon] ?? nguon} – ${vaitro === "phoihop" ? "Phối hợp" : vaitro === "xulychinh" ? "Xử lý chính" : NHAN_PHAMVI[phamvi] ?? phamvi} – ${NHAN_TINHTRANG[tinhtrang] ?? tinhtrang}`;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tieuDe}</h1>

      {loi && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">{loi}</div>
      )}

      {nguon === "nhiemvu" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {!dsNhiemVu ? (
            <div className="py-12 text-center text-gray-400">Đang tải...</div>
          ) : dsNhiemVu.length === 0 ? (
            <p className="py-12 text-center text-gray-400">Không có nhiệm vụ nào.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Nội dung</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Người xử lý</th>
                  <th className="px-4 py-3">Hạn xử lý</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {dsNhiemVu.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/nhiem-vu/${r.id}`} className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90">{r.tieuDe}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.tenPhongChuTri}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.nguoiXuLyChinh ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.hanXuLy ? formatDateVN(r.hanXuLy) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.trangThai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(nguon === "kehoach-canhan" || nguon === "kehoach-phong") && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {!dsKeHoach ? (
            <div className="py-12 text-center text-gray-400">Đang tải...</div>
          ) : dsKeHoach.length === 0 ? (
            <p className="py-12 text-center text-gray-400">Không có kế hoạch nào.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Tuần</th>
                  <th className="px-4 py-3">Nội dung</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Người tạo</th>
                  <th className="px-4 py-3">Hạn xử lý</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {dsKeHoach.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.tuan}/{r.nam}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{r.noiDung}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.tenPhong}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.nguoiTao}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.hanXuLy ? formatDateVN(r.hanXuLy) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.daHoanThanh ? "Hoàn thành" : "Chưa xử lý"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
