"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaiGhiNhan } from "@prisma/client";
import { getCurrentWeekInfo, getWeekDateRangeLabel, formatDateVN } from "@/lib/week";
import { traCuuKeHoachBaoCao, type TraCuuRow } from "@/lib/actions/tra-cuu";
import { getPhongList } from "@/lib/actions/danh-muc";
import WeekSelect from "@/components/ca-nhan/WeekSelect";
import ProgressBar from "@/components/ca-nhan/ProgressBar";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";

type Tab = "canhan" | "phong";
type Phong = { maPhong: string; tenPhong: string };
// Trạng thái xử lý — CHỈ áp dụng cho Kế hoạch (Báo cáo không có khái niệm hoàn thành), giống hệt
// bộ lọc đang có ở "Kế hoạch (Toàn bộ phòng)" bên menu Cá nhân.
type XuLyFilter = "tatCa" | "daXuLy" | "chuaXuLy";

const XU_LY_FILTERS: { key: XuLyFilter; label: string }[] = [
  { key: "tatCa", label: "Tất cả (đã/chưa xử lý)" },
  { key: "daXuLy", label: "Đã xử lý" },
  { key: "chuaXuLy", label: "Chưa xử lý" },
];

// Trang TRA CỨU — dùng chung cho "/tra-cuu/ke-hoach" và "/tra-cuu/bao-cao".
// 2 tab: "Cá nhân" (gom theo Phòng -> theo từng người) và "Phòng" (gom theo Phòng, danh sách
// phẳng — vì bản thân dòng cấp Phòng không thuộc riêng 1 người). Có dropdown chọn phạm vi xem:
// "Tất cả các phòng" (toàn cơ quan, mặc định) hoặc 1 phòng cụ thể. Hiển thị ĐẦY ĐỦ nội dung: nội
// dung, kết quả, phối hợp, ghi chú — khác bản Xuất Word (chỉ lấy nội dung).
export default function TraCuuBoard({ loai }: { loai: LoaiGhiNhan }) {
  return (
    <ToastProvider>
      <Content loai={loai} />
    </ToastProvider>
  );
}

function Content({ loai }: { loai: LoaiGhiNhan }) {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const { show } = useToast();
  const isKeHoach = loai === "KEHOACH";
  const tenLoai = isKeHoach ? "Kế hoạch" : "Báo cáo";

  const [tab, setTab] = useState<Tab>("canhan");
  const [nam, setNam] = useState(namHienTai);
  const [tuan, setTuan] = useState(tuanHienTai);
  const [maPhongFilter, setMaPhongFilter] = useState<string>("TATCA");
  const [xuLyFilter, setXuLyFilter] = useState<XuLyFilter>("tatCa");
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [rows, setRows] = useState<TraCuuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getPhongList().then(setPhongList);
  }, []);

  const reload = useCallback(() => {
    setIsLoading(true);
    traCuuKeHoachBaoCao({
      nam,
      tuan,
      loai,
      phamVi: tab,
      maPhong: maPhongFilter === "TATCA" ? undefined : maPhongFilter,
    })
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan, loai, tab, maPhongFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Áp bộ lọc Đã/Chưa xử lý TRƯỚC khi gom nhóm theo phòng — chỉ có tác dụng với Kế hoạch.
  const filteredRows = useMemo(() => {
    if (!isKeHoach || xuLyFilter === "tatCa") return rows;
    return rows.filter((r) => (xuLyFilter === "daXuLy" ? r.daHoanThanh : !r.daHoanThanh));
  }, [rows, xuLyFilter, isKeHoach]);

  // Gom theo Phòng — GIỮ NGUYÊN thứ tự server đã trả về (đã orderBy theo thuTu của phòng).
  const phongGroups = useMemo(() => {
    const groups: { maPhong: string; tenPhong: string; rows: TraCuuRow[] }[] = [];
    for (const r of filteredRows) {
      const last = groups[groups.length - 1];
      if (last && last.maPhong === r.maPhong) {
        last.rows.push(r);
      } else {
        groups.push({ maPhong: r.maPhong, tenPhong: r.tenPhong, rows: [r] });
      }
    }
    return groups;
  }, [filteredRows]);

  const wordUrl = useMemo(() => {
    const sp = new URLSearchParams({ nam: String(nam), tuan: String(tuan), loai });
    if (maPhongFilter !== "TATCA") sp.set("maPhong", maPhongFilter);
    return `/api/xuat-word/phong?${sp.toString()}`;
  }, [nam, tuan, loai, maPhongFilter]);

  // Trước đây dùng thẻ <a href> điều hướng thẳng — trình duyệt tự tải nhưng KHÔNG có cách nào biết
  // lúc nào xong để tắt hiệu ứng loading. Đổi sang tự fetch() lấy blob rồi tự tạo link tải, để có
  // state isExporting điều khiển spinner trên nút trong lúc chờ server dựng file Word.
  async function handleExportWord() {
    setIsExporting(true);
    try {
      const res = await fetch(wordUrl);
      if (!res.ok) throw new Error("Xuất Word thất bại, vui lòng thử lại");
      const blob = await res.blob();

      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const tenFile = match?.[1] ? decodeURIComponent(match[1]) : `${loai}_Tuan_${tuan}_${nam}.docx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tenFile;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      show("error", "Xuất Word thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setTab("canhan")}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === "canhan"
                  ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Cá nhân
            </button>
            <button
              onClick={() => setTab("phong")}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === "phong"
                  ? "bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Phòng
            </button>
          </div>

          <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />

          <select
            value={maPhongFilter}
            onChange={(e) => setMaPhongFilter(e.target.value)}
            className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="TATCA">Tất cả các phòng</option>
            {phongList.map((p) => (
              <option key={p.maPhong} value={p.maPhong}>
                {p.tenPhong}
              </option>
            ))}
          </select>

          {isKeHoach && (
            <select
              value={xuLyFilter}
              onChange={(e) => setXuLyFilter(e.target.value as XuLyFilter)}
              className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {XU_LY_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Xuất Word chỉ có ở tab Phòng — đúng yêu cầu, và áp dụng cho cả Kế hoạch lẫn Báo cáo
            Phòng vì cùng 1 định dạng xuất, chỉ đổi tiêu đề "KẾ HOẠCH"/"BÁO CÁO". */}
        {tab === "phong" && (
          <button
            onClick={handleExportWord}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {isExporting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                Đang xuất...
              </>
            ) : (
              <>⬇ Xuất Word</>
            )}
          </button>
        )}
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <p className="text-xs text-gray-400">
          {tenLoai} — Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Đang tải...
          </div>
        ) : phongGroups.length === 0 ? (
          <p className="py-12 text-center text-gray-400">Không có dữ liệu cho tuần này.</p>
        ) : (
          phongGroups.map((g, gi) => (
            <PhongGroup
              key={g.maPhong}
              index={gi + 1}
              tenPhong={g.tenPhong}
              rows={g.rows}
              tab={tab}
              loai={loai}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PhongGroup({
  index,
  tenPhong,
  rows,
  tab,
  loai,
}: {
  index: number;
  tenPhong: string;
  rows: TraCuuRow[];
  tab: Tab;
  loai: LoaiGhiNhan;
}) {
  return (
    <div className="border-l-2 border-brand-400 pl-4">
      <p className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
        {index}/ {tenPhong}
      </p>
      {tab === "canhan" ? (
        <CaNhanTrongPhong rows={rows} loai={loai} />
      ) : (
        <DanhSachMuc items={rows} loai={loai} showNguoiNhap />
      )}
    </div>
  );
}

// Gom các dòng cùng 1 phòng theo TỪNG NGƯỜI — đúng bố cục ảnh mẫu ("1. Nguyễn Chí Tình",
// "2. Phạm Khắc Dũng"...). Không cần showNguoiNhap trên từng mục nữa vì đã ghi rõ tên ở tiêu đề
// nhóm rồi, lặp lại sẽ thừa.
function CaNhanTrongPhong({ rows, loai }: { rows: TraCuuRow[]; loai: LoaiGhiNhan }) {
  const groups: { maNV: string; hoTen: string; rows: TraCuuRow[] }[] = [];
  for (const r of rows) {
    const key = r.nguoiTao.maNV;
    const last = groups.find((g) => g.maNV === key);
    if (last) {
      last.rows.push(r);
    } else {
      groups.push({ maNV: key, hoTen: r.nguoiTao.hoTen, rows: [r] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={g.maNV}>
          <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            {gi + 1}. {g.hoTen}
          </p>
          <div className="pl-4">
            <DanhSachMuc items={g.rows} loai={loai} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Danh sách đánh số — hiển thị ĐẦY ĐỦ: nội dung, kết quả, phối hợp, ghi chú (nếu có). Icon ✓/✗ chỉ
// có ở Kế hoạch (Báo cáo không có khái niệm hoàn thành).
function DanhSachMuc({
  items,
  loai,
  showNguoiNhap,
}: {
  items: TraCuuRow[];
  loai: LoaiGhiNhan;
  showNguoiNhap?: boolean;
}) {
  const isKeHoach = loai === "KEHOACH";
  return (
    <div className="space-y-3">
      {items.map((r, i) => (
        <div key={r.id} className="flex gap-2 text-sm">
          {isKeHoach && (
            <span
              className={`mt-0.5 shrink-0 font-bold leading-none ${
                r.daHoanThanh ? "text-success-500" : "text-error-500"
              }`}
            >
              {r.daHoanThanh ? "✓" : "✗"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words text-gray-800 dark:text-white/90">
              {i + 1}. {r.noiDung}
            </p>
            {showNguoiNhap && (
              <p className="mt-0.5 text-xs text-gray-400">Người nhập: {r.nguoiTao.hoTen}</p>
            )}
            {r.ketQua && (
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">Kết quả: {r.ketQua}</p>
            )}
            {r.nguoiPhoiHop.length > 0 && (
              <p className="mt-0.5 text-xs text-purple-600 dark:text-purple-400">
                Phối hợp: {r.nguoiPhoiHop.map((p) => p.hoTen).join(", ")}
              </p>
            )}
            {r.ghiChu && (
              <p className="mt-0.5 text-xs italic text-gray-400">Ghi chú: {r.ghiChu}</p>
            )}
            {isKeHoach && (r.hanXuLy || (r.tienDo != null && r.tienDo > 0)) && (
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                {r.tienDo != null && r.tienDo > 0 && (
                  <div className="w-full max-w-md">
                    <ProgressBar percent={r.tienDo} />
                  </div>
                )}
                {r.hanXuLy && (
                  <span
                    className={`shrink-0 text-xs font-medium sm:ml-auto ${
                      !r.daHoanThanh && new Date(r.hanXuLy) < new Date()
                        ? "text-error-600"
                        : "text-gray-400"
                    }`}
                  >
                    Hạn xử lý: {formatDateVN(new Date(r.hanXuLy))}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
