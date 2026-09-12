// ĐÍCH: src/components/nhiem-vu/NhiemVuPhoiHopPanel.tsx
"use client";

import { useState } from "react";
import { capNhatPhoiHopCuaToi } from "@/lib/actions/nhiem-vu";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { formatDateTimeVN } from "@/lib/week";

type PhoiHopRow = {
  id: number;
  maNV: string;
  ghiChu: string | null;
  daHoanThanhPhanViec: boolean;
  thoiGianHoanThanhPhanViec: Date | null;
  tenPhongLucDo: string | null;
  nhanVien: { hoTen: string };
};

export default function NhiemVuPhoiHopPanel({
  nhiemVuId,
  danhSach,
  maNVDangXem,
  onChanged,
}: {
  nhiemVuId: number;
  danhSach: PhoiHopRow[];
  maNVDangXem?: string;
  onChanged: () => void;
}) {
  const { show } = useToast();

  if (danhSach.length === 0) {
    return <p className="text-sm text-gray-400">Nhiệm vụ này chưa có người phối hợp.</p>;
  }

  return (
    <div className="space-y-3">
      {danhSach.map((p) => (
        <DongPhoiHop
          key={p.id}
          nhiemVuId={nhiemVuId}
          dong={p}
          laChinhMinh={p.maNV === maNVDangXem}
          onChanged={onChanged}
          show={show}
        />
      ))}
    </div>
  );
}

function DongPhoiHop({
  nhiemVuId,
  dong,
  laChinhMinh,
  onChanged,
  show,
}: {
  nhiemVuId: number;
  dong: PhoiHopRow;
  laChinhMinh: boolean;
  onChanged: () => void;
  show: (v: "success" | "error", t: string, m: string) => void;
}) {
  const [dangSua, setDangSua] = useState(false);
  const [ghiChu, setGhiChu] = useState(dong.ghiChu ?? "");
  const [dangLuu, setDangLuu] = useState(false);
  const [xacNhanHoanThanh, setXacNhanHoanThanh] = useState<null | boolean>(null); // giá trị SẮP chuyển sang

  async function luuGhiChu() {
    setDangLuu(true);
    try {
      await capNhatPhoiHopCuaToi(nhiemVuId, { ghiChu });
      show("success", "Đã lưu", "Đã cập nhật ghi chú đóng góp");
      setDangSua(false);
      onChanged();
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangLuu(false);
    }
  }

  async function xacNhanDoiHoanThanh() {
    if (xacNhanHoanThanh === null) return;
    const giaTriMoi = xacNhanHoanThanh;
    setXacNhanHoanThanh(null);
    setDangLuu(true);
    try {
      await capNhatPhoiHopCuaToi(nhiemVuId, { daHoanThanhPhanViec: giaTriMoi });
      show("success", "Đã cập nhật", giaTriMoi ? "Đã đánh dấu hoàn thành phần việc" : "Đã bỏ đánh dấu hoàn thành");
      onChanged();
    } catch (e) {
      show("error", "Cập nhật thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">{dong.nhanVien.hoTen}</span>
          {dong.tenPhongLucDo && <span className="ml-2 text-xs text-gray-400">({dong.tenPhongLucDo})</span>}
        </div>

        {laChinhMinh ? (
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={dong.daHoanThanhPhanViec}
              disabled={dangLuu}
              onChange={() => setXacNhanHoanThanh(!dong.daHoanThanhPhanViec)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Đã hoàn thành phần việc của tôi
          </label>
        ) : (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              dong.daHoanThanhPhanViec
                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
            }`}
          >
            {dong.daHoanThanhPhanViec ? "Đã hoàn thành phần việc" : "Chưa hoàn thành"}
          </span>
        )}
      </div>

      {dong.daHoanThanhPhanViec && dong.thoiGianHoanThanhPhanViec && (
        <p className="mt-1 text-[11px] italic text-gray-400">
          Hoàn thành lúc {formatDateTimeVN(dong.thoiGianHoanThanhPhanViec)}
        </p>
      )}

      {dangSua && laChinhMinh ? (
        <div className="mt-2">
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={2}
            className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Ghi chú đóng góp của bạn..."
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button onClick={() => setDangSua(false)} className="text-xs text-gray-400 hover:underline">
              Huỷ
            </button>
            <button onClick={luuGhiChu} disabled={dangLuu} className="text-xs font-medium text-brand-500 hover:underline">
              {dangLuu ? "Đang lưu..." : "Lưu ghi chú"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {dong.ghiChu || <span className="italic text-gray-400">Chưa có ghi chú đóng góp</span>}
          </p>
          {laChinhMinh && (
            <button onClick={() => setDangSua(true)} className="shrink-0 text-xs text-gray-400 hover:text-brand-500">
              Sửa
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={xacNhanHoanThanh !== null}
        title={xacNhanHoanThanh ? "Đánh dấu hoàn thành phần việc" : "Bỏ đánh dấu hoàn thành"}
        description={
          xacNhanHoanThanh
            ? "Xác nhận bạn đã hoàn thành phần việc phối hợp của mình trong nhiệm vụ này?"
            : "Bỏ đánh dấu hoàn thành cho phần việc phối hợp của bạn?"
        }
        confirmText="Xác nhận"
        onConfirm={xacNhanDoiHoanThanh}
        onClose={() => setXacNhanHoanThanh(null)}
      />
    </div>
  );
}
