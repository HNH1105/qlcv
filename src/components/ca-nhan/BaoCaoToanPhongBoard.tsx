"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentWeekInfo, getWeekDateRangeLabel } from "@/lib/week";
import {
  getKeHoachToanPhong,
  danhDauLaCuaPhong,
  lanhDaoBoDanhDauLaCuaPhong,
  type KeHoachRow,
} from "@/lib/actions/ke-hoach";
import ConfirmDialog from "./ConfirmDialog";
import WeekSelect from "./WeekSelect";
import ToanBoPhongList from "./ToanBoPhongList";
import ToastProvider, { useToast } from "./ToastProvider";

// Trang mới: "Cá nhân" -> "Báo cáo (Toàn bộ phòng)" — lãnh đạo chọn tuần để xem báo cáo của mọi
// chuyên viên trong phòng, và giờ có thêm hành động "Chuyển thành Báo cáo Phòng" cho từng dòng
// (chuẩn bị dữ liệu sẵn cho tính năng Báo cáo Phòng sẽ làm ở màn "Phòng" sau này). Mặc định hiển
// thị TUẦN HIỆN TẠI (đúng bản chất báo cáo việc đã làm trong tuần).
export default function BaoCaoToanPhongBoard() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}

function Content() {
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const { show } = useToast();
  const [nam, setNam] = useState(namHienTai);
  const [tuan, setTuan] = useState(tuanHienTai);
  const [rows, setRows] = useState<KeHoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // [MỚI] Bỏ đánh dấu "là của Phòng" — dòng đang chờ xác nhận + trạng thái đang xử lý.
  const [dongCanBoDanhDau, setDongCanBoDanhDau] = useState<KeHoachRow | null>(null);
  const [isBoDanhDauPending, setIsBoDanhDauPending] = useState(false);
  // [MỚI] Hỏi xác nhận trước khi "Đánh dấu là của Phòng" (trước đây bấm là đánh dấu luôn).
  const [idCanDanhDau, setIdCanDanhDau] = useState<number | null>(null);
  const [isDanhDauPending, setIsDanhDauPending] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    getKeHoachToanPhong(nam, tuan, "BAOCAO")
      .then(setRows)
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, tuan]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleConfirmDanhDau() {
    if (idCanDanhDau === null) return;
    setIsDanhDauPending(true);
    try {
      await danhDauLaCuaPhong(idCanDanhDau);
      show("success", "Đã chuyển thành công", "Đã chuyển thành Báo cáo Phòng");
      reload();
    } catch (e) {
      show("error", "Đánh dấu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsDanhDauPending(false);
      setIdCanDanhDau(null);
    }
  }

  async function handleConfirmBoDanhDau() {
    if (!dongCanBoDanhDau) return;
    setIsBoDanhDauPending(true);
    try {
      await lanhDaoBoDanhDauLaCuaPhong(dongCanBoDanhDau.id);
      show("success", "Đã bỏ đánh dấu", "Mục này không còn là Báo cáo Phòng");
      reload();
    } catch (e) {
      show("error", "Bỏ đánh dấu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsBoDanhDauPending(false);
      setDongCanBoDanhDau(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-white/[0.05]">
        <WeekSelect nam={nam} tuan={tuan} onChange={(n, t) => { setNam(n); setTuan(t); }} />
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-xs text-gray-400">
          Tuần {tuan}/{nam} — Từ ngày {getWeekDateRangeLabel(nam, tuan)}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Đang tải...
          </div>
        ) : (
          <ToanBoPhongList
            rows={rows}
            onConvert={setIdCanDanhDau}
            onUnmark={setDongCanBoDanhDau}
            loai="BAOCAO"
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={idCanDanhDau !== null}
        title="Đánh dấu là BC Phòng"
        description="Bạn chắc chắn muốn đánh dấu mục này là Báo cáo Phòng?"
        confirmText="Đánh dấu"
        isLoading={isDanhDauPending}
        onConfirm={handleConfirmDanhDau}
        onClose={() => {
          if (!isDanhDauPending) setIdCanDanhDau(null);
        }}
      />

      <ConfirmDialog
        isOpen={dongCanBoDanhDau !== null}
        title="Bỏ đánh dấu BC Phòng"
        description={`Bạn chắc chắn muốn bỏ đánh dấu mục này khỏi Báo cáo Phòng?${
          dongCanBoDanhDau ? ` Mục vẫn giữ nguyên trong báo cáo cá nhân của ${dongCanBoDanhDau.nguoiTao.hoTen}.` : ""
        }`}
        confirmText="Bỏ đánh dấu"
        isLoading={isBoDanhDauPending}
        onConfirm={handleConfirmBoDanhDau}
        onClose={() => {
          if (!isBoDanhDauPending) setDongCanBoDanhDau(null);
        }}
      />
    </div>
  );
}
