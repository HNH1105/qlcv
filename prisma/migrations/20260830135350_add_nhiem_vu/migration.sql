/*
  Warnings:

  - A unique constraint covering the columns `[nguon_ke_hoach_tuan_id]` on the table `nhiem_vu` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TanSuatNhac" AS ENUM ('HANG_TUAN', 'HANG_THANG', 'HANG_QUY', 'HANG_NAM');

-- CreateEnum
CREATE TYPE "LoaiThongBao" AS ENUM ('NHIEM_VU_DUOC_GIAO', 'NHIEM_VU_PHAN_CONG', 'NHIEM_VU_CHO_DUYET', 'NHIEM_VU_DA_DUYET', 'NHIEM_VU_YEU_CAU_LAM_LAI', 'NHIEM_VU_SAP_DEN_HAN', 'NHIEM_VU_QUA_HAN', 'NHIEM_VU_DINH_KY_NHAC');

-- CreateEnum
CREATE TYPE "LoaiDoiTuongNhac" AS ENUM ('NHIEM_VU_HAN', 'NHIEM_VU_DINHKY', 'KE_HOACH_HAN');

-- CreateEnum
CREATE TYPE "KenhNhac" AS ENUM ('EMAIL', 'APP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HanhDongNhiemVu" ADD VALUE 'TAMDUNG';
ALTER TYPE "HanhDongNhiemVu" ADD VALUE 'THAY_DOI_PHONG_CHU_TRI';
ALTER TYPE "HanhDongNhiemVu" ADD VALUE 'THAY_DOI_NOI_DUNG';
ALTER TYPE "HanhDongNhiemVu" ADD VALUE 'THAY_DOI_UU_TIEN';
ALTER TYPE "HanhDongNhiemVu" ADD VALUE 'HOAN_THANH_DOT_DINH_KY';

-- AlterTable
ALTER TABLE "nhiem_vu" ADD COLUMN     "dung_nhac_lai" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ngay_bat_dau_nhac" DATE,
ADD COLUMN     "ngay_ket_thuc_nhac" DATE,
ADD COLUMN     "ngay_nhac_tiep_theo" DATE,
ADD COLUMN     "nguon_ke_hoach_tuan_id" INTEGER,
ADD COLUMN     "so_dot_da_xong" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tan_suat_nhac" "TanSuatNhac";

-- AlterTable
ALTER TABLE "nhiem_vu_nguoi_phoi_hop" ADD COLUMN     "ten_phong_luc_do" TEXT;

-- CreateTable
CREATE TABLE "nhiem_vu_sub_task" (
    "id" SERIAL NOT NULL,
    "nhiem_vu_id" INTEGER NOT NULL,
    "noiDung" TEXT NOT NULL,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "da_hoan_thanh" BOOLEAN NOT NULL DEFAULT false,
    "nguoi_hoan_thanh_id" TEXT,
    "thoi_gian_hoan_thanh" TIMESTAMP(3),
    "nguoi_tao_id" TEXT NOT NULL,
    "tao_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "cap_nhat_luc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nhiem_vu_sub_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thong_bao" (
    "id" SERIAL NOT NULL,
    "nguoi_nhan_id" TEXT NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "noiDung" TEXT,
    "loai" "LoaiThongBao" NOT NULL,
    "duong_dan" TEXT,
    "da_doc" BOOLEAN NOT NULL DEFAULT false,
    "tao_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhac_viec_da_gui" (
    "id" SERIAL NOT NULL,
    "loai_doi_tuong" "LoaiDoiTuongNhac" NOT NULL,
    "doi_tuong_id" INTEGER NOT NULL,
    "ngay_moc" DATE NOT NULL,
    "kenh" "KenhNhac" NOT NULL,
    "nguoi_nhan_id" TEXT NOT NULL,
    "gui_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhac_viec_da_gui_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nhiem_vu_sub_task_nhiem_vu_id_thu_tu_idx" ON "nhiem_vu_sub_task"("nhiem_vu_id", "thu_tu");

-- CreateIndex
CREATE INDEX "thong_bao_nguoi_nhan_id_da_doc_idx" ON "thong_bao"("nguoi_nhan_id", "da_doc");

-- CreateIndex
CREATE INDEX "thong_bao_nguoi_nhan_id_tao_luc_idx" ON "thong_bao"("nguoi_nhan_id", "tao_luc");

-- CreateIndex
CREATE INDEX "nhac_viec_da_gui_loai_doi_tuong_doi_tuong_id_idx" ON "nhac_viec_da_gui"("loai_doi_tuong", "doi_tuong_id");

-- CreateIndex
CREATE UNIQUE INDEX "nhac_viec_da_gui_loai_doi_tuong_doi_tuong_id_ngay_moc_kenh__key" ON "nhac_viec_da_gui"("loai_doi_tuong", "doi_tuong_id", "ngay_moc", "kenh", "nguoi_nhan_id");

-- CreateIndex
CREATE UNIQUE INDEX "nhiem_vu_nguon_ke_hoach_tuan_id_key" ON "nhiem_vu"("nguon_ke_hoach_tuan_id");

-- CreateIndex
CREATE INDEX "nhiem_vu_is_deleted_trang_thai_han_xu_ly_idx" ON "nhiem_vu"("is_deleted", "trang_thai", "han_xu_ly");

-- CreateIndex
CREATE INDEX "nhiem_vu_tan_suat_nhac_dung_nhac_lai_ngay_nhac_tiep_theo_idx" ON "nhiem_vu"("tan_suat_nhac", "dung_nhac_lai", "ngay_nhac_tiep_theo");

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguon_ke_hoach_tuan_id_fkey" FOREIGN KEY ("nguon_ke_hoach_tuan_id") REFERENCES "ke_hoach_tuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_sub_task" ADD CONSTRAINT "nhiem_vu_sub_task_nhiem_vu_id_fkey" FOREIGN KEY ("nhiem_vu_id") REFERENCES "nhiem_vu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_sub_task" ADD CONSTRAINT "nhiem_vu_sub_task_nguoi_hoan_thanh_id_fkey" FOREIGN KEY ("nguoi_hoan_thanh_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_sub_task" ADD CONSTRAINT "nhiem_vu_sub_task_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_bao" ADD CONSTRAINT "thong_bao_nguoi_nhan_id_fkey" FOREIGN KEY ("nguoi_nhan_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhac_viec_da_gui" ADD CONSTRAINT "nhac_viec_da_gui_nguoi_nhan_id_fkey" FOREIGN KEY ("nguoi_nhan_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey

ALTER TABLE nhiem_vu
  ADD CONSTRAINT chk_nv_tien_do
  CHECK (tien_do_phan_tram BETWEEN 0 AND 100);
 -- AddForeignKey

ALTER TABLE ke_hoach_tuan
  ADD CONSTRAINT chk_kh_tien_do
  CHECK (tien_do IS NULL OR (tien_do BETWEEN 0 AND 100));
 