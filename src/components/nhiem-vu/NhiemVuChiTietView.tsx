// ĐÍCH: src/components/nhiem-vu/NhiemVuChiTietView.tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ToastProvider from "@/components/ca-nhan/ToastProvider";
import { TrangThaiNhiemVuBadge, UuTienBadge, tinhQuaHan } from "./NhiemVuBadges";
import NhiemVuTimeline from "./NhiemVuTimeline";
import NhiemVuHanhDongPanel from "./NhiemVuHanhDongPanel";
import NhiemVuSubTaskList from "./NhiemVuSubTaskList";
import NhiemVuPhoiHopPanel from "./NhiemVuPhoiHopPanel";
import { formatDateVN } from "@/lib/week";
import { getNhiemVuChiTiet, capNhatTienDoThuCong } from "@/lib/actions/nhiem-vu";

// Awaited<T> là utility type có sẵn của TypeScript (lib.es5.d.ts trở lên), không cần import gì —
// suy ra kiểu dữ liệu trả về đầy đủ của getNhiemVuChiTiet() để dùng lại ở đây.
type NhiemVuChiTiet = Awaited<ReturnType<typeof getNhiemVuChiTiet>>;

export default function NhiemVuChiTietView({ nvBanDau }: { nvBanDau: NhiemVuChiTiet }) {
  const [nv, setNv] = useState(nvBanDau);
  const [isReloading, setIsReloading] = useState(false);
  const [tabDuoi, setTabDuoi] = useState<"lichSu" | "phoiHop">("lichSu");
  const user = useAuth();
  const router = useRouter();

  const reload = useCallback(() => {
    setIsReloading(true);
    getNhiemVuChiTiet(nv.id)
      .then(setNv)
      .finally(() => setIsReloading(false));
    router.refresh();
  }, [nv.id, router]);

  const quaHan = tinhQuaHan(nv.hanXuLy, nv.trangThai);

  return (
    <ToastProvider>
      {/* Hiệu ứng nhẹ khi đang tải lại dữ liệu sau 1 hành động — dim nội dung + spinner góc trên,
          để người dùng biết ngay là đã bấm thành công và đang cập nhật, không phải màn hình "đơ". */}
      <div className={`relative space-y-4 transition-opacity duration-200 ${isReloading ? "opacity-70" : ""}`}>
        {isReloading && (
          <div className="fixed right-6 top-20 z-50 flex items-center gap-2 rounded-full bg-gray-900/80 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-white/90 dark:text-gray-800">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-gray-400 dark:border-t-gray-800" />
            Đang cập nhật...
          </div>
        )}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <UuTienBadge mucDo={nv.mucDoUuTien} />
            <TrangThaiNhiemVuBadge trangThai={nv.trangThai} />
            {nv.tanSuatNhac && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  nv.dungNhacLai
                    ? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                }`}
              >
                🔁 Định kỳ — Đợt {nv.soDotDaXong + 1}
                {nv.dungNhacLai && " (đã dừng nhắc)"}
              </span>
            )}
            {nv.nguonKeHoachTuan && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                🔗 Từ Kế hoạch tuần {nv.nguonKeHoachTuan.tuan}/{nv.nguonKeHoachTuan.nam}
              </span>
            )}
          </div>

          <h1 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">{nv.tieuDe}</h1>
          {nv.noiDung && (
            <p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">
              {nv.noiDung}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2 dark:border-white/[0.05]">
            <div>
              <p className="text-xs font-medium text-gray-400">Phòng chủ trì</p>
              <p className="text-gray-800 dark:text-white/90">{nv.phongChuTri.tenPhong}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Người xử lý chính</p>
              <p className="text-gray-800 dark:text-white/90">
                {nv.nguoiXuLyChinh?.hoTen ?? <span className="italic text-gray-400">Chưa phân công</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Người giao</p>
              <p className="text-gray-800 dark:text-white/90">{nv.nguoiGiao.hoTen}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Người tạo</p>
              <p className="text-gray-800 dark:text-white/90">{nv.nguoiTao.hoTen}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Ngày giao</p>
              <p className="text-gray-800 dark:text-white/90">{formatDateVN(nv.ngayGiao)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Hạn xử lý</p>
              <p className={quaHan ? "font-medium text-error-600" : "text-gray-800 dark:text-white/90"}>
                {nv.hanXuLy ? formatDateVN(nv.hanXuLy) : "—"} {quaHan && "(quá hạn)"}
              </p>
            </div>
            {nv.nguon && (
              <div>
                <p className="text-xs font-medium text-gray-400">Nguồn</p>
                <p className="text-gray-800 dark:text-white/90">{nv.nguon}</p>
              </div>
            )}
            {nv.vanBanLienQuan && (
              <div>
                <p className="text-xs font-medium text-gray-400">Văn bản liên quan</p>
                <p className="text-gray-800 dark:text-white/90">{nv.vanBanLienQuan}</p>
              </div>
            )}
            {nv.linkFile && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-gray-400">Link file</p>
                {/* Chuẩn hoá href PHÒNG TRƯỜNG HỢP dữ liệu cũ không có http(s):// — nếu thiếu,
                    trình duyệt coi là đường dẫn TƯƠNG ĐỐI và nối vào URL trang hiện tại (VD:
                    "đasa" -> "/nhiem-vu/đasa"), không mở đúng link ngoài như ý muốn. */}
                <a
                  href={/^https?:\/\//i.test(nv.linkFile) ? nv.linkFile : `https://${nv.linkFile}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-brand-500 hover:underline"
                >
                  {nv.linkFile}
                </a>
              </div>
            )}
          </div>

          {nv.phongPhoiHop.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
              <p className="mb-1 text-xs font-medium text-gray-400">Phòng phối hợp</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {nv.phongPhoiHop.map((p) => p.phong.tenPhong).join(", ")}
              </p>
            </div>
          )}

          {nv.nguoiPhoiHop.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-400">Người phối hợp</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {nv.nguoiPhoiHop.map((p) => p.nhanVien.hoTen).join(", ")}
              </p>
            </div>
          )}

          {nv.ketQua && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
              <p className="mb-1 text-xs font-medium text-gray-400">Kết quả</p>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{nv.ketQua}</p>
            </div>
          )}

          <NhiemVuSubTaskList
            nhiemVuId={nv.id}
            subTasks={nv.subTasks}
            tienDoHienTai={nv.tienDoPhanTram}
            isNguoiXuLyChinh={user?.maNV === nv.nguoiXuLyChinhId}
            onChanged={reload}
          />

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>Tiến độ {nv.subTasks.length > 0 && "(tự tính theo checklist)"}</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{nv.tienDoPhanTram}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-success-500 transition-all duration-300"
                style={{ width: `${nv.tienDoPhanTram}%` }}
              />
            </div>
            {/* Ô nhập tay CHỈ hiện khi CHƯA có subtask nào — có subtask thì % tự tính, khoá nhập tay
                (đúng nguyên tắc "2 chế độ loại trừ nhau" đã chốt). */}
            {nv.subTasks.length === 0 && user?.maNV === nv.nguoiXuLyChinhId && nv.trangThai === "DANGXULY" && (
              <TienDoThuCongInput nhiemVuId={nv.id} tienDoHienTai={nv.tienDoPhanTram} onSaved={reload} />
            )}
          </div>

          <div className="mt-5">
            <NhiemVuHanhDongPanel nv={nv} user={user!} onChanged={reload} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="mb-4 flex gap-2 border-b border-gray-100 dark:border-white/[0.05]">
            {(
              [
                { key: "lichSu", label: "Lịch sử thao tác" },
                { key: "phoiHop", label: `Người phối hợp (${nv.nguoiPhoiHop.length})` },
              ] as { key: typeof tabDuoi; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTabDuoi(t.key)}
                className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                  tabDuoi === t.key
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tabDuoi === "lichSu" ? (
            <NhiemVuTimeline logs={nv.logs} />
          ) : (
            <NhiemVuPhoiHopPanel
              nhiemVuId={nv.id}
              danhSach={nv.nguoiPhoiHop}
              maNVDangXem={user?.maNV}
              onChanged={reload}
            />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

// Ô nhập tiến độ % thủ công, gọn — chỉ hiện khi nhiệm vụ chưa dùng subtask (xem điều kiện gọi ở trên).
function TienDoThuCongInput({
  nhiemVuId,
  tienDoHienTai,
  onSaved,
}: {
  nhiemVuId: number;
  tienDoHienTai: number;
  onSaved: () => void;
}) {
  const [gia, setGia] = useState(tienDoHienTai);
  const [dangLuu, setDangLuu] = useState(false);

  async function handleLuu() {
    setDangLuu(true);
    try {
      await capNhatTienDoThuCong(nhiemVuId, gia);
      onSaved();
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        value={gia}
        onChange={(e) => setGia(Number(e.target.value))}
        className="h-9 w-24 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      <button
        onClick={handleLuu}
        disabled={dangLuu}
        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300"
      >
        {dangLuu ? "Đang lưu..." : "Cập nhật tiến độ"}
      </button>
    </div>
  );
}
