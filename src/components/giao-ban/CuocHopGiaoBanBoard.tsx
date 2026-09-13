// ĐÍCH: src/components/giao-ban/CuocHopGiaoBanBoard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Pagination from "@/components/nhiem-vu/Pagination";
import { getCurrentWeekInfo, formatDateVN } from "@/lib/week";
import { getCuocHopGiaoBanListPhanTrang, taoCuocHopGiaoBan } from "@/lib/actions/giao-ban";

type Rows = Awaited<ReturnType<typeof getCuocHopGiaoBanListPhanTrang>>["rows"];

export default function CuocHopGiaoBanBoard() {
  return (
    <ToastProvider>
      <BoardContent />
    </ToastProvider>
  );
}

function BoardContent() {
  const user = useAuth();
  const { show } = useToast();
  const { isOpen, openModal, closeModal } = useModal();
  const [rows, setRows] = useState<Rows>([]);
  const [tongSo, setTongSo] = useState(0);
  const [trang, setTrang] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setIsLoading(true);
    getCuocHopGiaoBanListPhanTrang({ trang, soDongMoiTrang: pageSize })
      .then((res) => {
        setRows(res.rows);
        setTongSo(res.tongSo);
      })
      .catch((e) => show("error", "Không tải được dữ liệu", e instanceof Error ? e.message : "Có lỗi xảy ra"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trang, pageSize]);

  useEffect(() => {
    reload();
  }, [reload]);

  const tongSoTrang = Math.max(1, Math.ceil(tongSo / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Checklist giao ban</h1>
          <p className="text-sm text-gray-400">Danh sách các cuộc giao ban theo tuần.</p>
        </div>
        {user?.isAdmin && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Tạo cuộc giao ban mới <span className="text-lg leading-none">+</span>
          </button>
        )}
      </div>

      {user?.isAdmin && (
        <Link
          href="/giao-ban/xac-nhan-chuyen-tuan"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:underline"
        >
          Xem danh sách chờ xác nhận chuyển tuần →
        </Link>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-gray-400">Chưa có cuộc giao ban nào.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[860px]">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="w-14 px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">STT</TableCell>
                      <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tên</TableCell>
                      <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tổng nội dung</TableCell>
                      <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ngày họp</TableCell>
                      <TableCell isHeader className="w-40 px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tiến độ</TableCell>
                      <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Trạng thái</TableCell>
                      <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Người tạo</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {rows.map((r, idx) => (
                      <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500">
                          {(trang - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <Link href={`/giao-ban/${r.id}`} className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90">
                            Giao ban tuần {r.tuan}/{r.nam}
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{r.tongNoiDung}</TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{formatDateVN(new Date(r.ngayHop))}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                              <div className="h-full bg-brand-500" style={{ width: `${r.tienDoPhanTram}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{r.soDaHoanThanh}/{r.tongNoiDung}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r.trangThai === "DANG_MO"
                                ? "bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                            }`}
                          >
                            {r.trangThai === "DANG_MO" ? "Đang mở" : "Đã chốt"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                          {r.createdBy.hoTen}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <Pagination
            currentPage={trang}
            totalPages={tongSoTrang}
            totalRecords={tongSo}
            pageSize={pageSize}
            onPageChange={setTrang}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setTrang(1);
            }}
          />
        </>
      )}

      <TaoCuocHopModal isOpen={isOpen} onClose={closeModal} onCreated={reload} />
    </div>
  );
}

function TaoCuocHopModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const { show } = useToast();
  const { nam: namHienTai, tuan: tuanHienTai } = getCurrentWeekInfo();
  const [nam, setNam] = useState(namHienTai);
  const [tuan, setTuan] = useState(tuanHienTai);
  const [ngayHop, setNgayHop] = useState("");
  const [dateKey, setDateKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNam(namHienTai);
    setTuan(tuanHienTai);
    setNgayHop(new Date().toISOString().slice(0, 10));
    setDateKey((k) => k + 1);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSave() {
    if (!ngayHop) return setError("Vui lòng chọn ngày họp.");
    setIsSubmitting(true);
    setError(null);
    try {
      await taoCuocHopGiaoBan(nam, tuan, new Date(ngayHop));
      show("success", "Đã tạo", `Đã tạo cuộc giao ban tuần ${tuan}/${nam}`);
      onCreated();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      setError(msg);
      show("error", "Tạo thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-5 lg:p-8">
      <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Tạo cuộc giao ban mới</h4>
      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">{error}</div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tuần</Label>
            <input type="number" value={tuan} onChange={(e) => setTuan(Number(e.target.value))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          </div>
          <div>
            <Label>Năm</Label>
            <input type="number" value={nam} onChange={(e) => setNam(Number(e.target.value))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" />
          </div>
        </div>
        <div key={dateKey}>
          <DatePicker id="ngay-hop-giao-ban" label="Ngày họp" defaultDate={ngayHop} onChange={(_d: Date[], dateStr: string) => setNgayHop(dateStr)} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Huỷ</Button>
        <Button size="sm" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Đang tạo..." : "Tạo"}</Button>
      </div>
    </Modal>
  );
}
