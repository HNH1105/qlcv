// ĐÍCH: src/components/giao-ban/NoiDungGiaoBanDetailModal.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { formatDateVN, formatDateTimeVN } from "@/lib/week";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import {
  capNhatNoiDungGiaoBan,
  themNguoiXuLy,
  xoaNguoiXuLy,
  hoanThanhNoiDung,
  boHoanThanh,
  deNghiChuyenTuan,
  huyKhongTheoDoi,
} from "@/lib/actions/giao-ban";
import { tinhTrangThaiGiaoBan } from "@/lib/giao-ban/trang-thai";
import { TrangThaiGiaoBanBadge, UuTienGiaoBanBadge } from "./GiaoBanBadges";
import NoiDungGiaoBanLichSu from "./NoiDungGiaoBanLichSu";
import { MucDoUuTienGiaoBan } from "@prisma/client";
import type { NoiDungGiaoBanRow } from "./GiaoBanTable";

// Ánh xạ quyền PHÍA CLIENT — chỉ để ẩn/hiện nút, quyết định thật vẫn nằm ở giao-ban.ts (server).
// Giữ đúng 4 điều chỉnh đã chốt: Admin (isAdmin) > LĐ đơn vị chỉ xem > LĐ/Chuyên viên phòng đúng
// phòng xử lý.
function tinhQuyenClient(
  user: { isAdmin: boolean; quyen: string; maPhong: string } | null | undefined,
  phongXuLyId: string
) {
  if (!user) return { xemDuoc: false, suaThongTin: false, capNhatGhiChuVaHoanThanh: false, laAdmin: false };
  const isAdmin = user.isAdmin;
  const cungPhong = user.maPhong === phongXuLyId;
  const isLanhDaoPhong = !isAdmin && user.quyen === "LANHDAOPHONG" && cungPhong;
  const isChuyenVien = !isAdmin && user.quyen === "USER" && cungPhong;
  const laLanhDaoDonVi = !isAdmin && user.quyen === "LANHDAODONVI";
  return {
    laAdmin: isAdmin,
    xemDuoc: isAdmin || laLanhDaoDonVi || cungPhong,
    suaThongTin: isAdmin || isLanhDaoPhong,
    capNhatGhiChuVaHoanThanh: isAdmin || isLanhDaoPhong || isChuyenVien,
  };
}

const UU_TIEN_OPTIONS: { value: MucDoUuTienGiaoBan; label: string }[] = [
  { value: "CAO", label: "Cao" },
  { value: "TRUNGBINH", label: "Trung bình" },
  { value: "THAP", label: "Thấp" },
];

export default function NoiDungGiaoBanDetailModal({
  isOpen,
  onClose,
  row,
  cuocHopDangMo,
  onChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: NoiDungGiaoBanRow | null;
  cuocHopDangMo: boolean;
  onChanged: () => void;
}) {
  const user = useAuth();
  const { show } = useToast();

  const quyen = row ? tinhQuyenClient(user, row.phongXuLy.maPhong) : null;
  const trangThai = row ? tinhTrangThaiGiaoBan(row) : "DANG_XU_LY";
  const khoaNghiepVu = !cuocHopDangMo || (row?.daKetThuc ?? true);

  // ----- Form sửa thông tin (chỉ dùng khi quyen.suaThongTin) -----
  const [dangSua, setDangSua] = useState(false);
  const [noiDung, setNoiDung] = useState("");
  const [hanHoanThanh, setHanHoanThanh] = useState("");
  const [dateKey, setDateKey] = useState(0);
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienGiaoBan>("TRUNGBINH");
  const [ghiChu, setGhiChu] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ----- Chuyên viên xử lý -----
  const [nhanVienList, setNhanVienList] = useState<{ maNV: string; hoTen: string; maPhong: string }[]>([]);
  const [selectedNguoiXuLy, setSelectedNguoiXuLy] = useState<string[]>([]);
  const [isSavingNguoiXuLy, setIsSavingNguoiXuLy] = useState(false);

  // ----- Hoàn thành / Huỷ (cần nhập text) -----
  const [dangNhapHoanThanh, setDangNhapHoanThanh] = useState(false);
  const [ghiChuHoanThanh, setGhiChuHoanThanh] = useState("");
  const [dangNhapHuy, setDangNhapHuy] = useState(false);
  const [lyDoHuy, setLyDoHuy] = useState("");
  const [confirmBoHoanThanh, setConfirmBoHoanThanh] = useState(false);
  const [confirmChuyenTuan, setConfirmChuyenTuan] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [hienLichSu, setHienLichSu] = useState(false);

  useEffect(() => {
    if (!isOpen || !row) return;
    setDangSua(false);
    setNoiDung(row.noiDung);
    setHanHoanThanh(new Date(row.hanHoanThanh).toISOString().slice(0, 10));
    setDateKey((k) => k + 1);
    setMucDoUuTien(row.mucDoUuTien);
    setGhiChu(row.ghiChu ?? "");
    setSelectedNguoiXuLy(row.nguoiXuLys.map((x) => x.nhanVien.maNV));
    setDangNhapHoanThanh(false);
    setGhiChuHoanThanh("");
    setDangNhapHuy(false);
    setLyDoHuy("");
    setHienLichSu(false);
    getNhanVienList().then(setNhanVienList);
  }, [isOpen, row]);

  const nguoiXuLyOptions = useMemo(
    () =>
      row ? nhanVienList.filter((nv) => nv.maPhong === row.phongXuLy.maPhong).map((nv) => ({ value: nv.maNV, text: nv.hoTen })) : [],
    [nhanVienList, row]
  );

  const handleHanChange = useCallback((_dates: Date[], dateStr: string) => setHanHoanThanh(dateStr), []);

  if (!row || !quyen) return null;

  async function luuThongTin() {
    setIsSaving(true);
    try {
      await capNhatNoiDungGiaoBan(row!.id, {
        noiDung,
        hanHoanThanh: new Date(hanHoanThanh),
        mucDoUuTien,
      });
      show("success", "Đã lưu", "Đã cập nhật nội dung giao ban");
      setDangSua(false);
      onChanged();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  async function luuGhiChu() {
    setIsSaving(true);
    try {
      await capNhatNoiDungGiaoBan(row!.id, { ghiChu });
      show("success", "Đã lưu", "Đã cập nhật ghi chú");
      onChanged();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  }

  async function luuNguoiXuLy(nextSelected: string[]) {
    const truoc = row!.nguoiXuLys.map((x) => x.nhanVien.maNV);
    const themMoi = nextSelected.filter((id) => !truoc.includes(id));
    const boBot = truoc.filter((id) => !nextSelected.includes(id));
    setSelectedNguoiXuLy(nextSelected);
    setIsSavingNguoiXuLy(true);
    try {
      for (const id of themMoi) await themNguoiXuLy(row!.id, id);
      for (const id of boBot) await xoaNguoiXuLy(row!.id, id);
      onChanged();
    } catch (e) {
      show("error", "Cập nhật thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
      setSelectedNguoiXuLy(truoc);
    } finally {
      setIsSavingNguoiXuLy(false);
    }
  }

  async function xacNhanHoanThanh() {
    setIsActing(true);
    try {
      await hoanThanhNoiDung(row!.id, ghiChuHoanThanh || undefined);
      show("success", "Đã hoàn thành", "Đã đánh dấu hoàn thành nội dung");
      onChanged();
      onClose();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsActing(false);
    }
  }

  async function xacNhanBoHoanThanh() {
    setIsActing(true);
    try {
      await boHoanThanh(row!.id);
      show("success", "Đã cập nhật", "Đã bỏ đánh dấu hoàn thành");
      onChanged();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsActing(false);
      setConfirmBoHoanThanh(false);
    }
  }

  async function xacNhanChuyenTuanSau() {
    setIsActing(true);
    try {
      await deNghiChuyenTuan(row!.id);
      show("success", "Đã đề nghị", "Đã đề nghị chuyển tuần sau — chờ Admin xác nhận");
      onChanged();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsActing(false);
      setConfirmChuyenTuan(false);
    }
  }

  async function xacNhanHuy() {
    setIsActing(true);
    try {
      await huyKhongTheoDoi(row!.id, lyDoHuy || undefined);
      show("success", "Đã huỷ", "Đã huỷ/không theo dõi nội dung này");
      onChanged();
      onClose();
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] p-5 lg:p-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TrangThaiGiaoBanBadge trangThai={trangThai} />
        <UuTienGiaoBanBadge mucDo={row.mucDoUuTien} />
        {khoaNghiepVu && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
            🔒 Đã khoá thao tác
          </span>
        )}
      </div>

      {!dangSua ? (
        <>
          <p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-white/90">{row.noiDung}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400">Phòng xử lý</p>
              <p className="text-gray-800 dark:text-white/90">{row.phongXuLy.tenPhong}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Hạn hoàn thành</p>
              <p className="text-gray-800 dark:text-white/90">{formatDateVN(new Date(row.hanHoanThanh))}</p>
            </div>
          </div>
          {quyen.suaThongTin && !khoaNghiepVu && (
            <button
              onClick={() => setDangSua(true)}
              className="mt-3 text-xs font-medium text-brand-500 hover:underline"
            >
              ✏️ Sửa nội dung / hạn / mức độ ưu tiên
            </button>
          )}
        </>
      ) : (
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
              <DatePicker id="sua-han-hoan-thanh" label="Hạn hoàn thành" defaultDate={hanHoanThanh} onChange={handleHanChange} />
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
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setDangSua(false)} disabled={isSaving}>Huỷ</Button>
            <Button size="sm" onClick={luuThongTin} disabled={isSaving}>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
        {quyen.suaThongTin && !khoaNghiepVu ? (
          <NguoiPhoiHopSelect
            label="Chuyên viên xử lý"
            options={nguoiXuLyOptions}
            selected={selectedNguoiXuLy}
            onChange={luuNguoiXuLy}
          />
        ) : (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-400">Chuyên viên xử lý</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {row.nguoiXuLys.length === 0 ? (
                <span className="italic text-gray-400">Chưa phân công</span>
              ) : (
                row.nguoiXuLys.map((x) => x.nhanVien.hoTen).join(", ")
              )}
            </p>
          </div>
        )}
        {isSavingNguoiXuLy && <p className="mt-1 text-xs text-gray-400">Đang lưu...</p>}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
        <Label>Ghi chú</Label>
        <div className="flex gap-2">
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            disabled={!quyen.capNhatGhiChuVaHoanThanh || khoaNghiepVu}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          {quyen.capNhatGhiChuVaHoanThanh && !khoaNghiepVu && (
            <Button size="sm" variant="outline" onClick={luuGhiChu} disabled={isSaving}>Lưu</Button>
          )}
        </div>
      </div>

      {row.nguoiHoanThanh && (
        <p className="mt-3 text-xs text-gray-400">
          Hoàn thành bởi {row.nguoiHoanThanh.hoTen}
          {row.thoiGianHoanThanh && ` lúc ${formatDateTimeVN(row.thoiGianHoanThanh)}`}
        </p>
      )}

      {/* ===== Hành động nghiệp vụ ===== */}
      {!khoaNghiepVu && (quyen.capNhatGhiChuVaHoanThanh || quyen.suaThongTin) && (
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
          {dangNhapHoanThanh ? (
            <div className="space-y-2 rounded-lg bg-success-50 p-3 dark:bg-success-500/10">
              <Label>Ghi chú kết quả thực hiện</Label>
              <textarea
                value={ghiChuHoanThanh}
                onChange={(e) => setGhiChuHoanThanh(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDangNhapHoanThanh(false)} disabled={isActing}>Huỷ</Button>
                <Button size="sm" onClick={xacNhanHoanThanh} disabled={isActing}>
                  {isActing ? "Đang lưu..." : "Xác nhận hoàn thành"}
                </Button>
              </div>
            </div>
          ) : dangNhapHuy ? (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
              <Label>Lý do huỷ/không theo dõi (không bắt buộc)</Label>
              <textarea
                value={lyDoHuy}
                onChange={(e) => setLyDoHuy(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDangNhapHuy(false)} disabled={isActing}>Đóng</Button>
                <Button size="sm" onClick={xacNhanHuy} disabled={isActing}>
                  {isActing ? "Đang lưu..." : "Xác nhận huỷ"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quyen.capNhatGhiChuVaHoanThanh && !row.daHoanThanh && (
                <button
                  onClick={() => setDangNhapHoanThanh(true)}
                  className="rounded-lg bg-success-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-600"
                >
                  ✓ Đánh dấu hoàn thành
                </button>
              )}
              {quyen.capNhatGhiChuVaHoanThanh && row.daHoanThanh && (
                <button
                  onClick={() => setConfirmBoHoanThanh(true)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300"
                >
                  ↩ Bỏ hoàn thành
                </button>
              )}
              {quyen.suaThongTin && !row.daHoanThanh && (
                <button
                  onClick={() => setConfirmChuyenTuan(true)}
                  disabled={row.deNghiChuyenTuan}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {row.deNghiChuyenTuan ? "Đã đề nghị chuyển tuần" : "→ Chuyển tuần sau"}
                </button>
              )}
              {quyen.suaThongTin && (
                <button
                  onClick={() => setDangNhapHuy(true)}
                  className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                >
                  ✕ Huỷ/không theo dõi
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/[0.05]">
        <button
          onClick={() => setHienLichSu((v) => !v)}
          className="text-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
        >
          {hienLichSu ? "▾ Ẩn lịch sử" : "▸ Xem lịch sử"}
        </button>
        {hienLichSu && (
          <div className="mt-2">
            <NoiDungGiaoBanLichSu noiDungGiaoBanId={row.id} />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmBoHoanThanh}
        title="Bỏ hoàn thành"
        description="Bạn chắc chắn muốn bỏ đánh dấu hoàn thành nội dung này?"
        isLoading={isActing}
        onConfirm={xacNhanBoHoanThanh}
        onClose={() => setConfirmBoHoanThanh(false)}
      />
      <ConfirmDialog
        isOpen={confirmChuyenTuan}
        title="Đề nghị chuyển tuần sau"
        description="Nội dung sẽ được đánh dấu đề nghị chuyển sang tuần sau. Admin sẽ xác nhận và tạo bản ghi cho tuần mới."
        isLoading={isActing}
        onConfirm={xacNhanChuyenTuanSau}
        onClose={() => setConfirmChuyenTuan(false)}
      />
    </Modal>
  );
}
