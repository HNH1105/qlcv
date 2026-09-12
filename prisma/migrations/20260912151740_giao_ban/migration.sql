-- CreateEnum
CREATE TYPE "TrangThaiCuocHopGiaoBan" AS ENUM ('DANG_MO', 'DA_CHOT');

-- CreateEnum
CREATE TYPE "MucDoUuTienGiaoBan" AS ENUM ('CAO', 'TRUNGBINH', 'THAP');

-- CreateEnum
CREATE TYPE "HanhDongGiaoBan" AS ENUM ('TAO_NOI_DUNG', 'CHUYEN_TU_NHIEM_VU', 'CHUYEN_TU_KE_HOACH_PHONG', 'CAP_NHAT_NOI_DUNG', 'SUA_PHONG_XU_LY', 'THEM_NGUOI_XU_LY', 'XOA_NGUOI_XU_LY', 'SUA_HAN_HOAN_THANH', 'SUA_MUC_DO_UU_TIEN', 'CAP_NHAT_GHI_CHU', 'HOAN_THANH', 'BO_HOAN_THANH', 'CHUYEN_TUAN_SAU', 'XAC_NHAN_CHUYEN_TUAN', 'HUY_KHONG_THEO_DOI', 'DONG_BO_HOAN_THANH');

-- CreateTable
CREATE TABLE "cuoc_hop_giao_ban" (
    "id" SERIAL NOT NULL,
    "tuan" INTEGER NOT NULL,
    "nam" INTEGER NOT NULL,
    "ngay_hop" DATE NOT NULL,
    "trang_thai" "TrangThaiCuocHopGiaoBan" NOT NULL DEFAULT 'DANG_MO',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuoc_hop_giao_ban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noi_dung_giao_ban" (
    "id" SERIAL NOT NULL,
    "cuoc_hop_giao_ban_id" INTEGER NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "nhiem_vu_id" INTEGER,
    "ke_hoach_tuan_id" INTEGER,
    "chuoi_noi_dung_id" TEXT NOT NULL,
    "nguon_noi_dung_giao_ban_id" INTEGER,
    "phong_xu_ly_id" TEXT NOT NULL,
    "han_hoan_thanh" DATE NOT NULL,
    "muc_do_uu_tien" "MucDoUuTienGiaoBan" NOT NULL,
    "da_hoan_thanh" BOOLEAN NOT NULL DEFAULT false,
    "nguoi_hoan_thanh_id" TEXT,
    "thoi_gian_hoan_thanh" TIMESTAMP(3),
    "da_ket_thuc" BOOLEAN NOT NULL DEFAULT false,
    "de_nghi_chuyen_tuan" BOOLEAN NOT NULL DEFAULT false,
    "ghi_chu" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "noi_dung_giao_ban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noi_dung_giao_ban_nguoi_xu_ly" (
    "id" SERIAL NOT NULL,
    "noi_dung_giao_ban_id" INTEGER NOT NULL,
    "nhan_vien_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noi_dung_giao_ban_nguoi_xu_ly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noi_dung_giao_ban_log" (
    "id" SERIAL NOT NULL,
    "noi_dung_giao_ban_id" INTEGER NOT NULL,
    "nguoi_thuc_hien_id" TEXT NOT NULL,
    "thoi_gian" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thao_tac" "HanhDongGiaoBan" NOT NULL,
    "truong_duoc_sua" TEXT,
    "gia_tri_cu" TEXT,
    "gia_tri_moi" TEXT,

    CONSTRAINT "noi_dung_giao_ban_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cuoc_hop_giao_ban_trang_thai_idx" ON "cuoc_hop_giao_ban"("trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "cuoc_hop_giao_ban_nam_tuan_key" ON "cuoc_hop_giao_ban"("nam", "tuan");

-- CreateIndex
CREATE UNIQUE INDEX "noi_dung_giao_ban_nguon_noi_dung_giao_ban_id_key" ON "noi_dung_giao_ban"("nguon_noi_dung_giao_ban_id");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_cuoc_hop_giao_ban_id_is_deleted_da_ket_th_idx" ON "noi_dung_giao_ban"("cuoc_hop_giao_ban_id", "is_deleted", "da_ket_thuc");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_chuoi_noi_dung_id_idx" ON "noi_dung_giao_ban"("chuoi_noi_dung_id");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_nhiem_vu_id_idx" ON "noi_dung_giao_ban"("nhiem_vu_id");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_ke_hoach_tuan_id_idx" ON "noi_dung_giao_ban"("ke_hoach_tuan_id");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_phong_xu_ly_id_idx" ON "noi_dung_giao_ban"("phong_xu_ly_id");

-- CreateIndex
CREATE UNIQUE INDEX "noi_dung_giao_ban_nhiem_vu_id_cuoc_hop_giao_ban_id_key" ON "noi_dung_giao_ban"("nhiem_vu_id", "cuoc_hop_giao_ban_id");

-- CreateIndex
CREATE UNIQUE INDEX "noi_dung_giao_ban_ke_hoach_tuan_id_cuoc_hop_giao_ban_id_key" ON "noi_dung_giao_ban"("ke_hoach_tuan_id", "cuoc_hop_giao_ban_id");

-- CreateIndex
CREATE UNIQUE INDEX "noi_dung_giao_ban_nguoi_xu_ly_noi_dung_giao_ban_id_nhan_vie_key" ON "noi_dung_giao_ban_nguoi_xu_ly"("noi_dung_giao_ban_id", "nhan_vien_id");

-- CreateIndex
CREATE INDEX "noi_dung_giao_ban_log_noi_dung_giao_ban_id_thoi_gian_idx" ON "noi_dung_giao_ban_log"("noi_dung_giao_ban_id", "thoi_gian");

-- AddForeignKey
ALTER TABLE "cuoc_hop_giao_ban" ADD CONSTRAINT "cuoc_hop_giao_ban_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_cuoc_hop_giao_ban_id_fkey" FOREIGN KEY ("cuoc_hop_giao_ban_id") REFERENCES "cuoc_hop_giao_ban"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_nhiem_vu_id_fkey" FOREIGN KEY ("nhiem_vu_id") REFERENCES "nhiem_vu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_ke_hoach_tuan_id_fkey" FOREIGN KEY ("ke_hoach_tuan_id") REFERENCES "ke_hoach_tuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_phong_xu_ly_id_fkey" FOREIGN KEY ("phong_xu_ly_id") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_nguoi_hoan_thanh_id_fkey" FOREIGN KEY ("nguoi_hoan_thanh_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban" ADD CONSTRAINT "noi_dung_giao_ban_nguon_noi_dung_giao_ban_id_fkey" FOREIGN KEY ("nguon_noi_dung_giao_ban_id") REFERENCES "noi_dung_giao_ban"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban_nguoi_xu_ly" ADD CONSTRAINT "noi_dung_giao_ban_nguoi_xu_ly_noi_dung_giao_ban_id_fkey" FOREIGN KEY ("noi_dung_giao_ban_id") REFERENCES "noi_dung_giao_ban"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban_nguoi_xu_ly" ADD CONSTRAINT "noi_dung_giao_ban_nguoi_xu_ly_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban_log" ADD CONSTRAINT "noi_dung_giao_ban_log_noi_dung_giao_ban_id_fkey" FOREIGN KEY ("noi_dung_giao_ban_id") REFERENCES "noi_dung_giao_ban"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noi_dung_giao_ban_log" ADD CONSTRAINT "noi_dung_giao_ban_log_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;
