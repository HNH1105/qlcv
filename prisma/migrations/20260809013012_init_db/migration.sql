-- CreateEnum
CREATE TYPE "Quyen" AS ENUM ('USER', 'LANHDAOPHONG', 'LANHDAODONVI');

-- CreateEnum
CREATE TYPE "GioiTinh" AS ENUM ('NAM', 'NU', 'KHAC');

-- CreateEnum
CREATE TYPE "LoaiGhiNhan" AS ENUM ('KEHOACH', 'BAOCAO');

-- CreateEnum
CREATE TYPE "CapDoKeHoach" AS ENUM ('CANHAN', 'PHONG');

-- CreateEnum
CREATE TYPE "MucDoUuTien" AS ENUM ('THUONG', 'KHAN', 'HOATOC');

-- CreateEnum
CREATE TYPE "TrangThaiNhiemVu" AS ENUM ('CHO_PHAN_CONG', 'DANGXULY', 'CHO_DUYET', 'HOANTHANH', 'TAMDUNG', 'HUY');

-- CreateEnum
CREATE TYPE "HanhDongNhiemVu" AS ENUM ('TAO_MOI', 'PHAN_CONG', 'CHUYEN_TIEP', 'CAP_NHAT_TIENDO', 'DONG_GOP_PHOIHOP', 'BAO_CAO_HOANTHANH', 'YEU_CAU_XULY_LAI', 'DUYET_HOANTHANH', 'MO_LAI', 'HUY', 'THAY_DOI_HAN', 'THAY_DOI_NGUOIXULY');

-- CreateTable
CREATE TABLE "phong" (
    "ma_phong" TEXT NOT NULL,
    "ten_phong" TEXT NOT NULL,
    "thu_tu" INTEGER NOT NULL DEFAULT 999,
    "hoat_dong" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "phong_pkey" PRIMARY KEY ("ma_phong")
);

-- CreateTable
CREATE TABLE "nhan_vien" (
    "ma_nv" TEXT NOT NULL,
    "ho_ten" TEXT NOT NULL,
    "ma_phong" TEXT NOT NULL,
    "thu_tu" INTEGER NOT NULL DEFAULT 999,
    "chuc_vu" TEXT,
    "hoat_dong" BOOLEAN NOT NULL DEFAULT true,
    "quyen" "Quyen" NOT NULL DEFAULT 'USER',
    "ngay_sinh" DATE,
    "gioi_tinh" "GioiTinh",
    "dia_chi" TEXT,
    "so_dien_thoai" TEXT,
    "email" TEXT,
    "anh_dai_dien" TEXT,
    "tao_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cap_nhat_luc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("ma_nv")
);

-- CreateTable
CREATE TABLE "tai_khoan" (
    "id" SERIAL NOT NULL,
    "ma_nv" TEXT NOT NULL,
    "ten_dang_nhap" TEXT NOT NULL,
    "mat_khau_hash" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "lan_dang_nhap_cuoi" TIMESTAMP(3),
    "tao_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bi_khoa" BOOLEAN NOT NULL DEFAULT false,
    "so_lan_dang_nhap_sai_lien_tiep" INTEGER NOT NULL DEFAULT 0,
    "khoa_luc" TIMESTAMP(3),
    "ly_do_khoa" TEXT,

    CONSTRAINT "tai_khoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ke_hoach_tuan" (
    "id" SERIAL NOT NULL,
    "nam" INTEGER NOT NULL,
    "tuan" INTEGER NOT NULL,
    "loai" "LoaiGhiNhan" NOT NULL,
    "capDo" "CapDoKeHoach" NOT NULL,
    "ma_phong" TEXT NOT NULL,
    "ma_nv" TEXT,
    "noi_dung" TEXT NOT NULL,
    "ket_qua" TEXT,
    "da_hoan_thanh" BOOLEAN NOT NULL DEFAULT false,
    "ghi_chu" TEXT,
    "ghi_chu_phoi_hop" TEXT,
    "nguon_id" INTEGER,
    "nguoi_cap_nhat_id" TEXT,
    "ngay_cap_nhat" TIMESTAMP(3) NOT NULL,
    "tao_luc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ke_hoach_tuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ke_hoach_tuan_phoi_hop" (
    "id" SERIAL NOT NULL,
    "ke_hoach_tuan_id" INTEGER NOT NULL,
    "ma_nv" TEXT NOT NULL,

    CONSTRAINT "ke_hoach_tuan_phoi_hop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhiem_vu" (
    "id" SERIAL NOT NULL,
    "tieu_de" TEXT NOT NULL,
    "noi_dung" TEXT,
    "muc_do_uu_tien" "MucDoUuTien" NOT NULL DEFAULT 'THUONG',
    "nguon" TEXT,
    "van_ban_lien_quan" TEXT,
    "link_file" TEXT,
    "nguoi_tao_id" TEXT NOT NULL,
    "nguoi_giao_id" TEXT NOT NULL,
    "ngay_giao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "han_xu_ly" DATE,
    "phong_chu_tri_id" TEXT NOT NULL,
    "nguoi_xu_ly_chinh_id" TEXT,
    "trang_thai" "TrangThaiNhiemVu" NOT NULL DEFAULT 'CHO_PHAN_CONG',
    "tien_do_phan_tram" INTEGER NOT NULL DEFAULT 0,
    "ket_qua" TEXT,
    "nguoi_bao_cao_hoan_thanh_id" TEXT,
    "nguoi_duyet_id" TEXT,
    "thoi_gian_hoan_thanh" TIMESTAMP(3),
    "ngay_cap_nhat" TIMESTAMP(3) NOT NULL,
    "nguoi_cap_nhat_id" TEXT,

    CONSTRAINT "nhiem_vu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhiem_vu_phong" (
    "id" SERIAL NOT NULL,
    "nhiem_vu_id" INTEGER NOT NULL,
    "ma_phong" TEXT NOT NULL,

    CONSTRAINT "nhiem_vu_phong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhiem_vu_nguoi_phoi_hop" (
    "id" SERIAL NOT NULL,
    "nhiem_vu_id" INTEGER NOT NULL,
    "ma_nv" TEXT NOT NULL,
    "ma_phong" TEXT,
    "ngay_them" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ghi_chu" TEXT,

    CONSTRAINT "nhiem_vu_nguoi_phoi_hop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhiem_vu_log" (
    "id" SERIAL NOT NULL,
    "nhiem_vu_id" INTEGER NOT NULL,
    "thoi_gian" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hanh_dong" "HanhDongNhiemVu" NOT NULL,
    "nguoi_thuc_hien_id" TEXT NOT NULL,
    "tu_gia_tri" TEXT,
    "den_gia_tri" TEXT,
    "ghi_chu" TEXT,

    CONSTRAINT "nhiem_vu_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nhan_vien_email_key" ON "nhan_vien"("email");

-- CreateIndex
CREATE INDEX "nhan_vien_ma_phong_thu_tu_idx" ON "nhan_vien"("ma_phong", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_ma_nv_key" ON "tai_khoan"("ma_nv");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_ten_dang_nhap_key" ON "tai_khoan"("ten_dang_nhap");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_nam_tuan_loai_capDo_idx" ON "ke_hoach_tuan"("nam", "tuan", "loai", "capDo");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_ma_phong_nam_tuan_idx" ON "ke_hoach_tuan"("ma_phong", "nam", "tuan");

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_ma_nv_nam_tuan_idx" ON "ke_hoach_tuan"("ma_nv", "nam", "tuan");

-- CreateIndex
CREATE UNIQUE INDEX "ke_hoach_tuan_phoi_hop_ke_hoach_tuan_id_ma_nv_key" ON "ke_hoach_tuan_phoi_hop"("ke_hoach_tuan_id", "ma_nv");

-- CreateIndex
CREATE INDEX "nhiem_vu_trang_thai_idx" ON "nhiem_vu"("trang_thai");

-- CreateIndex
CREATE INDEX "nhiem_vu_phong_chu_tri_id_idx" ON "nhiem_vu"("phong_chu_tri_id");

-- CreateIndex
CREATE INDEX "nhiem_vu_nguoi_xu_ly_chinh_id_idx" ON "nhiem_vu"("nguoi_xu_ly_chinh_id");

-- CreateIndex
CREATE INDEX "nhiem_vu_han_xu_ly_idx" ON "nhiem_vu"("han_xu_ly");

-- CreateIndex
CREATE UNIQUE INDEX "nhiem_vu_phong_nhiem_vu_id_ma_phong_key" ON "nhiem_vu_phong"("nhiem_vu_id", "ma_phong");

-- CreateIndex
CREATE UNIQUE INDEX "nhiem_vu_nguoi_phoi_hop_nhiem_vu_id_ma_nv_key" ON "nhiem_vu_nguoi_phoi_hop"("nhiem_vu_id", "ma_nv");

-- CreateIndex
CREATE INDEX "nhiem_vu_log_nhiem_vu_id_thoi_gian_idx" ON "nhiem_vu_log"("nhiem_vu_id", "thoi_gian");

-- AddForeignKey
ALTER TABLE "nhan_vien" ADD CONSTRAINT "nhan_vien_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_khoan" ADD CONSTRAINT "tai_khoan_ma_nv_fkey" FOREIGN KEY ("ma_nv") REFERENCES "nhan_vien"("ma_nv") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_ma_nv_fkey" FOREIGN KEY ("ma_nv") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_nguoi_cap_nhat_id_fkey" FOREIGN KEY ("nguoi_cap_nhat_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan" ADD CONSTRAINT "ke_hoach_tuan_nguon_id_fkey" FOREIGN KEY ("nguon_id") REFERENCES "ke_hoach_tuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan_phoi_hop" ADD CONSTRAINT "ke_hoach_tuan_phoi_hop_ke_hoach_tuan_id_fkey" FOREIGN KEY ("ke_hoach_tuan_id") REFERENCES "ke_hoach_tuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan_phoi_hop" ADD CONSTRAINT "ke_hoach_tuan_phoi_hop_ma_nv_fkey" FOREIGN KEY ("ma_nv") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_giao_id_fkey" FOREIGN KEY ("nguoi_giao_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_phong_chu_tri_id_fkey" FOREIGN KEY ("phong_chu_tri_id") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_xu_ly_chinh_id_fkey" FOREIGN KEY ("nguoi_xu_ly_chinh_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_bao_cao_hoan_thanh_id_fkey" FOREIGN KEY ("nguoi_bao_cao_hoan_thanh_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu" ADD CONSTRAINT "nhiem_vu_nguoi_cap_nhat_id_fkey" FOREIGN KEY ("nguoi_cap_nhat_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_phong" ADD CONSTRAINT "nhiem_vu_phong_nhiem_vu_id_fkey" FOREIGN KEY ("nhiem_vu_id") REFERENCES "nhiem_vu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_phong" ADD CONSTRAINT "nhiem_vu_phong_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_nguoi_phoi_hop" ADD CONSTRAINT "nhiem_vu_nguoi_phoi_hop_nhiem_vu_id_fkey" FOREIGN KEY ("nhiem_vu_id") REFERENCES "nhiem_vu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_nguoi_phoi_hop" ADD CONSTRAINT "nhiem_vu_nguoi_phoi_hop_ma_nv_fkey" FOREIGN KEY ("ma_nv") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_nguoi_phoi_hop" ADD CONSTRAINT "nhiem_vu_nguoi_phoi_hop_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_log" ADD CONSTRAINT "nhiem_vu_log_nhiem_vu_id_fkey" FOREIGN KEY ("nhiem_vu_id") REFERENCES "nhiem_vu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_vu_log" ADD CONSTRAINT "nhiem_vu_log_nguoi_thuc_hien_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id") REFERENCES "nhan_vien"("ma_nv") ON DELETE RESTRICT ON UPDATE CASCADE;
