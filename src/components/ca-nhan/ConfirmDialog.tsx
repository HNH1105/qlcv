"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  note,
  confirmText = "Xác nhận",
  cancelText = "Huỷ",
  isLoading,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  note?: string; // dòng ghi chú phụ, VD: "Đồng thời đánh dấu hoàn thành Kế hoạch Phòng tương ứng..."
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[440px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      {note && <p className="mt-2 text-xs text-gray-400">{note}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              Đang xử lý...
            </span>
          ) : (
            confirmText
          )}
        </Button>
      </div>
    </Modal>
  );
}
