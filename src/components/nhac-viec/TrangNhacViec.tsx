// ĐÍCH: src/components/nhac-viec/TrangNhacViec.tsx
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import NhiemVuCuaToiSection from "./NhiemVuCuaToiSection";
import QuanLyNhiemVuSection from "./QuanLyNhiemVuSection";
import KeHoachSection from "./KeHoachSection";
import { getTongQuanNhacViec, type TongQuanNhacViec } from "@/lib/nhac-viec/tong-quan";

// Quy tắc hiển thị theo vai trò (mục 5 đặc tả):
// USER: Nhiệm vụ của tôi + Kế hoạch cá nhân + Kế hoạch phòng
// LANHDAOPHONG: + Quản lý nhiệm vụ phòng
// LANHDAODONVI: + Quản lý nhiệm vụ toàn cơ quan
//
// [TỐI ƯU] Toàn bộ số liệu tải trong 1 LẦN GỌI server duy nhất (getTongQuanNhacViec) rồi chia
// xuống từng khối — trước đây mỗi khối tự gọi server riêng, 5-6 lượt chạy nối đuôi nhau.
export default function TrangNhacViec() {
  const user = useAuth();
  const [tq, setTq] = useState<TongQuanNhacViec | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let conHieuLuc = true;
    getTongQuanNhacViec()
      .then((data) => {
        if (conHieuLuc) setTq(data);
      })
      .catch((e) => {
        if (conHieuLuc) setLoi(e instanceof Error ? e.message : "Không tải được số liệu nhắc việc");
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  const phamviQuanLy =
    user?.quyen === "LANHDAOPHONG" ? "phong" : user?.quyen === "LANHDAODONVI" ? "coquan" : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nhắc việc</h1>
        {tq && (
          <p className="mt-1 text-xs text-gray-400">
            Nhiệm vụ: việc còn dở tính tất cả; hoàn thành / đã huỷ tính trong năm {tq.namNhiemVu}. Kế
            hoạch: tính trong năm {tq.namKeHoach}.
          </p>
        )}
      </div>

      {loi && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {loi}
        </div>
      )}

      <NhiemVuCuaToiSection xlc={tq?.xuLyChinh ?? null} ph={tq?.phoiHop ?? null} />

      {phamviQuanLy && (
        <QuanLyNhiemVuSection
          phamvi={phamviQuanLy}
          tk={tq ? (tq.quanLy?.phamvi === phamviQuanLy ? tq.quanLy.tk : null) : null}
        />
      )}

      <KeHoachSection
        tieuDe={tq ? `Kế hoạch cá nhân (năm ${tq.namKeHoach})` : "Kế hoạch cá nhân"}
        phamvi="canhan"
        tk={tq?.keHoachCaNhan ?? null}
      />
      <KeHoachSection
        tieuDe={tq ? `Kế hoạch phòng (năm ${tq.namKeHoach})` : "Kế hoạch phòng"}
        phamvi="phong"
        tk={tq?.keHoachPhong ?? null}
      />
    </div>
  );
}
