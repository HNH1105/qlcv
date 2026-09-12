// ĐÍCH: src/components/giao-ban/CuocHopGiaoBanBoard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import { getCurrentWeekInfo, getWeekDateRangeLabel, formatDateVN } from "@/lib/week";
import { getCuocHopGiaoBanList, taoCuocHopGiaoBan } from "@/lib/actions/giao-ban";

type CuocHop = Awaited<ReturnType<typeof getCuocHopGiaoBanList>>[number];

export default function CuocHopGiaoBanBoard() {
  return (
    <ToastProvider>
      <BoardContent />
    </ToastProvider>
  );
}

function BoardContent() {
  const user = useAuth();
  const { show } = useToast();
  const { isOpen, openModal, closeModal } = useModal();
  const [rows, setRows] = useState<CuocHop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setIsLoading(true);
    getCuocHopGiaoBanList()
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Checklist giao ban</h1>
          <p className="text-sm text-gray-400">Danh sách các cuộc giao ban theo tuần.</p>
        </div>
        {user?.isAdmin && (
          <div className="flex gap-2">
            <Link
              href="/giao-ban/xac-nhan-chuyen-tuan"
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Xác nhận chuyển tuần
            </Link>
            <button
              onClick={openModal}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Tạo cuộc giao ban mới <span className="text-lg leading-none">+</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-400">Chưa có cuộc giao ban nào.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/giao-ban/${r.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-white/90">Tuần {r.tuan}/{r.nam}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.trangThai === "DANG_MO"
                      ? "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                      : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {r.trangThai === "DANG_MO" ? "Đang mở" : "Đã chốt"}
                </span>
              </div>
              <p className="text-xs text-gray-400">{getWeekDateRangeLabel(r.nam, r.tuan)}</p>
              <p className="mt-1 text-xs text-gray-400">Ngày họp: {formatDateVN(new Date(r.ngayHop))}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{r._count.noiDungs} nội dung</p>
            </Link>
          ))}
        </div>
      )}

      <TaoCuocHopModal isOpen={isOpen} onClose={closeModal} onCreated={reload} />
    </div>
  );
}

function TaoCuocHopModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { show } = useToast();
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const [nam, setNam] = useState(namHienTai);
  const [tuan, setTuan] = useState(tuanHienTai);
  const [ngayHop, setNgayHop] = useState("");
  const [dateKey, setDateKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNam(namHienTai);
    setTuan(tuanHienTai);
    setNgayHop(new Date().toISOString().slice(0, 10));
    setDateKey((k) => k + 1);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNgayChange = useCallback((_dates: Date[], dateStr: string) => setNgayHop(dateStr), []);

  async function handleSave() {
    if (!ngayHop) return setError("Vui lòng chọn ngày họp.");
    setIsSubmitting(true);
    setError(null);
    try {
      await taoCuocHopGiaoBan(nam, tuan, new Date(ngayHop));
      show("success", "Đã tạo", `Đã tạo cuộc giao ban tuần ${tuan}/${nam}`);
      onCreated();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      setError(msg);
      show("error", "Tạo thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Tạo cuộc giao ban mới</h4>
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tuần</Label>
            <input
              type="number"
              value={tuan}
              onChange={(e) => setTuan(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <Label>Năm</Label>
            <input
              type="number"
              value={nam}
              onChange={(e) => setNam(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
        <div key={dateKey}>
          <DatePicker id="ngay-hop-giao-ban" label="Ngày họp" defaultDate={ngayHop} onChange={handleNgayChange} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Huỷ</Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo"}
        </Button>
      </div>
    </Modal>
  );
}
