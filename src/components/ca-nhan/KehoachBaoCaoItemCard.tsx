"use client";

import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Checkbox from "@/components/form/input/Checkbox";
import {
  markHoanThanh,
  danhDauLaCuaPhong,
  loaiKhoiPhong,
  xoaKeHoachBaoCao,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import UpdateResultModal from "./UpdateResultModal";
import SuaNoiDungModal from "./SuaNoiDungModal";
import ChiTietModal from "./ChiTietModal";
import ConfirmDialog from "./ConfirmDialog";
import { ProgressStrip } from "./ProgressBar";
import { useToast } from "./ToastProvider";
import { formatDateTimeVN, formatDateVN, isTrongKhungSuaFull, isCungNgayHomNay } from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";

type ConfirmAction = "hoanThanh" | "boHoanThanh" | "chuyenPhong" | "loaiPhong" | "xoa" | null;
type NhanVien = { maNV: string; hoTen: string; maPhong: string };

export default function KeHoachBaoCaoItemCard({
  row,
  loai,
  isSelected,
  onToggleSelect,
  onChanged,
  nguoiTao,
  allowConvertToPhong = true,
  allowRemoveFromPhong = false,
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
  // "Loại khỏi phòng" — CHỈ hiện ở bảng cấp Phòng, và chỉ khi người xem là lãnh đạo của đúng phòng
  // đó (board Phòng tự kiểm tra quyen rồi mới truyền true xuống; server action loaiKhoiPhong vẫn
  // kiểm tra lại quyền 1 lần nữa cho chắc). Mặc định false để không hiện ở bảng cá nhân.
  allowRemoveFromPhong?: boolean;
}) {
  const isKeHoach = loai === "KEHOACH";
  const { show } = useToast();
  const user = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // "Cập nhật kết quả/ghi chú" — LUÔN hiện trong menu, không điều kiện gì (modal gốc, không đổi).
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  // "Sửa" — modal MỚI, RIÊNG, chỉ hiện mục menu khi canEditFull=true (xem bên dưới).
  const [isSuaOpen, setIsSuaOpen] = useState(false);
  const [isChiTietOpen, setIsChiTietOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isPending, setIsPending] = useState(false);

  // "Sửa" (Nội dung/Hạn xử lý/Người phối hợp) chỉ cho phép khi (nam, tuan) CỦA CHÍNH DÒNG NÀY
  // (row.nam/row.tuan — KHÔNG PHẢI tuần đang xem trên board) nằm đúng trong khung cho phép. Đây
  // CHỈ để ẩn/hiện mục menu — server action suaFullKeHoachBaoCao vẫn tự kiểm tra lại y hệt điều
  // này, không tin giá trị này gửi từ client.
  const canEditFull = isTrongKhungSuaFull(loai, row.nam, row.tuan);

  // "Xoá": chỉ CHÍNH người đã tạo dòng này, và chỉ trong ĐÚNG NGÀY vừa nhập (taoLuc). Đây CHỈ để
  // ẩn/hiện nút Xoá cho gọn — chốt chặn THẬT SỰ nằm ở server action xoaKeHoachBaoCao (ke-hoach.ts),
  // tự kiểm tra lại y hệt điều kiện này, không tin giá trị này gửi từ client.
  const coTheXoa = row.nguoiTao.maNV === user?.maNV && isCungNgayHomNay(row.taoLuc);

  // Danh sách đồng nghiệp cùng phòng — CHỈ cần tải khi thực sự mở modal Sửa VÀ dòng đang trong
  // khung sửa full (tránh gọi API thừa cho phần lớn trường hợp không cần tới Người phối hợp).
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  useEffect(() => {
    if (isSuaOpen && canEditFull && nhanVienList.length === 0) {
      getNhanVienList().then(setNhanVienList);
    }
  }, [isSuaOpen, canEditFull, nhanVienList.length]);

  const nhanVienOptions = useMemo(() => {
    return nhanVienList
      .filter((nv) => nv.maNV !== user?.maNV && nv.maPhong === user?.maPhong)
      .map((nv) => ({ value: nv.maNV, text: nv.hoTen }));
  }, [nhanVienList, user?.maNV, user?.maPhong]);

  // Chỉ coi là "đã chỉnh sửa sau khi tạo" nếu cách nhau hơn 60s — tránh hiện "Cập nhật lúc" ngay
  // cả khi vừa tạo xong (ngayCapNhat luôn = taoLuc lúc mới tạo do @updatedAt).
  const daChinhSua =
    Math.abs(new Date(row.ngayCapNhat).getTime() - new Date(row.taoLuc).getTime()) > 60000;

  // Có ít nhất 1 trong 2 dòng chú thích neo góc dưới-phải (Cập nhật lúc / Hạn xử lý) -> cần chừa
  // thêm khoảng trống bên dưới card trên tablet/desktop để không đè lên nội dung chính.
  const coGhiChuGocDuoi = daChinhSua || (isKeHoach && !!row.hanXuLy);

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
      const res = await danhDauLaCuaPhong(row.id);
      const tenPhong = isKeHoach ? "KH Phòng" : "BC Phòng";
      show(
        "success",
        "Đã đánh dấu thành công",
        res.alreadyMarked ? `Mục này đã là ${tenPhong} từ trước` : `Đã đánh dấu là ${tenPhong}`
      );
      onChanged();
    } catch (e) {
      show("error", "Đánh dấu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsPending(false);
      setConfirmAction(null);
    }
  }

  async function handleConfirmXoa() {
    setIsPending(true);
    try {
      await xoaKeHoachBaoCao(row.id);
      show("success", "Đã xoá", `Đã xoá ${isKeHoach ? "kế hoạch" : "báo cáo"} này`);
      onChanged();
    } catch (e) {
      show("error", "Xoá thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsPending(false);
      setConfirmAction(null);
    }
  }

  async function handleConfirmLoaiPhong() {
    setIsPending(true);
    try {
      await loaiKhoiPhong(row.id);
      show("success", "Đã loại khỏi phòng", "Đã trả mục này về cá nhân người tạo");
      onChanged();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsPending(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div
        className={`flex items-start justify-between gap-3 p-4 sm:relative ${
          coGhiChuGocDuoi ? "sm:pb-10" : ""
        }`}
      >
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
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 break-words text-sm text-gray-800 dark:text-white/90">
            {row.noiDung}
            {row.laCuaPhong && (
              <span className="ml-2 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 align-middle text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                KH Phòng
              </span>
            )}
          </p>

          {row.ketQua && (
            <p className="mt-1 line-clamp-2 break-words text-xs text-blue-600 dark:text-blue-400">
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
            <p className="mt-1 break-words text-xs text-purple-600 dark:text-purple-400">
              Phối hợp: {row.nguoiPhoiHop.map((p) => p.hoTen).join(", ")}
            </p>
          )}
          {isKeHoach && row.tienDo != null && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tiến độ: <span className="font-medium">{row.tienDo}%</span>
            </p>
          )}

          {/* "Cập nhật lúc..." + "Hạn xử lý" — GOM CHUNG 1 KHỐI, neo xuống góc dưới-phải của card
              trên tablet/desktop (sm+), xếp chồng lên nhau (Cập nhật lúc ở trên, Hạn xử lý ở dưới)
              để không đè nhau. Trên di động, cả 2 vẫn nằm trong luồng nội dung bình thường (không
              absolute), xếp theo đúng thứ tự cũ. */}
          {coGhiChuGocDuoi && (
            <div className="mt-1 flex flex-col items-start gap-0.5 sm:absolute sm:bottom-2 sm:right-4 sm:mt-0 sm:items-end">
              {daChinhSua && (
                <p className="text-[11px] italic text-gray-400">
                  Cập nhật lúc {formatDateTimeVN(row.ngayCapNhat)}
                  {row.nguoiCapNhat && ` bởi ${row.nguoiCapNhat.hoTen}`}
                </p>
              )}
              {isKeHoach && row.hanXuLy && (
                <p
                  className={`text-xs font-medium ${
                    !row.daHoanThanh && new Date(row.hanXuLy) < new Date()
                      ? "text-error-600"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Hạn xử lý: {formatDateVN(new Date(row.hanXuLy))}
                </p>
              )}
            </div>
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
          {allowConvertToPhong && !row.laCuaPhong && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction("chuyenPhong");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              → Đánh dấu là {isKeHoach ? "KH Phòng" : "BC Phòng"}
            </DropdownItem>
          )}

          {/* "Sửa" — MỤC MENU MỚI, RIÊNG với "Cập nhật kết quả/ghi chú" bên dưới. CHỈ hiện khi
              canEditFull=true (đúng khung tuần cho phép). Mở SuaNoiDungModal — chỉ có Nội dung/Hạn
              xử lý/Người phối hợp, không có Kết quả/Ghi chú/Tiến độ. */}
          {canEditFull && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setIsSuaOpen(true);
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              ✏️ Sửa
            </DropdownItem>
          )}

          {/* "Cập nhật kết quả/ghi chú" — LUÔN hiện, không điều kiện gì (đúng hành vi gốc). */}
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
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction(row.daHoanThanh ? "boHoanThanh" : "hoanThanh");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {row.daHoanThanh ? "✕ Bỏ đánh dấu hoàn thành" : "✓ Đánh dấu hoàn thành"}
            </DropdownItem>
          )}

          {allowRemoveFromPhong && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction("loaiPhong");
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
            >
              🚫 Loại khỏi phòng
            </DropdownItem>
          )}

          {/* "Xoá" — chỉ hiện cho chính người đã tạo dòng này, và chỉ trong đúng ngày vừa nhập.
              Icon dùng SVG (currentColor) thay vì emoji 🗑️ để chắc chắn hiển thị ĐÚNG MÀU ĐỎ — emoji
              không nhận được màu chữ CSS trên nhiều trình duyệt/hệ điều hành. */}
          {coTheXoa && (
            <DropdownItem
              onItemClick={() => {
                setIsMenuOpen(false);
                setConfirmAction("xoa");
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M8.5 2.75A.75.75 0 019.25 2h1.5a.75.75 0 01.75.75V4h3.25a.75.75 0 010 1.5h-.598l-.687 9.63A2.25 2.25 0 0111.17 17.5H8.83a2.25 2.25 0 01-2.245-2.37L5.898 5.5H5.3a.75.75 0 010-1.5h3.2V2.75zm1.5.75v.5h0v-.5zM7.4 5.5l.68 9.516a.75.75 0 00.749.734h2.34a.75.75 0 00.75-.734L12.6 5.5H7.4z"
                  clipRule="evenodd"
                />
              </svg>
              Xoá
            </DropdownItem>
          )}
        </Dropdown>
      </div>
      </div>

      {isKeHoach && row.tienDo != null && row.tienDo > 0 && <ProgressStrip percent={row.tienDo} />}

      <UpdateResultModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        ids={[row.id]}
        currentNoiDung={row.noiDung}
        currentKetQua={row.ketQua}
        currentGhiChu={row.ghiChu}
        onUpdated={onChanged}
        showChuyenPhongNote={allowConvertToPhong}
        showTienDo={isKeHoach}
        currentTienDo={row.tienDo}
      />

      {canEditFull && (
        <SuaNoiDungModal
          isOpen={isSuaOpen}
          onClose={() => setIsSuaOpen(false)}
          id={row.id}
          currentNoiDung={row.noiDung}
          showHanXuLy={isKeHoach}
          currentHanXuLy={row.hanXuLy}
          currentNguoiPhoiHopIds={row.nguoiPhoiHop.map((p) => p.maNV)}
          nhanVienOptions={nhanVienOptions}
          onUpdated={onChanged}
        />
      )}

      <ChiTietModal
        isOpen={isChiTietOpen}
        onClose={() => setIsChiTietOpen(false)}
        row={row}
        loai={loai}
        nguoiTao={nguoiTao}
      />

      <ConfirmDialog
        isOpen={confirmAction === "chuyenPhong"}
        title={`Đánh dấu là ${isKeHoach ? "KH Phòng" : "BC Phòng"}`}
        description={`Bạn muốn đánh dấu 1 ${isKeHoach ? "kế hoạch" : "báo cáo"} cá nhân này là ${isKeHoach ? "kế hoạch" : "báo cáo"} phòng?`}
        confirmText="Đánh dấu"
        isLoading={isPending}
        onConfirm={handleConfirmConvert}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "hoanThanh"}
        title="Đánh dấu hoàn thành"
        description="Bạn chắc chắn 1 kế hoạch này đã hoàn thành?"
        isLoading={isPending}
        onConfirm={() => handleConfirmHoanThanh(true)}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "boHoanThanh"}
        title="Bỏ đánh dấu hoàn thành"
        description="Bạn chắc chắn muốn bỏ đánh dấu hoàn thành cho kế hoạch này?"
        isLoading={isPending}
        onConfirm={() => handleConfirmHoanThanh(false)}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "xoa"}
        title={`Xoá ${isKeHoach ? "kế hoạch" : "báo cáo"}`}
        description={`Bạn chắc chắn muốn xoá ${isKeHoach ? "kế hoạch" : "báo cáo"} này? Chỉ xoá được trong đúng ngày vừa nhập, không thể hoàn tác.`}
        confirmText="Xoá"
        isLoading={isPending}
        onConfirm={handleConfirmXoa}
        onClose={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === "loaiPhong"}
        title={`Loại khỏi ${isKeHoach ? "Kế hoạch" : "Báo cáo"} Phòng`}
        description={`Bạn chắc chắn muốn loại mục này khỏi ${isKeHoach ? "Kế hoạch" : "Báo cáo"} Phòng? Mục sẽ được trả về lại thành ${isKeHoach ? "kế hoạch" : "báo cáo"} cá nhân của người tạo.`}
        confirmText="Loại khỏi phòng"
        isLoading={isPending}
        onConfirm={handleConfirmLoaiPhong}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
