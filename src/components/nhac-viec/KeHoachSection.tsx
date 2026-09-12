// ĐÍCH: src/components/nhac-viec/KeHoachSection.tsx
"use client";
import { useEffect, useState } from "react";
import ChiSoLink from "./ChiSoLink";
import type { TongQuanKeHoach } from "@/lib/nhac-viec/ke-hoach";

export default function KeHoachSection({
  tieuDe, phamvi, taiDuLieu,
}: {
  tieuDe: string;
  phamvi: "canhan" | "phong";
  taiDuLieu: () => Promise<TongQuanKeHoach>;
}) {
  const [tk, setTk] = useState<TongQuanKeHoach | null>(null);

  useEffect(() => {
    taiDuLieu().then(setTk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function href(tt: string) {
    return `/nhac-viec/chi-tiet?nguon=kehoach-${phamvi === "canhan" ? "canhan" : "phong"}&phamvi=${phamvi}&tinhtrang=${tt}`;
  }

  return (
    <section>
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{tieuDe}</p>
      {!tk ? <div className="py-4 text-center text-sm text-gray-400">Đang tải...</div> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <ChiSoLink label="Tổng số" value={tk.tong} href={href("tong")} />
          <ChiSoLink label="Chưa xử lý" value={tk.chuaxuly} href={href("chuaxuly")} />
          <ChiSoLink label="Chưa xử lý quá hạn" value={tk.chuaxulyquahan} href={href("chuaxulyquahan")} nhan="error" />
          <ChiSoLink label="Hoàn thành" value={tk.hoanthanh} href={href("hoanthanh")} nhan="success" />
          <ChiSoLink label="Đúng hạn" value={tk.hoanthanhDungHan} href={href("hoanthanh-dunghan")} nhan="success" />
          <ChiSoLink label="Quá hạn (đã xong)" value={tk.hoanthanhQuaHan} href={href("hoanthanh-quahan")} />
        </div>
      )}
    </section>
  );
}
