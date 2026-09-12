-- AlterTable
ALTER TABLE "nhiem_vu_nguoi_phoi_hop" ADD COLUMN     "da_hoan_thanh_phan_viec" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thoi_gian_hoan_thanh_phan_viec" TIMESTAMP(3);
