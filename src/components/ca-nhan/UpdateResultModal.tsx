"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { updateKetQuaGhiChu } from "@/lib/actions/ke-hoach";

export default function UpdateResultModal({
  isOpen,
  onClose,
  id,
  currentKetQua,
  currentGhiChu,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  id: number;
  currentKetQua: string | null;
  currentGhiChu: string | null;
  onUpdated: () => void;
}) {
  const [ketQua, setKetQua] = useState(currentKetQua ?? "");
  const [ghiChu, setGhiChu] = useState(currentGhiChu ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await updateKetQuaGhiChu([id], ketQua, ghiChu);
      onUpdated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[584px] p-5 lg:p-10">
      <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
        Cập nhật kết quả / ghi chú
      </h4>

      <div className="space-y-5">
        <div>
          <Label>Kết quả</Label>
          <Input value={ketQua} onChange={(e) => setKetQua(e.target.value)} />
        </div>
        <div>
          <Label>Ghi chú</Label>
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-end w-full gap-3 mt-6">
        <Button size="sm" variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
