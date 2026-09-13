// ĐÍCH: src/components/giao-ban/ImportGiaoBanExcelModal.tsx
"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import {
  xemTruocImportGiaoBan,
  xacNhanImportGiaoBan,
  type DongExcelDaXuLy,
  type KetQuaImportGiaoBan,
} from "@/lib/actions/giao-ban/import";
import { formatDateVN } from "@/lib/week";

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
  const [dangDoc, setDangDoc] = useState(false);
  const [dangImport, setDangImport] = useState(false);
  const [xemTruoc, setXemTruoc] = useState<DongExcelDaXuLy[] | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaImportGiaoBan | null>(null);

  const soHopLe = xemTruoc?.filter((r) => r.hopLe).length ?? 0;
  const soLoi = xemTruoc ? xemTruoc.length - soHopLe : 0;

  function resetAndClose() {
    setFileName(null);
    setXemTruoc(null);
    setKetQua(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  async function handleDocFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return show("error", "Chưa chọn file", "Vui lòng chọn file Excel (.xlsx)");

    const formData = new FormData();
    formData.set("file", file);

    setDangDoc(true);
    setKetQua(null);
    try {
      const rows = await xemTruocImportGiaoBan(formData);
      if (rows.length === 0) {
        show("error", "File trống", "Không tìm thấy dòng dữ liệu nào (từ dòng 2 trở đi).");
      }
      setXemTruoc(rows);
    } catch (e) {
      show("error", "Đọc file thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangDoc(false);
    }
  }

  async function handleXacNhanImport() {
    if (!xemTruoc) return;
    setDangImport(true);
    try {
      const kq = await xacNhanImportGiaoBan(cuocHopGiaoBanId, xemTruoc);
      setKetQua(kq);
      if (kq.thanhCong > 0) {
        show("success", "Đã import", `Đã thêm ${kq.thanhCong}/${kq.tongSoDong} dòng vào checklist`);
        onImported();
      }
    } catch (e) {
      show("error", "Import thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangImport(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[760px] p-5 lg:p-8">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">Import Excel</h4>

      {!xemTruoc ? (
        <>
          <p className="mb-4 text-xs text-gray-400">
            Cột theo đúng thứ tự: <b>STT</b> (bỏ qua) — <b>Nội dung*</b> — <b>Mã phòng phụ trách*</b>{" "}
            (VD: P01, phải đúng mã trong danh mục) — <b>Mã người xử lý</b> (nhiều mã cách nhau bằng
            dấu phẩy, phải thuộc đúng phòng ở cột trước) — <b>Hạn xử lý*</b> (dd/mm/yyyy) —{" "}
            <b>Ghi chú</b>. Dòng 1 là tiêu đề, dữ liệu từ dòng 2.
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

          <div className="mt-6 flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={resetAndClose} disabled={dangDoc}>Đóng</Button>
            <Button size="sm" onClick={handleDocFile} disabled={dangDoc || !fileName}>
              {dangDoc ? "Đang đọc..." : "Đọc & xem trước"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tổng {xemTruoc.length} dòng — <span className="text-success-600">{soHopLe} hợp lệ</span> —{" "}
              <span className="text-error-600">{soLoi} lỗi</span> (dòng lỗi sẽ KHÔNG được import)
            </p>
            <button onClick={() => setXemTruoc(null)} className="text-xs text-brand-500 hover:underline">
              ← Chọn file khác
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 dark:border-white/[0.05]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Dòng</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Nội dung</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Phòng</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Người xử lý</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Hạn</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {xemTruoc.map((r) => (
                  <tr key={r.dong} className={r.hopLe ? "" : "bg-error-50 dark:bg-error-500/10"}>
                    <td className="px-2 py-2 text-gray-500">{r.dong}</td>
                    <td className="max-w-[220px] truncate px-2 py-2 text-gray-700 dark:text-gray-200">{r.noiDung || "—"}</td>
                    <td className="px-2 py-2 text-gray-500">{r.tenPhong ?? r.maPhong}</td>
                    <td className="px-2 py-2 text-gray-500">{r.tenNguoiXuLy?.join(", ") || "—"}</td>
                    <td className="px-2 py-2 text-gray-500">{r.hanHoanThanhISO ? formatDateVN(new Date(r.hanHoanThanhISO)) : "—"}</td>
                    <td className="px-2 py-2">
                      {r.hopLe ? (
                        <span className="text-success-600">✓ Hợp lệ</span>
                      ) : (
                        <span className="text-error-600">✕ {r.lyDo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ketQua && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs dark:bg-white/5">
              Đã import <b>{ketQua.thanhCong}</b>/{ketQua.tongSoDong} dòng.
              {ketQua.loi.length > 0 && (
                <ul className="ml-4 mt-1 list-disc text-error-600">
                  {ketQua.loi.map((l, i) => (
                    <li key={i}>Dòng {l.dong}: {l.lyDo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={resetAndClose} disabled={dangImport}>Đóng</Button>
            <Button size="sm" onClick={handleXacNhanImport} disabled={dangImport || soHopLe === 0 || ketQua != null}>
              {dangImport ? "Đang import..." : `Xác nhận import ${soHopLe} dòng hợp lệ`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
