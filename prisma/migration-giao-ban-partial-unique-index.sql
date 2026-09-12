-- ============================================================================================
-- Chạy sau khi `npx prisma migrate dev --name giao_ban` đã tạo xong các bảng.
-- Prisma schema KHÔNG hỗ trợ partial unique index (mệnh đề WHERE), nên phải thêm tay theo đúng
-- cách dự án đã làm với CHECK constraint viết tay (xem migration-check-constraints.sql cũ).
--
-- Mục đích (đặc tả mục 24, 37.18, 37.19, 37.21):
--   Tại một thời điểm, 1 Nhiệm vụ / 1 Kế hoạch phòng chỉ được có TỐI ĐA 1 NoiDungGiaoBan
--   "đang sống" (daKetThuc = false, isDeleted = false). Các bản ghi đã kết thúc (daKetThuc=true)
--   không tính, nên KHÔNG dùng @@unique thường (Prisma) mà phải dùng partial index có điều kiện.
-- ============================================================================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_giao_ban_nhiem_vu_dang_song
  ON noi_dung_giao_ban (nhiem_vu_id)
  WHERE nhiem_vu_id IS NOT NULL AND da_ket_thuc = false AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_giao_ban_ke_hoach_dang_song
  ON noi_dung_giao_ban (ke_hoach_tuan_id)
  WHERE ke_hoach_tuan_id IS NOT NULL AND da_ket_thuc = false AND is_deleted = false;

-- Nếu dùng Prisma Migrate: thêm khối SQL trên vào cuối file migration.sql mới nhất trong
-- prisma/migrations/<timestamp>_giao_ban/migration.sql (Prisma sẽ KHÔNG tự xoá khi bạn migrate
-- diff lần sau, vì Prisma không biết về partial index này — an toàn để giữ nguyên).
