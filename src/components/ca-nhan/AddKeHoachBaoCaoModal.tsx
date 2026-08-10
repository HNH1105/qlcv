"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import MultiSelect from "@/components/form/MultiSelect";
import { submitKeHoachCaNhan } from "@/lib/actions/ke-hoach";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import { getWeekDateRangeLabel } from "@/lib/week";
import { LoaiGhiNhan } from "@prisma/client";

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
  nam: number;
  tuan: number;
  loai: LoaiGhiNhan;
  onAdded: () => void;
}) {
  const user = useAuth();
  const isBaoCao = loai === "BAOCAO";

  const [noiDung, setNoiDung] = useState("");
  const [ketQua, setKetQua] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [chuyenThanhPhong, setChuyenThanhPhong] = useState(false);
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedPhoiHop, setSelectedPhoiHop] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
  }, [isOpen]);

  // Không cần chọn phòng ban riêng — chỉ hiện đồng nghiệp CÙNG PHÒNG với người đang đăng nhập,
  // và loại chính mình ra (không thể "phối hợp" với bản thân).
  // LƯU Ý: field "selected" dưới đây KHÔNG được component MultiSelect thực sự dùng tới (nó tự
  // quản lý trạng thái chọn qua state nội bộ selectedOptions) — nhưng interface Option của nó khai
  // báo field này là bắt buộc, nên vẫn phải truyền vào (giá trị gì cũng được, luôn để false là đủ).
  const nhanVienOptions = useMemo(() => {
    return nhanVienList
      .filter((nv) => nv.maNV !== user?.maNV && nv.maPhong === user?.maPhong)
      .map((nv) => ({ value: nv.maNV, text: nv.hoTen, selected: false }));
  }, [nhanVienList, user?.maNV, user?.maPhong]);

  function resetAndClose() {
    setNoiDung("");
    setKetQua("");
    setGhiChu("");
    setChuyenThanhPhong(false);
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
        nam,
        tuan,
        loai,
        noiDung,
        ketQua,
        ghiChu,
        nguoiPhoiHopIds: selectedPhoiHop,
        chuyenThanhKeHoachPhong: chuyenThanhPhong,
      });
      onAdded();
      resetAndClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} className="max-w-[640px] p-5 lg:p-10">
      <h4 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">
        Thêm {isBaoCao ? "báo cáo" : "kế hoạch"}
      </h4>
      <p className="mb-6 text-sm font-medium text-error-500">
        Bạn đang nhập {isBaoCao ? "BÁO CÁO" : "KẾ HOẠCH"} cho Tuần {tuan}, Năm {nam} (Từ ngày{" "}
        {getWeekDateRangeLabel(nam, tuan)})
      </p>

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
          <MultiSelect
            label="Người phối hợp cùng phòng (không bắt buộc)"
            options={nhanVienOptions}
            defaultSelected={selectedPhoiHop}
            onChange={(values) => setSelectedPhoiHop(values)}
          />
        </div>

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
        <Button size="sm" variant="outline" onClick={resetAndClose}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </Modal>
  );
}
