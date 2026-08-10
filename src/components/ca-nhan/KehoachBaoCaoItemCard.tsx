"use client";

import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  markHoanThanh,
  convertCaNhanToPhong,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import UpdateResultModal from "./UpdateResultModal";
import { LoaiGhiNhan } from "@prisma/client";

export default function KeHoachBaoCaoItemCard({
  row,
  loai,
  onChanged,
}: {
  row: KeHoachRow;
  loai: LoaiGhiNhan;
  onChanged: () => void;
}) {
  const isKeHoach = loai === "KEHOACH";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleToggleHoanThanh() {
    setIsMenuOpen(false);
    setIsPending(true);
    try {
      await markHoanThanh([row.id], !row.daHoanThanh);
      onChanged();
    } finally {
      setIsPending(false);
    }
  }

  async function handleConvertToPhong() {
    setIsMenuOpen(false);
    setIsPending(true);
    try {
      await convertCaNhanToPhong(row.id);
      onChanged();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-start gap-3">
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

        <div>
          <p className="text-sm text-gray-800 dark:text-white/90">
            {row.noiDung}
            {row.daChuyenPhong && (
              <span className="ml-2 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 align-middle text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                Đã chuyển Phòng
              </span>
            )}
          </p>

          {row.ketQua && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Kết quả: {row.ketQua}
            </p>
          )}
          {row.ghiChu && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ghi chú: {row.ghiChu}</p>
          )}
          {row.nguoiPhoiHop.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              Phối hợp: {row.nguoiPhoiHop.map((p) => p.hoTen).join(", ")}
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
          {isKeHoach && !row.daChuyenPhong && (
            <DropdownItem
              onItemClick={handleConvertToPhong}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              → Chuyển thành Kế hoạch Phòng
            </DropdownItem>
          )}
          <DropdownItem
            onItemClick={() => {
              setIsMenuOpen(false);
              setIsUpdateOpen(true);
            }}
            className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
          >
            📝 Cập nhật kết quả/ghi chú
          </DropdownItem>
          {isKeHoach && (
            <DropdownItem
              onItemClick={handleToggleHoanThanh}
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
        id={row.id}
        currentKetQua={row.ketQua}
        currentGhiChu={row.ghiChu}
        onUpdated={onChanged}
      />
    </div>
  );
}
