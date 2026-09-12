// ĐÍCH: src/components/nhiem-vu/NhiemVuCapNhatPhoiHopModal.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { capNhatPhoiHopCuaToi } from "@/lib/actions/nhiem-vu";

export default function NhiemVuCapNhatPhoiHopModal({
  isOpen,
  onClose,
  nhiemVuId,
  ghiChuHienTai,
  daHoanThanhHienTai,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  ghiChuHienTai: string | null;
  daHoanThanhHienTai: boolean;
  onUpdated: () => void;
}) {
  const [ghiChu, setGhiChu] = useState(ghiChuHienTai ?? "");
  const [daHoanThanh, setDaHoanThanh] = useState(daHoanThanhHienTai);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function handleLuu() {
    setDangLuu(true);
    setLoi(null);
    try {
      await capNhatPhoiHopCuaToi(nhiemVuId, { ghiChu, daHoanThanhPhanViec: daHoanThanh });
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Cập nhật phần việc phối hợp</h4>
      <p className="mb-4 text-xs text-gray-400">Chỉ ảnh hưởng riêng phần việc của bạn — không đổi trạng thái chung của nhiệm vụ.</p>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Ghi chú đóng góp</Label>
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={3}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Bạn đã làm được gì trong phần phối hợp của mình..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={daHoanThanh}
            onChange={(e) => setDaHoanThanh(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Đã hoàn thành phần việc của tôi
        </label>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangLuu}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleLuu} disabled={dangLuu}>
          {dangLuu ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
