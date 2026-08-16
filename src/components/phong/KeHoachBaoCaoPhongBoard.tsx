"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaiGhiNhan } from "@prisma/client";
import { getCurrentWeekInfo, getWeekDateRangeLabel, isoWeeksInYear } from "@/lib/week";
import {
  getKeHoachPhong,
  markHoanThanh,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import { useModal } from "@/hooks/useModal";
import { useAuth } from "@/context/AuthContext";
import WeekSelect from "@/components/ca-nhan/WeekSelect";
import KeHoachBaoCaoItemCard from "@/components/ca-nhan/KehoachBaoCaoItemCard";
import UpdateResultModal from "@/components/ca-nhan/UpdateResultModal";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import AddKeHoachBaoCaoPhongModal from "@/components/phong/AddKeHoachBaoCaoPhongModal";

// Bảng Kế hoạch/Báo cáo CẤP PHÒNG — logic/giao diện gần như y hệt bảng cá nhân
// (KeHoachBaoCaoBoard.tsx), khác 3 điểm chính:
// 1. Dữ liệu là laCuaPhong=true của CẢ PHÒNG (không riêng người đang đăng nhập) — ai trong phòng cũng
//    xem và thao tác được (đánh dấu hoàn thành/cập nhật), vết cập nhật vẫn ghi rõ người thao tác.
// 2. Card hiển thị thêm "Người tạo" — vì nhiều người khác nhau trong phòng có thể tạo ra dòng này.
// 3. KHÔNG có "Chuyển thành ... Phòng" (đã là cấp Phòng) và không có "Đã/Chưa chuyển phòng" trong
//    dropdown trạng thái — chỉ còn Tất cả/Chưa thực hiện/Đã thực hiện.
type StatusTab = "tatCa" | "chuaThucHien" | "daThucHien";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "tatCa", label: "Tất cả trạng thái" },
  { key: "chuaThucHien", label: "Chưa thực hiện" },
  { key: "daThucHien", label: "Đã thực hiện" },
];

export default function KeHoachBaoCaoPhongBoard({ loai }: { loai: LoaiGhiNhan }) {
  return (
    <ToastProvider>
      <BoardContent loai={loai} />
    </ToastProvider>
  );
}

function BoardContent({ loai }: { loai: LoaiGhiNhan }) {
  // SỬA LẠI theo phản hồi: Kế hoạch mặc định XEM tuần SAU (giống board cá nhân), không phải tuần
  // hiện tại — chỉ Báo cáo mới mặc định tuần hiện tại (đúng bản chất báo cáo việc đã làm).
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  let tuanSauMacDinh = tuanHienTai + 1;
  let namSauMacDinh = namHienTai;
  if (tuanSauMacDinh > isoWeeksInYear(namHienTai)) {
    tuanSauMacDinh = 1;
    namSauMacDinh = namHienTai + 1;
  }

  const { show } = useToast();
  const user = useAuth();
  // Server action loaiKhoiPhong() vẫn tự kiểm tra lại quyền + đúng phòng — cờ này ở FE chỉ để
  // quyết định có HIỆN nút hay không, không phải nguồn kiểm soát quyền duy nhất.
  const isLanhDao = user?.quyen === "LANHDAOPHONG" || user?.quyen === "LANHDAODONVI";

  const isBaoCao = loai === "BAOCAO";
  const tenLoai = isBaoCao ? "Báo cáo" : "Kế hoạch";

  const [nam, setNam] = useState(isBaoCao ? namHienTai : namSauMacDinh);
  const [tuan, setTuan] = useState(isBaoCao ? tuanHienTai : tuanSauMacDinh);
  // Mặc định "Tất cả trạng thái" theo phản hồi (trước đây mặc định "Chưa thực hiện").
  const [statusTab, setStatusTab] = useState<StatusTab>("tatCa");

  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, openModal, closeModal } = useModal();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkMarkConfirmOpen, setIsBulkMarkConfirmOpen] = useState(false);
  const [isBulkMarking, setIsBulkMarking] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachPhong(nam, tuan, loai)
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan, loai]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setSelectedIds([]);
  }, [nam, tuan, statusTab]);

  const filteredRows = useMemo(() => {
    if (isBaoCao) return rows;
    switch (statusTab) {
      case "daThucHien":
        return rows.filter((r) => r.daHoanThanh);
      case "tatCa":
        return rows;
      case "chuaThucHien":
      default:
        return rows.filter((r) => !r.daHoanThanh);
    }
  }, [rows, statusTab, isBaoCao]);

  // Dọn selectedIds mỗi khi danh sách hiển thị đổi (VD: 1 dòng vừa được "Loại khỏi phòng" từ menu
  // 3 chấm của chính nó, khiến nó biến mất khỏi filteredRows) — nếu không, checkbox của dòng đã mất
  // vẫn còn nằm trong selectedIds, làm sai lệch "Đã chọn N mục" và các thao tác hàng loạt sau đó.
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredRows.some((r) => r.id === id)));
  }, [filteredRows]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
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
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-3">
          <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />

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
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Thêm {tenLoai} Phòng <span className="text-lg leading-none">+</span>
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-xs text-gray-400">
          Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {/* Chỉ còn 2 nút hàng loạt (không có "Chuyển KH cho phòng" vì đây đã là cấp Phòng) */}
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
            Chưa có dữ liệu nào cho tuần {tuan}/{nam}. Bấm &quot;Thêm {tenLoai} Phòng&quot; để bắt đầu.
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
                nguoiTao={row.nguoiTao}
                allowConvertToPhong={false}
                allowRemoveFromPhong={isLanhDao}
              />
            ))}
          </div>
        )}
      </div>

      <AddKeHoachBaoCaoPhongModal
        isOpen={isOpen}
        onClose={closeModal}
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
        showChuyenPhongNote={false}
        showTienDo={!isBaoCao}
      />

      <ConfirmDialog
        isOpen={isBulkMarkConfirmOpen}
        title="Đánh dấu hoàn thành hàng loạt"
        description={`Bạn chắc chắn ${selectedIds.length} kế hoạch phòng đã chọn đều đã hoàn thành?`}
        isLoading={isBulkMarking}
        onConfirm={handleBulkMarkHoanThanh}
        onClose={() => setIsBulkMarkConfirmOpen(false)}
      />
    </div>
  );
}
