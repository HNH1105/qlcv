// ĐÍCH: src/components/nhiem-vu/NhiemVuDoiHanModal.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import HanXuLyInput from "@/components/ca-nhan/HanXuLyInput";
import { doiHanXuLy } from "@/lib/actions/nhiem-vu";

export default function NhiemVuDoiHanModal({
  isOpen,
  onClose,
  nhiemVuId,
  hanHienTai,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  hanHienTai: Date | null;
  onUpdated: () => void;
}) {
  const [han, setHan] = useState(hanHienTai ? hanHienTai.toISOString().slice(0, 10) : "");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function handleSave() {
    setDangXuLy(true);
    setLoi(null);
    try {
      await doiHanXuLy(nhiemVuId, han ? new Date(han) : null);
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[420px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Đổi hạn xử lý</h4>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div>
        <Label>Hạn xử lý mới</Label>
        <HanXuLyInput value={han} onChange={setHan} />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangXuLy}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
