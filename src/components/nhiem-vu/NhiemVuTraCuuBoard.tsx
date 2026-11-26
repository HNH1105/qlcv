// ĐÍCH: src/components/nhiem-vu/NhiemVuTraCuuBoard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { traCuuNhiemVu, type NhiemVuRow } from "@/lib/actions/nhiem-vu";
import { getPhongList, getNhanVienList } from "@/lib/actions/danh-muc";
import { useAuth } from "@/context/AuthContext";
import { MucDoUuTien, TrangThaiNhiemVu } from "@prisma/client";
import NhiemVuTable from "./NhiemVuTable";
import Pagination from "./Pagination";
import DatePicker from "@/components/form/date-picker";
import { useNavProgress } from "@/components/providers/NavProgressProvider";

type Phong = { maPhong: string; tenPhong: string };
type NhanVien = { maNV: string; hoTen: string; maPhong: string };

export default function NhiemVuTraCuuBoard() {
  const batDauDieuHuong = useNavProgress();
  const user = useAuth();
  const [dsPhong, setDsPhong] = useState<Phong[]>([]);
  const [dsNhanVien, setDsNhanVien] = useState<NhanVien[]>([]);
  const [pageSize, setPageSize] = useState(10);

  // [MẶC ĐỊNH NHẸ] Mở trang chỉ tải nhiệm vụ ĐANG XỬ LÝ, GIAO TRONG NĂM HIỆN TẠI (theo ngày giao,
  // 01/01 -> 31/12 năm nay theo giờ máy người dùng) thay vì toàn bộ dữ liệu. Muốn xem rộng hơn: chọn
  // Trạng thái "Tất cả" và/hoặc bấm "Xoá lọc ngày".
  const namHienTai = new Date().getFullYear();
  const [tuNgay, setTuNgay] = useState(`${namHienTai}-01-01`);
  const [denNgay, setDenNgay] = useState(`${namHienTai}-12-31`);
  const [theoLoaiNgay, setTheoLoaiNgay] = useState<"ngayGiao" | "hanXuLy">("ngayGiao");
  // Đổi key để dựng lại 2 ô chọn ngày khi bấm "Xoá lọc ngày" (flatpickr không tự xoá ô nhập).
  const [lanXoaNgay, setLanXoaNgay] = useState(0);
  const [phongChuTriId, setPhongChuTriId] = useState("");
  const [nguoiXuLyChinhId, setNguoiXuLyChinhId] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThaiNhiemVu | "">("DANGXULY");
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTien | "">("");
  // Ô từ khoá: tuKhoaNhap đổi theo từng phím gõ; tuKhoa (dùng để tìm) chỉ cập nhật sau khi NGỪNG GÕ
  // 400ms — tránh mỗi phím gõ là 1 lần truy vấn database.
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [chiQuaHan, setChiQuaHan] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTuKhoa(tuKhoaNhap.trim()), 400);
    return () => clearTimeout(t);
  }, [tuKhoaNhap]);

  // Khoá bộ lọc (không gồm trang). Đổi bộ lọc -> tự về trang 1 NGAY trong cùng lần render (trước
  // đây dùng 1 useEffect setTrang(1) nên đang ở trang 3 mà đổi bộ lọc sẽ truy vấn 2 lần).
  const khoaBoLoc = JSON.stringify([tuNgay, denNgay, theoLoaiNgay, phongChuTriId, nguoiXuLyChinhId, trangThai, mucDoUuTien, tuKhoa, chiQuaHan, pageSize]);
  const [trangTheoBoLoc, setTrangTheoBoLoc] = useState({ khoa: khoaBoLoc, trang: 1 });
  const trang = trangTheoBoLoc.khoa === khoaBoLoc ? trangTheoBoLoc.trang : 1;
  const setTrang = (t: number) => setTrangTheoBoLoc({ khoa: khoaBoLoc, trang: t });

  // Kết quả gắn khoá (bộ lọc + trang) đã dùng để tải: chỉ hiển thị khi khớp, còn lại "Đang tải...";
  // kết quả của lần tải cũ về trễ bị bỏ qua (không ghi đè kết quả mới).
  const khoaTai = `${khoaBoLoc}|${trang}`;
  const [ketQua, setKetQua] = useState<{ khoa: string; rows: NhiemVuRow[]; tongSo: number } | null>(null);
  const isLoading = ketQua?.khoa !== khoaTai;
  const rows = isLoading ? [] : ketQua!.rows;
  const tongSo = isLoading ? 0 : ketQua!.tongSo;

  // Handler ổn định cho DatePicker — component này dựng lại flatpickr mỗi khi onChange đổi tham
  // chiếu, nên không truyền hàm viết tại chỗ (mỗi lần render lại dựng lại lịch).
  const onChonTuNgay = useCallback((_d: Date[], dateStr: string) => setTuNgay(dateStr), []);
  const onChonDenNgay = useCallback((_d: Date[], dateStr: string) => setDenNgay(dateStr), []);

  useEffect(() => {
    getPhongList().then(setDsPhong);
    getNhanVienList().then((l) => setDsNhanVien(l as unknown as NhanVien[]));
  }, []);

  useEffect(() => {
    let conHieuLuc = true;
    const khoa = khoaTai;
    traCuuNhiemVu({
      // Tính theo GIỜ MÁY NGƯỜI DÙNG và lấy TRỌN NGÀY: từ 00:00 ngày bắt đầu đến 23:59:59 ngày kết
      // thúc (trước đây new Date("yyyy-mm-dd") = 00:00 giờ UTC, làm rơi mất các nhiệm vụ giao trong
      // ngày cuối của khoảng lọc).
      tuNgay: tuNgay ? new Date(`${tuNgay}T00:00:00`) : undefined,
      denNgay: denNgay ? new Date(`${denNgay}T23:59:59.999`) : undefined,
      theoLoaiNgay,
      phongChuTriId: phongChuTriId || undefined,
      nguoiXuLyChinhId: nguoiXuLyChinhId || undefined,
      trangThai: trangThai || undefined,
      mucDoUuTien: mucDoUuTien || undefined,
      tuKhoa: tuKhoa || undefined,
      chiQuaHan,
      trang,
      soDongMoiTrang: pageSize,
    })
      .then((res) => {
        if (conHieuLuc) setKetQua({ khoa, rows: res.rows, tongSo: res.tongSo });
      })
      .catch(() => {
        if (conHieuLuc) setKetQua({ khoa, rows: [], tongSo: 0 });
      });
    return () => {
      conHieuLuc = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaTai]);

  const tongSoTrang = Math.max(1, Math.ceil(tongSo / pageSize));
  const dsXuLyChinhTheoPhong = phongChuTriId ? dsNhanVien.filter((nv) => nv.maPhong === phongChuTriId) : dsNhanVien;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tra cứu nhiệm vụ</h1>
        {(user?.quyen === "LANHDAODONVI" || user?.quyen === "LANHDAOPHONG") && (
          <Link
            href="/nhiem-vu/tao-moi"
            onClick={batDauDieuHuong}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Giao nhiệm vụ
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <SelectField label="Lọc theo" value={theoLoaiNgay} onChange={(v) => setTheoLoaiNgay(v as "ngayGiao" | "hanXuLy")}>
            <option value="hanXuLy">Hạn xử lý</option>
            <option value="ngayGiao">Ngày giao</option>
          </SelectField>

          <div>
            <DatePicker
              key={`tu-${lanXoaNgay}`}
              id="tra-cuu-tu-ngay"
              label="Từ ngày"
              placeholder="Chọn ngày..."
              defaultDate={tuNgay || undefined}
              onChange={onChonTuNgay}
            />
          </div>
          <div>
            <DatePicker
              key={`den-${lanXoaNgay}`}
              id="tra-cuu-den-ngay"
              label="Đến ngày"
              placeholder="Chọn ngày..."
              defaultDate={denNgay || undefined}
              onChange={onChonDenNgay}
            />
            {(tuNgay || denNgay) && (
              <button
                type="button"
                onClick={() => {
                  setTuNgay("");
                  setDenNgay("");
                  setLanXoaNgay((n) => n + 1);
                }}
                className="mt-1 text-xs text-brand-500 hover:underline"
              >
                Xoá lọc ngày
              </button>
            )}
          </div>

          <SelectField
            label="Phòng chủ trì"
            value={phongChuTriId}
            onChange={(v) => {
              setPhongChuTriId(v);
              setNguoiXuLyChinhId("");
            }}
          >
            <option value="">Tất cả</option>
            {dsPhong.map((p) => (
              <option key={p.maPhong} value={p.maPhong}>
                {p.tenPhong}
              </option>
            ))}
          </SelectField>

          <SelectField label="Người xử lý chính" value={nguoiXuLyChinhId} onChange={setNguoiXuLyChinhId}>
            <option value="">Tất cả</option>
            {dsXuLyChinhTheoPhong.map((nv) => (
              <option key={nv.maNV} value={nv.maNV}>
                {nv.hoTen}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Trạng thái"
            value={trangThai}
            onChange={(v) => setTrangThai(v as TrangThaiNhiemVu | "")}
            disabled={chiQuaHan}
          >
            <option value="">Tất cả</option>
            <option value="CHO_PHAN_CONG">Chờ phân công</option>
            <option value="DANGXULY">Đang xử lý</option>
            <option value="CHO_DUYET">Chờ duyệt</option>
            <option value="HOANTHANH">Hoàn thành</option>
            <option value="TAMDUNG">Tạm dừng</option>
            <option value="HUY">Đã huỷ</option>
          </SelectField>

          <SelectField label="Ưu tiên" value={mucDoUuTien} onChange={(v) => setMucDoUuTien(v as MucDoUuTien | "")}>
            <option value="">Tất cả</option>
            <option value="THUONG">Thường</option>
            <option value="KHAN">Khẩn</option>
          </SelectField>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Từ khoá</label>
            <input
              value={tuKhoaNhap}
              onChange={(e) => setTuKhoaNhap(e.target.value)}
              placeholder="Tiêu đề, nội dung..."
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={chiQuaHan} onChange={(e) => setChiQuaHan(e.target.checked)} />
          Chỉ hiện nhiệm vụ quá hạn{" "}
          <span className="text-xs text-gray-400">(bỏ qua lựa chọn Trạng thái phía trên nếu có)</span>
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          Đang tải...
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">Tìm thấy {tongSo} kết quả</p>
          <NhiemVuTable rows={rows} />
          <Pagination
            currentPage={trang}
            totalPages={tongSoTrang}
            totalRecords={tongSo}
            pageSize={pageSize}
            onPageChange={setTrang}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-white/5"
      >
        {children}
      </select>
    </div>
  );
}
