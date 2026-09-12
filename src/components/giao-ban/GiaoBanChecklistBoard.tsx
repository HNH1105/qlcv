// ĐÍCH: src/components/giao-ban/GiaoBanChecklistBoard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { formatDateVN, getWeekDateRangeLabel } from "@/lib/week";
import { getCuocHopGiaoBanChiTiet, chotCuocHopGiaoBan } from "@/lib/actions/giao-ban";
import GiaoBanTable, { type NoiDungGiaoBanRow } from "./GiaoBanTable";
import AddNoiDungGiaoBanModal from "./AddNoiDungGiaoBanModal";
import ImportGiaoBanExcelModal from "./ImportGiaoBanExcelModal";
import NoiDungGiaoBanDetailModal from "./NoiDungGiaoBanDetailModal";

type ChiTiet = Awaited<ReturnType<typeof getCuocHopGiaoBanChiTiet>>;

export default function GiaoBanChecklistBoard({ cuocHopGiaoBanId }: { cuocHopGiaoBanId: number }) {
  return (
    <ToastProvider>
      <BoardContent cuocHopGiaoBanId={cuocHopGiaoBanId} />
    </ToastProvider>
  );
}

function BoardContent({ cuocHopGiaoBanId }: { cuocHopGiaoBanId: number }) {
  const user = useAuth();
  const { show } = useToast();
  const { isOpen: isAddOpen, openModal: openAdd, closeModal: closeAdd } = useModal();
  const { isOpen: isImportOpen, openModal: openImport, closeModal: closeImport } = useModal();

  const [data, setData] = useState<ChiTiet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<NoiDungGiaoBanRow | null>(null);
  const [confirmChot, setConfirmChot] = useState(false);
  const [isChotting, setIsChotting] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    getCuocHopGiaoBanChiTiet(cuocHopGiaoBanId)
      .then((d) => setData(d as ChiTiet))
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuocHopGiaoBanId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleChot() {
    setIsChotting(true);
    try {
      await chotCuocHopGiaoBan(cuocHopGiaoBanId);
      show("success", "Đã chốt", "Đã chốt cuộc giao ban");
      reload();
    } catch (e) {
      show("error", "Không thể chốt", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsChotting(false);
      setConfirmChot(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        Đang tải...
      </div>
    );
  }

  const { cuocHop, rows, thongKe, xemToanBo } = data;
  const dangMo = cuocHop.trangThai === "DANG_MO";
  // Chỉ Admin/LĐ phòng mới có quyền "Thêm nội dung" (mục 13: chuyên viên & LĐ đơn vị không có
  // dòng "Sửa nội dung giao việc" — thêm mới cũng thuộc nhóm quyền này). Kiểm tra thật vẫn ở
  // server (themNoiDungTrucTiep), đây chỉ để ẩn nút cho gọn giao diện.
  const coTheThem = user?.isAdmin || user?.quyen === "LANHDAOPHONG";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Giao ban tuần {cuocHop.tuan}/{cuocHop.nam}
          </h1>
          <p className="text-sm text-gray-400">
            {getWeekDateRangeLabel(cuocHop.nam, cuocHop.tuan)} — Ngày họp {formatDateVN(new Date(cuocHop.ngayHop))}
            {" — "}
            <span className={dangMo ? "text-success-600" : "text-gray-500"}>
              {dangMo ? "Đang mở" : "Đã chốt"}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {dangMo && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Thêm nội dung <span className="text-lg leading-none">+</span>
            </button>
          )}
          {user?.isAdmin && dangMo && (
            <button
              onClick={openImport}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Import Excel
            </button>
          )}
          {user?.isAdmin && dangMo && (
            <button
              onClick={() => setConfirmChot(true)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Chốt cuộc giao ban
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ThongKeCard label="Tổng số" value={thongKe.tong} />
        <ThongKeCard label="Đã hoàn thành" value={thongKe.daHoanThanh} className="text-success-600" />
        <ThongKeCard label="Đang xử lý" value={thongKe.dangXuLy} className="text-blue-600" />
        <ThongKeCard label="Đã chuyển tuần" value={thongKe.daChuyenTuan} className="text-orange-600" />
        <ThongKeCard label="Đã hủy" value={thongKe.daHuy} className="text-gray-500" />
        <ThongKeCard label="Tỷ lệ hoàn thành" value={`${thongKe.tyLeHoanThanh}%`} className="text-brand-600" />
      </div>

      <GiaoBanTable
        rows={rows as NoiDungGiaoBanRow[]}
        hienPhong={xemToanBo}
        onXemChiTiet={setSelectedRow}
      />

      <AddNoiDungGiaoBanModal
        isOpen={isAddOpen}
        onClose={closeAdd}
        cuocHopGiaoBanId={cuocHopGiaoBanId}
        onAdded={reload}
      />

      <ImportGiaoBanExcelModal
        isOpen={isImportOpen}
        onClose={closeImport}
        cuocHopGiaoBanId={cuocHopGiaoBanId}
        onImported={reload}
      />

      <NoiDungGiaoBanDetailModal
        isOpen={selectedRow != null}
        onClose={() => setSelectedRow(null)}
        row={selectedRow}
        cuocHopDangMo={dangMo}
        onChanged={reload}
      />

      <ConfirmDialog
        isOpen={confirmChot}
        title="Chốt cuộc giao ban"
        description="Sau khi chốt, không thể thao tác thêm trên các nội dung của cuộc họp này. Chỉ chốt được khi mọi nội dung đã kết thúc (hoàn thành/chuyển tuần/huỷ)."
        isLoading={isChotting}
        onConfirm={handleChot}
        onClose={() => setConfirmChot(false)}
      />
    </div>
  );
}

function ThongKeCard({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
      <p className={`text-lg font-semibold ${className ?? "text-gray-800 dark:text-white/90"}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
