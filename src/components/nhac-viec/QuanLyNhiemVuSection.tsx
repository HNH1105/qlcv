// ĐÍCH: src/components/nhac-viec/QuanLyNhiemVuSection.tsx
"use client";
import { useEffect, useState } from "react";
import ChiSoLink from "./ChiSoLink";
import { getTongQuanQuanLyNhiemVu, type TongQuanXuLyChinh } from "@/lib/nhac-viec/nhiem-vu";

export default function QuanLyNhiemVuSection({ phamvi }: { phamvi: "phong" | "coquan" }) {
  const [tk, setTk] = useState<TongQuanXuLyChinh | null>(null);

  useEffect(() => {
    getTongQuanQuanLyNhiemVu(phamvi).then(setTk);
  }, [phamvi]);

  function href(tt: string) {
    return `/nhac-viec/chi-tiet?nguon=nhiemvu&phamvi=${phamvi}&tinhtrang=${tt}`;
  }

  return (
    <section>
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
        {phamvi === "phong" ? "Quản lý nhiệm vụ phòng" : "Quản lý nhiệm vụ toàn cơ quan"}
      </p>
      {!tk ? <div className="py-4 text-center text-sm text-gray-400">Đang tải...</div> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <ChiSoLink label="Tổng" value={tk.tong} href={href("tong")} />
          <ChiSoLink label="Chờ phân công" value={tk.chophancong} href={href("chophancong")} />
          <ChiSoLink label="Chờ duyệt" value={tk.choduyet} href={href("choduyet")} />
          <ChiSoLink label="Đang xử lý" value={tk.dangxuly} href={href("dangxuly")} />
          <ChiSoLink label="Sắp đến hạn" value={tk.sapdenhan} href={href("sapdenhan")} />
          <ChiSoLink label="Quá hạn" value={tk.quahan} href={href("quahan")} nhan="error" />
          <ChiSoLink label="Tạm dừng" value={tk.tamdung} href={href("tamdung")} />
          <ChiSoLink label="Đã huỷ" value={tk.dahuy} href={href("dahuy")} />
          <ChiSoLink label="Hoàn thành" value={tk.hoanthanh} href={href("hoanthanh")} nhan="success" />
          <ChiSoLink label="Đúng hạn" value={tk.hoanthanhDungHan} href={href("hoanthanh-dunghan")} nhan="success" />
          <ChiSoLink label="Quá hạn (đã xong)" value={tk.hoanthanhQuaHan} href={href("hoanthanh-quahan")} />
        </div>
      )}
    </section>
  );
}
