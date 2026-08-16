/*
  Warnings:

  - You are about to drop the column `capDo` on the `ke_hoach_tuan` table. All the data in the column will be lost.
  - You are about to drop the column `nguon_id` on the `ke_hoach_tuan` table. All the data in the column will be lost.
  - Made the column `ma_nv` on table `ke_hoach_tuan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ke_hoach_tuan" DROP CONSTRAINT "ke_hoach_tuan_ma_nv_fkey";

-- DropForeignKey
ALTER TABLE "ke_hoach_tuan" DROP CONSTRAINT "ke_hoach_tuan_nguon_id_fkey";

-- DropIndex
DROP INDEX "ke_hoach_tuan_ma_nv_nam_tuan_idx";

-- DropIndex
DROP INDEX "ke_hoach_tuan_ma_phong_nam_tuan_idx";

-- DropIndex
DROP INDEX "ke_hoach_tuan_nam_tuan_loai_capDo_idx";

-- AlterTable
ALTER TABLE "ke_hoach_tuan" DROP COLUMN "capDo",
DROP COLUMN "nguon_id",
ADD COLUMN     "han_xu_ly" DATE,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "la_cua_ca_nhan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "la_cua_phong" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nguoi_danh_dau_phong_id" TEXT,
ADD COLUMN     "nguoi_loai_khoi_phong_id" TEXT,
ADD COLUMN     "nguoi_xoa_id" TEXT,
ADD COLUMN     "thoi_gian_danh_dau_phong" TIMESTAMP(3),
ADD COLUMN     "thoi_gian_loai_khoi_phong" TIMESTAMP(3),
ADD COLUMN     "tien_do" INTEGER,
ADD COLUMN     "xoa_luc" TIMESTAMP(3),
ALTER COLUMN "ma_nv" SET NOT NULL;

-- AlterTable
ALTER TABLE "nhiem_vu" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nguoi_xoa_id" TEXT,
ADD COLUMN     "xoa_luc" TIMESTAMP(3);

-- DropEnum
DROP TYPE "CapDoKeHoach";

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_nam_tuan_loai_idx" ON "ke_hoach_tuan"("nam", "tuan", "loai");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_ma_phong_nam_tuan_la_cua_phong_idx" ON "ke_hoach_tuan"("ma_phong", "nam", "tuan", "la_cua_phong");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_ma_nv_nam_tuan_la_cua_ca_nhan_idx" ON "ke_hoach_tuan"("ma_nv", "nam", "tuan", "la_cua_ca_nhan");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_is_deleted_idx" ON "ke_hoach_tuan"("is_deleted");

-- CreateIndex
CREATE INDEX "nhiem_vu_is_deleted_idx" ON "nhiem_vu"("is_deleted");

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_ma_nv_fkey" FOREIGN KEY ("ma_nv") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_nguoi_danh_dau_phong_id_fkey" FOREIGN KEY ("nguoi_danh_dau_phong_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_nguoi_loai_khoi_phong_id_fkey" FOREIGN KEY ("nguoi_loai_khoi_phong_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_nguoi_xoa_id_fkey" FOREIGN KEY ("nguoi_xoa_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_xoa_id_fkey" FOREIGN KEY ("nguoi_xoa_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

--add
ALTER TABLE "ke_hoach_tuan"
  ADD CONSTRAINT "ke_hoach_tuan_la_cua_check"
  CHECK ("la_cua_ca_nhan" OR "la_cua_phong");