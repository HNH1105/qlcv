"use client";

// Giao diện "Biên tập trước khi xuất Word" — trang Tra cứu Kế hoạch / Báo cáo (tab Phòng).
// Chỉ LĐ phòng + Admin (board tự ẩn nút với người khác; server action và route POST vẫn kiểm tra
// lại quyền).
//
// 2 danh sách, mỗi dòng luôn nằm ĐÚNG 1 trong 2:
//   ① Phòng — sẽ xuất Word (có tick). Bỏ tick → dòng chuyển xuống ②.
//   ② Cá nhân — không xuất (không tick). Tick → dòng chuyển lên ①.
// Trong mỗi nhóm phòng: dòng "gốc" của danh sách đó đứng trước, dòng vừa chuyển sang nằm CUỐI nhóm.
//
// KHÔNG ghi gì vào DB. Lựa chọn (overrides) do board cha giữ trong state — đóng/mở lại vẫn còn,
// chỉ mất khi tải lại trang (F5).

import { useEffect, useMemo, useState } from "react";
import { LoaiGhiNhan } from "@prisma/client";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { getDuLieuBienTapXuatWord, type BienTapRow } from "@/lib/actions/tra-cuu";
import { taiFileTuResponse } from "./tai-file";

// id -> true (đưa vào Phòng) / false (bỏ khỏi Phòng). Chỉ lưu các dòng KHÁC trạng thái gốc.
export type BienTapOverrides = Record<number, boolean>;

export default function BienTapXuatWordModal({
  isOpen,
  onClose,
  nam,
  tuan,
  loai,
  maPhong,
  overrides,
  onChangeOverrides,
}: {
  isOpen: boolean;
  onClose: () => void;
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  maPhong?: string;
  overrides: BienTapOverrides;
  onChangeOverrides: (next: BienTapOverrides) => void;
}) {
  const { show } = useToast();
  const isKeHoach = loai === "KEHOACH";
  const tenLoai = isKeHoach ? "kế hoạch" : "báo cáo";

  const [rows, setRows] = useState<BienTapRow[]>([]);
  // Board cha chỉ MOUNT component này khi đang mở — mỗi lần mở là 1 lần mount mới, nên bắt đầu
  // luôn ở trạng thái đang tải.
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [vuaChuyenId, setVuaChuyenId] = useState<number | null>(null);

  // Mỗi lần mở (= mỗi lần mount) đều tải dữ liệu mới nhất (có thể vừa có người nhập thêm) — lựa
  // chọn cũ vẫn giữ nhờ overrides theo id do board cha lưu. Cờ conHieuLuc bỏ qua kết quả về trễ
  // nếu người dùng đóng cửa sổ trước khi tải xong.
  useEffect(() => {
    let conHieuLuc = true;
    getDuLieuBienTapXuatWord({ nam, tuan, loai, maPhong })
      .then((data) => {
        if (conHieuLuc) setRows(data);
      })
      .catch((e) => {
        if (conHieuLuc) {
          show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra");
        }
      })
      .finally(() => {
        if (conHieuLuc) setIsLoading(false);
      });
    return () => {
      conHieuLuc = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan, loai, maPhong]);

  useEffect(() => {
    if (vuaChuyenId === null) return;
    const t = setTimeout(() => setVuaChuyenId(null), 1500);
    return () => clearTimeout(t);
  }, [vuaChuyenId]);

  const thuocPhong = (r: BienTapRow) => overrides[r.id] ?? r.laCuaPhong;

  // Sắp: theo phòng -> dòng gốc trước, dòng vừa chuyển sang cuối nhóm -> id (thứ tự nhập).
  // Khớp đúng thứ tự route POST dùng khi dựng file Word.
  const { dsPhong, dsCaNhan } = useMemo(() => {
    const sx = (a: BienTapRow, b: BienTapRow) => {
      if (a.thuTuPhong !== b.thuTuPhong) return a.thuTuPhong - b.thuTuPhong;
      if (a.maPhong !== b.maPhong) return a.maPhong < b.maPhong ? -1 : 1;
      const aChuyen = thuocPhong(a) !== a.laCuaPhong ? 1 : 0;
      const bChuyen = thuocPhong(b) !== b.laCuaPhong ? 1 : 0;
      if (aChuyen !== bChuyen) return aChuyen - bChuyen;
      return a.id - b.id;
    };
    return {
      dsPhong: rows.filter(thuocPhong).sort(sx),
      dsCaNhan: rows.filter((r) => !thuocPhong(r)).sort(sx),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, overrides]);

  const soBo = rows.filter((r) => r.laCuaPhong && !thuocPhong(r)).length;
  const soThem = rows.filter((r) => !r.laCuaPhong && thuocPhong(r)).length;

  function chuyen(r: BienTapRow, vaoPhong: boolean) {
    const next = { ...overrides };
    if (vaoPhong === r.laCuaPhong) delete next[r.id];
    else next[r.id] = vaoPhong;
    onChangeOverrides(next);
    setVuaChuyenId(r.id);
  }

  async function handleXuatWord() {
    if (dsPhong.length === 0) {
      show("error", "Không có gì để xuất", `Danh sách ${tenLoai} phòng đang trống`);
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch("/api/xuat-word/phong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nam, tuan, loai, maPhong, ids: dsPhong.map((r) => r.id) }),
      });
      await taiFileTuResponse(res, `${loai}_Tuan_${tuan}_${nam}.docx`);
    } catch (e) {
      show("error", "Xuất Word thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[900px] lg:max-w-[1280px]">
      {/* Khung cao cố định vừa màn hình (trừ lề 2rem, tối đa 900px): tiêu đề + chân cố định, 2
          danh sách chia đôi phần còn lại và TỰ CUỘN bên trong — không bao giờ vượt chiều cao
          trình duyệt dù danh sách dài. */}
      <div className="flex h-[calc(100dvh-2rem)] max-h-[900px] flex-col p-5 sm:p-6">
      <div className="shrink-0 pr-12">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Biên tập {tenLoai} phòng trước khi xuất Word
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Tuần {tuan}/{nam} · Chỉ tạm thời, không lưu vào hệ thống — tải lại trang (F5) sẽ trở về ban đầu
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
          {/* Điện thoại / màn nhỏ: 2 danh sách xếp TRÊN - DƯỚI. Máy tính (lg trở lên): SONG SONG
              trái - phải, mỗi bên tự cuộn. */}
          <KhoiDanhSach
            tieuDe={`① ${isKeHoach ? "Kế hoạch" : "Báo cáo"} phòng — sẽ xuất Word`}
            goiY="Bỏ tick → chuyển sang ②"
            rows={dsPhong}
            daTick
            vuaChuyenId={vuaChuyenId}
            onToggle={(r) => chuyen(r, false)}
            nhan={(r) => (!r.laCuaPhong ? { text: "Thêm từ cá nhân", kieu: "them" } : null)}
            rong={`Chưa có ${tenLoai} nào sẽ được xuất`}
          />

          <div className="shrink-0 self-center text-sm leading-none text-gray-400">
            <span className="lg:hidden">⇅</span>
            <span className="hidden lg:inline">⇄</span>
          </div>

          <KhoiDanhSach
            tieuDe={`② ${isKeHoach ? "Kế hoạch" : "Báo cáo"} cá nhân — không xuất`}
            goiY="Tick → chuyển sang ①"
            rows={dsCaNhan}
            daTick={false}
            vuaChuyenId={vuaChuyenId}
            onToggle={(r) => chuyen(r, true)}
            nhan={(r) => (r.laCuaPhong ? { text: "Bỏ khỏi phòng", kieu: "bo" } : null)}
            rong={`Không có ${tenLoai} cá nhân nào ngoài phòng`}
          />
        </div>
      )}

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Đã bỏ {soBo} · Đã thêm {soThem} · Sẽ xuất {dsPhong.length} mục
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onChangeOverrides({})}
            disabled={soBo + soThem === 0}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Khôi phục ban đầu
          </button>
          <button
            onClick={handleXuatWord}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {isExporting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                Đang xuất...
              </>
            ) : (
              <>⬇ Xuất Word ({dsPhong.length} mục)</>
            )}
          </button>
        </div>
      </div>
      </div>
    </Modal>
  );
}

function KhoiDanhSach({
  tieuDe,
  goiY,
  rows,
  daTick,
  vuaChuyenId,
  onToggle,
  nhan,
  rong,
}: {
  tieuDe: string;
  goiY: string;
  rows: BienTapRow[];
  daTick: boolean;
  vuaChuyenId: number | null;
  onToggle: (r: BienTapRow) => void;
  nhan: (r: BienTapRow) => { text: string; kieu: "them" | "bo" } | null;
  rong: string;
}) {
  // Gom các dòng liên tiếp cùng phòng (rows đã sắp theo phòng).
  const nhom: { maPhong: string; tenPhong: string; rows: BienTapRow[] }[] = [];
  for (const r of rows) {
    const last = nhom[nhom.length - 1];
    if (last && last.maPhong === r.maPhong) last.rows.push(r);
    else nhom.push({ maPhong: r.maPhong, tenPhong: r.tenPhong, rows: [r] });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-gray-200 dark:border-white/[0.08]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/[0.05]">
        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {tieuDe} ({rows.length})
        </span>
        <span className="text-xs text-gray-400">{goiY}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {nhom.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">{rong}</p>
        ) : (
          nhom.map((g, gi) => (
            <div key={g.maPhong}>
              <p className="bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
                {gi + 1}/ {g.tenPhong}
              </p>
              {g.rows.map((r) => {
                const n = nhan(r);
                return (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-start gap-3 border-t border-gray-100 px-4 py-2.5 transition-colors duration-700 hover:bg-gray-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03] ${
                      vuaChuyenId === r.id ? "bg-blue-50 dark:bg-blue-500/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={daTick}
                      onChange={() => onToggle(r)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm text-gray-800 dark:text-white/90">
                        {r.noiDung}
                        {n && (
                          <span
                            className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-xs font-medium ${
                              n.kieu === "them"
                                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                            }`}
                          >
                            {n.text}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">Người nhập: {r.nguoiTao.hoTen}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
