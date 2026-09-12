// ĐÍCH: src/components/nhiem-vu/NhiemVuSuaThongTinModal.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { suaThongTinCoBan } from "@/lib/actions/nhiem-vu";
import { MucDoUuTien } from "@prisma/client";

export default function NhiemVuSuaThongTinModal({
  isOpen,
  onClose,
  nhiemVuId,
  tieuDeHienTai,
  noiDungHienTai,
  mucDoUuTienHienTai,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  tieuDeHienTai: string;
  noiDungHienTai: string | null;
  mucDoUuTienHienTai: MucDoUuTien;
  onUpdated: () => void;
}) {
  const [tieuDe, setTieuDe] = useState(tieuDeHienTai);
  const [noiDung, setNoiDung] = useState(noiDungHienTai ?? "");
  const [mucDo, setMucDo] = useState<MucDoUuTien>(mucDoUuTienHienTai);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function handleSave() {
    if (!tieuDe.trim()) {
      setLoi("Tiêu đề không được để trống.");
      return;
    }
    setDangXuLy(true);
    setLoi(null);
    try {
      await suaThongTinCoBan(nhiemVuId, { tieuDe, noiDung, mucDoUuTien: mucDo });
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sửa thông tin nhiệm vụ</h4>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>
            Tiêu đề <span className="text-error-500">*</span>
          </Label>
          <Input value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} />
        </div>
        <div>
          <Label>Nội dung</Label>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={4}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="w-[160px]">
          <Label>Mức ưu tiên</Label>
          <select
            value={mucDo}
            onChange={(e) => setMucDo(e.target.value as MucDoUuTien)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="THUONG">Thường</option>
            <option value="KHAN">Khẩn</option>
          </select>
        </div>
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
