"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "./NguoiPhoiHopSelect";
import DatePicker from "@/components/form/date-picker";
import { suaFullKeHoachBaoCao } from "@/lib/actions/ke-hoach";
import { useToast } from "./ToastProvider";

type PhoiHopOption = { value: string; text: string };

// Chuẩn hoá 1 Date thành string "yyyy-mm-dd" — đúng dateFormat mà DatePicker (flatpickr) đang
// dùng. Dùng phần UTC (giống cách hanXuLy được lưu/hiển thị ở nơi khác trong dự án) để tránh lệch
// ngày do múi giờ trình duyệt.
function toDateInputValue(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// MODAL MỚI — TÁCH RIÊNG khỏi UpdateResultModal (không đụng gì tới modal đó). Chỉ hiện qua mục
// menu "✏️ Sửa" — mục này CHỈ hiện khi (nam, tuan) CỦA CHÍNH DÒNG đang nằm trong khung "sửa full"
// (xem isTrongKhungSuaFull trong lib/week.ts, do component cha KehoachBaoCaoItemCard tự tính và
// quyết định có render nút mở modal này hay không).
//
// Modal này CHỈ có 3 thứ: Nội dung, Hạn xử lý (chỉ Kế hoạch mới có), Người phối hợp — KHÔNG có Kết
// quả/Ghi chú/Tiến độ (3 cái đó vẫn sửa qua modal "Cập nhật kết quả/ghi chú" — UpdateResultModal —
// như cũ, menu đó luôn hiện, không phụ thuộc khung tuần).
//
// Chỉ áp dụng cho ĐÚNG 1 dòng — không có chế độ hàng loạt.
//
// LƯU Ý BẢO MẬT: modal này chỉ hiện ra khi UI cho là "trong khung" — chốt chặn THẬT SỰ nằm ở
// server action suaFullKeHoachBaoCao (ke-hoach.ts), tự tra lại (nam, tuan, loai) từ DB và tự kiểm
// tra lại bằng đúng isTrongKhungSuaFull(), không tin bất kỳ giá trị nào gửi từ client.
export default function SuaNoiDungModal({
  isOpen,
  onClose,
  id,
  currentNoiDung,
  // Chỉ có ý nghĩa khi là Kế hoạch (Báo cáo không có Hạn xử lý) — truyền showHanXuLy=false khi là
  // Báo cáo để ẩn hẳn ô này.
  showHanXuLy,
  currentHanXuLy,
  currentNguoiPhoiHopIds,
  nhanVienOptions,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  id: number;
  currentNoiDung: string;
  showHanXuLy: boolean;
  currentHanXuLy?: Date | null;
  currentNguoiPhoiHopIds: string[];
  nhanVienOptions: PhoiHopOption[];
  onUpdated: () => void;
}) {
  const { show } = useToast();

  const [noiDung, setNoiDung] = useState(currentNoiDung);
  const [phoiHop, setPhoiHop] = useState<string[]>(currentNguoiPhoiHopIds);
  const [hanXuLy, setHanXuLy] = useState(
    currentHanXuLy ? toDateInputValue(new Date(currentHanXuLy)) : ""
  );
  // flatpickr không tự cập nhật khi defaultDate đổi — dùng key ép remount mỗi lần mở modal.
  const [dateKey, setDateKey] = useState(0);
  const [showPhoiHop, setShowPhoiHop] = useState(currentNguoiPhoiHopIds.length > 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNoiDung(currentNoiDung);
      setPhoiHop(currentNguoiPhoiHopIds);
      setHanXuLy(currentHanXuLy ? toDateInputValue(new Date(currentHanXuLy)) : "");
      setShowPhoiHop(currentNguoiPhoiHopIds.length > 0);
      setDateKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentNoiDung, currentHanXuLy, currentNguoiPhoiHopIds]);

  const handleHanXuLyChange = useCallback((_dates: Date[], dateStr: string) => {
    setHanXuLy(dateStr);
  }, []);

  async function handleSave() {
    if (!noiDung.trim()) {
      show("error", "Thiếu nội dung", "Vui lòng nhập nội dung");
      return;
    }
    setIsSubmitting(true);
    try {
      await suaFullKeHoachBaoCao(id, {
        noiDung,
        nguoiPhoiHopIds: phoiHop,
        hanXuLy: showHanXuLy ? (hanXuLy ? new Date(hanXuLy) : null) : undefined,
      });
      show("success", "Đã lưu", "Đã cập nhật nội dung");
      onUpdated();
      onClose();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[584px] p-5 lg:p-10">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sửa</h4>

      {/* Sắp xếp gọn: Nội dung trước (chiếm phần lớn không gian), Hạn xử lý + nút "Thêm người phối
          hợp" nằm chung 1 hàng ngay dưới cho gọn (giống bố cục ở modal Thêm mới), chỉ khi cần mới
          hiện khối chọn Người phối hợp đầy đủ bên dưới. */}
      <div className="space-y-4">
        <div>
          <Label>
            Nội dung <span className="text-error-500">*</span>
          </Label>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={4}
            autoFocus
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {showHanXuLy && (
            <div key={dateKey} className="w-[170px] shrink-0">
              <DatePicker
                id={`han-xu-ly-sua-${id}`}
                label="Hạn xử lý (không bắt buộc)"
                placeholder="Chọn ngày..."
                defaultDate={hanXuLy || undefined}
                onChange={handleHanXuLyChange}
              />
            </div>
          )}

          {!showPhoiHop && (
            <button
              type="button"
              onClick={() => setShowPhoiHop(true)}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <span className="text-base leading-none">+</span> Thêm người phối hợp
            </button>
          )}
        </div>

        {showPhoiHop && (
          <NguoiPhoiHopSelect
            label="Người phối hợp (không bắt buộc)"
            options={nhanVienOptions}
            selected={phoiHop}
            onChange={setPhoiHop}
          />
        )}
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
