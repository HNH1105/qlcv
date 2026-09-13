// ĐÍCH: src/components/giao-ban/GiaoBanChecklistBoard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { formatDateVN, getWeekDateRangeLabel, getISOWeekEnd } from "@/lib/week";
import { getPhongList } from "@/lib/actions/danh-muc";
import {
  getCuocHopGiaoBanChiTiet,
  chotCuocHopGiaoBan,
  hoanThanhNoiDung,
  boHoanThanh,
  deNghiChuyenTuan,
} from "@/lib/actions/giao-ban";
import GiaoBanTable, { type NoiDungGiaoBanRow, type HanhDongHang } from "./GiaoBanTable";
import AddNoiDungGiaoBanModal from "./AddNoiDungGiaoBanModal";
import ImportGiaoBanExcelModal from "./ImportGiaoBanExcelModal";
import ThongKeGiaoBanModal from "./ThongKeGiaoBanModal";
import ChiTietNoiDungGiaoBanModal from "./modals/ChiTietNoiDungGiaoBanModal";
import SuaNoiDungGiaoBanModal from "./modals/SuaNoiDungGiaoBanModal";
import CapNhatGhiChuModal from "./modals/CapNhatGhiChuModal";
import LichSuNoiDungModal from "./modals/LichSuNoiDungModal";
import LoaiKhoiDanhSachModal from "./modals/LoaiKhoiDanhSachModal";

type ChiTiet = Awaited<ReturnType<typeof getCuocHopGiaoBanChiTiet>>;
type TabTrangThai = "TAT_CA" | "CHUA_XU_LY" | "DA_XU_LY";
type Phong = { maPhong: string; tenPhong: string };

export default function GiaoBanChecklistBoard({ cuocHopGiaoBanId }: { cuocHopGiaoBanId: number }) {
  return (
    <ToastProvider>
      <BoardContent cuocHopGiaoBanId={cuocHopGiaoBanId} />
    </ToastProvider>
  );
}

function BoardContent({ cuocHopGiaoBanId }: { cuocHopGiaoBanId: number }) {
  const user = useAuth();
  const { show } = useToast();
  const { isOpen: isAddOpen, openModal: openAdd, closeModal: closeAdd } = useModal();
  const { isOpen: isImportOpen, openModal: openImport, closeModal: closeImport } = useModal();
  const { isOpen: isThongKeOpen, openModal: openThongKe, closeModal: closeThongKe } = useModal();

  const [data, setData] = useState<ChiTiet | null>(null);
  const [dsPhong, setDsPhong] = useState<Phong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<TabTrangThai>("TAT_CA");
  const [locPhong, setLocPhong] = useState(""); // "" = tất cả phòng
  const [dangCheck, setDangCheck] = useState<number | null>(null);

  // Mỗi hành động ứng đúng 1 modal riêng — KHÔNG gộp chung 1 modal to như trước.
  const [rowChiTiet, setRowChiTiet] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowSua, setRowSua] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowGhiChu, setRowGhiChu] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowLichSu, setRowLichSu] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowHuy, setRowHuy] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowChuyenTuan, setRowChuyenTuan] = useState<NoiDungGiaoBanRow | null>(null);
  const [dangChuyenTuan, setDangChuyenTuan] = useState(false);

  const [confirmChot, setConfirmChot] = useState(false);
  const [isChotting, setIsChotting] = useState(false);

  // reload({silent}) — mặc định KHÔNG bật lại spinner toàn trang, chỉ dùng khi thao tác nhỏ (check
  // hoàn thành, sửa 1 dòng...) để cảm giác giống cập nhật ngầm (AJAX), không giật cả trang mỗi lần
  // bấm. Chỉ lần tải đầu tiên mới hiện spinner full.
  const reload = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      getCuocHopGiaoBanChiTiet(cuocHopGiaoBanId)
        .then((d) => setData(d as ChiTiet))
        .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
        .finally(() => setIsLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cuocHopGiaoBanId]
  );

  useEffect(() => {
    reload();
    getPhongList().then(setDsPhong);
  }, [reload]);

  const rows = (data?.rows as NoiDungGiaoBanRow[] | undefined) ?? [];

  const rowsLoc = useMemo(() => {
    let r = rows;
    if (tab === "CHUA_XU_LY") r = r.filter((x) => !x.daKetThuc);
    if (tab === "DA_XU_LY") r = r.filter((x) => x.daKetThuc);
    if (locPhong) r = r.filter((x) => x.phongXuLy.maPhong === locPhong);
    return r;
  }, [rows, tab, locPhong]);

  const soChuaXuLy = rows.filter((r) => !r.daKetThuc).length;
  const soDaXuLy = rows.filter((r) => r.daKetThuc).length;
  const soDaHoanThanh = rows.filter((r) => r.daHoanThanh).length;
  const tyLe = rows.length === 0 ? 0 : Math.round((soDaHoanThanh / rows.length) * 100);

  // Check trực tiếp trên bảng — AJAX ngầm, không chuyển trang, không hiện spinner toàn trang.
  // Chống 2 người cùng check: server trả {thanhCong:false, lyDo} khi dữ liệu đã đổi trước đó.
  async function toggleHoanThanh(row: NoiDungGiaoBanRow) {
    setDangCheck(row.id);
    try {
      const ketQua = row.daHoanThanh ? await boHoanThanh(row.id) : await hoanThanhNoiDung(row.id);
      if (!ketQua.thanhCong) {
        show("error", "Đã có người khác cập nhật", ketQua.lyDo);
      }
      reload({ silent: true });
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangCheck(null);
    }
  }

  function hanhDong(row: NoiDungGiaoBanRow, h: HanhDongHang) {
    if (h === "chi-tiet") setRowChiTiet(row);
    if (h === "sua") setRowSua(row);
    if (h === "ghi-chu") setRowGhiChu(row);
    if (h === "lich-su") setRowLichSu(row);
    if (h === "huy") setRowHuy(row);
    if (h === "chuyen-tuan") setRowChuyenTuan(row);
  }

  async function xacNhanChuyenTuanSau() {
    if (!rowChuyenTuan) return;
    setDangChuyenTuan(true);
    try {
      await deNghiChuyenTuan(rowChuyenTuan.id);
      show("success", "Đã đề nghị", "Đã đề nghị chuyển tuần sau — chờ Admin xác nhận");
      reload({ silent: true });
    } catch (e) {
      show("error", "Thao tác thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangChuyenTuan(false);
      setRowChuyenTuan(null);
    }
  }

  async function handleChot() {
    setIsChotting(true);
    try {
      await chotCuocHopGiaoBan(cuocHopGiaoBanId);
      show("success", "Đã chốt", "Đã chốt cuộc giao ban");
      reload();
    } catch (e) {
      show("error", "Không thể chốt", e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsChotting(false);
      setConfirmChot(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        Đang tải...
      </div>
    );
  }

  const { cuocHop } = data;
  const dangMo = cuocHop.trangThai === "DANG_MO";
  const coTheThem = user?.isAdmin || user?.quyen === "LANHDAOPHONG";
  const hanMacDinh = getISOWeekEnd(cuocHop.nam, cuocHop.tuan).toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Giao ban tuần {cuocHop.tuan}/{cuocHop.nam}
          </h1>
          <p className="text-sm text-gray-400">
            {getWeekDateRangeLabel(cuocHop.nam, cuocHop.tuan)} — Ngày họp {formatDateVN(new Date(cuocHop.ngayHop))}
            {" — "}
            <span className={dangMo ? "text-success-600" : "text-gray-500"}>{dangMo ? "Đang mở" : "Đã chốt"}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openThongKe}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
          >
            📊 Thống kê
          </button>
          {/* Import chỉ Admin — trước đây gộp chung điều kiện với LĐ phòng là SAI */}
          {user?.isAdmin && dangMo && (
            <button
              onClick={openImport}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Import Excel
            </button>
          )}
          {coTheThem && dangMo && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Thêm nội dung <span className="text-lg leading-none">+</span>
            </button>
          )}
          {user?.isAdmin && dangMo && (
            <button
              onClick={() => setConfirmChot(true)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              Chốt cuộc giao ban
            </button>
          )}
        </div>
      </div>

      {/* Cùng hàng: tabs Trạng thái + lọc Phòng + tổng số/tỷ lệ hoàn thành */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            <TabButton active={tab === "TAT_CA"} onClick={() => setTab("TAT_CA")} label="Tất cả" count={rows.length} />
            <TabButton active={tab === "CHUA_XU_LY"} onClick={() => setTab("CHUA_XU_LY")} label="Chưa xử lý" count={soChuaXuLy} />
            <TabButton active={tab === "DA_XU_LY"} onClick={() => setTab("DA_XU_LY")} label="Đã xử lý" count={soDaXuLy} />
          </div>
          <select
            value={locPhong}
            onChange={(e) => setLocPhong(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">Tất cả phòng</option>
            {dsPhong.map((p) => (
              <option key={p.maPhong} value={p.maPhong}>{p.tenPhong}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {rows.length} công việc — Hoàn thành <b className="text-gray-700 dark:text-gray-200">{soDaHoanThanh}/{rows.length}</b> — Tỷ lệ{" "}
          <b className="text-brand-600">{tyLe}%</b>
        </p>
      </div>

      <GiaoBanTable rows={rowsLoc} dangCheck={dangCheck} onToggleHoanThanh={toggleHoanThanh} onHanhDong={hanhDong} />

      <AddNoiDungGiaoBanModal
        isOpen={isAddOpen}
        onClose={closeAdd}
        cuocHopGiaoBanId={cuocHopGiaoBanId}
        hanMacDinh={hanMacDinh}
        onAdded={() => reload({ silent: true })}
      />

      <ImportGiaoBanExcelModal
        isOpen={isImportOpen}
        onClose={closeImport}
        cuocHopGiaoBanId={cuocHopGiaoBanId}
        onImported={() => reload({ silent: true })}
      />

      <ThongKeGiaoBanModal isOpen={isThongKeOpen} onClose={closeThongKe} rows={rows} />

      <ChiTietNoiDungGiaoBanModal isOpen={rowChiTiet != null} onClose={() => setRowChiTiet(null)} row={rowChiTiet} />
      <SuaNoiDungGiaoBanModal isOpen={rowSua != null} onClose={() => setRowSua(null)} row={rowSua} onSaved={() => reload({ silent: true })} />
      <CapNhatGhiChuModal isOpen={rowGhiChu != null} onClose={() => setRowGhiChu(null)} row={rowGhiChu} onSaved={() => reload({ silent: true })} />
      <LichSuNoiDungModal isOpen={rowLichSu != null} onClose={() => setRowLichSu(null)} row={rowLichSu} />
      <LoaiKhoiDanhSachModal isOpen={rowHuy != null} onClose={() => setRowHuy(null)} row={rowHuy} onSaved={() => reload({ silent: true })} />

      <ConfirmDialog
        isOpen={rowChuyenTuan != null}
        title="Đề nghị chuyển tuần sau"
        description="Nội dung sẽ được đánh dấu đề nghị chuyển sang tuần sau. Admin sẽ xác nhận và tạo bản ghi cho tuần mới."
        isLoading={dangChuyenTuan}
        onConfirm={xacNhanChuyenTuanSau}
        onClose={() => setRowChuyenTuan(null)}
      />

      <ConfirmDialog
        isOpen={confirmChot}
        title="Chốt cuộc giao ban"
        description="Sau khi chốt, không thể thao tác thêm trên các nội dung của cuộc họp này. Chỉ chốt được khi mọi nội dung đã kết thúc (hoàn thành/chuyển tuần/huỷ)."
        isLoading={isChotting}
        onConfirm={handleChot}
        onClose={() => setConfirmChot(false)}
      />
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-gray-800 shadow-sm dark:bg-gray-dark dark:text-white/90" : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15" : "bg-gray-200 text-gray-500 dark:bg-white/10"}`}>
        {count}
      </span>
    </button>
  );
}
