// ĐÍCH: src/components/giao-ban/modals/SuaNoiDungGiaoBanModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { suaNoiDungGiaoBan, capNhatNguoiXuLy } from "@/lib/actions/giao-ban";
import { MucDoUuTienGiaoBan } from "@prisma/client";
import type { NoiDungGiaoBanRow } from "../GiaoBanTable";

const UU_TIEN_OPTIONS: { value: MucDoUuTienGiaoBan; label: string }[] = [
  { value: "CAO", label: "Cao" },
  { value: "TRUNGBINH", label: "Trung bình" },
  { value: "THAP", label: "Thấp" },
];

export default function SuaNoiDungGiaoBanModal({
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

  const [noiDung, setNoiDung] = useState("");
  const [hanHoanThanh, setHanHoanThanh] = useState("");
  const [dateKey, setDateKey] = useState(0);
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienGiaoBan>("CAO");
  const [nhanVienList, setNhanVienList] = useState<{ maNV: string; hoTen: string; maPhong: string }[]>([]);
  const [nguoiXuLy, setNguoiXuLy] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !row) return;
    setNoiDung(row.noiDung);
    setHanHoanThanh(new Date(row.hanHoanThanh).toISOString().slice(0, 10));
    setDateKey((k) => k + 1);
    setMucDoUuTien(row.mucDoUuTien);
    setNguoiXuLy(row.nguoiXuLys.map((x) => x.nhanVien.maNV));
    getNhanVienList().then(setNhanVienList);
  }, [isOpen, row]);

  const nguoiXuLyOptions = useMemo(
    () => (row ? nhanVienList.filter((nv) => nv.maPhong === row.phongXuLy.maPhong).map((nv) => ({ value: nv.maNV, text: nv.hoTen })) : []),
    [nhanVienList, row]
  );

  if (!row) return null;

  async function handleLuu() {
    if (!row) return; // giúp TypeScript tự thu hẹp kiểu ngay trong closure này — check ở ngoài
    // (dòng "if (!row) return null;" phía trên) không tự áp dụng được vào bên trong hàm lồng vì
    // đây là 1 closure, TS không đảm bảo `row` còn non-null tại thời điểm hàm này được gọi.
    if (!noiDung.trim()) return show("error", "Thiếu nội dung", "Vui lòng nhập nội dung.");
    if (!hanHoanThanh) return show("error", "Thiếu hạn", "Vui lòng chọn hạn hoàn thành.");

    setIsSaving(true);
    try {
      // Gộp thành 2 lệnh, nhưng CHỈ gọi khi bấm Lưu — không tự lưu theo từng thao tác lẻ trong lúc
      // đang mở modal, tránh đúng lỗi trước đây (nhấp ra ngoài dropdown người xử lý tự bắn request).
      await suaNoiDungGiaoBan(row.id, { noiDung, hanHoanThanh: new Date(hanHoanThanh), mucDoUuTien });
      await capNhatNguoiXuLy(row.id, nguoiXuLy);
      show("success", "Đã lưu", "Đã cập nhật nội dung giao ban");
      onSaved();
      onClose();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sửa nội dung giao ban</h4>

      <div className="space-y-4">
        <div>
          <Label>Nội dung</Label>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={3}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div key={dateKey}>
            <DatePicker
              id="sua-han-hoan-thanh-giao-ban"
              label="Hạn hoàn thành"
              defaultDate={hanHoanThanh}
              onChange={(_d: Date[], dateStr: string) => setHanHoanThanh(dateStr)}
            />
          </div>
          <div>
            <Label>Mức độ ưu tiên</Label>
            <select
              value={mucDoUuTien}
              onChange={(e) => setMucDoUuTien(e.target.value as MucDoUuTienGiaoBan)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {UU_TIEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <NguoiPhoiHopSelect label="Chuyên viên xử lý" options={nguoiXuLyOptions} selected={nguoiXuLy} onChange={setNguoiXuLy} />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSaving}>Huỷ</Button>
        <Button size="sm" onClick={handleLuu} disabled={isSaving}>
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
