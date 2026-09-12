// ĐÍCH: src/components/giao-ban/ImportGiaoBanExcelModal.tsx
"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { importGiaoBanExcel, type KetQuaImportGiaoBan } from "@/lib/actions/giao-ban/import";

export default function ImportGiaoBanExcelModal({
  isOpen,
  onClose,
  cuocHopGiaoBanId,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  cuocHopGiaoBanId: number;
  onImported: () => void;
}) {
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaImportGiaoBan | null>(null);

  function resetAndClose() {
    setFileName(null);
    setKetQua(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return show("error", "Chưa chọn file", "Vui lòng chọn file Excel (.xlsx)");

    const formData = new FormData();
    formData.set("file", file);

    setIsSubmitting(true);
    setKetQua(null);
    try {
      const kq = await importGiaoBanExcel(cuocHopGiaoBanId, formData);
      setKetQua(kq);
      if (kq.thanhCong > 0) {
        show("success", "Đã import", `Đã thêm ${kq.thanhCong}/${kq.tongSoDong} dòng vào checklist`);
        onImported();
      } else {
        show("error", "Không có dòng nào hợp lệ", "Xem chi tiết lỗi bên dưới");
      }
    } catch (e) {
      show("error", "Import thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[560px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">Import Excel</h4>
      <p className="mb-4 text-xs text-gray-400">
        Cột theo đúng thứ tự: <b>STT</b> (bỏ qua) — <b>Nội dung*</b> — <b>Phòng phụ trách*</b> —{" "}
        <b>Người xử lý</b> (nhiều người cách nhau bằng dấu phẩy) — <b>Hạn xử lý*</b> (dd/mm/yyyy) —{" "}
        <b>Ghi chú</b>. Dòng 1 là tiêu đề, dữ liệu bắt đầu từ dòng 2. Không import trạng thái hoàn
        thành hay mức độ ưu tiên (mặc định "Trung bình").
      </p>

      <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="hidden"
          id="giao-ban-excel-file"
        />
        <label htmlFor="giao-ban-excel-file" className="cursor-pointer text-sm font-medium text-brand-500 hover:underline">
          {fileName ?? "Chọn file Excel (.xlsx)"}
        </label>
      </div>

      {ketQua && (
        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-white/5">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            Tổng {ketQua.tongSoDong} dòng — Thành công {ketQua.thanhCong} — Lỗi {ketQua.loi.length}
          </p>
          {ketQua.loi.length > 0 && (
            <div>
              <p className="font-medium text-error-600">Dòng lỗi (không import):</p>
              <ul className="ml-4 list-disc space-y-0.5 text-error-600">
                {ketQua.loi.map((l, i) => (
                  <li key={i}>Dòng {l.dong}: {l.lyDo}</li>
                ))}
              </ul>
            </div>
          )}
          {ketQua.canhBao.length > 0 && (
            <div>
              <p className="font-medium text-yellow-600">Cảnh báo (vẫn import được):</p>
              <ul className="ml-4 list-disc space-y-0.5 text-yellow-600">
                {ketQua.canhBao.map((l, i) => (
                  <li key={i}>Dòng {l.dong}: {l.lyDo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>Đóng</Button>
        <Button size="sm" onClick={handleImport} disabled={isSubmitting || !fileName}>
          {isSubmitting ? "Đang import..." : "Import"}
        </Button>
      </div>
    </Modal>
  );
}
