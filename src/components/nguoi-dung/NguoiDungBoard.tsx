// ĐÍCH: src/components/nguoi-dung/NguoiDungBoard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useModal } from "@/hooks/useModal";
import { getPhongList } from "@/lib/actions/danh-muc";
import { getDanhSachNguoiDung, resetMatKhau, taoNguoiDung, suaThongTinNguoiDung } from "@/lib/actions/nguoi-dung";
import { formatDateTimeVN } from "@/lib/week";

type Phong = { maPhong: string; tenPhong: string };
type NguoiDung = Awaited<ReturnType<typeof getDanhSachNguoiDung>>[number];
type KetQuaMatKhau = { hoTen: string; tenDangNhap: string; matKhauMoi: string };

export default function NguoiDungBoard() {
  return (
    <ToastProvider>
      <BoardContent />
    </ToastProvider>
  );
}

function BoardContent() {
  const { show } = useToast();
  const { isOpen: isAddOpen, openModal: openAdd, closeModal: closeAdd } = useModal();

  const [dsPhong, setDsPhong] = useState<Phong[]>([]);
  const [maPhong, setMaPhong] = useState("");
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [rows, setRows] = useState<NguoiDung[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [rowDangReset, setRowDangReset] = useState<NguoiDung | null>(null);
  const [dangReset, setDangReset] = useState(false);
  const [rowDangSua, setRowDangSua] = useState<NguoiDung | null>(null);
  const [ketQuaMatKhau, setKetQuaMatKhau] = useState<KetQuaMatKhau | null>(null);
  const [daCopy, setDaCopy] = useState(false);

  useEffect(() => {
    getPhongList().then(setDsPhong);
  }, []);

  // Debounce ô tìm kiếm 400ms — gõ liên tục không bắn API liên tục.
  useEffect(() => {
    const t = setTimeout(() => setTuKhoa(tuKhoaNhap.trim()), 400);
    return () => clearTimeout(t);
  }, [tuKhoaNhap]);

  const reload = useCallback(() => {
    setIsLoading(true);
    getDanhSachNguoiDung({ maPhong: maPhong || undefined, tuKhoa: tuKhoa || undefined })
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maPhong, tuKhoa]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function xacNhanReset() {
    if (!rowDangReset) return;
    setDangReset(true);
    try {
      const kq = await resetMatKhau(rowDangReset.maNV);
      setKetQuaMatKhau(kq);
      show("success", "Đã reset mật khẩu", `Đã tạo mật khẩu mới cho ${kq.hoTen}`);
      reload();
    } catch (e) {
      show("error", "Reset thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangReset(false);
      setRowDangReset(null);
    }
  }

  async function handleCopy() {
    if (!ketQuaMatKhau) return;
    try {
      await navigator.clipboard.writeText(ketQuaMatKhau.matKhauMoi);
      setDaCopy(true);
      setTimeout(() => setDaCopy(false), 2000);
    } catch {
      show("error", "Không copy được", "Vui lòng bôi đen và copy thủ công.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Quản lý người dùng</h1>
          <p className="text-sm text-gray-400">Tra cứu người dùng theo phòng, thêm mới, sửa thông tin, reset mật khẩu.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Thêm người dùng <span className="text-lg leading-none">+</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs text-gray-500">Tìm kiếm (tên hoặc tên đăng nhập)</label>
          <input
            value={tuKhoaNhap}
            onChange={(e) => setTuKhoaNhap(e.target.value)}
            placeholder="VD: Nguyễn Văn A hoặc nva..."
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs text-gray-500">Phòng</label>
          <select
            value={maPhong}
            onChange={(e) => setMaPhong(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">Tất cả phòng</option>
            {dsPhong.map((p) => (
              <option key={p.maPhong} value={p.maPhong}>{p.tenPhong}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-400">Không tìm thấy người dùng nào.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  <th className="w-14 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">STT</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Họ tên</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tên đăng nhập</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Phòng</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Chức vụ</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                  <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Đăng nhập cuối</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rows.map((r, idx) => (
                  <tr key={r.maNV} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-theme-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{r.hoTen}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.taiKhoan?.tenDangNhap ?? <span className="italic text-gray-400">Chưa có tài khoản</span>}
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">{r.phong.tenPhong}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">{r.chucVu ?? "—"}</td>
                    <td className="px-4 py-3">
                      <TrangThaiBadge nguoiDung={r} />
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {r.taiKhoan?.lanDangNhapCuoi ? formatDateTimeVN(r.taiKhoan.lanDangNhapCuoi) : <span className="italic text-gray-400">Chưa đăng nhập</span>}
                    </td>
                    <td className="px-2 py-3 text-end">
                      <RowMenu
                        coTaiKhoan={!!r.taiKhoan}
                        onSuaThongTin={() => setRowDangSua(r)}
                        onResetMatKhau={() => setRowDangReset(r)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ThemNguoiDungModal
        isOpen={isAddOpen}
        onClose={closeAdd}
        dsPhong={dsPhong}
        onCreated={(kq) => {
          setKetQuaMatKhau(kq);
          reload();
        }}
      />

      <SuaNguoiDungModal
        isOpen={rowDangSua != null}
        onClose={() => setRowDangSua(null)}
        row={rowDangSua}
        dsPhong={dsPhong}
        onSaved={reload}
      />

      <ConfirmDialog
        isOpen={rowDangReset != null}
        title="Reset mật khẩu"
        description={`Tạo mật khẩu mới cho "${rowDangReset?.hoTen}" (${rowDangReset?.taiKhoan?.tenDangNhap})? Mật khẩu cũ sẽ không còn dùng được, và tài khoản sẽ được mở khoá nếu đang bị khoá.`}
        confirmText="Reset mật khẩu"
        isLoading={dangReset}
        onConfirm={xacNhanReset}
        onClose={() => setRowDangReset(null)}
      />

      <Modal isOpen={ketQuaMatKhau != null} onClose={() => setKetQuaMatKhau(null)} className="max-w-[440px] p-5 lg:p-8">
        <h4 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Mật khẩu</h4>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Tài khoản của <b>{ketQuaMatKhau?.hoTen}</b> ({ketQuaMatKhau?.tenDangNhap}). Vui lòng gửi
          trực tiếp cho người dùng — mật khẩu này CHỈ hiển thị đúng 1 lần, không thể xem lại.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/5">
          <code className="flex-1 select-all font-mono text-lg font-semibold tracking-wider text-gray-800 dark:text-white/90">
            {ketQuaMatKhau?.matKhauMoi}
          </code>
          <button
            onClick={handleCopy}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            {daCopy ? "Đã copy ✓" : "Copy"}
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={() => setKetQuaMatKhau(null)}>Đóng</Button>
        </div>
      </Modal>
    </div>
  );
}

function TrangThaiBadge({ nguoiDung }: { nguoiDung: NguoiDung }) {
  if (!nguoiDung.taiKhoan) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
        Chưa có tài khoản
      </span>
    );
  }
  if (nguoiDung.taiKhoan.biKhoa) {
    return (
      <span className="rounded-full bg-error-100 px-2.5 py-0.5 text-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400">
        Đang bị khoá
      </span>
    );
  }
  if (!nguoiDung.hoatDong) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
        Ngừng hoạt động
      </span>
    );
  }
  return (
    <span className="rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-400">
      Hoạt động
    </span>
  );
}

// ============================================================================================
// MODAL: Thêm người dùng
// ============================================================================================

function ThemNguoiDungModal({
  isOpen,
  onClose,
  dsPhong,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  dsPhong: Phong[];
  onCreated: (kq: KetQuaMatKhau) => void;
}) {
  const { show } = useToast();
  const [maNV, setMaNV] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [maPhong, setMaPhong] = useState("");
  const [chucVu, setChucVu] = useState("");
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMaNV("");
    setHoTen("");
    setMaPhong("");
    setChucVu("");
    setTenDangNhap("");
    setError(null);
  }, [isOpen]);

  async function handleTao() {
    if (!maNV.trim() || !hoTen.trim() || !maPhong || !tenDangNhap.trim()) {
      return setError("Vui lòng nhập đầy đủ Mã nhân viên, Họ tên, Phòng, Tên đăng nhập.");
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const kq = await taoNguoiDung({ maNV, hoTen, maPhong, chucVu: chucVu || undefined, tenDangNhap });
      show("success", "Đã tạo người dùng", `Đã tạo tài khoản cho ${kq.hoTen}`);
      onCreated(kq);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      setError(msg);
      show("error", "Tạo thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Thêm người dùng</h4>
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Mã nhân viên *</Label>
            <input
              value={maNV}
              onChange={(e) => setMaNV(e.target.value)}
              placeholder="VD: NV001"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <Label>Tên đăng nhập *</Label>
            <input
              value={tenDangNhap}
              onChange={(e) => setTenDangNhap(e.target.value)}
              placeholder="VD: nva"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
        <div>
          <Label>Họ tên *</Label>
          <input
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phòng *</Label>
            <select
              value={maPhong}
              onChange={(e) => setMaPhong(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">— Chọn phòng —</option>
              {dsPhong.map((p) => (
                <option key={p.maPhong} value={p.maPhong}>{p.tenPhong}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Chức vụ</Label>
            <input
              value={chucVu}
              onChange={(e) => setChucVu(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Mật khẩu sẽ được tự động tạo ngẫu nhiên và hiển thị 1 lần sau khi tạo xong.</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Huỷ</Button>
        <Button size="sm" onClick={handleTao} disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo người dùng"}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================================================================
// MODAL: Sửa thông tin cơ bản (Họ tên / Phòng / Chức vụ)
// ============================================================================================

function SuaNguoiDungModal({
  isOpen,
  onClose,
  row,
  dsPhong,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  row: NguoiDung | null;
  dsPhong: Phong[];
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [hoTen, setHoTen] = useState("");
  const [maPhong, setMaPhong] = useState("");
  const [chucVu, setChucVu] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !row) return;
    setHoTen(row.hoTen);
    setMaPhong(row.maPhong);
    setChucVu(row.chucVu ?? "");
  }, [isOpen, row]);

  if (!row) return null;

  async function handleLuu() {
    if (!hoTen.trim() || !maPhong) return show("error", "Thiếu thông tin", "Vui lòng nhập Họ tên và Phòng.");
    setIsSubmitting(true);
    try {
      await suaThongTinNguoiDung(row!.maNV, { hoTen, maPhong, chucVu: chucVu || undefined });
      show("success", "Đã lưu", "Đã cập nhật thông tin người dùng");
      onSaved();
      onClose();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sửa thông tin</h4>
      <div className="space-y-4">
        <div>
          <Label>Họ tên</Label>
          <input
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div>
          <Label>Phòng</Label>
          <select
            value={maPhong}
            onChange={(e) => setMaPhong(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">— Chọn phòng —</option>
            {dsPhong.map((p) => (
              <option key={p.maPhong} value={p.maPhong}>{p.tenPhong}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Chức vụ</Label>
          <input
            value={chucVu}
            onChange={(e) => setChucVu(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Huỷ</Button>
        <Button size="sm" onClick={handleLuu} disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================================================================
// Menu "..." — portal ra document.body để không bị bảng cuộn ngang che mất.
// ============================================================================================

function RowMenu({
  coTaiKhoan,
  onSuaThongTin,
  onResetMatKhau,
}: {
  coTaiKhoan: boolean;
  onSuaThongTin: () => void;
  onResetMatKhau: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  function moMenu() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right - window.scrollX });
    setIsOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : moMenu())}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
        aria-label="Thao tác khác"
      >
        ⋯
      </button>
      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "absolute", top: pos.top, right: pos.right }}
            className="z-[99999] w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-dark"
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onSuaThongTin();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            >
              ✏️ Sửa thông tin
            </button>
            {coTaiKhoan && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onResetMatKhau();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              >
                🔑 Reset mật khẩu
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}