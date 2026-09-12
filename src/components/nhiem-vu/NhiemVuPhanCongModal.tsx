// ĐÍCH: src/components/nhiem-vu/NhiemVuPhanCongModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import { getNhanVienList } from "@/lib/actions/danh-muc";
import { phanCongBoSung } from "@/lib/actions/nhiem-vu";
import { useToast } from "@/components/ca-nhan/ToastProvider";

type NhanVien = { maNV: string; hoTen: string; maPhong: string };

export default function NhiemVuPhanCongModal({
  isOpen,
  onClose,
  nhiemVuId,
  phongChuTriId,
  phongPhoiHopIds,
  nguoiXuLyChinhHienTai,
  phoiHopHienTai,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  nhiemVuId: number;
  phongChuTriId: string;
  // MỚI — danh sách phòng phối hợp HIỆN CÓ của nhiệm vụ, dùng để lọc "Người phối hợp" giống hệt
  // cách form Giao nhiệm vụ lúc tạo đã làm (chỉ hiện nhân viên thuộc phòng chủ trì + phòng phối
  // hợp). Đây là bộ lọc UI, không phải ràng buộc cứng ở server — server vẫn chỉ kiểm tra "đang
  // hoạt động", không chặn phòng.
  phongPhoiHopIds: string[];
  nguoiXuLyChinhHienTai: string | null;
  phoiHopHienTai: string[];
  onUpdated: () => void;
}) {
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [nguoiXuLyChinh, setNguoiXuLyChinh] = useState(nguoiXuLyChinhHienTai ?? "");
  const [phoiHop, setPhoiHop] = useState<string[]>(phoiHopHienTai);
  const [ghiChu, setGhiChu] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    getNhanVienList().then(setNhanVienList);
    setNguoiXuLyChinh(nguoiXuLyChinhHienTai ?? "");
    setPhoiHop(phoiHopHienTai);
    setGhiChu("");
    setLoi(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Người xử lý chính: CHỈ trong phòng chủ trì (đúng nghiệp vụ)
  const dsXuLyChinh = useMemo(
    () => nhanVienList.filter((nv) => nv.maPhong === phongChuTriId),
    [nhanVienList, phongChuTriId]
  );

  const dsPhongChoPhep = useMemo(
    () => new Set([phongChuTriId, ...phongPhoiHopIds]),
    [phongChuTriId, phongPhoiHopIds]
  );

  // Người phối hợp: CHỈ trong phòng chủ trì + phòng phối hợp hiện có (giống lúc tạo mới), loại
  // người đang là xử lý chính (invariant).
  const dsPhoiHopOptions = useMemo(
    () =>
      nhanVienList
        .filter((nv) => nv.maNV !== nguoiXuLyChinh && dsPhongChoPhep.has(nv.maPhong))
        .map((nv) => ({ value: nv.maNV, text: nv.hoTen })),
    [nhanVienList, nguoiXuLyChinh, dsPhongChoPhep]
  );

  async function handleSave() {
    setDangXuLy(true);
    setLoi(null);
    try {
      await phanCongBoSung(nhiemVuId, nguoiXuLyChinh || null, phoiHop, ghiChu || undefined);
      onUpdated();
      onClose();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Phân công bổ sung</h4>

      {loi && (
        <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <Label>Người xử lý chính</Label>
          <select
            value={nguoiXuLyChinh}
            onChange={(e) => {
              const maNVMoi = e.target.value;
              setNguoiXuLyChinh(maNVMoi);
              // Cùng invariant với form Tạo mới: tự loại khỏi phối hợp nếu người này đang được
              // chọn phối hợp từ trước, kèm toast báo rõ lý do (trước đây chỉ âm thầm lọc, không
              // báo gì, khiến "Lưu thất bại" ở lần bấm Lưu trước đó gây khó hiểu).
              if (phoiHop.includes(maNVMoi)) {
                const ten = nhanVienList.find((nv) => nv.maNV === maNVMoi)?.hoTen ?? maNVMoi;
                show(
                  "warning",
                  "Đã tự động loại khỏi phối hợp",
                  `${ten} vừa được chọn làm người xử lý chính nên tự động loại khỏi danh sách phối hợp.`
                );
              }
              setPhoiHop((prev) => prev.filter((ma) => ma !== maNVMoi));
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">— Chưa phân công —</option>
            {dsXuLyChinh.map((nv) => (
              <option key={nv.maNV} value={nv.maNV}>
                {nv.hoTen}
              </option>
            ))}
          </select>
        </div>

        <div>
          <NguoiPhoiHopSelect
            label="Người phối hợp"
            options={dsPhoiHopOptions}
            selected={phoiHop}
            onChange={setPhoiHop}
          />
          {phongPhoiHopIds.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              Danh sách chỉ gồm nhân viên thuộc Phòng chủ trì và các Phòng phối hợp của nhiệm vụ này.
            </p>
          )}
        </div>

        <div>
          <Label>Ghi chú (không bắt buộc)</Label>
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={2}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={dangXuLy}>
          Huỷ
        </Button>
        <Button size="sm" onClick={handleSave} disabled={dangXuLy}>
          {dangXuLy ? "Đang lưu..." : "Lưu phân công"}
        </Button>
      </div>
    </Modal>
  );
}
