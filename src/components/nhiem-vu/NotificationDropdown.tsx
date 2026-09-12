// ĐÍCH: src/components/header/NotificationDropdown.tsx (GHI ĐÈ file cũ — giữ nguyên tên component
// "NotificationDropdown" và toàn bộ style/khung dropdown, CHỈ thay phần dữ liệu giả bằng dữ liệu
// thật lấy từ bảng ThongBao qua src/lib/actions/thong-bao.ts)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useNavProgress } from "@/components/providers/NavProgressProvider";
import {
  getThongBaoCuaToi,
  getSoThongBaoChuaDoc,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
  type ThongBaoRow,
} from "@/lib/actions/thong-bao";
import { formatDateTimeVN } from "@/lib/week";

const KHOANG_LAM_MOI_MS = 30000; // poll đơn giản mỗi 30s — đủ dùng cho bản đầu, thay bằng
// WebSocket/SSE sau nếu cần thật sự real-time, không phải đổi gì ở phần dữ liệu.

export default function NotificationDropdown() {
  const batDauDieuHuong = useNavProgress();
  const [isOpen, setIsOpen] = useState(false);
  const [dsThongBao, setDsThongBao] = useState<ThongBaoRow[]>([]);
  const [soChuaDoc, setSoChuaDoc] = useState(0);

  // Chấm cam nhấp nháy — TRƯỚC ĐÂY là 1 boolean giả (setNotifying(false) ngay khi bấm 1 lần, không
  // phản ánh dữ liệu thật). GIỜ = có thật số thông báo chưa đọc hay không, tự cập nhật mỗi 30s.
  const notifying = soChuaDoc > 0;

  useEffect(() => {
    function lamMoiSoDem() {
      // Bỏ qua khi tab đang ở NỀN (người dùng đang xem tab khác/thu nhỏ trình duyệt) — không có ai
      // nhìn thấy số đếm lúc đó nên gọi API cũng vô ích, chỉ tốn thêm request. Dùng Page Visibility
      // API có sẵn của trình duyệt, không cần thư viện gì thêm.
      if (document.visibilityState !== "visible") return;
      getSoThongBaoChuaDoc().then(setSoChuaDoc);
    }
    lamMoiSoDem();
    const timer = setInterval(lamMoiSoDem, KHOANG_LAM_MOI_MS);
    // Gọi lại NGAY khi người dùng quay lại tab (thay vì phải đợi tới chu kỳ 30s tiếp theo) — trải
    // nghiệm mượt hơn: mở lại tab là thấy số mới nhất liền, không phải chờ.
    document.addEventListener("visibilitychange", lamMoiSoDem);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", lamMoiSoDem);
    };
  }, []);

  function toggleDropdown() {
    const moi = !isOpen;
    setIsOpen(moi);
    // Side-effect (gọi Server Action) PHẢI nằm NGOÀI hàm updater của setState — updater phải thuần
    // tuý, không side-effect, vì React có thể gọi lại nó nhiều lần (đặc biệt ở Strict Mode). Lỗi
    // gốc trước đó: gọi getThongBaoCuaToi() bên trong setIsOpen((v) => {...}) khiến Next.js router
    // (Server Action dùng cơ chế router nội bộ để revalidate) bị cập nhật ngay trong lúc React
    // đang render/reconcile — đây chính là nguyên nhân lỗi "Cannot update Router while rendering".
    if (moi) getThongBaoCuaToi().then(setDsThongBao);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleClickThongBao(tb: ThongBaoRow) {
    if (!tb.daDoc) {
      await danhDauDaDoc(tb.id);
      setSoChuaDoc((n) => Math.max(0, n - 1));
      setDsThongBao((prev) => prev.map((x) => (x.id === tb.id ? { ...x, daDoc: true } : x)));
    }
    closeDropdown();
    if (tb.duongDan) batDauDieuHuong();
  }

  async function handleDanhDauTatCa() {
    await danhDauTatCaDaDoc();
    setSoChuaDoc(0);
    setDsThongBao((prev) => prev.map((x) => ({ ...x, daDoc: true })));
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Thông báo</h5>
          <div className="flex items-center gap-3">
            {soChuaDoc > 0 && (
              <button
                onClick={handleDanhDauTatCa}
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Danh sách THẬT — thay hoàn toàn phần dữ liệu giả cũ ("Terry Franci requests permission...")
            và dòng "Chức năng đang xây dựng". Giữ đúng khung li/hover/border của bản gốc. */}
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {dsThongBao.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Chưa có thông báo nào.
            </li>
          ) : (
            dsThongBao.map((tb) => (
              <li key={tb.id}>
                <Link
                  href={tb.duongDan ?? "#"}
                  onClick={() => handleClickThongBao(tb)}
                  className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                    !tb.daDoc ? "bg-brand-50/50 dark:bg-brand-500/5" : ""
                  }`}
                >
                  {/* Chấm tròn thay avatar — xanh = chưa đọc, xám = đã đọc (giữ tinh thần chấm
                      trạng thái của bản gốc, chỉ đổi ý nghĩa từ "online" sang "chưa đọc"). */}
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      tb.daDoc ? "bg-gray-300 dark:bg-gray-600" : "bg-brand-500"
                    }`}
                  />
                  <span className="block min-w-0 flex-1">
                    <span className="mb-1 block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {tb.tieuDe}
                    </span>
                    {tb.noiDung && (
                      <span className="mb-1 line-clamp-2 block text-theme-xs text-gray-500 dark:text-gray-400">
                        {tb.noiDung}
                      </span>
                    )}
                    <span className="block text-theme-xs text-gray-400">{formatDateTimeVN(tb.taoLuc)}</span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        {/* Nay đã có trang /thong-bao thật (ThongBaoTatCaBoard) — thêm lại nút này, khác bản demo
            cũ trỏ href="/" vô nghĩa. */}
        <Link
          href="/thong-bao"
          onClick={() => {
            closeDropdown();
            batDauDieuHuong();
          }}
          className="mt-auto block px-4 py-2 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Xem tất cả thông báo
        </Link>
      </Dropdown>
    </div>
  );
}
