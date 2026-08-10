"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "./NguoiPhoiHopSelect";
import { submitKeHoachCaNhan } from "@/lib/actions/ke-hoach";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentWeekInfo,
  getWeekDateRangeLabel,
  getTuanOptions,
  parseTuanOptionValue,
} from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";
import { useToast } from "./ToastProvider";

type NhanVien = { maNV: string; hoTen: string; maPhong: string };

export default function AddKeHoachBaoCaoModal({
  isOpen,
  onClose,
  nam,
  tuan,
  loai,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  // nam/tuan truyền vào là tuần đang được xem trên board — dùng làm giá trị MẶC ĐỊNH cho dropdown
  // tuần bên trong modal (tuần sau đối với Kế hoạch, tuần hiện tại đối với Báo cáo), người dùng
  // vẫn có thể đổi sang tuần khác ngay trong modal trước khi lưu.
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  onAdded: () => void;
}) {
  const user = useAuth();
  const { show } = useToast();
  const isBaoCao = loai === "BAOCAO";

  const [modalNam, setModalNam] = useState(nam);
  const [modalTuan, setModalTuan] = useState(tuan);
  const [noiDung, setNoiDung] = useState("");
  const [ketQua, setKetQua] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  // Mặc định BẬT SẴN — hầu hết kế hoạch cá nhân đều cần chuyển thành kế hoạch phòng, để mặc định
  // tắt khiến người dùng hay quên tick. Vẫn có thể bỏ tick nếu không muốn chuyển.
  const [chuyenThanhPhong, setChuyenThanhPhong] = useState(true);
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedPhoiHop, setSelectedPhoiHop] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
    // Mỗi lần mở modal, đưa tuần về đúng mặc định của board hiện tại (tránh giữ tuần đã chọn lần
    // trước nếu người dùng đã đổi rồi đóng modal mà không lưu).
    setModalNam(nam);
    setModalTuan(tuan);
    setChuyenThanhPhong(true);
  }, [isOpen, nam, tuan]);

  // Danh sách "Tuần" hiển thị trong modal — KHÔNG còn dropdown "Năm" riêng:
  // - Kế hoạch: được lập cho tương lai, nên nối thêm vài tuần đầu năm sau (xử lý mốc cuối năm).
  // - Báo cáo: chỉ báo cáo việc đã/đang làm, không cho chọn tuần tương lai — giới hạn tới tuần
  //   hiện tại của năm hiện tại.
  const tuanOptions = useMemo(() => {
    if (isBaoCao) {
      const { nam: namHT, tuan: tuanHT } = getCurrentWeekInfo();
      return getTuanOptions(namHT, { maxTuan: tuanHT });
    }
    return getTuanOptions(modalNam, { forwardExtraWeeksNextYear: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoCao, modalNam, isOpen]);

  // Không cần chọn phòng ban riêng — chỉ hiện đồng nghiệp CÙNG PHÒNG với người đang đăng nhập,
  // và loại chính mình ra (không thể "phối hợp" với bản thân).
  const nhanVienOptions = useMemo(() => {
    return nhanVienList
      .filter((nv) => nv.maNV !== user?.maNV && nv.maPhong === user?.maPhong)
      .map((nv) => ({ value: nv.maNV, text: nv.hoTen }));
  }, [nhanVienList, user?.maNV, user?.maPhong]);

  function resetAndClose() {
    setNoiDung("");
    setKetQua("");
    setGhiChu("");
    setChuyenThanhPhong(true);
    setSelectedPhoiHop([]);
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
      await submitKeHoachCaNhan({
        nam: modalNam,
        tuan: modalTuan,
        loai,
        noiDung,
        ketQua,
        ghiChu,
        nguoiPhoiHopIds: selectedPhoiHop,
        chuyenThanhKeHoachPhong: chuyenThanhPhong,
      });
      show(
        "success",
        "Đã lưu thành công",
        `Đã thêm ${isBaoCao ? "báo cáo" : "kế hoạch"} cho Tuần ${modalTuan}, ${modalNam}`
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
        Thêm {isBaoCao ? "báo cáo" : "kế hoạch"}
      </h4>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Dropdown chọn tuần ngay trong modal — chỉ còn 1 lựa chọn "Tuần" (không có "Năm" riêng
            nữa). Mặc định lấy theo tuần board đang xem (tuần sau với Kế hoạch, tuần hiện tại với
            Báo cáo), cho phép đổi sang tuần khác trước khi lưu. */}
        <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Nhập {isBaoCao ? "báo cáo" : "kế hoạch"} cho tuần nào?
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Tuần</label>
            <select
              value={`${modalNam}-${modalTuan}`}
              onChange={(e) => {
                const { nam: n, tuan: t } = parseTuanOptionValue(e.target.value);
                setModalNam(n);
                setModalTuan(t);
              }}
              className="h-10 w-full max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {tuanOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Từ ngày {getWeekDateRangeLabel(modalNam, modalTuan)}
          </p>
        </div>

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

        <NguoiPhoiHopSelect
          label="Người phối hợp cùng phòng (không bắt buộc)"
          options={nhanVienOptions}
          selected={selectedPhoiHop}
          onChange={setSelectedPhoiHop}
        />

        <div>
          <Label>Ghi chú</Label>
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </div>

        {!isBaoCao && (
          <div className="flex items-center gap-2">
            <Checkbox checked={chuyenThanhPhong} onChange={setChuyenThanhPhong} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Đồng thời chuyển thành Kế hoạch Phòng
            </span>
          </div>
        )}
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
