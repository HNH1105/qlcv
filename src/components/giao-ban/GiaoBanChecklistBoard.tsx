// ĐÍCH: src/components/giao-ban/GiaoBanChecklistBoard.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import ConfirmDialog from "@/components/ca-nhan/ConfirmDialog";
import { formatDateVN, getWeekDateRangeLabel, getISOWeekEnd } from "@/lib/week";
import { getPhongList } from "@/lib/actions/danh-muc";
import { loiThanThien, rutGonNoiDung } from "@/lib/giao-ban/loi-than-thien";
import {
  getCuocHopGiaoBanChiTiet,
  chotCuocHopGiaoBan,
  moLaiCuocHopGiaoBan,
  capNhatHoanThanhHangLoat,
  deNghiChuyenTuan,
  khoiPhucNoiDungGiaoBan,
} from "@/lib/actions/giao-ban";
import GiaoBanTable, { type NoiDungGiaoBanRow, type HanhDongHang } from "./GiaoBanTable";
import LoaiBoTable from "./LoaiBoTable";
import AddNoiDungGiaoBanModal from "./AddNoiDungGiaoBanModal";
import ImportGiaoBanExcelModal from "./ImportGiaoBanExcelModal";
import ThongKeGiaoBanModal from "./ThongKeGiaoBanModal";
import ChiTietNoiDungGiaoBanModal from "./modals/ChiTietNoiDungGiaoBanModal";
import SuaNoiDungGiaoBanModal from "./modals/SuaNoiDungGiaoBanModal";
import CapNhatGhiChuModal from "./modals/CapNhatGhiChuModal";
import LichSuNoiDungModal from "./modals/LichSuNoiDungModal";
import LoaiKhoiDanhSachModal from "./modals/LoaiKhoiDanhSachModal";

type ChiTiet = Awaited<ReturnType<typeof getCuocHopGiaoBanChiTiet>>;
type TabTrangThai = "TAT_CA" | "CHUA_XU_LY" | "DA_XU_LY" | "LOAI_BO";
type Phong = { maPhong: string; tenPhong: string };

const DEBOUNCE_MS = 700;

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
  const [locPhong, setLocPhong] = useState("");

  // ===== Checkbox optimistic + debounce gộp batch =====
  // overrides: giá trị daHoanThanh NGƯỜI DÙNG ĐANG THẤY (đã ghi đè lên dữ liệu server), phản ánh
  // NGAY khi click — không chờ API. pendingRef: tập id CẦN GỬI lên server ở lượt debounce kế tiếp,
  // tách khỏi overrides để có thể "check rồi bỏ check lại về ban đầu -> không cần gửi API" (khi giá
  // trị optimistic trùng lại đúng giá trị server, tự xoá khỏi pending mà KHÔNG xoá khỏi overrides
  // — vì overrides khi đó == giá trị gốc nên hiển thị vẫn đúng).
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [dangGuiIds, setDangGuiIds] = useState<Set<number>>(new Set());
  const pendingRef = useRef<Record<number, boolean>>({});
  const isSendingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef<NoiDungGiaoBanRow[]>([]); // luôn giữ bản rows mới nhất để tra cứu nội dung khi báo lỗi

  const [rowChiTiet, setRowChiTiet] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowSua, setRowSua] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowGhiChu, setRowGhiChu] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowLichSu, setRowLichSu] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowHuy, setRowHuy] = useState<NoiDungGiaoBanRow | null>(null);
  const [rowChuyenTuan, setRowChuyenTuan] = useState<NoiDungGiaoBanRow | null>(null);
  const [dangChuyenTuan, setDangChuyenTuan] = useState(false);
  const [dangKhoiPhucId, setDangKhoiPhucId] = useState<number | null>(null);

  const [confirmChot, setConfirmChot] = useState(false);
  const [isChotting, setIsChotting] = useState(false);
  const [dangMoLai, setDangMoLai] = useState(false);

  const reload = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      return getCuocHopGiaoBanChiTiet(cuocHopGiaoBanId)
        .then((d) => {
          setData(d as ChiTiet);
          rowsRef.current = d.rows as NoiDungGiaoBanRow[];
        })
        .catch((e) => show("error", "Không tải được dữ liệu", loiThanThien(e)))
        .finally(() => setIsLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cuocHopGiaoBanId]
  );

  useEffect(() => {
    reload();
    getPhongList().then(setDsPhong);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [reload]);

  const rowsGoc = (data?.rows as NoiDungGiaoBanRow[] | undefined) ?? [];

  // Áp overrides lên rows gốc — mọi nơi khác trong component (bảng, tab đếm số, tỷ lệ) đều dùng
  // MẢNG NÀY thay vì rowsGoc, để hiển thị optimistic nhất quán khắp nơi.
  //
  // QUAN TRỌNG: override phải đổi ĐỒNG THỜI cả daHoanThanh LẪN daKetThuc (không chỉ daHoanThanh).
  // Lý do: check/uncheck 1 nội dung luôn kéo theo daKetThuc đổi tương ứng ở server (hoàn thành ->
  // daKetThuc=true, bỏ hoàn thành -> daKetThuc=false). Nếu chỉ override daHoanThanh, trong lúc chờ
  // server phản hồi dòng đó rơi vào trạng thái nửa vời (VD: vừa bỏ check nhưng daKetThuc cũ vẫn
  // còn true) — nếu đang xem tab "Đã xử lý"/"Chưa xử lý" (lọc theo daKetThuc), dòng sẽ hiển thị SAI
  // tab một lúc rồi "nhảy" đúng chỗ ngay khi dữ liệu thật về, trông như bị mất rồi hiện lại. Đổi cả
  // 2 field cùng lúc thì UI đúng ngay từ đầu, không có khoảng nửa vời đó.
  const rows = useMemo(
    () =>
      rowsGoc.map((r) =>
        r.id in overrides ? { ...r, daHoanThanh: overrides[r.id], daKetThuc: overrides[r.id] } : r
      ),
    [rowsGoc, overrides]
  );

  // "Loại bỏ" = đã kết thúc, KHÔNG hoàn thành, KHÔNG phải do chuyển tuần (không có bản ghi kế tiếp).
  const laLoaiBo = (r: NoiDungGiaoBanRow) => r.daKetThuc && !r.daHoanThanh && r.duocChuyenThanh == null;

  // 3 tab chính (Tất cả/Chưa xử lý/Đã xử lý) KHÔNG bao gồm các dòng đã Loại bỏ — dòng đó chỉ nằm
  // trong tab Loại bỏ riêng, và cũng KHÔNG tính vào tỷ lệ % (yêu cầu mới).
  const rowsConTheoDoi = useMemo(() => rows.filter((r) => !laLoaiBo(r)), [rows]);
  const rowsLoaiBo = useMemo(() => rows.filter(laLoaiBo), [rows]);

  const rowsLoc = useMemo(() => {
    let r = tab === "LOAI_BO" ? rowsLoaiBo : rowsConTheoDoi;
    if (tab === "CHUA_XU_LY") r = r.filter((x) => !x.daKetThuc);
    if (tab === "DA_XU_LY") r = r.filter((x) => x.daKetThuc);
    if (locPhong) r = r.filter((x) => x.phongXuLy.maPhong === locPhong);
    return r;
  }, [tab, rowsConTheoDoi, rowsLoaiBo, locPhong]);

  const soChuaXuLy = rowsConTheoDoi.filter((r) => !r.daKetThuc).length;
  const soDaXuLy = rowsConTheoDoi.filter((r) => r.daKetThuc).length;
  const soDaHoanThanh = rowsConTheoDoi.filter((r) => r.daHoanThanh).length;
  const tyLe = rowsConTheoDoi.length === 0 ? 0 : Math.round((soDaHoanThanh / rowsConTheoDoi.length) * 100);

  // ===================== CHECKBOX: optimistic + debounce + gộp batch =====================

  function layNoiDungTheoId(id: number): string {
    return rowsRef.current.find((r) => r.id === id)?.noiDung ?? "";
  }

  function scheduleFlush() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (!isSendingRef.current) doFlush();
    }, DEBOUNCE_MS);
  }

  async function doFlush() {
    const snapshot = { ...pendingRef.current };
    const ids = Object.keys(snapshot).map(Number);
    if (ids.length === 0) return;

    pendingRef.current = {}; // đã chụp snapshot — pending mới phát sinh trong lúc gửi sẽ vào lượt sau
    isSendingRef.current = true;
    setDangGuiIds(new Set(ids));

    try {
      const ketQua = await capNhatHoanThanhHangLoat(ids.map((id) => ({ id, daHoanThanh: snapshot[id] })));

      if (ketQua.thanhCongIds.length > 0) {
        show("success", "Đã cập nhật", `${ketQua.thanhCongIds.length} nội dung đã được cập nhật thành công.`);
      }
      if (ketQua.thatBai.length > 0) {
        // Hoàn lại đúng giá trị TRƯỚC KHI CHECK cho các dòng lỗi — vì rowsGoc (server) tại thời
        // điểm này vẫn còn là giá trị cũ (do batch của các dòng khác có thể đã reload), nên xoá
        // override của riêng các id lỗi để nó rơi về đúng giá trị gốc, không cần biết giá trị gốc
        // là gì (không phải lưu lại "giá trị trước" riêng).
        setOverrides((prev) => {
          const next = { ...prev };
          for (const f of ketQua.thatBai) delete next[f.id];
          return next;
        });
        const danhSachLoi = ketQua.thatBai
          .slice(0, 3)
          .map((f) => `"${rutGonNoiDung(f.noiDung)}" (${f.lyDo})`)
          .join("; ");
        show(
          "error",
          `${ketQua.thatBai.length} nội dung cập nhật thất bại`,
          danhSachLoi + (ketQua.thatBai.length > 3 ? "…" : "")
        );
      }
    } catch (e) {
      // Lỗi mạng/toàn batch — hoàn lại TẤT CẢ override của lượt này để không mất đồng bộ, người
      // dùng có thể check lại (thao tác vẫn còn nguyên trên server vì chưa gửi được gì).
      setOverrides((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      show("error", "Cập nhật thất bại", loiThanThien(e, "Không thể kết nối tới máy chủ. Vui lòng thử lại."));
    } finally {
      setDangGuiIds(new Set());
      isSendingRef.current = false;
      // Chờ dữ liệu thật từ server về XONG rồi mới xoá override — tránh giật hình (nhấp nháy về
      // giá trị cũ trong lúc chờ reload) như bản trước.
      await reload({ silent: true });
      setOverrides((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          if (!(id in pendingRef.current)) delete next[id]; // id nào bị toggle tiếp trong lúc gửi thì giữ nguyên, chờ lượt sau
        }
        return next;
      });
      // Nếu trong lúc gửi người dùng bấm thêm — gửi tiếp lượt mới ngay.
      if (Object.keys(pendingRef.current).length > 0) doFlush();
    }
  }

  function toggleHoanThanh(row: NoiDungGiaoBanRow) {
    const giaTriGoc = rowsGoc.find((r) => r.id === row.id)?.daHoanThanh ?? row.daHoanThanh;
    const giaTriMoi = !row.daHoanThanh; // dựa trên giá trị ĐANG HIỂN THỊ (đã gồm override trước đó)

    setOverrides((prev) => ({ ...prev, [row.id]: giaTriMoi }));

    if (giaTriMoi === giaTriGoc) {
      // Check rồi bỏ check lại về đúng trạng thái ban đầu -> không cần gửi API cho id này nữa.
      delete pendingRef.current[row.id];
    } else {
      pendingRef.current[row.id] = giaTriMoi;
    }
    scheduleFlush();
  }

  // ===================== Các hành động khác =====================

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
      show("error", "Thao tác thất bại", loiThanThien(e));
    } finally {
      setDangChuyenTuan(false);
      setRowChuyenTuan(null);
    }
  }

  async function handleKhoiPhuc(row: NoiDungGiaoBanRow) {
    setDangKhoiPhucId(row.id);
    try {
      await khoiPhucNoiDungGiaoBan(row.id);
      show("success", "Đã khôi phục", "Nội dung đã được đưa trở lại checklist");
      reload({ silent: true });
    } catch (e) {
      show("error", "Khôi phục thất bại", loiThanThien(e));
    } finally {
      setDangKhoiPhucId(null);
    }
  }

  async function handleChot() {
    setIsChotting(true);
    try {
      await chotCuocHopGiaoBan(cuocHopGiaoBanId);
      show("success", "Đã chốt", "Đã chốt cuộc giao ban");
      reload();
    } catch (e) {
      show("error", "Không thể chốt", loiThanThien(e));
    } finally {
      setIsChotting(false);
      setConfirmChot(false);
    }
  }

  async function handleMoLai() {
    setDangMoLai(true);
    try {
      await moLaiCuocHopGiaoBan(cuocHopGiaoBanId);
      show("success", "Đã mở lại", "Cuộc giao ban đã được mở lại, có thể thao tác tiếp");
      reload();
    } catch (e) {
      show("error", "Không thể mở lại", loiThanThien(e));
    } finally {
      setDangMoLai(false);
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
          {/* Admin quyết định chốt hay không, không phụ thuộc tiến độ nội dung — và được mở lại. */}
          {user?.isAdmin && !dangMo && (
            <button
              onClick={handleMoLai}
              disabled={dangMoLai}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {dangMoLai ? "Đang mở lại..." : "🔓 Mở lại cuộc giao ban"}
            </button>
          )}
        </div>
      </div>

      {/* Sticky: tabs + lọc phòng + thống kê nhanh luôn dính lại khi cuộn xuống bảng dài */}
      <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center justify-between gap-3 bg-gray-50/95 px-1 py-2 backdrop-blur dark:bg-gray-900/95">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            <TabButton active={tab === "TAT_CA"} onClick={() => setTab("TAT_CA")} label="Tất cả" count={rowsConTheoDoi.length} />
            <TabButton active={tab === "CHUA_XU_LY"} onClick={() => setTab("CHUA_XU_LY")} label="Chưa xử lý" count={soChuaXuLy} />
            <TabButton active={tab === "DA_XU_LY"} onClick={() => setTab("DA_XU_LY")} label="Đã xử lý" count={soDaXuLy} />
            {user?.isAdmin && (
              <TabButton active={tab === "LOAI_BO"} onClick={() => setTab("LOAI_BO")} label="Loại bỏ" count={rowsLoaiBo.length} />
            )}
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
          {rowsConTheoDoi.length} công việc — Hoàn thành <b className="text-gray-700 dark:text-gray-200">{soDaHoanThanh}/{rowsConTheoDoi.length}</b> — Tỷ lệ{" "}
          <b className="text-brand-600">{tyLe}%</b>
          {rowsLoaiBo.length > 0 && <span className="text-gray-400"> (không tính {rowsLoaiBo.length} mục đã loại bỏ)</span>}
        </p>
      </div>

      {tab === "LOAI_BO" ? (
        <LoaiBoTable rows={rowsLoc} dangKhoiPhucId={dangKhoiPhucId} onKhoiPhuc={handleKhoiPhuc} onXemChiTiet={(r) => setRowChiTiet(r)} />
      ) : (
        <GiaoBanTable rows={rowsLoc} dangMo={dangMo} dangGuiIds={dangGuiIds} onToggleHoanThanh={toggleHoanThanh} onHanhDong={hanhDong} />
      )}

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

      <ThongKeGiaoBanModal isOpen={isThongKeOpen} onClose={closeThongKe} rows={rowsConTheoDoi} />

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
        description="Sau khi chốt, mọi thao tác chỉnh sửa (sửa nội dung, ghi chú, hoàn thành, chuyển tuần, huỷ) sẽ bị khoá — chỉ còn xem chi tiết/lịch sử. Bạn có thể mở lại bất kỳ lúc nào."
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
