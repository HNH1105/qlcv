// ĐÍCH: src/components/giao-ban/AddNoiDungGiaoBanModal.tsx
//
// Đợt này CHỈ làm nguồn "Nhập trực tiếp" (ưu tiên theo yêu cầu). 2 nguồn còn lại (Từ Nhiệm vụ /
// Từ Kế hoạch phòng) sẽ thêm dạng tab ở modal này khi làm tới — action nền
// (chuyenNhiemVuThanhGiaoBan/chuyenKeHoachThanhGiaoBan) đã có sẵn ghi chú khung trong giao-ban.ts.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import { themNoiDungTrucTiep } from "@/lib/actions/giao-ban";
import { getPhongList, getNhanVienList } from "@/lib/actions/danh-muc";
import { MucDoUuTienGiaoBan } from "@prisma/client";

type Phong = { maPhong: string; tenPhong: string };
type NhanVien = { maNV: string; hoTen: string; maPhong: string };

const UU_TIEN_OPTIONS: { value: MucDoUuTienGiaoBan; label: string }[] = [
  { value: "CAO", label: "Cao" },
  { value: "TRUNGBINH", label: "Trung bình" },
  { value: "THAP", label: "Thấp" },
];

export default function AddNoiDungGiaoBanModal({
  isOpen,
  onClose,
  cuocHopGiaoBanId,
  hanMacDinh,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  cuocHopGiaoBanId: number;
  hanMacDinh: string; // yyyy-mm-dd — ngày cuối tuần của cuộc họp, dùng làm hạn mặc định
  onAdded: () => void;
}) {
  const user = useAuth();
  const { show } = useToast();

  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);

  const [noiDung, setNoiDung] = useState("");
  // Admin/LĐ đơn vị chọn tự do; LĐ phòng mặc định đúng phòng mình (khớp quyền "suaNoiDung").
  const [phongXuLyId, setPhongXuLyId] = useState("");
  const [hanHoanThanh, setHanHoanThanh] = useState("");
  const [dateKey, setDateKey] = useState(0);
  // Mặc định: hạn = ngày cuối tuần của cuộc họp, mức độ ưu tiên = Cao (theo yêu cầu mới).
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienGiaoBan>("CAO");
  const [ghiChu, setGhiChu] = useState("");
  const [selectedNguoiXuLy, setSelectedNguoiXuLy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getPhongList().then(setPhongList);
    getNhanVienList().then(setNhanVienList);
    setNoiDung("");
    setPhongXuLyId(user?.quyen === "LANHDAOPHONG" ? user.maPhong : "");
    setHanHoanThanh(hanMacDinh);
    setDateKey((k) => k + 1);
    setMucDoUuTien("CAO");
    setGhiChu("");
    setSelectedNguoiXuLy([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hanMacDinh]);

  // Người xử lý CHỈ được chọn trong đúng phòng xử lý đã chọn ở trên (điều chỉnh đã chốt) — đổi
  // phòng thì reset lại danh sách đã chọn để không giữ người sai phòng.
  const nguoiXuLyOptions = useMemo(
    () =>
      nhanVienList
        .filter((nv) => nv.maPhong === phongXuLyId)
        .map((nv) => ({ value: nv.maNV, text: nv.hoTen })),
    [nhanVienList, phongXuLyId]
  );

  useEffect(() => {
    setSelectedNguoiXuLy((prev) => prev.filter((id) => nguoiXuLyOptions.some((o) => o.value === id)));
  }, [nguoiXuLyOptions]);

  const handleHanChange = useCallback((_dates: Date[], dateStr: string) => {
    setHanHoanThanh(dateStr);
  }, []);

  function resetAndClose() {
    onClose();
  }

  async function handleSave() {
    if (!noiDung.trim()) return setError("Vui lòng nhập nội dung.");
    if (!phongXuLyId) return setError("Vui lòng chọn phòng xử lý.");
    if (!hanHoanThanh) return setError("Vui lòng chọn hạn hoàn thành.");

    setIsSubmitting(true);
    setError(null);
    try {
      await themNoiDungTrucTiep({
        cuocHopGiaoBanId,
        noiDung,
        phongXuLyId,
        hanHoanThanh: new Date(hanHoanThanh),
        mucDoUuTien,
        ghiChu: ghiChu || undefined,
        nguoiXuLyIds: selectedNguoiXuLy,
      });
      show("success", "Đã thêm", "Đã thêm nội dung vào checklist giao ban");
      onAdded();
      resetAndClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại";
      setError(msg);
      show("error", "Thêm thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const phongOptionsChoDropdown =
    user?.quyen === "LANHDAOPHONG" ? phongList.filter((p) => p.maPhong === user.maPhong) : phongList;

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[640px] p-5 lg:p-10">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Thêm nội dung giao ban</h4>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <Label>
            Nội dung <span className="text-error-500">*</span>
          </Label>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={3}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Nội dung công việc đưa ra giao ban..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>
              Phòng xử lý <span className="text-error-500">*</span>
            </Label>
            <select
              value={phongXuLyId}
              onChange={(e) => setPhongXuLyId(e.target.value)}
              disabled={user?.quyen === "LANHDAOPHONG"}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">— Chọn phòng —</option>
              {phongOptionsChoDropdown.map((p) => (
                <option key={p.maPhong} value={p.maPhong}>
                  {p.tenPhong}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Mức độ ưu tiên</Label>
            <select
              value={mucDoUuTien}
              onChange={(e) => setMucDoUuTien(e.target.value as MucDoUuTienGiaoBan)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {UU_TIEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div key={dateKey} className="w-[180px]">
          <DatePicker
            id="han-hoan-thanh-giao-ban"
            label="Hạn hoàn thành *"
            placeholder="Chọn ngày..."
            defaultDate={hanHoanThanh || undefined}
            onChange={handleHanChange}
          />
        </div>

        <NguoiPhoiHopSelect
          label="Chuyên viên xử lý (không bắt buộc)"
          options={nguoiXuLyOptions}
          selected={selectedNguoiXuLy}
          onChange={setSelectedNguoiXuLy}
        />

        <div>
          <Label>Ghi chú</Label>
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div className="flex items-center justify-end w-full gap-3 mt-6">
        <Button size="sm" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              Đang lưu...
            </span>
          ) : (
            "Thêm vào checklist"
          )}
        </Button>
      </div>
    </Modal>
  );
}
