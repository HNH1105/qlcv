// ĐÍCH: src/components/nhiem-vu/NhiemVuLyDoModal.tsx
// Dùng chung cho: Tạm dừng, Huỷ, Yêu cầu xử lý lại (batBuocLyDo=true) và Mở lại (batBuocLyDo=false).
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

export default function NhiemVuLyDoModal({
  isOpen,
  onClose,
  title,
  moTa,
  batBuocLyDo = true,
  confirmText = "Xác nhận",
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  moTa?: string;
  batBuocLyDo?: boolean;
  confirmText?: string;
  onConfirm: (lyDo: string) => Promise<void>;
}) {
  const [lyDo, setLyDo] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function handleConfirm() {
    if (batBuocLyDo && !lyDo.trim()) {
      setLoi("Vui lòng nhập lý do.");
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      await onConfirm(lyDo);
      setLyDo("");
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">{title}</h4>
      {moTa && <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{moTa}</p>}

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div>
        <Label>
          Lý do {batBuocLyDo && <span className="text-error-500">*</span>}
        </Label>
        <textarea
          value={lyDo}
          onChange={(e) => setLyDo(e.target.value)}
          rows={3}
          className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          placeholder={batBuocLyDo ? "Bắt buộc nhập lý do..." : "Không bắt buộc..."}
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangXuLy}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={dangXuLy}>
          {dangXuLy ? "Đang xử lý..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
