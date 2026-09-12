// ĐÍCH: src/components/nhiem-vu/NhiemVuTaoMoiForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import NguoiPhoiHopSelect from "@/components/ca-nhan/NguoiPhoiHopSelect";
import NguoiXuLyChinhSelect from "./NguoiXuLyChinhSelect";
import { useNavProgress } from "@/components/providers/NavProgressProvider";
import { useAuth } from "@/context/AuthContext";
import { getPhongList, getNhanVienList } from "@/lib/actions/danh-muc";
import { taoNhiemVu } from "@/lib/actions/nhiem-vu";
import { MucDoUuTien, TanSuatNhac } from "@prisma/client";
import ToastProvider, { useToast } from "@/components/ca-nhan/ToastProvider";

type Phong = { maPhong: string; tenPhong: string };
type NhanVien = { maNV: string; hoTen: string; maPhong: string; quyen: string };

const TAN_SUAT_OPTIONS: { value: TanSuatNhac; label: string }[] = [
  { value: "HANG_TUAN", label: "Hàng tuần" },
  { value: "HANG_THANG", label: "Hàng tháng" },
  { value: "HANG_QUY", label: "Hàng quý" },
  { value: "HANG_NAM", label: "Hàng năm" },
];

// Danh mục lỗi field — dùng để bôi viền đỏ + biết cần focus/cuộn tới đâu. Không cần enum phức tạp,
// chỉ là key nội bộ của form này.
type TruongLoi = "tieuDe" | "phongChuTri" | "nguoiGiao" | "ngayBatDauNhac" | null;

export default function NhiemVuTaoMoiForm(props: {
  phongMacDinh?: string;
  // MỚI — cho phép truyền sẵn danh mục từ Server Component (page.tsx) để tránh form phải tự gọi
  // Server Action lúc mount (mỗi lần tốn 1 round-trip riêng, cộng dồn độ trễ DB). Optional để
  // không phá vỡ nơi khác lỡ dùng component này mà chưa truyền — khi đó fallback tự fetch như cũ.
  dsPhongBanDau?: Phong[];
  dsNhanVienBanDau?: NhanVien[];
}) {
  return (
    <ToastProvider>
      <NoiDungForm {...props} />
    </ToastProvider>
  );
}

function NoiDungForm({
  phongMacDinh,
  dsPhongBanDau,
  dsNhanVienBanDau,
}: {
  phongMacDinh?: string;
  dsPhongBanDau?: Phong[];
  dsNhanVienBanDau?: NhanVien[];
}) {
  const user = useAuth();
  const router = useRouter();
  const batDauDieuHuong = useNavProgress();
  const { show } = useToast();
  const isLDPhong = user?.quyen === "LANHDAOPHONG";

  const [dsPhong, setDsPhong] = useState<Phong[]>(dsPhongBanDau ?? []);
  const [dsNhanVien, setDsNhanVien] = useState<NhanVien[]>(dsNhanVienBanDau ?? []);

  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTien>("THUONG");
  const [nguon, setNguon] = useState("");
  const [vanBanLienQuan, setVanBanLienQuan] = useState("");
  const [linkFile, setLinkFile] = useState("");
  const [nguoiGiaoId, setNguoiGiaoId] = useState("");
  const [ngayGiao, setNgayGiao] = useState(new Date().toISOString().slice(0, 10));

  const [phongChuTriId, setPhongChuTriId] = useState(isLDPhong ? user?.maPhong ?? "" : phongMacDinh ?? "");
  const [nguoiXuLyChinhId, setNguoiXuLyChinhId] = useState("");
  const [phongPhoiHopIds, setPhongPhoiHopIds] = useState<string[]>([]);
  const [nguoiPhoiHopIds, setNguoiPhoiHopIds] = useState<string[]>([]);

  const [kieuHan, setKieuHan] = useState<"cuThe" | "dinhKy" | "khong">("khong");
  const [hanXuLy, setHanXuLy] = useState("");
  const [tanSuatNhac, setTanSuatNhac] = useState<TanSuatNhac>("HANG_THANG");
  const [ngayBatDauNhac, setNgayBatDauNhac] = useState("");
  const [ngayKetThucNhac, setNgayKetThucNhac] = useState("");

  const [truongLoi, setTruongLoi] = useState<TruongLoi>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refTieuDe = useRef<HTMLInputElement>(null);
  const refPhongChuTri = useRef<HTMLSelectElement>(null);
  const refNguoiGiao = useRef<HTMLSelectElement>(null);

  // Chỉ tự fetch khi KHÔNG được truyền sẵn từ server (fallback cho nơi khác lỡ dùng component này
  // mà chưa kịp sửa page.tsx truyền props) — trang /nhiem-vu/tao-moi thật đã truyền sẵn nên nhánh
  // này không chạy, tránh 2 round-trip chậm như log bạn gặp trước đó.
  useEffect(() => {
    if (dsPhongBanDau && dsNhanVienBanDau) return;
    getPhongList().then(setDsPhong);
    getNhanVienList().then((list) => setDsNhanVien(list as NhanVien[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dsNguoiGiao = useMemo(
    () =>
      dsNhanVien.filter(
        (nv) => nv.quyen === "LANHDAODONVI" || (nv.quyen === "LANHDAOPHONG" && nv.maPhong === phongChuTriId)
      ),
    [dsNhanVien, phongChuTriId]
  );

  useEffect(() => {
    if (user && dsNguoiGiao.some((nv) => nv.maNV === user.maNV)) {
      setNguoiGiaoId(user.maNV);
    } else if (!dsNguoiGiao.some((nv) => nv.maNV === nguoiGiaoId)) {
      setNguoiGiaoId("");
    }
    setNguoiXuLyChinhId((prev) =>
      dsNhanVien.some((nv) => nv.maNV === prev && nv.maPhong === phongChuTriId) ? prev : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phongChuTriId, dsNguoiGiao]);

  const dsPhongChoPhepPhoiHop = useMemo(
    () => new Set([phongChuTriId, ...phongPhoiHopIds]),
    [phongChuTriId, phongPhoiHopIds]
  );

  useEffect(() => {
    setNguoiPhoiHopIds((prev) =>
      prev.filter((maNV) => {
        const nv = dsNhanVien.find((n) => n.maNV === maNV);
        return nv ? dsPhongChoPhepPhoiHop.has(nv.maPhong) : false;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsPhongChoPhepPhoiHop]);

  const dsXuLyChinhOptions = useMemo(
    () => dsNhanVien.filter((nv) => nv.maPhong === phongChuTriId),
    [dsNhanVien, phongChuTriId]
  );

  const dsPhoiHopOptions = useMemo(
    () =>
      dsNhanVien
        .filter((nv) => nv.maNV !== nguoiXuLyChinhId && dsPhongChoPhepPhoiHop.has(nv.maPhong))
        .map((nv) => ({ value: nv.maNV, text: nv.hoTen })),
    [dsNhanVien, nguoiXuLyChinhId, dsPhongChoPhepPhoiHop]
  );

  const dsPhongPhoiHopOptions = useMemo(
    () =>
      dsPhong.filter((p) => p.maPhong !== phongChuTriId).map((p) => ({ value: p.maPhong, text: p.tenPhong })),
    [dsPhong, phongChuTriId]
  );

  // Báo lỗi bằng Toast (không phụ thuộc vị trí cuộn màn hình — luôn hiện góc dưới-phải) + tự cuộn
  // và focus về đúng ô đang thiếu. Trước đây chỉ có khung đỏ phía trên, nếu người dùng đã cuộn
  // xuống thấy mất, không hiểu vì sao bấm "Giao nhiệm vụ" không có phản hồi gì.
  // BUG đã sửa: trước đây chọn "Người xử lý chính" KHÔNG kiểm tra người đó có đang nằm trong danh
  // sách "Người phối hợp" hay không — dsPhoiHopOptions chỉ lọc chiều NGƯỢC LẠI (ẩn xử lý chính
  // khỏi danh sách CHỌN phối hợp), nhưng nếu 1 người ĐÃ được chọn phối hợp từ trước, rồi sau đó
  // mới chọn họ làm xử lý chính, giá trị cũ trong nguoiPhoiHopIds vẫn còn nguyên trong state ->
  // gửi lên server bị chặn bởi invariant "xử lý chính không được trùng phối hợp" (lỗi "Lưu thất
  // bại" mà không rõ vì sao, vì UI không tự hiện chip đã chọn đó nữa do dsPhoiHopOptions đã lọc nó
  // ra khỏi danh sách HIỂN THỊ, nhưng KHÔNG xoá khỏi state đã chọn). Sửa: mỗi lần đổi xử lý chính,
  // chủ động loại người đó khỏi nguoiPhoiHopIds + báo toast cho người dùng biết vì sao.
  function handleChonNguoiXuLyChinh(maNVMoi: string) {
    setNguoiXuLyChinhId(maNVMoi);
    if (maNVMoi && nguoiPhoiHopIds.includes(maNVMoi)) {
      setNguoiPhoiHopIds((prev) => prev.filter((ma) => ma !== maNVMoi));
      const ten = dsNhanVien.find((nv) => nv.maNV === maNVMoi)?.hoTen ?? maNVMoi;
      show(
        "warning",
        "Đã tự động loại khỏi phối hợp",
        `${ten} vừa được chọn làm người xử lý chính nên tự động loại khỏi danh sách phối hợp.`
      );
    }
  }

  function baoLoi(truong: Exclude<TruongLoi, null>, thongDiep: string) {
    setTruongLoi(truong);
    show("error", "Chưa thể lưu", thongDiep);
    const ref = { tieuDe: refTieuDe, phongChuTri: refPhongChuTri, nguoiGiao: refNguoiGiao }[truong];
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    ref.current?.focus();
  }

  async function handleSubmit() {
    setTruongLoi(null);
    if (!tieuDe.trim()) return baoLoi("tieuDe", "Vui lòng nhập tiêu đề.");
    if (!phongChuTriId) return baoLoi("phongChuTri", "Vui lòng chọn phòng chủ trì.");
    if (!nguoiGiaoId) return baoLoi("nguoiGiao", "Vui lòng chọn người giao.");
    if (kieuHan === "dinhKy" && !ngayBatDauNhac) {
      show("error", "Chưa thể lưu", "Vui lòng chọn ngày bắt đầu nhắc.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Tự thêm "https://" nếu người dùng gõ thiếu (VD: "drive.google.com/..." thay vì
      // "https://drive.google.com/...") — tránh lưu link tương đối gây lỗi hiển thị ở trang chi
      // tiết (link bị nối vào path hiện tại thay vì mở đúng trang ngoài).
      const linkFileChuanHoa = linkFile.trim()
        ? /^https?:\/\//i.test(linkFile.trim())
          ? linkFile.trim()
          : `https://${linkFile.trim()}`
        : undefined;

      const { id } = await taoNhiemVu({
        tieuDe,
        noiDung: noiDung || undefined,
        mucDoUuTien,
        nguon: nguon || undefined,
        vanBanLienQuan: vanBanLienQuan || undefined,
        linkFile: linkFileChuanHoa,
        nguoiGiaoId,
        ngayGiao: new Date(ngayGiao),
        hanXuLy: kieuHan === "cuThe" && hanXuLy ? new Date(hanXuLy) : null,
        phongChuTriId,
        nguoiXuLyChinhId: nguoiXuLyChinhId || null,
        phongPhoiHopIds,
        nguoiPhoiHopIds,
        tanSuatNhac: kieuHan === "dinhKy" ? tanSuatNhac : null,
        ngayBatDauNhac: kieuHan === "dinhKy" && ngayBatDauNhac ? new Date(ngayBatDauNhac) : null,
        ngayKetThucNhac: kieuHan === "dinhKy" && ngayKetThucNhac ? new Date(ngayKetThucNhac) : null,
      });
      show("success", "Đã tạo nhiệm vụ", `Đã giao "${tieuDe}"`);
      batDauDieuHuong();
      router.push(`/nhiem-vu/${id}`);
    } catch (e) {
      show("error", "Lưu thất bại", e instanceof Error ? e.message : "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  }

  const vienDo = "border-error-500 focus:border-error-500 focus:ring-error-500/10";

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className={`transition-opacity duration-200 ${isSubmitting ? "pointer-events-none opacity-60" : ""}`}>
        <h1 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">Giao nhiệm vụ</h1>

        <div className="space-y-5">
          <div>
            <Label>
              Tiêu đề <span className="text-error-500">*</span>
            </Label>
            <Input
              ref={refTieuDe}
              value={tieuDe}
              onChange={(e) => {
                setTieuDe(e.target.value);
                if (truongLoi === "tieuDe") setTruongLoi(null);
              }}
              placeholder="VD: Rà soát danh mục TTHC..."
              className={truongLoi === "tieuDe" ? vienDo : undefined}
            />
          </div>

          <div>
            <Label>Nội dung</Label>
            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              rows={3}
              className="h-auto w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-[160px]">
              <Label>Mức ưu tiên</Label>
              <select
                value={mucDoUuTien}
                onChange={(e) => setMucDoUuTien(e.target.value as MucDoUuTien)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="THUONG">Thường</option>
                <option value="KHAN">Khẩn</option>
              </select>
            </div>
            <div className="min-w-[160px] flex-1">
              <Label>Nguồn</Label>
              <Input value={nguon} onChange={(e) => setNguon(e.target.value)} placeholder="VD: Chỉ đạo miệng, công văn..." />
            </div>
            <div className="min-w-[160px] flex-1">
              <Label>Văn bản liên quan</Label>
              <Input value={vanBanLienQuan} onChange={(e) => setVanBanLienQuan(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Link file (không bắt buộc)</Label>
            <Input value={linkFile} onChange={(e) => setLinkFile(e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-[220px]">
              <Label>
                Phòng chủ trì <span className="text-error-500">*</span>
              </Label>
              <select
                ref={refPhongChuTri}
                value={phongChuTriId}
                onChange={(e) => {
                  setPhongChuTriId(e.target.value);
                  if (truongLoi === "phongChuTri") setTruongLoi(null);
                }}
                disabled={isLDPhong}
                className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm shadow-theme-xs disabled:bg-gray-100 disabled:text-gray-500 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-white/5 ${
                  truongLoi === "phongChuTri" ? vienDo : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10"
                }`}
              >
                <option value="">— Chọn phòng —</option>
                {dsPhong.map((p) => (
                  <option key={p.maPhong} value={p.maPhong}>
                    {p.tenPhong}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[200px] flex-1">
              <Label>
                Người giao <span className="text-error-500">*</span>
              </Label>
              <select
                ref={refNguoiGiao}
                value={nguoiGiaoId}
                onChange={(e) => {
                  setNguoiGiaoId(e.target.value);
                  if (truongLoi === "nguoiGiao") setTruongLoi(null);
                }}
                className={`h-11 w-full rounded-lg border bg-transparent px-4 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${
                  truongLoi === "nguoiGiao" ? vienDo : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10"
                }`}
              >
                <option value="">— Chọn người giao —</option>
                {dsNguoiGiao.map((nv) => (
                  <option key={nv.maNV} value={nv.maNV}>
                    {nv.hoTen}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[160px]">
              <DatePicker
                id="tao-moi-ngay-giao"
                label="Ngày giao"
                placeholder="Chọn ngày..."
                defaultDate={ngayGiao || undefined}
                onChange={(_dates: Date[], dateStr: string) => setNgayGiao(dateStr)}
              />
            </div>

            <div className="w-[220px]">
              <Label>Người xử lý chính (không bắt buộc)</Label>
              <NguoiXuLyChinhSelect
                options={dsXuLyChinhOptions.map((nv) => ({ value: nv.maNV, text: nv.hoTen }))}
                value={nguoiXuLyChinhId}
                onChange={handleChonNguoiXuLyChinh}
              />
            </div>
          </div>

          <NguoiPhoiHopSelect
            label="Phòng phối hợp (không bắt buộc)"
            options={dsPhongPhoiHopOptions}
            selected={phongPhoiHopIds}
            onChange={setPhongPhoiHopIds}
          />

          <div>
            <NguoiPhoiHopSelect
              label="Người phối hợp (không bắt buộc)"
              options={dsPhoiHopOptions}
              selected={nguoiPhoiHopIds}
              onChange={setNguoiPhoiHopIds}
            />
            {phongPhoiHopIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Danh sách chỉ gồm nhân viên thuộc Phòng chủ trì và các Phòng phối hợp đã chọn.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.05]">
            <div className="mb-3 flex flex-wrap gap-4">
              {(
                [
                  { key: "khong", label: "Không đặt hạn" },
                  { key: "cuThe", label: "Có hạn xử lý cụ thể" },
                  { key: "dinhKy", label: "Nhắc lặp lại định kỳ" },
                ] as { key: typeof kieuHan; label: string }[]
              ).map((o) => (
                <label key={o.key} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" checked={kieuHan === o.key} onChange={() => setKieuHan(o.key)} />
                  {o.label}
                </label>
              ))}
            </div>

            {kieuHan === "cuThe" && (
              <div className="w-[200px]">
                <DatePicker
                  id="tao-moi-han-xu-ly"
                  label="Hạn xử lý"
                  placeholder="Chọn ngày..."
                  defaultDate={hanXuLy || undefined}
                  onChange={(_dates: Date[], dateStr: string) => setHanXuLy(dateStr)}
                />
              </div>
            )}

            {kieuHan === "dinhKy" && (
              <div className="flex flex-wrap gap-3">
                <div className="w-[160px]">
                  <Label>Tần suất</Label>
                  <select
                    value={tanSuatNhac}
                    onChange={(e) => setTanSuatNhac(e.target.value as TanSuatNhac)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    {TAN_SUAT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-[200px]">
                  <DatePicker
                    id="tao-moi-ngay-bat-dau-nhac"
                    label="Bắt đầu từ ngày"
                    placeholder="Chọn ngày..."
                    defaultDate={ngayBatDauNhac || undefined}
                    onChange={(_dates: Date[], dateStr: string) => setNgayBatDauNhac(dateStr)}
                  />
                </div>
                <div className="w-[200px]">
                  <DatePicker
                    id="tao-moi-ngay-ket-thuc-nhac"
                    label="Kết thúc nhắc (không bắt buộc)"
                    placeholder="Chọn ngày..."
                    defaultDate={ngayKetThucNhac || undefined}
                    onChange={(_dates: Date[], dateStr: string) => setNgayKetThucNhac(dateStr)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Giao nhiệm vụ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
