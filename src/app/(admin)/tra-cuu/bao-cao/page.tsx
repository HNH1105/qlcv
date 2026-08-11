import { LoaiGhiNhan } from "@prisma/client";
import TraCuuBoard from "@/components/tra-cuu/TraCuuBoard";

export default function Page() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Tra cứu Báo cáo
      </h1>
      <TraCuuBoard loai={LoaiGhiNhan.BAOCAO} />
    </div>
  );
}
