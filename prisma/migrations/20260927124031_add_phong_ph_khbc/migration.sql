-- CreateTable
CREATE TABLE "ke_hoach_tuan_phong_phoi_hop" (
    "ke_hoach_tuan_id" INTEGER NOT NULL,
    "ma_phong" TEXT NOT NULL,

    CONSTRAINT "ke_hoach_tuan_phong_phoi_hop_pkey" PRIMARY KEY ("ke_hoach_tuan_id","ma_phong")
);

-- CreateIndex
CREATE INDEX "ke_hoach_tuan_phong_phoi_hop_ma_phong_idx" ON "ke_hoach_tuan_phong_phoi_hop"("ma_phong");

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan_phong_phoi_hop" ADD CONSTRAINT "ke_hoach_tuan_phong_phoi_hop_ke_hoach_tuan_id_fkey" FOREIGN KEY ("ke_hoach_tuan_id") REFERENCES "ke_hoach_tuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ke_hoach_tuan_phong_phoi_hop" ADD CONSTRAINT "ke_hoach_tuan_phong_phoi_hop_ma_phong_fkey" FOREIGN KEY ("ma_phong") REFERENCES "phong"("ma_phong") ON DELETE RESTRICT ON UPDATE CASCADE;
