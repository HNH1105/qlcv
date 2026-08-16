"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "./NguoiPhoiHopSelect";
import DatePicker from "@/components/form/date-picker";
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
  // Hạn xử lý — CHỈ có ở Kế hoạch, mặc định để trống (không có hạn). Dùng string "yyyy-mm-dd" —
  // đúng dateFormat mà DatePicker (flatpickr) component có sẵn của dự án đang dùng.
  const [hanXuLy, setHanXuLy] = useState("");
  // DatePicker có sẵn không hỗ trợ "xoá về trống" (flatpickr giữ nguyên text trong DOM input khi
  // defaultDate đổi thành undefined lúc re-init) — dùng key ép React unmount/remount lại hẳn
  // component mỗi khi cần xoá sạch, đảm bảo input hiện đúng rỗng.
  const [dateKey, setDateKey] = useState(0);
  // Mặc định: Kế hoạch BẬT SẴN (đa số cần chuyển ngay), Báo cáo TẮT SẴN (tính năng Báo cáo Phòng
  // bên "Phòng" chưa làm xong, để mặc định tắt tránh tạo dữ liệu thừa ngoài ý muốn).
  const [chuyenThanhPhong, setChuyenThanhPhong] = useState(!isBaoCao);
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedPhoiHop, setSelectedPhoiHop] = useState<string[]>([]);
  // Người phối hợp mặc định ẨN — chỉ hiện ra khi bấm nút "+ Thêm người phối hợp" cùng hàng với
  // dropdown Tuần, tránh chiếm chỗ ngay từ đầu khi phần lớn trường hợp không cần dùng tới.
  const [showPhoiHop, setShowPhoiHop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
    // Mỗi lần mở modal, đưa tuần về đúng mặc định của board hiện tại (tránh giữ tuần đã chọn lần
    // trước nếu người dùng đã đổi rồi đóng modal mà không lưu).
    setModalNam(nam);
    setModalTuan(tuan);
    setChuyenThanhPhong(!isBaoCao);
    setShowPhoiHop(false);
    setHanXuLy("");
    setDateKey((k) => k + 1);
  }, [isOpen, nam, tuan, isBaoCao]);

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

  const handleHanXuLyChange = useCallback((_dates: Date[], dateStr: string) => {
    setHanXuLy(dateStr);
  }, []);

  function resetAndClose() {
    setNoiDung("");
    setKetQua("");
    setGhiChu("");
    setChuyenThanhPhong(!isBaoCao);
    setSelectedPhoiHop([]);
    setShowPhoiHop(false);
    setHanXuLy("");
    setDateKey((k) => k + 1);
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
        danhDauLaCuaPhong: chuyenThanhPhong,
        hanXuLy: !isBaoCao && hanXuLy ? new Date(hanXuLy) : null,
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
        {/* Bỏ khung tô màu + câu hỏi "Nhập ... cho tuần nào?" — Tuần / Hạn xử lý / nút Thêm người
            phối hợp nằm CHUNG 1 HÀNG, cùng chiều cao (mỗi cột chỉ có "label + control", KHÔNG kèm
            caption phụ bên trong để items-end canh đều nhau — caption "Từ ngày..." dời xuống dưới
            cả hàng, dùng chung cho hàng thay vì lồng riêng trong cột Tuần như trước, vì lồng riêng
            làm cột Tuần cao hơn hẳn 2 cột kia, khiến items-end canh lệch, nhìn rất khó chịu). */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[140px] shrink-0">
            <Label>Tuần</Label>
            <select
              value={`${modalNam}-${modalTuan}`}
              onChange={(e) => {
                const { nam: n, tuan: t } = parseTuanOptionValue(e.target.value);
                setModalNam(n);
                setModalTuan(t);
              }}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {tuanOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {!isBaoCao && (
            <div key={dateKey} className="w-[150px] shrink-0">
              <DatePicker
                id="han-xu-ly-ca-nhan"
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
        <p className="-mt-3 text-xs text-gray-400">
          Từ ngày {getWeekDateRangeLabel(modalNam, modalTuan)}
        </p>

        {showPhoiHop && (
          <NguoiPhoiHopSelect
            label="Người phối hợp cùng phòng (không bắt buộc)"
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

        {/* Trước đây checkbox này CHỈ hiện cho Kế hoạch — nay hiện cho cả Báo cáo (nhãn đổi theo
            loại), nhưng mặc định TẮT với Báo cáo (khác Kế hoạch mặc định BẬT) vì tính năng "Báo
            cáo Phòng" bên màn Phòng chưa hoàn thiện, tránh tạo dữ liệu thừa ngoài ý muốn. */}
        <div className="flex items-center gap-2">
          <Checkbox checked={chuyenThanhPhong} onChange={setChuyenThanhPhong} />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Đồng thời đánh dấu là {isBaoCao ? "Báo cáo Phòng" : "Kế hoạch Phòng"}
          </span>
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
