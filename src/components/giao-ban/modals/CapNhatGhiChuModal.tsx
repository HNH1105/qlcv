// ĐÍCH: src/components/giao-ban/modals/CapNhatGhiChuModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { capNhatGhiChuGiaoBan } from "@/lib/actions/giao-ban";
import type { NoiDungGiaoBanRow } from "../GiaoBanTable";

export default function CapNhatGhiChuModal({
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
  const [ghiChu, setGhiChu] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && row) setGhiChu(row.ghiChu ?? "");
  }, [isOpen, row]);

  if (!row) return null;

  async function handleLuu() {
    setIsSaving(true);
    try {
      await capNhatGhiChuGiaoBan(row!.id, ghiChu || null);
      show("success", "Đã lưu", "Đã cập nhật ghi chú");
      onSaved();
      onClose();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Cập nhật ghi chú</h4>
      <p className="mb-4 line-clamp-2 text-xs text-gray-400">{row.noiDung}</p>

      <Label>Ghi chú / Kết quả</Label>
      <textarea
        value={ghiChu}
        onChange={(e) => setGhiChu(e.target.value)}
        rows={4}
        autoFocus
        className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSaving}>Huỷ</Button>
        <Button size="sm" onClick={handleLuu} disabled={isSaving}>
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
