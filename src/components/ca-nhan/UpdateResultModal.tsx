"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { updateKetQuaGhiChu } from "@/lib/actions/ke-hoach";
import { useToast } from "./ToastProvider";

export default function UpdateResultModal({
  isOpen,
  onClose,
  ids,
  // Chỉ truyền các giá trị hiện tại khi sửa ĐÚNG 1 dòng (ids.length === 1) — trường hợp chọn
  // nhiều dòng để cập nhật hàng loạt thì để trống nghĩa là "không đổi", không hiển thị ô Nội dung.
  currentNoiDung,
  currentKetQua,
  currentGhiChu,
  onUpdated,
  // Câu ghi chú "Nếu mục đã 'Đã chuyển Phòng'..." chỉ có ý nghĩa ở bảng CÁ NHÂN (nơi 1 dòng có thể
  // đã được chuyển thành bản Phòng riêng). Ở bảng CẤP PHÒNG, dòng đang sửa BẢN THÂN NÓ đã là cấp
  // Phòng rồi — không có khái niệm "chuyển phòng tương ứng" nữa, nên mặc định ẩn câu này khi dùng
  // ở đó. Mặc định true để không phá vỡ chỗ gọi cũ (modal dùng ở bảng cá nhân).
  showChuyenPhongNote = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  ids: number[];
  currentNoiDung?: string | null;
  currentKetQua?: string | null;
  currentGhiChu?: string | null;
  onUpdated: () => void;
  showChuyenPhongNote?: boolean;
}) {
  const isBulk = ids.length > 1;
  const { show } = useToast();

  const [noiDung, setNoiDung] = useState(currentNoiDung ?? "");
  const [ketQua, setKetQua] = useState(currentKetQua ?? "");
  const [ghiChu, setGhiChu] = useState(currentGhiChu ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset lại giá trị hiển thị mỗi lần mở modal (vì modal này được tái sử dụng, không unmount)
  useEffect(() => {
    if (isOpen) {
      setNoiDung(currentNoiDung ?? "");
      setKetQua(currentKetQua ?? "");
      setGhiChu(currentGhiChu ?? "");
    }
  }, [isOpen, currentNoiDung, currentKetQua, currentGhiChu]);

  async function handleSave() {
    if (!isBulk && !noiDung.trim()) {
      show("error", "Không thể lưu", "Nội dung không được để trống");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateKetQuaGhiChu(ids, {
        // Hàng loạt: không sửa nội dung từng dòng khác nhau cùng lúc.
        noiDung: isBulk ? null : noiDung,
        // Hàng loạt: để trống nghĩa là "giữ nguyên" cho từng dòng (tránh xoá mất dữ liệu cũ hàng
        // loạt); sửa 1 dòng: để trống nghĩa là chủ động xoá trắng.
        ketQua: isBulk && !ketQua.trim() ? null : ketQua,
        ghiChu: isBulk && !ghiChu.trim() ? null : ghiChu,
      });
      show("success", "Đã cập nhật", `Đã cập nhật ${ids.length} mục thành công`);
      onUpdated();
      onClose();
    } catch (e) {
      show("error", "Cập nhật thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[584px] p-5 lg:p-10">
      <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
        Cập nhật {isBulk ? "hàng loạt" : "nội dung / "}kết quả / ghi chú
      </h4>
      {isBulk && (
        <p className="mb-6 text-sm text-gray-400">
          Đang áp dụng cho {ids.length} mục đã chọn. Để trống ô nào nghĩa là giữ nguyên giá trị cũ
          của ô đó.
        </p>
      )}
      {showChuyenPhongNote && (
        <p className="mb-6 text-xs text-gray-400">
          Nếu mục đã "Đã chuyển Phòng", Kết quả/Ghi chú cũng sẽ tự động cập nhật cho Kế hoạch Phòng
          tương ứng.
        </p>
      )}

      <div className="space-y-5">
        {!isBulk && (
          <div>
            <Label>
              Nội dung <span className="text-error-500">*</span>
            </Label>
            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              rows={3}
              className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        )}
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
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              Đang lưu...
            </span>
          ) : (
            "Lưu"
          )}
        </Button>
      </div>
    </Modal>
  );
}
