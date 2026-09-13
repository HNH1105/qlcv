// ĐÍCH: src/components/giao-ban/modals/LichSuNoiDungModal.tsx
"use client";

import { Modal } from "@/components/ui/modal";
import NoiDungGiaoBanLichSu from "../NoiDungGiaoBanLichSu";
import type { NoiDungGiaoBanRow } from "../GiaoBanTable";

export default function LichSuNoiDungModal({
  isOpen,
  onClose,
  row,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: NoiDungGiaoBanRow | null;
}) {
  if (!row) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Lịch sử thao tác</h4>
      <p className="mb-4 line-clamp-2 text-xs text-gray-400">{row.noiDung}</p>
      <NoiDungGiaoBanLichSu noiDungGiaoBanId={row.id} />
    </Modal>
  );
}
