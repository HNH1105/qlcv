// ĐÍCH: src/components/nhac-viec/TrangNhacViec.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import NhiemVuCuaToiSection from "./NhiemVuCuaToiSection";
import QuanLyNhiemVuSection from "./QuanLyNhiemVuSection";
import KeHoachSection from "./KeHoachSection";
import { getTongQuanKeHoachCaNhan, getTongQuanKeHoachPhong } from "@/lib/nhac-viec/ke-hoach";

// Quy tắc hiển thị theo vai trò (mục 5 đặc tả):
// USER: Nhiệm vụ của tôi + Kế hoạch cá nhân + Kế hoạch phòng
// LANHDAOPHONG: + Quản lý nhiệm vụ phòng
// LANHDAODONVI: + Quản lý nhiệm vụ toàn cơ quan
export default function TrangNhacViec() {
  const user = useAuth();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nhắc việc</h1>

      <NhiemVuCuaToiSection />

      {user?.quyen === "LANHDAOPHONG" && <QuanLyNhiemVuSection phamvi="phong" />}
      {user?.quyen === "LANHDAODONVI" && <QuanLyNhiemVuSection phamvi="coquan" />}

      <KeHoachSection tieuDe="Kế hoạch cá nhân" phamvi="canhan" taiDuLieu={getTongQuanKeHoachCaNhan} />
      <KeHoachSection tieuDe="Kế hoạch phòng" phamvi="phong" taiDuLieu={getTongQuanKeHoachPhong} />
    </div>
  );
}
