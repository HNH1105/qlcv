// ĐÍCH: src/components/nhiem-vu/NhiemVuSubTaskList.tsx
"use client";

import { useState } from "react";
import { themSubTask, tickSubTask, xoaSubTask, suaSubTask } from "@/lib/actions/nhiem-vu";
import { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";

type SubTask = {
  id: number;
  noiDung: string;
  daHoanThanh: boolean;
};

// Đóng gói việc con đang chờ xác nhận tick — lưu cả 2 chiều (đang tick lên hay bỏ tick) để hiển thị
// đúng câu hỏi xác nhận.
type ChoXacNhanTick = { subTaskId: number; noiDung: string; sangTrangThai: boolean } | null;

export default function NhiemVuSubTaskList({
  nhiemVuId,
  subTasks,
  tienDoHienTai,
  isNguoiXuLyChinh,
  onChanged,
}: {
  nhiemVuId: number;
  subTasks: SubTask[];
  tienDoHienTai: number;
  isNguoiXuLyChinh: boolean;
  onChanged: () => void;
}) {
  const { show } = useToast();
  const [noiDungMoi, setNoiDungMoi] = useState("");
  const [dangThem, setDangThem] = useState(false);
  const [dangSuaId, setDangSuaId] = useState<number | null>(null);
  const [noiDungSua, setNoiDungSua] = useState("");
  const [xacNhanXoaId, setXacNhanXoaId] = useState<number | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  // MỚI: thay vì tick xong gọi server ngay (cảm giác "đơ" vì không có phản hồi tức thời), giờ
  // tách 2 bước — bấm checkbox chỉ MỞ hộp xác nhận, chưa gọi gì cả; xác nhận Yes mới thật sự gọi
  // server. Đồng thời có state riêng đánh dấu ĐÚNG 1 dòng đang xử lý để hiện spinner tại chỗ, thay
  // vì disable/loading toàn bộ danh sách.
  const [choXacNhanTick, setChoXacNhanTick] = useState<ChoXacNhanTick>(null);
  const [dangCapNhatId, setDangCapNhatId] = useState<number | null>(null);

  const laDongCuoiCung = subTasks.length === 1;

  async function handleThem() {
    if (!noiDungMoi.trim()) return;
    setDangThem(true);
    try {
      await themSubTask(nhiemVuId, noiDungMoi.trim());
      setNoiDungMoi("");
      onChanged();
    } catch (e) {
      show("error", "Thêm thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangThem(false);
    }
  }

  async function xacNhanTick() {
    if (!choXacNhanTick) return;
    const { subTaskId, sangTrangThai } = choXacNhanTick;
    setDangCapNhatId(subTaskId);
    setChoXacNhanTick(null);
    try {
      await tickSubTask(subTaskId, sangTrangThai);
      onChanged();
    } catch (e) {
      show("error", "Cập nhật thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangCapNhatId(null);
    }
  }

  async function handleLuuSua(subTaskId: number) {
    if (!noiDungSua.trim()) return;
    try {
      await suaSubTask(subTaskId, noiDungSua.trim());
      setDangSuaId(null);
      onChanged();
    } catch (e) {
      show("error", "Sửa thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    }
  }

  async function handleXoaThat(subTaskId: number) {
    setDangXuLy(true);
    try {
      await xoaSubTask(subTaskId);
      show("success", "Đã xoá", "Đã xoá việc con khỏi checklist");
      onChanged();
    } catch (e) {
      show("error", "Xoá thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangXuLy(false);
      setXacNhanXoaId(null);
    }
  }

  if (subTasks.length === 0 && !isNguoiXuLyChinh) {
    return null;
  }

  return (
    <div className="border-t border-gray-100 pt-4 dark:border-white/[0.05]">
      <p className="mb-2 text-xs font-medium text-gray-400">Việc con (checklist)</p>

      {subTasks.length === 0 ? (
        <p className="mb-2 text-sm text-gray-400">Chưa có việc con nào — tiến độ đang nhập thủ công.</p>
      ) : (
        <div className="space-y-1.5">
          {subTasks.map((s) => {
            const dangCapNhatDongNay = dangCapNhatId === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 transition-opacity ${dangCapNhatDongNay ? "opacity-50" : ""}`}
              >
                {dangCapNhatDongNay ? (
                  // Spinner nhỏ THAY chỗ checkbox trong lúc chờ server — người dùng thấy NGAY là
                  // đang xử lý, không phải bấm xong "im lặng" chờ cả trang load lại.
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                ) : (
                  <input
                    type="checkbox"
                    checked={s.daHoanThanh}
                    disabled={!isNguoiXuLyChinh || dangCapNhatId !== null}
                    onChange={() =>
                      setChoXacNhanTick({ subTaskId: s.id, noiDung: s.noiDung, sangTrangThai: !s.daHoanThanh })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed"
                  />
                )}

                {dangSuaId === s.id ? (
                  <>
                    <input
                      value={noiDungSua}
                      onChange={(e) => setNoiDungSua(e.target.value)}
                      className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      autoFocus
                    />
                    <button onClick={() => handleLuuSua(s.id)} className="text-xs text-brand-500 hover:underline">
                      Lưu
                    </button>
                    <button onClick={() => setDangSuaId(null)} className="text-xs text-gray-400 hover:underline">
                      Huỷ
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 text-sm ${
                        s.daHoanThanh ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.noiDung}
                    </span>
                    {isNguoiXuLyChinh && !dangCapNhatDongNay && (
                      <>
                        <button
                          onClick={() => {
                            setDangSuaId(s.id);
                            setNoiDungSua(s.noiDung);
                          }}
                          className="text-xs text-gray-400 hover:text-brand-500"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => setXacNhanXoaId(s.id)}
                          className="text-xs text-gray-400 hover:text-error-500"
                        >
                          Xoá
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isNguoiXuLyChinh && (
        <div className="mt-3 flex gap-2">
          <input
            value={noiDungMoi}
            onChange={(e) => setNoiDungMoi(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleThem()}
            placeholder="Thêm việc con..."
            disabled={dangThem}
            className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <button
            onClick={handleThem}
            disabled={dangThem || !noiDungMoi.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-gray-300"
          >
            {dangThem && <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />}
            + Thêm
          </button>
        </div>
      )}

      {/* Xác nhận TRƯỚC KHI gọi server — theo đúng yêu cầu: tick lên hay bỏ tick đều hỏi lại. */}
      <ConfirmDialog
        isOpen={choXacNhanTick !== null}
        title={choXacNhanTick?.sangTrangThai ? "Đánh dấu hoàn thành" : "Bỏ đánh dấu hoàn thành"}
        description={
          choXacNhanTick
            ? `${choXacNhanTick.sangTrangThai ? "Đánh dấu đã xong" : "Bỏ đánh dấu"} việc con "${choXacNhanTick.noiDung}"? Tiến độ sẽ được tính lại ngay sau khi xác nhận.`
            : ""
        }
        confirmText="Xác nhận"
        onConfirm={xacNhanTick}
        onClose={() => setChoXacNhanTick(null)}
      />

      <ConfirmDialog
        isOpen={xacNhanXoaId !== null}
        title="Xoá việc con"
        description={
          laDongCuoiCung
            ? `Đây là việc con cuối cùng. Sau khi xoá, tiến độ hiện tại (${tienDoHienTai}%) sẽ trở thành tiến độ NHẬP THỦ CÔNG, không còn tự tính theo checklist nữa.`
            : "Bạn chắc chắn muốn xoá việc con này?"
        }
        confirmText="Xoá"
        isLoading={dangXuLy}
        onConfirm={() => xacNhanXoaId !== null && handleXoaThat(xacNhanXoaId)}
        onClose={() => setXacNhanXoaId(null)}
      />
    </div>
  );
}
