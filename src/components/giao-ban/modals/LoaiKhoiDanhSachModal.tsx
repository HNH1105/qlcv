// ĐÍCH: src/components/giao-ban/modals/LoaiKhoiDanhSachModal.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { huyKhongTheoDoi } from "@/lib/actions/giao-ban";
import type { NoiDungGiaoBanRow } from "../GiaoBanTable";

export default function LoaiKhoiDanhSachModal({
  isOpen,
  onClose,
  row,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: NoiDungGiaoBanRow | null;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [lyDo, setLyDo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!row) return null;

  async function handleXacNhan() {
    setIsSaving(true);
    try {
      await huyKhongTheoDoi(row!.id, lyDo || undefined);
      show("success", "Đã loại khỏi danh sách", "Nội dung đã được đánh dấu không theo dõi");
      onSaved();
      onClose();
      setLyDo("");
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Loại khỏi danh sách</h4>
      <p className="mb-4 line-clamp-2 text-xs text-gray-400">{row.noiDung}</p>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Nội dung sẽ dừng theo dõi tại đây (không hoàn thành, không chuyển tuần). Có thể ghi lý do
        (không bắt buộc).
      </p>
      <Label>Lý do</Label>
      <textarea
        value={lyDo}
        onChange={(e) => setLyDo(e.target.value)}
        rows={3}
        className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSaving}>Đóng</Button>
        <Button size="sm" onClick={handleXacNhan} disabled={isSaving}>
          {isSaving ? "Đang xử lý..." : "Xác nhận loại khỏi danh sách"}
        </Button>
      </div>
    </Modal>
  );
}
