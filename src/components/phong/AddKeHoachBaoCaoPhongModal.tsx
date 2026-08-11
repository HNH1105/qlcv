"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import { submitKeHoachPhong } from "@/lib/actions/ke-hoach";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentWeekInfo,
  getWeekDateRangeLabel,
  getTuanOptions,
  isoWeeksInYear,
  parseTuanOptionValue,
} from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";
import { useToast } from "@/components/ca-nhan/ToastProvider";

type NhanVien = { maNV: string; hoTen: string; maPhong: string };

// Modal Thêm mới CẤP PHÒNG — cùng bố cục với AddKeHoachBaoCaoModal (cá nhân) nhưng:
// - KHÔNG có checkbox "chuyển thành phòng" (dòng này đã là cấp Phòng rồi, không cần chuyển tiếp).
// - Gọi submitKeHoachPhong (tạo capDo=PHONG, người tạo = người đang đăng nhập) thay vì
//   submitKeHoachCaNhan.
// - Tuần mặc định trong modal LÀ HẰNG SỐ độc lập với tuần đang xem trên board: Kế hoạch luôn mặc
//   định "tuần sau", Báo cáo luôn mặc định "tuần hiện tại" — dù board đang xem tuần nào, bấm Thêm
//   vẫn quay về đúng 2 mặc định này (đúng yêu cầu, khác cách cá nhân đang làm là lấy theo tuần board
//   đang xem).
export default function AddKeHoachBaoCaoPhongModal({
  isOpen,
  onClose,
  loai,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  loai: LoaiGhiNhan;
  onAdded: () => void;
}) {
  const user = useAuth();
  const { show } = useToast();
  const isBaoCao = loai === "BAOCAO";

  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const defaultNamTuan = useMemo(() => {
    if (isBaoCao) return { nam: namHienTai, tuan: tuanHienTai };
    let t = tuanHienTai + 1;
    let n = namHienTai;
    if (t > isoWeeksInYear(namHienTai)) {
      t = 1;
      n = namHienTai + 1;
    }
    return { nam: n, tuan: t };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoCao, isOpen]);

  const [modalNam, setModalNam] = useState(defaultNamTuan.nam);
  const [modalTuan, setModalTuan] = useState(defaultNamTuan.tuan);
  const [noiDung, setNoiDung] = useState("");
  const [ketQua, setKetQua] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedPhoiHop, setSelectedPhoiHop] = useState<string[]>([]);
  const [showPhoiHop, setShowPhoiHop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
    setModalNam(defaultNamTuan.nam);
    setModalTuan(defaultNamTuan.tuan);
    setShowPhoiHop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tuanOptions = useMemo(() => {
    if (isBaoCao) return getTuanOptions(namHienTai, { maxTuan: tuanHienTai });
    return getTuanOptions(modalNam, { forwardExtraWeeksNextYear: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoCao, modalNam, isOpen]);

  // Người phối hợp: vẫn lọc theo cùng phòng — ở cấp Phòng có thể phối hợp với bất kỳ đồng nghiệp
  // nào khác trong phòng (không loại trừ ai theo maNV như bên cá nhân, vì đây không phải "của
  // riêng" người tạo — chỉ loại chính người đang đăng nhập ra khỏi danh sách để không tự chọn mình).
  const nhanVienOptions = useMemo(() => {
    return nhanVienList
      .filter((nv) => nv.maNV !== user?.maNV && nv.maPhong === user?.maPhong)
      .map((nv) => ({ value: nv.maNV, text: nv.hoTen }));
  }, [nhanVienList, user?.maNV, user?.maPhong]);

  function resetAndClose() {
    setNoiDung("");
    setKetQua("");
    setGhiChu("");
    setSelectedPhoiHop([]);
    setShowPhoiHop(false);
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!noiDung.trim()) {
      setError("Vui lòng nhập nội dung");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await submitKeHoachPhong({
        nam: modalNam,
        tuan: modalTuan,
        loai,
        noiDung,
        ketQua,
        ghiChu,
        nguoiPhoiHopIds: selectedPhoiHop,
      });
      show(
        "success",
        "Đã lưu thành công",
        `Đã thêm ${isBaoCao ? "báo cáo" : "kế hoạch"} phòng cho Tuần ${modalTuan}, ${modalNam}`
      );
      onAdded();
      resetAndClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại";
      setError(msg);
      show("error", "Lưu thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[640px] p-5 lg:p-10">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">
        Thêm {isBaoCao ? "báo cáo" : "kế hoạch"} phòng
      </h4>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tuần</label>
            <select
              value={`${modalNam}-${modalTuan}`}
              onChange={(e) => {
                const { nam: n, tuan: t } = parseTuanOptionValue(e.target.value);
                setModalNam(n);
                setModalTuan(t);
              }}
              className="h-10 min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {tuanOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Từ ngày {getWeekDateRangeLabel(modalNam, modalTuan)}
            </p>
          </div>

          {!showPhoiHop && (
            <button
              type="button"
              onClick={() => setShowPhoiHop(true)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <span className="text-base leading-none">+</span> Thêm người phối hợp
            </button>
          )}
        </div>

        {showPhoiHop && (
          <NguoiPhoiHopSelect
            label="Người phối hợp (không bắt buộc)"
            options={nhanVienOptions}
            selected={selectedPhoiHop}
            onChange={setSelectedPhoiHop}
          />
        )}

        <div>
          <Label>
            Nội dung <span className="text-error-500">*</span>
          </Label>
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={3}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder={
              isBaoCao ? "Đã thực hiện công việc gì..." : "Dự kiến thực hiện công việc gì..."
            }
          />
        </div>

        {isBaoCao && (
          <div>
            <Label>Kết quả</Label>
            <Input
              value={ketQua}
              onChange={(e) => setKetQua(e.target.value)}
              placeholder="VD: Đã hoàn thành, đạt yêu cầu..."
            />
          </div>
        )}

        <div>
          <Label>Ghi chú</Label>
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
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
            "Lưu"
          )}
        </Button>
      </div>
    </Modal>
  );
}
