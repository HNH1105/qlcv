"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaiGhiNhan } from "@prisma/client";
import { getCurrentWeekInfo, isoWeeksInYear, getWeekDateRangeLabel } from "@/lib/week";
import {
  getKeHoachCaNhan,
  danhDauLaCuaPhongBulk,
  markHoanThanh,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import { useModal } from "@/hooks/useModal";
import AddKeHoachBaoCaoModal from "./AddKeHoachBaoCaoModal";
import KeHoachBaoCaoItemCard from "./KehoachBaoCaoItemCard";
import UpdateResultModal from "./UpdateResultModal";
import ConfirmDialog from "./ConfirmDialog";
import WeekSelect from "./WeekSelect";
import ToastProvider, { useToast } from "./ToastProvider";

// "toanBo" (xem toàn bộ kế hoạch của cả phòng, dành cho lãnh đạo) đã được TÁCH RA thành trang
// riêng ở menu bên trái ("Kế hoạch (Toàn bộ phòng)" / "Báo cáo (Toàn bộ phòng)") — xem
// KeHoachToanPhongBoard.tsx / BaoCaoToanPhongBoard.tsx. Board này chỉ còn lo đúng 1 việc: kế
// hoạch/báo cáo CỦA CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP.
type StatusTab = "tatCa" | "chuaThucHien" | "daThucHien" | "daChuyenPhong" | "chuaChuyenPhong";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "tatCa", label: "Tất cả trạng thái" },
  { key: "chuaThucHien", label: "Chưa thực hiện" },
  { key: "daThucHien", label: "Đã thực hiện" },
  { key: "daChuyenPhong", label: "Đã đánh dấu cấp Phòng" },
  { key: "chuaChuyenPhong", label: "Chưa đánh dấu cấp phòng" },
];

export default function KeHoachBaoCaoBoard({ loai }: { loai: LoaiGhiNhan }) {
  return (
    <ToastProvider>
      <BoardContent loai={loai} />
    </ToastProvider>
  );
}

function BoardContent({ loai }: { loai: LoaiGhiNhan }) {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const { show } = useToast();

  // Xử lý vắt qua năm mới cho "Tuần sau" (tuần 52/53 -> tuần 1 năm sau)
  let tuanSauMacDinh = tuanHienTai + 1;
  let namSauMacDinh = namHienTai;
  if (tuanSauMacDinh > isoWeeksInYear(namHienTai)) {
    tuanSauMacDinh = 1;
    namSauMacDinh = namHienTai + 1;
  }

  const isBaoCao = loai === "BAOCAO";
  const tenLoai = isBaoCao ? "Báo cáo" : "Kế hoạch";

  // Mặc định: BÁO CÁO -> Tuần hiện tại (báo cáo việc đã làm trong tuần); KẾ HOẠCH -> Tuần sau (lên
  // kế hoạch cho tuần sắp tới) — đúng quy ước bản Apps Script cũ.
  const [nam, setNam] = useState(isBaoCao ? namHienTai : namSauMacDinh);
  const [tuan, setTuan] = useState(isBaoCao ? tuanHienTai : tuanSauMacDinh);

  // Tab trạng thái — chỉ áp dụng cho Kế hoạch (Báo cáo không có khái niệm hoàn thành/chuyển
  // phòng). Hiển thị dưới dạng 1 dropdown gọn thay vì dãy nút, có thêm lựa chọn "Tất cả trạng
  // thái".
  const [statusTab, setStatusTab] = useState<StatusTab>("tatCa");

  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useModal();

  // Chọn nhiều để thao tác hàng loạt (chỉ Kế hoạch)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkConvertConfirmOpen, setIsBulkConvertConfirmOpen] = useState(false);
  const [isBulkConverting, setIsBulkConverting] = useState(false);
  const [isBulkMarkConfirmOpen, setIsBulkMarkConfirmOpen] = useState(false);
  const [isBulkMarking, setIsBulkMarking] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachCaNhan(nam, tuan, loai)
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan, loai]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ==================== [MỚI] XEM KÈM KẾ HOẠCH CÙNG TUẦN (chỉ màn Báo cáo) ====================
  // Kế hoạch tuần N (lên từ tuần N-1) là 1 phần của Báo cáo tuần N. Ô tick mặc định TẮT, không nhớ
  // qua lần vào sau. Khi bật: tải Kế hoạch CÁ NHÂN của CHÍNH người đang đăng nhập, ĐÚNG tuần đang
  // chọn, hiển thị phía DƯỚI danh sách Báo cáo bằng đúng KeHoachBaoCaoItemCard (loai="KEHOACH") —
  // nên mọi thao tác (hoàn thành, cập nhật kết quả/tiến độ, sửa, đánh dấu phòng...) dùng lại nguyên
  // logic + kiểm tra quyền/khung tuần sẵn có ở server, không viết thêm nhánh xử lý riêng nào.
  // Phần tải/hiển thị nằm trong component riêng KeHoachTuanNaySection (cuối file) — chỉ được MOUNT
  // khi ô tick bật, và gắn key theo tuần, nên tắt ô tick hoặc đổi tuần là component cũ bị huỷ hẳn
  // (không thể hiện nhầm dữ liệu tuần cũ, không cần tự dọn state).
  const [xemKemKeHoach, setXemKemKeHoach] = useState(false);

  // Đổi tuần hoặc đổi tab thì bỏ chọn hàng loạt cũ đi, tránh cập nhật nhầm dòng không còn hiển thị.
  // LƯU Ý: đây là NƠI DUY NHẤT statusTab bị thay đổi ngoài thao tác click của người dùng — và nó
  // không hề gán lại statusTab, chỉ dọn selectedIds. Nếu bạn thấy giao diện tự "nhảy" sang tab
  // "Chưa chuyển phòng" sau khi chuyển 1 dòng, đó không phải do đổi tab: đó là vì dòng vừa chuyển
  // xong rời khỏi bộ lọc đang xem (VD: đang xem "Chưa chuyển phòng" mà chuyển xong dòng đó sẽ biến
  // mất khỏi danh sách vì nó không còn khớp điều kiện lọc nữa) — hành vi lọc đúng, không phải lỗi
  // chuyển tab.
  useEffect(() => {
    setSelectedIds([]);
  }, [nam, tuan, statusTab]);

  const filteredRows = useMemo(() => {
    if (isBaoCao) return rows;
    switch (statusTab) {
      case "daThucHien":
        return rows.filter((r) => r.daHoanThanh);
      case "daChuyenPhong":
        return rows.filter((r) => r.laCuaPhong);
      case "chuaChuyenPhong":
        return rows.filter((r) => !r.laCuaPhong);
      case "tatCa":
        return rows;
      case "chuaThucHien":
      default:
        return rows.filter((r) => !r.daHoanThanh);
    }
  }, [rows, statusTab, isBaoCao]);

  // FIX LỖI ĐÃ BÁO: checkbox vẫn còn đánh dấu sau khi 1 dòng biến mất khỏi danh sách do thao tác
  // đơn lẻ trên chính nó (VD: bấm "Loại khỏi phòng"/"Đánh dấu hoàn thành" từ menu 3 chấm của dòng
  // đó khiến nó rời khỏi filteredRows) — effect ở trên chỉ dọn khi đổi nam/tuan/statusTab, không bắt
  // được trường hợp này. Dọn lại selectedIds mỗi khi filteredRows đổi để luôn khớp với danh sách
  // đang hiển thị thật.
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredRows.some((r) => r.id === id)));
  }, [filteredRows]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function handleBulkConvert() {
    setIsBulkConverting(true);
    try {
      const res = await danhDauLaCuaPhongBulk(selectedIds);
      show(
        "success",
        "Đã chuyển thành công",
        res.boQua > 0
          ? `Đã chuyển ${res.updated} mục, bỏ qua ${res.boQua} mục đã thuộc Phòng từ trước`
          : `Đã chuyển ${res.updated} mục thành Kế hoạch Phòng`
      );
      setSelectedIds([]);
      reload();
    } catch (e) {
      show("error", "Chuyển thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsBulkConverting(false);
      setIsBulkConvertConfirmOpen(false);
    }
  }

  async function handleBulkMarkHoanThanh() {
    setIsBulkMarking(true);
    try {
      const res = await markHoanThanh(selectedIds, true);
      show("success", "Đã cập nhật", `Đã đánh dấu hoàn thành ${res.updated} mục`);
      setSelectedIds([]);
      reload();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsBulkMarking(false);
      setIsBulkMarkConfirmOpen(false);
    }
  }

  return (
    // Tự dựng khung "card" trắng bo góc thay vì bọc trong ComponentCard có sẵn — vì không cần
    // hiện lại tiêu đề (PageBreadcrumb ở trên đã có rồi).
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-3">
          <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />

          {/* Dãy nút trạng thái cũ -> gộp lại thành 1 dropdown gọn, có thêm "Tất cả trạng thái". */}
          {!isBaoCao && (
            <select
              value={statusTab}
              onChange={(e) => setStatusTab(e.target.value as StatusTab)}
              className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {STATUS_TABS.map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
                </option>
              ))}
            </select>
          )}

          {isBaoCao && (
            <label className="flex h-[42px] cursor-pointer select-none items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <input
                type="checkbox"
                checked={xemKemKeHoach}
                onChange={(e) => setXemKemKeHoach(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-brand-500"
              />
              Xem kèm kế hoạch tuần này
            </label>
          )}
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Thêm {tenLoai} <span className="text-lg leading-none">+</span>
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-xs text-gray-400">
          Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {/* Thanh công cụ chọn hàng loạt — chỉ hiện khi có mục được chọn, chỉ áp dụng cho Kế hoạch.
            3 nút tô màu riêng để phân biệt nhanh: cam = cập nhật, tím = chuyển phòng, xanh lá =
            hoàn thành — chữ trắng cho tương phản rõ trên nền màu. */}
        {!isBaoCao && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm dark:bg-brand-500/10">
            <span className="font-medium text-brand-700 dark:text-brand-400">
              Đã chọn {selectedIds.length} mục
            </span>
            <button
              onClick={() => setIsBulkMarkConfirmOpen(true)}
              className="rounded-lg bg-success-500 px-3 py-1.5 text-xs font-medium text-white shadow-theme-xs hover:bg-success-600"
            >
              ✓ Đánh dấu hoàn thành
            </button>
            {/* TẠM THỜI ẨN nút Cập nhật hàng loạt theo yêu cầu (chưa xoá state/modal bên dưới để
                dễ bật lại sau này — chỉ cần bỏ comment đoạn <button> này). */}
            {/* <button
              onClick={() => setIsBulkUpdateOpen(true)}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-theme-xs hover:bg-orange-600"
            >
              📝 Cập nhật kết quả/ghi chú
            </button> */}
            <button
              onClick={() => setIsBulkConvertConfirmOpen(true)}
              className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white shadow-theme-xs hover:bg-purple-600"
            >
              → Đánh dấu là KH Phòng
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Bỏ chọn
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Đang tải...
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="py-12 text-center text-gray-400">
            Chưa có dữ liệu nào cho tuần {tuan}/{nam}. Bấm &quot;Thêm {tenLoai}&quot; để bắt đầu.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((row) => (
              <KeHoachBaoCaoItemCard
                key={row.id}
                row={row}
                loai={loai}
                isSelected={selectedIds.includes(row.id)}
                onToggleSelect={isBaoCao ? undefined : toggleSelect}
                onChanged={reload}
              />
            ))}
          </div>
        )}

        {/* [MỚI] Khối "Kế hoạch tuần này" — PHÍA DƯỚI danh sách Báo cáo, chỉ khi bật ô tick. Không
            có checkbox chọn hàng loạt (onToggleSelect=undefined) để không lẫn với thao tác hàng
            loạt; mọi thao tác đơn lẻ qua menu 3 chấm của từng card như bên màn Kế hoạch. */}
        {isBaoCao && xemKemKeHoach && (
          <KeHoachTuanNaySection key={`${nam}-${tuan}`} nam={nam} tuan={tuan} />
        )}
      </div>

      <AddKeHoachBaoCaoModal
        isOpen={isOpen}
        onClose={closeModal}
        nam={nam}
        tuan={tuan}
        loai={loai}
        onAdded={reload}
      />

      <UpdateResultModal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        ids={selectedIds}
        onUpdated={() => {
          setSelectedIds([]);
          reload();
        }}
        showTienDo={!isBaoCao}
      />

      <ConfirmDialog
        isOpen={isBulkConvertConfirmOpen}
        title="Đánh dấu là KH Phòng"
        description={`Bạn muốn đánh dấu ${selectedIds.length} kế hoạch cá nhân đã chọn là kế hoạch phòng?`}
        note="Các mục đã đánh dấu từ trước sẽ được bỏ qua, không đánh dấu lại."
        confirmText="Đánh dấu"
        isLoading={isBulkConverting}
        onConfirm={handleBulkConvert}
        onClose={() => setIsBulkConvertConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isBulkMarkConfirmOpen}
        title="Đánh dấu hoàn thành hàng loạt"
        description={`Bạn chắc chắn ${selectedIds.length} kế hoạch đã chọn đều đã hoàn thành?`}
        note='Đồng thời đánh dấu hoàn thành Kế hoạch Phòng tương ứng (áp dụng cho các mục đã "Đánh dấu là KH Phòng").'
        isLoading={isBulkMarking}
        onConfirm={handleBulkMarkHoanThanh}
        onClose={() => setIsBulkMarkConfirmOpen(false)}
      />
    </div>
  );
}

// ==================== [MỚI] KHỐI "KẾ HOẠCH TUẦN NÀY" (dưới danh sách Báo cáo) ====================
// Chỉ được mount khi ô tick "Xem kèm kế hoạch tuần này" đang bật, và có key = tuần đang chọn (xem
// chỗ gọi) — đổi tuần / tắt ô tick là component này bị huỷ, mount lại từ đầu với isLoading=true.
// Nhờ vậy:
//   - không bao giờ hiện nhầm kế hoạch của tuần khác (kết quả trả về trễ của tuần cũ rơi vào
//     component đã huỷ, bị bỏ qua nhờ cờ `conHieuLuc`);
//   - không phải gọi setState đồng bộ trong useEffect (đúng quy tắc react-hooks của dự án).
// Chỉ ĐỌC kế hoạch cá nhân của chính người đăng nhập (getKeHoachCaNhan tự lọc theo session).
function KeHoachTuanNaySection({ nam, tuan }: { nam: number; tuan: number }) {
  const { show } = useToast();
  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let conHieuLuc = true;
    getKeHoachCaNhan(nam, tuan, "KEHOACH")
      .then((data) => {
        if (conHieuLuc) setRows(data);
      })
      .catch((e) => {
        if (conHieuLuc) {
          show("error", "Không tải được kế hoạch tuần này", e instanceof Error ? e.message : "Có lỗi xảy ra");
        }
      })
      .finally(() => {
        if (conHieuLuc) setIsLoading(false);
      });
    return () => {
      conHieuLuc = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan]);

  // Gọi sau mỗi thao tác trên 1 card kế hoạch (hoàn thành, cập nhật kết quả...) — tải lại im lặng,
  // giữ nguyên danh sách đang hiện trong lúc chờ (không nháy spinner).
  function taiLai() {
    getKeHoachCaNhan(nam, tuan, "KEHOACH")
      .then(setRows)
      .catch((e) =>
        show("error", "Không tải lại được kế hoạch", e instanceof Error ? e.message : "Có lỗi xảy ra")
      );
  }

  const soHoanThanh = rows.filter((r) => r.daHoanThanh).length;

  // Không có checkbox chọn hàng loạt (không truyền onToggleSelect) để không lẫn với thao tác hàng
  // loạt; mọi thao tác đơn lẻ qua menu 3 chấm của từng card như bên màn Kế hoạch.
  return (
    <div className="mt-2 border-t border-dashed border-gray-200 pt-5 dark:border-white/[0.08]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Kế hoạch tuần {tuan}/{nam}{" "}
          <span className="font-normal text-gray-400">(đã lên từ tuần trước)</span>
        </p>
        {!isLoading && rows.length > 0 && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            Hoàn thành {soHoanThanh}/{rows.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải kế hoạch...
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Không có kế hoạch nào cho tuần {tuan}/{nam}.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.02]">
          {rows.map((row) => (
            <KeHoachBaoCaoItemCard key={`kh-${row.id}`} row={row} loai="KEHOACH" onChanged={taiLai} />
          ))}
        </div>
      )}
    </div>
  );
}
