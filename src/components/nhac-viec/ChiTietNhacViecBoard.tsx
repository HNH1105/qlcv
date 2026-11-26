// ĐÍCH: src/components/nhac-viec/ChiTietNhacViecBoard.tsx
// Trang chi tiết DÙNG CHUNG cho Nhiệm vụ + Kế hoạch cá nhân + Kế hoạch phòng — đọc 3 query param
// nguon/phamvi/tinhtrang (+ vaitro riêng cho nhiệm vụ phạm vi cá nhân), tự suy tiêu đề + gọi đúng
// action, KHÔNG tạo trang riêng cho từng loại (đúng mục 6, 9 đặc tả).
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getChiTietNhiemVu, type NhiemVuNhacViecRow } from "@/lib/nhac-viec/nhiem-vu";
import { getChiTietKeHoachDayDu } from "@/lib/nhac-viec/ke-hoach";
import type { KeHoachRow } from "@/lib/actions/ke-hoach";
import { formatDateVN, getWeekDateRangeLabel } from "@/lib/week";
import { useAuth } from "@/context/AuthContext";
import ToastProvider from "@/components/ca-nhan/ToastProvider";
import KeHoachBaoCaoItemCard from "@/components/ca-nhan/KehoachBaoCaoItemCard";

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

// Card kế hoạch (KeHoachBaoCaoItemCard) dùng thông báo toast -> bọc ToastProvider như các board khác.
export default function ChiTietNhacViecBoard() {
  return (
    <ToastProvider>
      <ChiTietNhacViecContent />
    </ToastProvider>
  );
}

function ChiTietNhacViecContent() {
  const sp = useSearchParams();
  const user = useAuth();
  const laLanhDao = user?.quyen === "LANHDAOPHONG" || user?.quyen === "LANHDAODONVI";
  const nguon = sp.get("nguon") ?? "";
  const phamvi = sp.get("phamvi") ?? "";
  const tinhtrang = sp.get("tinhtrang") ?? "tong";
  const vaitro = sp.get("vaitro") as "xulychinh" | "phoihop" | undefined;

  // Dữ liệu gắn KHOÁ theo bộ tham số đã dùng để tải (+ số lần tải lại sau mỗi thao tác trên card):
  // khoá chưa khớp = đang tải; kết quả của lần tải cũ về trễ bị bỏ qua.
  const [lanTai, setLanTai] = useState(0);
  const khoa = `${nguon}|${phamvi}|${tinhtrang}|${vaitro ?? ""}|${lanTai}`;
  const [ketQua, setKetQua] = useState<{
    khoa: string;
    dsNhiemVu: NhiemVuNhacViecRow[] | null;
    dsKeHoach: KeHoachRow[] | null;
    loi: string | null;
  } | null>(null);
  const daTaiXong = ketQua?.khoa === khoa;
  // Tải lại sau thao tác: GIỮ danh sách đang hiện trong lúc chờ (không nháy "Đang tải...").
  const dsNhiemVu = ketQua?.dsNhiemVu ?? null;
  const dsKeHoach = ketQua?.dsKeHoach ?? null;
  const loi = daTaiXong ? ketQua!.loi : null;

  useEffect(() => {
    let conHieuLuc = true;
    const k = khoa;
    const xong = (dl: { dsNhiemVu?: NhiemVuNhacViecRow[]; dsKeHoach?: KeHoachRow[]; loi?: string }) => {
      if (conHieuLuc) {
        setKetQua({ khoa: k, dsNhiemVu: dl.dsNhiemVu ?? null, dsKeHoach: dl.dsKeHoach ?? null, loi: dl.loi ?? null });
      }
    };
    const baoLoi = (e: unknown) => xong({ loi: e instanceof Error ? e.message : "Có lỗi xảy ra" });

    if (nguon === "nhiemvu") {
      getChiTietNhiemVu(phamvi as "canhan" | "phong" | "coquan", tinhtrang, vaitro)
        .then((ds) => xong({ dsNhiemVu: ds }))
        .catch(baoLoi);
    } else if (nguon === "kehoach-canhan" || nguon === "kehoach-phong") {
      getChiTietKeHoachDayDu(phamvi as "canhan" | "phong", tinhtrang)
        .then((ds) => xong({ dsKeHoach: ds }))
        .catch(baoLoi);
    }
    return () => {
      conHieuLuc = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoa]);

  // Đổi sang bộ tham số khác (khác tình trạng/nguồn) thì xoá danh sách cũ, hiện "Đang tải...".
  const khoaKhongTinhLanTai = khoa.slice(0, khoa.lastIndexOf("|"));
  const cungBoThamSo = !!ketQua && ketQua.khoa.slice(0, ketQua.khoa.lastIndexOf("|")) === khoaKhongTinhLanTai;
  const dsNhiemVuHienThi = cungBoThamSo ? dsNhiemVu : null;
  const dsKeHoachHienThi = cungBoThamSo ? dsKeHoach : null;

  const tieuDe = `${NHAN_NGUON[nguon] ?? nguon} – ${vaitro === "phoihop" ? "Phối hợp" : vaitro === "xulychinh" ? "Xử lý chính" : NHAN_PHAMVI[phamvi] ?? phamvi} – ${NHAN_TINHTRANG[tinhtrang] ?? tinhtrang}`;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">{tieuDe}</h1>

      {loi && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">{loi}</div>
      )}

      {nguon === "nhiemvu" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {!dsNhiemVuHienThi ? (
            <div className="py-12 text-center text-gray-400">{loi ? "" : "Đang tải..."}</div>
          ) : dsNhiemVuHienThi.length === 0 ? (
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
                {dsNhiemVuHienThi.map((r) => (
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

      {/* Kế hoạch: hiển thị bằng đúng card của màn Cá nhân -> Kế hoạch, có menu 3 chấm để thao tác
          (hoàn thành / bỏ hoàn thành, cập nhật kết quả - ghi chú - tiến độ, xem chi tiết, sửa / xoá /
          đánh dấu theo đúng quy tắc khung tuần & quyền sẵn có). Với Kế hoạch phòng: giống màn Phòng
          (không có "Đánh dấu là KH Phòng"; lãnh đạo có thêm "Loại khỏi phòng"). Sau mỗi thao tác tải
          lại danh sách — mục không còn thuộc tình trạng đang xem sẽ tự rời khỏi danh sách. */}
      {(nguon === "kehoach-canhan" || nguon === "kehoach-phong") && (
        !dsKeHoachHienThi ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {loi ? "" : "Đang tải..."}
          </div>
        ) : dsKeHoachHienThi.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
            Không có kế hoạch nào.
          </p>
        ) : (
          <div className="space-y-3">
            {dsKeHoachHienThi.map((row, i) => {
              const tuanMoi = i === 0 || dsKeHoachHienThi[i - 1].nam !== row.nam || dsKeHoachHienThi[i - 1].tuan !== row.tuan;
              return (
                <div key={row.id} className="space-y-1.5">
                  {tuanMoi && (
                    <p className="pt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Tuần {row.tuan}/{row.nam} — {getWeekDateRangeLabel(row.nam, row.tuan)}
                    </p>
                  )}
                  <KeHoachBaoCaoItemCard
                    row={row}
                    loai="KEHOACH"
                    onChanged={() => setLanTai((n) => n + 1)}
                    nguoiTao={nguon === "kehoach-phong" ? row.nguoiTao : undefined}
                    allowConvertToPhong={nguon === "kehoach-canhan"}
                    allowRemoveFromPhong={nguon === "kehoach-phong" && laLanhDao}
                  />
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
