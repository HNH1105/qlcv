// ĐÍCH: src/components/nhiem-vu/NhiemVuHanhDongPanel.tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import {
  duyetHoanThanh,
  moLaiNhiemVu,
  tamDungNhiemVu,
  huyNhiemVu,
  yeuCauXuLyLai,
  hoanThanhDotDinhKy,
} from "@/lib/actions/nhiem-vu";
import NhiemVuLyDoModal from "./NhiemVuLyDoModal";
import NhiemVuPhanCongModal from "./NhiemVuPhanCongModal";
import NhiemVuBaoCaoHoanThanhModal from "./NhiemVuBaoCaoHoanThanhModal";
import NhiemVuDoiHanModal from "./NhiemVuDoiHanModal";
import NhiemVuDoiPhongChuTriModal from "./NhiemVuDoiPhongChuTriModal";
import NhiemVuSuaThongTinModal from "./NhiemVuSuaThongTinModal";
import NhiemVuCapNhatPhoiHopModal from "./NhiemVuCapNhatPhoiHopModal";

type ModalDangMo =
  | null
  | "phanCong"
  | "baoCao"
  | "doiHan"
  | "doiPhong"
  | "tamDung"
  | "huy"
  | "yeuCauLai"
  | "moLai"
  | "suaThongTin"
  | "capNhatPhoiHop";

export default function NhiemVuHanhDongPanel({
  nv,
  user,
  onChanged,
}: {
  nv: {
    id: number;
    tieuDe: string;
    noiDung: string | null;
    mucDoUuTien: import("@prisma/client").MucDoUuTien;
    trangThai: string;
    phongChuTriId: string;
    nguoiXuLyChinhId: string | null;
    ketQua: string | null;
    hanXuLy: Date | null;
    tanSuatNhac: string | null;
    dungNhacLai: boolean;
    nguoiPhoiHop: { maNV: string; ghiChu: string | null; daHoanThanhPhanViec: boolean }[];
    phongPhoiHop: { maPhong: string }[];
  };
  user: { maNV: string; maPhong: string; quyen: string };
  onChanged: () => void;
}) {
  const { show } = useToast();
  const [modalMo, setModalMo] = useState<ModalDangMo>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  const isBGD = user.quyen === "LANHDAODONVI";
  const isLDPhongChuTri = user.quyen === "LANHDAOPHONG" && user.maPhong === nv.phongChuTriId;
  const isQuanLy = isBGD || isLDPhongChuTri;
  const isNguoiXuLyChinh = user.maNV === nv.nguoiXuLyChinhId;
  const phoiHopCuaToi = nv.nguoiPhoiHop.find((p) => p.maNV === user.maNV);
  const isNguoiPhoiHop = !!phoiHopCuaToi;

  function dong() {
    setModalMo(null);
  }

  async function chay(fn: () => Promise<void>, thongBaoThanhCong: string) {
    setDangXuLy(true);
    try {
      await fn();
      show("success", "Thành công", thongBaoThanhCong);
      onChanged();
    } catch (e) {
      show("error", "Thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangXuLy(false);
    }
  }

  const nutHanhDong: { label: string; onClick: () => void; variant?: "outline" }[] = [];

  if (nv.trangThai === "CHO_PHAN_CONG" && isQuanLy) {
    nutHanhDong.push({ label: "Phân công", onClick: () => setModalMo("phanCong") });
  }

  if (nv.trangThai === "DANGXULY") {
    if (isNguoiXuLyChinh) {
      nutHanhDong.push({ label: "Báo cáo hoàn thành", onClick: () => setModalMo("baoCao") });
    }
    if (isQuanLy) {
      nutHanhDong.push({ label: "Phân công bổ sung", onClick: () => setModalMo("phanCong"), variant: "outline" });
      nutHanhDong.push({ label: "Đổi hạn", onClick: () => setModalMo("doiHan"), variant: "outline" });
    }
  }

  if (nv.trangThai === "CHO_DUYET" && isQuanLy) {
    nutHanhDong.push({
      label: "Duyệt hoàn thành",
      onClick: () => chay(() => duyetHoanThanh(nv.id), "Đã duyệt hoàn thành nhiệm vụ"),
    });
    nutHanhDong.push({ label: "Yêu cầu xử lý lại", onClick: () => setModalMo("yeuCauLai"), variant: "outline" });
  }

  if ((nv.trangThai === "HOANTHANH" || nv.trangThai === "TAMDUNG") && isQuanLy) {
    nutHanhDong.push({ label: "Mở lại", onClick: () => setModalMo("moLai"), variant: "outline" });
  }

  if ((nv.trangThai === "DANGXULY" || nv.trangThai === "CHO_PHAN_CONG") && isQuanLy) {
    nutHanhDong.push({ label: "Tạm dừng", onClick: () => setModalMo("tamDung"), variant: "outline" });
    nutHanhDong.push({ label: "Huỷ nhiệm vụ", onClick: () => setModalMo("huy"), variant: "outline" });
  }

  if (isBGD && nv.trangThai !== "HOANTHANH" && nv.trangThai !== "HUY") {
    nutHanhDong.push({ label: "Đổi phòng chủ trì", onClick: () => setModalMo("doiPhong"), variant: "outline" });
  }

  if (isQuanLy && (nv.trangThai === "CHO_PHAN_CONG" || nv.trangThai === "DANGXULY")) {
    nutHanhDong.push({ label: "Sửa thông tin", onClick: () => setModalMo("suaThongTin"), variant: "outline" });
  }

  // Nhiệm vụ định kỳ — "Xong đợt" do CHÍNH người xử lý chính tự tick, KHÔNG qua duyệt LĐ phòng.
  if (nv.tanSuatNhac && !nv.dungNhacLai && isNguoiXuLyChinh) {
    nutHanhDong.push({
      label: "✓ Xong đợt này",
      onClick: () => chay(() => hoanThanhDotDinhKy(nv.id), "Đã hoàn thành đợt, đã tính ngày nhắc tiếp theo"),
    });
  }

  // Nút riêng cho NGƯỜI PHỐI HỢP — chỉ hiện khi user đang xem đúng là 1 trong danh sách phối hợp
  // (thuần phân quyền theo vai trò, không phụ thuộc trạng thái nhiệm vụ, trừ khi đã Huỷ thì không
  // còn gì để cập nhật nữa). Đặt CÙNG HÀNG với các nút quản lý khác cho tiện thao tác, thay vì chỉ
  // nằm trong tab "Người phối hợp" như trước.
  if (isNguoiPhoiHop && nv.trangThai !== "HUY") {
    nutHanhDong.push({
      label: "Cập nhật phối hợp",
      onClick: () => setModalMo("capNhatPhoiHop"),
      variant: "outline",
    });
  }

  if (nutHanhDong.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
      {nutHanhDong.map((n) => (
        <Button key={n.label} size="sm" variant={n.variant} onClick={n.onClick} disabled={dangXuLy}>
          {n.label}
        </Button>
      ))}

      <NhiemVuPhanCongModal
        isOpen={modalMo === "phanCong"}
        onClose={dong}
        nhiemVuId={nv.id}
        phongChuTriId={nv.phongChuTriId}
        phongPhoiHopIds={nv.phongPhoiHop.map((p) => p.maPhong)}
        nguoiXuLyChinhHienTai={nv.nguoiXuLyChinhId}
        phoiHopHienTai={nv.nguoiPhoiHop.map((p) => p.maNV)}
        onUpdated={onChanged}
      />

      <NhiemVuBaoCaoHoanThanhModal
        isOpen={modalMo === "baoCao"}
        onClose={dong}
        nhiemVuId={nv.id}
        ketQuaHienTai={nv.ketQua}
        onUpdated={onChanged}
      />

      <NhiemVuDoiHanModal
        isOpen={modalMo === "doiHan"}
        onClose={dong}
        nhiemVuId={nv.id}
        hanHienTai={nv.hanXuLy}
        onUpdated={onChanged}
      />

      <NhiemVuDoiPhongChuTriModal
        isOpen={modalMo === "doiPhong"}
        onClose={dong}
        nhiemVuId={nv.id}
        phongHienTaiId={nv.phongChuTriId}
        onUpdated={onChanged}
      />

      <NhiemVuSuaThongTinModal
        isOpen={modalMo === "suaThongTin"}
        onClose={dong}
        nhiemVuId={nv.id}
        tieuDeHienTai={nv.tieuDe}
        noiDungHienTai={nv.noiDung}
        mucDoUuTienHienTai={nv.mucDoUuTien}
        onUpdated={onChanged}
      />

      <NhiemVuCapNhatPhoiHopModal
        isOpen={modalMo === "capNhatPhoiHop"}
        onClose={dong}
        nhiemVuId={nv.id}
        ghiChuHienTai={phoiHopCuaToi?.ghiChu ?? null}
        daHoanThanhHienTai={phoiHopCuaToi?.daHoanThanhPhanViec ?? false}
        onUpdated={onChanged}
      />

      <NhiemVuLyDoModal
        isOpen={modalMo === "tamDung"}
        onClose={dong}
        title="Tạm dừng nhiệm vụ"
        batBuocLyDo
        confirmText="Tạm dừng"
        onConfirm={(lyDo) => chay(() => tamDungNhiemVu(nv.id, lyDo), "Đã tạm dừng nhiệm vụ")}
      />

      <NhiemVuLyDoModal
        isOpen={modalMo === "huy"}
        onClose={dong}
        title="Huỷ nhiệm vụ"
        moTa="Nhiệm vụ đã huỷ KHÔNG thể khôi phục lại — đây là trạng thái cuối."
        batBuocLyDo
        confirmText="Huỷ nhiệm vụ"
        onConfirm={(lyDo) => chay(() => huyNhiemVu(nv.id, lyDo), "Đã huỷ nhiệm vụ")}
      />

      <NhiemVuLyDoModal
        isOpen={modalMo === "yeuCauLai"}
        onClose={dong}
        title="Yêu cầu xử lý lại"
        batBuocLyDo
        confirmText="Gửi yêu cầu"
        onConfirm={(lyDo) => chay(() => yeuCauXuLyLai(nv.id, lyDo), "Đã yêu cầu xử lý lại")}
      />

      <NhiemVuLyDoModal
        isOpen={modalMo === "moLai"}
        onClose={dong}
        title="Mở lại nhiệm vụ"
        batBuocLyDo={false}
        confirmText="Mở lại"
        onConfirm={(ghiChu) => chay(() => moLaiNhiemVu(nv.id, ghiChu || undefined), "Đã mở lại nhiệm vụ")}
      />
    </div>
  );
}
