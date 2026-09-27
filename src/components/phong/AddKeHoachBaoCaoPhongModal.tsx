"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import DatePicker from "@/components/form/date-picker";
import { submitKeHoachPhong } from "@/lib/actions/ke-hoach";
import { getNhanVienList, getPhongList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentWeekInfo,
  getNextWeekInfo,
  getWeekDateRangeLabel,
  getTuanOptions,
  parseTuanOptionValue,
} from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";
import { useToast } from "@/components/ca-nhan/ToastProvider";

type NhanVien = { maNV: string; hoTen: string; maPhong: string };

// MỘT Ô "Nội dung" trong form — `id` CHỈ LÀ KHOÁ TẠM DÙNG TRONG REACT, KHÔNG PHẢI id bản ghi
// trong DB. Mỗi ô, khi lưu, sẽ trở thành 1 LẦN GỌI submitKeHoachPhong RIÊNG.
// `ketQua` CHỈ có ý nghĩa khi loai=BAOCAO — mỗi Nội dung đi kèm ĐÚNG 1 Kết quả riêng của nó.
type NoiDungItem = { id: string; value: string; ketQua: string };

// Modal Thêm mới CẤP PHÒNG — cùng bố cục với AddKeHoachBaoCaoModal (cá nhân) nhưng:
// - KHÔNG có checkbox "chuyển thành phòng" (dòng này đã là cấp Phòng rồi, không cần chuyển tiếp).
// - Gọi submitKeHoachPhong (laCuaPhong=true, laCuaCaNhan=false, người tạo = người đang đăng nhập)
//   thay vì
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
  // "Tuần sau" — dùng lại getNextWeekInfo() dùng chung trong lib/week.ts (cùng hàm mà
  // isTrongKhungSuaFull dùng để xác định khung sửa full của Kế hoạch), không tự tính tay ở đây
  // nữa để tránh 2 nơi lệch logic vắt năm.
  const defaultNamTuan = useMemo(() => {
    if (isBaoCao) return { nam: namHienTai, tuan: tuanHienTai };
    return getNextWeekInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoCao, isOpen]);

  const [modalNam, setModalNam] = useState(defaultNamTuan.nam);
  const [modalTuan, setModalTuan] = useState(defaultNamTuan.tuan);

  const demNoiDungRef = useRef(0);
  function taoNoiDungId() {
    demNoiDungRef.current += 1;
    return `nd-${demNoiDungRef.current}`;
  }
  const [noiDungItems, setNoiDungItems] = useState<NoiDungItem[]>(() => [
    { id: taoNoiDungId(), value: "", ketQua: "" },
  ]);

  const [ghiChu, setGhiChu] = useState("");
  const [hanXuLy, setHanXuLy] = useState("");
  const [dateKey, setDateKey] = useState(0);
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedPhoiHop, setSelectedPhoiHop] = useState<string[]>([]);
  const [showPhoiHop, setShowPhoiHop] = useState(false);

  // MỚI — Phòng phối hợp (cùng kiểu ẩn/hiện như Người phối hợp).
  const [dsPhong, setDsPhong] = useState<{ maPhong: string; tenPhong: string }[]>([]);
  const [selectedPhongPhoiHop, setSelectedPhongPhoiHop] = useState<string[]>([]);
  const [showPhongPhoiHop, setShowPhongPhoiHop] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
    getPhongList().then(setDsPhong);
    setModalNam(defaultNamTuan.nam);
    setModalTuan(defaultNamTuan.tuan);
    setShowPhoiHop(false);
    setSelectedPhoiHop([]);
    setShowPhongPhoiHop(false);
    setSelectedPhongPhoiHop([]);
    setHanXuLy("");
    setDateKey((k) => k + 1);
    setNoiDungItems([{ id: taoNoiDungId(), value: "", ketQua: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tuanOptions = useMemo(() => {
    if (isBaoCao) return getTuanOptions(namHienTai, { maxTuan: tuanHienTai });
    return getTuanOptions(modalNam, { forwardExtraWeeksNextYear: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoCao, modalNam, isOpen]);

  // Người phối hợp: mặc định lọc theo cùng phòng — ở cấp Phòng có thể phối hợp với bất kỳ đồng
  // nghiệp nào khác trong phòng (không loại trừ ai theo maNV như bên cá nhân, vì đây không phải
  // "của riêng" người tạo — chỉ loại chính người đang đăng nhập ra khỏi danh sách để không tự chọn
  // mình). MỚI: nạp thêm thành viên của (các) Phòng phối hợp đã chọn, cộng dồn với phòng mặc định.
  const nhanVienOptions = useMemo(() => {
    const dsMaPhongDuocChon = new Set([user?.maPhong, ...selectedPhongPhoiHop]);
    return nhanVienList
      .filter((nv) => nv.maNV !== user?.maNV && dsMaPhongDuocChon.has(nv.maPhong))
      .map((nv) => ({ value: nv.maNV, text: nv.hoTen }));
  }, [nhanVienList, user?.maNV, user?.maPhong, selectedPhongPhoiHop]);

  // MỚI — loại trừ chính phòng của người đang đăng nhập khỏi lựa chọn Phòng phối hợp.
  const dsPhongOptions = useMemo(() => {
    return dsPhong
      .filter((p) => p.maPhong !== user?.maPhong)
      .map((p) => ({ value: p.maPhong, text: p.tenPhong }));
  }, [dsPhong, user?.maPhong]);

  const handleHanXuLyChange = useCallback((_dates: Date[], dateStr: string) => {
    setHanXuLy(dateStr);
  }, []);

  function themNoiDungItem() {
    setNoiDungItems((items) => [...items, { id: taoNoiDungId(), value: "", ketQua: "" }]);
  }

  function xoaNoiDungItem(id: string) {
    setNoiDungItems((items) => (items.length <= 1 ? items : items.filter((it) => it.id !== id)));
  }

  function suaNoiDungItem(id: string, value: string) {
    setNoiDungItems((items) => items.map((it) => (it.id === id ? { ...it, value } : it)));
  }

  // MỚI — sửa Kết quả CỦA RIÊNG 1 ô (chỉ dùng khi Báo cáo).
  function suaKetQuaItem(id: string, ketQua: string) {
    setNoiDungItems((items) => items.map((it) => (it.id === id ? { ...it, ketQua } : it)));
  }

  function resetAndClose() {
    setNoiDungItems([{ id: taoNoiDungId(), value: "", ketQua: "" }]);
    setGhiChu("");
    setSelectedPhoiHop([]);
    setShowPhoiHop(false);
    setSelectedPhongPhoiHop([]);
    setShowPhongPhoiHop(false);
    setHanXuLy("");
    setDateKey((k) => k + 1);
    setError(null);
    onClose();
  }

  async function handleSave() {
    const itemsHopLe = noiDungItems
      .map((it) => ({ noiDung: it.value.trim(), ketQua: it.ketQua.trim() }))
      .filter((it) => it.noiDung.length > 0);
    if (itemsHopLe.length === 0) {
      setError("Vui lòng nhập nội dung");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      for (const it of itemsHopLe) {
        await submitKeHoachPhong({
          nam: modalNam,
          tuan: modalTuan,
          loai,
          noiDung: it.noiDung,
          ketQua: isBaoCao ? it.ketQua : undefined,
          ghiChu: noiDungItems.length > 1 ? undefined : ghiChu,
          nguoiPhoiHopIds: selectedPhoiHop,
          maPhongPhoiHop: selectedPhongPhoiHop,
          hanXuLy: !isBaoCao && hanXuLy ? new Date(hanXuLy) : null,
        });
      }
      show(
        "success",
        "Đã lưu thành công",
        itemsHopLe.length > 1
          ? `Đã thêm ${itemsHopLe.length} ${isBaoCao ? "báo cáo" : "kế hoạch"} phòng cho Tuần ${modalTuan}, ${modalNam}`
          : `Đã thêm ${isBaoCao ? "báo cáo" : "kế hoạch"} phòng cho Tuần ${modalTuan}, ${modalNam}`
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
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[640px] p-5 lg:max-w-[760px] lg:p-10">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">
        Thêm {isBaoCao ? "báo cáo" : "kế hoạch"} phòng
      </h4>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {/* 1 VÙNG CUỘN DUY NHẤT cho toàn bộ các trường bên dưới — xem giải thích chi tiết ở
          AddKeHoachBaoCaoModal.tsx (bản cá nhân), áp dụng y hệt ở đây. */}
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
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
                id="han-xu-ly-phong"
                label="Hạn xử lý (không bắt buộc)"
                placeholder="Chọn ngày..."
                defaultDate={hanXuLy || undefined}
                onChange={handleHanXuLyChange}
              />
            </div>
          )}

          {!showPhongPhoiHop && (
            <button
              type="button"
              onClick={() => setShowPhongPhoiHop(true)}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <span className="text-base leading-none">+</span> Thêm phòng phối hợp
            </button>
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

        {showPhongPhoiHop && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPhongPhoiHop(false);
                setSelectedPhongPhoiHop([]);
              }}
              className="absolute right-0 top-0 z-10 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-error-600 dark:hover:text-error-400"
            >
              ✕ Bỏ
            </button>
            <NguoiPhoiHopSelect
              label="Phòng phối hợp (không bắt buộc)"
              options={dsPhongOptions}
              selected={selectedPhongPhoiHop}
              onChange={setSelectedPhongPhoiHop}
            />
          </div>
        )}

        {showPhoiHop && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPhoiHop(false);
                setSelectedPhoiHop([]);
              }}
              className="absolute right-0 top-0 z-10 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-error-600 dark:hover:text-error-400"
            >
              ✕ Bỏ
            </button>
            <NguoiPhoiHopSelect
              label="Người phối hợp (không bắt buộc)"
              options={nhanVienOptions}
              selected={selectedPhoiHop}
              onChange={setSelectedPhoiHop}
            />
          </div>
        )}

        {/* MỚI — cho phép nhân nhiều ô Nội dung, giống bản cá nhân: mỗi ô là 1 bản ghi riêng khi
            lưu, dùng chung Tuần/Hạn xử lý/Người phối hợp/Ghi chú. Với Báo cáo: mỗi Nội dung đi
            kèm ĐÚNG 1 Kết quả riêng, nằm chung 1 hàng — Nội dung 80%, Kết quả 20%. */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            {isBaoCao ? (
              <div className={`flex flex-1 gap-2 ${noiDungItems.length > 1 ? "pl-7" : ""}`}>
                <div className="flex-[4]">
                  <Label>
                    Nội dung <span className="text-error-500">*</span>
                  </Label>
                </div>
                <div className="flex-1">
                  <Label>Kết quả</Label>
                </div>
              </div>
            ) : (
              <Label>
                Nội dung <span className="text-error-500">*</span>
              </Label>
            )}
            <button
              type="button"
              onClick={themNoiDungItem}
              className="ml-2 flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <span className="text-base leading-none">+</span> Thêm nội dung
            </button>
          </div>
          <div className="space-y-2">
            {noiDungItems.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2">
                {noiDungItems.length > 1 && (
                  <span className="mt-2.5 w-5 shrink-0 text-right text-sm text-gray-700 dark:text-gray-300">
                    {idx + 1}.
                  </span>
                )}
                {isBaoCao ? (
                  <div className="flex flex-1 gap-2">
                    <textarea
                      value={item.value}
                      onChange={(e) => suaNoiDungItem(item.id, e.target.value)}
                      rows={3}
                      className="h-auto flex-[4] resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      placeholder="Đã thực hiện công việc gì..."
                    />
                    <textarea
                      value={item.ketQua}
                      onChange={(e) => suaKetQuaItem(item.id, e.target.value)}
                      rows={3}
                      className="h-auto flex-1 resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      placeholder="Kết quả..."
                    />
                  </div>
                ) : (
                  <textarea
                    value={item.value}
                    onChange={(e) => suaNoiDungItem(item.id, e.target.value)}
                    rows={3}
                    className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Dự kiến thực hiện công việc gì..."
                  />
                )}
                {noiDungItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => xoaNoiDungItem(item.id)}
                    title="Bỏ nội dung này"
                    className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-error-600 dark:hover:bg-white/5 dark:hover:text-error-400"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {noiDungItems.length <= 1 && (
          <div>
            <Label>Ghi chú</Label>
            <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
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
