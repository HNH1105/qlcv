"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { updateKetQuaGhiChu } from "@/lib/actions/ke-hoach";
import { useToast } from "./ToastProvider";

// THEO YÊU CẦU: modal này KHÔNG còn cho sửa "Nội dung" nữa (dù sửa 1 dòng hay hàng loạt) — chỉ còn
// sửa được Kết quả/Ghi chú. Áp dụng đồng thời cho cả Kế hoạch lẫn Báo cáo, Cá nhân lẫn Phòng, vì cả
// 4 nơi đều dùng chung đúng 1 component này. Nội dung gốc vẫn hiển thị (khi sửa 1 dòng) dạng CHỈ
// ĐỌC để người dùng biết đang cập nhật đúng mục nào, không có ô nhập liệu nào cho nó nữa.
export default function UpdateResultModal({
  isOpen,
  onClose,
  ids,
  // Chỉ truyền khi sửa ĐÚNG 1 dòng (ids.length === 1) — dùng để hiển thị CHỈ ĐỌC cho người dùng
  // biết đang sửa mục nào, không dùng để chỉnh sửa.
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

  const [ketQua, setKetQua] = useState(currentKetQua ?? "");
  const [ghiChu, setGhiChu] = useState(currentGhiChu ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset lại giá trị hiển thị mỗi lần mở modal (vì modal này được tái sử dụng, không unmount)
  useEffect(() => {
    if (isOpen) {
      setKetQua(currentKetQua ?? "");
      setGhiChu(currentGhiChu ?? "");
    }
  }, [isOpen, currentKetQua, currentGhiChu]);

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await updateKetQuaGhiChu(ids, {
        // Không còn cho sửa Nội dung từ modal này nữa -> luôn truyền null (giữ nguyên).
        noiDung: null,
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
        Cập nhật kết quả / ghi chú{isBulk && " hàng loạt"}
      </h4>
      {isBulk && (
        <p className="mb-4 text-sm text-gray-400">
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
        {/* Nội dung gốc — CHỈ ĐỌC, hiển thị dạng nhãn/văn bản tĩnh thuần tuý (KHÔNG phải input/
            textarea), chỉ để biết đang cập nhật đúng mục nào. Vì đây không phải 1 form control nên
            không có gì để can thiệp qua F12/devtools — giá trị này chưa bao giờ được đọc lại hay
            gửi lên server (handleSave() luôn gửi noiDung: null, xem bên dưới). */}
        {!isBulk && currentNoiDung && (
          <div>
            <Label>Nội dung</Label>
            <p className="whitespace-pre-wrap break-words rounded-lg bg-success-50 px-4 py-2.5 text-sm text-success-800 dark:bg-success-500/10 dark:text-success-300">
              {currentNoiDung}
            </p>
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
