// ĐÍCH: src/components/nhiem-vu/NhiemVuBaoCaoHoanThanhModal.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { baoCaoHoanThanh } from "@/lib/actions/nhiem-vu";

export default function NhiemVuBaoCaoHoanThanhModal({
  isOpen,
  onClose,
  nhiemVuId,
  ketQuaHienTai,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  ketQuaHienTai: string | null;
  onUpdated: () => void;
}) {
  const [ketQua, setKetQua] = useState(ketQuaHienTai ?? "");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function handleSave() {
    if (!ketQua.trim()) {
      setLoi("Vui lòng nhập kết quả thực hiện.");
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      await baoCaoHoanThanh(nhiemVuId, ketQua);
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">Báo cáo hoàn thành</h4>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Nhiệm vụ sẽ chuyển sang trạng thái &quot;Chờ duyệt&quot; — Lãnh đạo phòng chủ trì xem lại và duyệt.
      </p>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div>
        <Label>
          Kết quả thực hiện <span className="text-error-500">*</span>
        </Label>
        <textarea
          value={ketQua}
          onChange={(e) => setKetQua(e.target.value)}
          rows={4}
          className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          placeholder="Đã thực hiện được những gì..."
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangXuLy}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={dangXuLy}>
          {dangXuLy ? "Đang gửi..." : "Gửi báo cáo"}
        </Button>
      </div>
    </Modal>
  );
}
