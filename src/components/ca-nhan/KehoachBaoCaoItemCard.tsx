"use client";

import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Checkbox from "@/components/form/input/Checkbox";
import {
  markHoanThanh,
  convertCaNhanToPhong,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import UpdateResultModal from "./UpdateResultModal";
import ChiTietModal from "./ChiTietModal";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { formatDateTimeVN } from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";

type ConfirmAction = "hoanThanh" | "boHoanThanh" | "chuyenPhong" | null;

export default function KeHoachBaoCaoItemCard({
  row,
  loai,
  isSelected,
  onToggleSelect,
  onChanged,
  nguoiTao,
  allowConvertToPhong = true,
}: {
  row: KeHoachRow;
  loai: LoaiGhiNhan;
  // Chỉ Kế hoạch mới có checkbox chọn hàng loạt (Báo cáo không có nhu cầu chuyển phòng/hoàn thành
  // hàng loạt) — truyền undefined để ẩn checkbox.
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onChanged: () => void;
  // Chỉ có ý nghĩa ở bảng CẤP PHÒNG (nhiều người khác nhau cùng tạo) — hiển thị "Người tạo: ..."
  // trên card. Bên cá nhân không truyền vì luôn là chính người đang xem, không cần hiện.
  nguoiTao?: { maNV: string; hoTen: string } | null;
  // Bảng cấp Phòng KHÔNG có hành động "Chuyển thành ... Phòng" nữa (bản thân dòng đó đã là cấp
  // Phòng rồi) — truyền false để ẩn mục này trong menu 3 chấm. Mặc định true để không phá vỡ chỗ
  // gọi cũ (bảng cá nhân).
  allowConvertToPhong?: boolean;
}) {
  const isKeHoach = loai === "KEHOACH";
  const { show } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isChiTietOpen, setIsChiTietOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isPending, setIsPending] = useState(false);

  // Chỉ coi là "đã chỉnh sửa sau khi tạo" nếu cách nhau hơn 60s — tránh hiện "Cập nhật lúc" ngay
  // cả khi vừa tạo xong (ngayCapNhat luôn = taoLuc lúc mới tạo do @updatedAt).
  const daChinhSua =
    Math.abs(new Date(row.ngayCapNhat).getTime() - new Date(row.taoLuc).getTime()) > 60000;

  async function handleConfirmHoanThanh(value: boolean) {
    setIsPending(true);
    try {
      await markHoanThanh([row.id], value);
      show("success", "Đã cập nhật", value ? "Đã đánh dấu hoàn thành" : "Đã bỏ đánh dấu hoàn thành");
      onChanged();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsPending(false);
      setConfirmAction(null);
    }
  }

  async function handleConfirmConvert() {
    setIsPending(true);
    try {
      const res = await convertCaNhanToPhong(row.id);
      const tenPhong = isKeHoach ? "Kế hoạch Phòng" : "Báo cáo Phòng";
      show(
        "success",
        "Đã chuyển thành công",
        res.alreadyConverted ? `Mục này đã được chuyển thành ${tenPhong} trước đó` : `Đã chuyển thành ${tenPhong}`
      );
      onChanged();
    } catch (e) {
      show("error", "Chuyển thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsPending(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex min-w-0 items-start gap-3">
        {isKeHoach && onToggleSelect && (
          <div className="mt-0.5 shrink-0">
            <Checkbox checked={!!isSelected} onChange={() => onToggleSelect(row.id)} />
          </div>
        )}

        {/* Icon trạng thái — CHỈ hiện cho Kế hoạch, đúng hành vi bản cũ (Báo cáo tự thân đã là việc
            đã làm xong nên không cần icon hoàn thành) */}
        {isKeHoach && (
          <span
            className={`mt-0.5 shrink-0 text-lg font-bold leading-none ${
              row.daHoanThanh ? "text-success-500" : "text-error-500"
            }`}
          >
            {row.daHoanThanh ? "✓" : "✗"}
          </span>
        )}

        {/* min-w-0 + break-words: chặn tràn chữ trên mobile khi nội dung/ghi chú dài, không có
            khoảng trắng để wrap tự nhiên (link dài, số liệu dài...) */}
        <div className="min-w-0">
          <p className="line-clamp-3 break-words text-sm text-gray-800 dark:text-white/90">
            {row.noiDung}
            {row.daChuyenPhong && (
              <span className="ml-2 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 align-middle text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                Đã chuyển Phòng
              </span>
            )}
          </p>

          {row.ketQua && (
            <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">
              Kết quả: {row.ketQua}
            </p>
          )}
          {row.ghiChu && (
            <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500 dark:text-gray-400">
              Ghi chú: {row.ghiChu}
            </p>
          )}
          {nguoiTao && (
            <p className="mt-1 break-words text-xs text-gray-400">
              Người tạo: <span className="text-gray-500 dark:text-gray-300">{nguoiTao.hoTen}</span>
            </p>
          )}
          {row.nguoiPhoiHop.length > 0 && (
            <p className="mt-1 break-words text-xs text-gray-400">
              Phối hợp: {row.nguoiPhoiHop.map((p) => p.hoTen).join(", ")}
            </p>
          )}
          {daChinhSua && (
            <p className="mt-1 text-[11px] italic text-gray-400">
              Cập nhật lúc {formatDateTimeVN(row.ngayCapNhat)}
              {row.nguoiCapNhat && ` bởi ${row.nguoiCapNhat.hoTen}`}
            </p>
          )}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
          title="Hành động"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 18a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </button>

        <Dropdown
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          className="absolute right-0 z-30 mt-1 flex w-64 flex-col rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          <DropdownItem
            onItemClick={() => {
              setIsMenuOpen(false);
              setIsChiTietOpen(true);
            }}
            className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
          >
            🔍 Xem chi tiết
          </DropdownItem>

          {/* Trước đây CHỈ Kế hoạch mới có hành động này — nay mở rộng cho cả Báo cáo (chuyển
              thành Báo cáo Phòng). Ẩn hẳn khi allowConvertToPhong=false (bảng cấp Phòng — dòng đó
              đã là cấp Phòng rồi, không "chuyển" lên đâu nữa). */}
          {allowConvertToPhong && !row.daChuyenPhong && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction("chuyenPhong");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              → Chuyển thành {isKeHoach ? "Kế hoạch Phòng" : "Báo cáo Phòng"}
            </DropdownItem>
          )}

          <DropdownItem
            onItemClick={() => {
              setIsMenuOpen(false);
              setIsUpdateOpen(true);
            }}
            className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
          >
            📝 Cập nhật nội dung/kết quả/ghi chú
          </DropdownItem>

          {isKeHoach && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction(row.daHoanThanh ? "boHoanThanh" : "hoanThanh");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {row.daHoanThanh ? "✕ Bỏ đánh dấu hoàn thành" : "✓ Đánh dấu hoàn thành"}
            </DropdownItem>
          )}
        </Dropdown>
      </div>

      <UpdateResultModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        ids={[row.id]}
        currentNoiDung={row.noiDung}
        currentKetQua={row.ketQua}
        currentGhiChu={row.ghiChu}
        onUpdated={onChanged}
      />

      <ChiTietModal
        isOpen={isChiTietOpen}
        onClose={() => setIsChiTietOpen(false)}
        row={row}
        loai={loai}
        nguoiTao={nguoiTao}
      />

      <ConfirmDialog
        isOpen={confirmAction === "chuyenPhong"}
        title={`Chuyển thành ${isKeHoach ? "Kế hoạch Phòng" : "Báo cáo Phòng"}`}
        description={`Bạn muốn đồng thời chuyển 1 ${isKeHoach ? "kế hoạch" : "báo cáo"} cá nhân này thành ${isKeHoach ? "kế hoạch" : "báo cáo"} phòng?`}
        isLoading={isPending}
        onConfirm={handleConfirmConvert}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "hoanThanh"}
        title="Đánh dấu hoàn thành"
        description="Bạn chắc chắn 1 kế hoạch này đã hoàn thành?"
        note='Đồng thời đánh dấu hoàn thành Kế hoạch Phòng tương ứng (áp dụng cho các mục đã "Đã chuyển Phòng").'
        isLoading={isPending}
        onConfirm={() => handleConfirmHoanThanh(true)}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "boHoanThanh"}
        title="Bỏ đánh dấu hoàn thành"
        description="Bạn chắc chắn muốn bỏ đánh dấu hoàn thành cho kế hoạch này?"
        note='Đồng thời bỏ đánh dấu hoàn thành Kế hoạch Phòng tương ứng (áp dụng cho các mục đã "Đã chuyển Phòng").'
        isLoading={isPending}
        onConfirm={() => handleConfirmHoanThanh(false)}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
