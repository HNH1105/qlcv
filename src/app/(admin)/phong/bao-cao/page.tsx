import { LoaiGhiNhan } from "@prisma/client";
import KeHoachBaoCaoPhongBoard from "@/components/phong/KeHoachBaoCaoPhongBoard";

export default function Page() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Báo cáo Phòng
      </h1>
      <KeHoachBaoCaoPhongBoard loai={LoaiGhiNhan.BAOCAO} />
    </div>
  );
}
