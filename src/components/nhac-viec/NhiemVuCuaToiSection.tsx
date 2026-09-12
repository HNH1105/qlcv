// ĐÍCH: src/components/nhac-viec/NhiemVuCuaToiSection.tsx
"use client";
import { useEffect, useState } from "react";
import ChiSoLink from "./ChiSoLink";
import { getTongQuanNhiemVuXuLyChinh, getTongQuanNhiemVuPhoiHop, type TongQuanXuLyChinh, type TongQuanPhoiHop } from "@/lib/nhac-viec/nhiem-vu";

function hrefXuLyChinh(tt: string) {
  return `/nhac-viec/chi-tiet?nguon=nhiemvu&phamvi=canhan&vaitro=xulychinh&tinhtrang=${tt}`;
}
function hrefPhoiHop(tt: string) {
  return `/nhac-viec/chi-tiet?nguon=nhiemvu&phamvi=canhan&vaitro=phoihop&tinhtrang=${tt}`;
}

export default function NhiemVuCuaToiSection() {
  const [xlc, setXlc] = useState<TongQuanXuLyChinh | null>(null);
  const [ph, setPh] = useState<TongQuanPhoiHop | null>(null);

  useEffect(() => {
    getTongQuanNhiemVuXuLyChinh().then(setXlc);
    getTongQuanNhiemVuPhoiHop().then(setPh);
  }, []);

  return (
    <section className="space-y-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nhiệm vụ của tôi</p>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-400">Xử lý chính</p>
        {!xlc ? <div className="py-4 text-center text-sm text-gray-400">Đang tải...</div> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <ChiSoLink label="Tổng" value={xlc.tong} href={hrefXuLyChinh("tong")} />
            <ChiSoLink label="Chờ phân công" value={xlc.chophancong} href={hrefXuLyChinh("chophancong")} />
            <ChiSoLink label="Chờ duyệt" value={xlc.choduyet} href={hrefXuLyChinh("choduyet")} />
            <ChiSoLink label="Đang xử lý" value={xlc.dangxuly} href={hrefXuLyChinh("dangxuly")} />
            <ChiSoLink label="Sắp đến hạn" value={xlc.sapdenhan} href={hrefXuLyChinh("sapdenhan")} />
            <ChiSoLink label="Quá hạn" value={xlc.quahan} href={hrefXuLyChinh("quahan")} nhan="error" />
            <ChiSoLink label="Tạm dừng" value={xlc.tamdung} href={hrefXuLyChinh("tamdung")} />
            <ChiSoLink label="Đã huỷ" value={xlc.dahuy} href={hrefXuLyChinh("dahuy")} />
            <ChiSoLink label="Hoàn thành" value={xlc.hoanthanh} href={hrefXuLyChinh("hoanthanh")} nhan="success" />
            <ChiSoLink label="Đúng hạn" value={xlc.hoanthanhDungHan} href={hrefXuLyChinh("hoanthanh-dunghan")} nhan="success" />
            <ChiSoLink label="Quá hạn (đã xong)" value={xlc.hoanthanhQuaHan} href={hrefXuLyChinh("hoanthanh-quahan")} />
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-400">Phối hợp</p>
        {!ph ? <div className="py-4 text-center text-sm text-gray-400">Đang tải...</div> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <ChiSoLink label="Tổng" value={ph.tong} href={hrefPhoiHop("tong")} />
            <ChiSoLink label="Chưa xử lý" value={ph.chuaxuly} href={hrefPhoiHop("chuaxuly")} />
            <ChiSoLink label="Sắp đến hạn" value={ph.sapdenhan} href={hrefPhoiHop("sapdenhan")} />
            <ChiSoLink label="Quá hạn" value={ph.quahan} href={hrefPhoiHop("quahan")} nhan="error" />
            <ChiSoLink label="Hoàn thành" value={ph.hoanthanh} href={hrefPhoiHop("hoanthanh")} nhan="success" />
          </div>
        )}
      </div>
    </section>
  );
}
