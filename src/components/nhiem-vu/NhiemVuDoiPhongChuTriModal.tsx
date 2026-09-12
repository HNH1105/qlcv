// ĐÍCH: src/components/nhiem-vu/NhiemVuDoiPhongChuTriModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getPhongList } from "@/lib/actions/danh-muc";
import { doiPhongChuTri } from "@/lib/actions/nhiem-vu";

type Phong = { maPhong: string; tenPhong: string };

export default function NhiemVuDoiPhongChuTriModal({
  isOpen,
  onClose,
  nhiemVuId,
  phongHienTaiId,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  phongHienTaiId: string;
  onUpdated: () => void;
}) {
  const [dsPhong, setDsPhong] = useState<Phong[]>([]);
  const [phongMoi, setPhongMoi] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getPhongList().then(setDsPhong);
    setPhongMoi("");
    setLyDo("");
    setLoi(null);
  }, [isOpen]);

  async function handleSave() {
    if (!phongMoi) {
      setLoi("Vui lòng chọn phòng chủ trì mới.");
      return;
    }
    if (!lyDo.trim()) {
      setLoi("Bắt buộc nhập lý do đổi phòng chủ trì.");
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      await doiPhongChuTri(nhiemVuId, phongMoi, lyDo);
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">Đổi phòng chủ trì</h4>
      <p className="mb-4 text-xs text-gray-400">
        Người xử lý chính hiện tại sẽ bị gỡ, nhiệm vụ quay về trạng thái &quot;Chờ phân công&quot; để
        Lãnh đạo phòng mới tự phân công lại.
      </p>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Phòng chủ trì mới</Label>
          <select
            value={phongMoi}
            onChange={(e) => setPhongMoi(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">— Chọn phòng —</option>
            {dsPhong
              .filter((p) => p.maPhong !== phongHienTaiId)
              .map((p) => (
                <option key={p.maPhong} value={p.maPhong}>
                  {p.tenPhong}
                </option>
              ))}
          </select>
        </div>

        <div>
          <Label>
            Lý do <span className="text-error-500">*</span>
          </Label>
          <textarea
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            rows={3}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangXuLy}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Xác nhận đổi"}
        </Button>
      </div>
    </Modal>
  );
}
