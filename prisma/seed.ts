import { PrismaClient, Quyen } from "@prisma/client";
import bcrypt from "bcryptjs";

// QUAN TRỌNG: seed dùng DIRECT_URL (bỏ qua PgBouncer pooler), KHÔNG dùng DATABASE_URL mặc định.
// Lý do: prisma.$transaction(async (tx) => {...}) là "interactive transaction" — cần giữ nguyên
// 1 kết nối xuyên suốt nhiều câu lệnh. PgBouncer ở chế độ transaction pooling (?pgbouncer=true)
// không đảm bảo giữ nguyên 1 kết nối như vậy, dễ gây lỗi hoặc hành vi sai giữa chừng khi seed.
// Seed chỉ chạy 1 lần, không cần qua pooler, nên trỏ thẳng DIRECT_URL là an toàn nhất.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

type NhanVienSeed = {
  maNV: string;
  hoTen: string;
  maPhong: string;
  thuTu: number;
  chucVu: string;
  quyen: Quyen;
};

// ============================================================
// CẤU HÌNH
// ============================================================

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

if (!DEFAULT_PASSWORD) {
  throw new Error(
    "Thiếu biến môi trường SEED_DEFAULT_PASSWORD trong file .env"
  );
}

// ============================================================
// DỮ LIỆU NHÂN VIÊN
// ============================================================

const nhanViens: NhanVienSeed[] = [
  // ==================== BAN GIÁM ĐỐC ====================

  {
    maNV: "BGD01",
    hoTen: "Hồ Thị Thu Hằng",
    maPhong: "BGD",
    thuTu: 1,
    chucVu: "Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD02",
    hoTen: "Nguyễn Văn Bé Hai",
    maPhong: "BGD",
    thuTu: 2,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD03",
    hoTen: "Trần Văn Tiền",
    maPhong: "BGD",
    thuTu: 3,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD04",
    hoTen: "Nguyễn Văn Đời",
    maPhong: "BGD",
    thuTu: 4,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD05",
    hoTen: "Nguyễn Hữu Phước",
    maPhong: "BGD",
    thuTu: 5,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD06",
    hoTen: "Đỗ Tất Tiến",
    maPhong: "BGD",
    thuTu: 6,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD07",
    hoTen: "Lâm Như Quỳnh",
    maPhong: "BGD",
    thuTu: 7,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },
  {
    maNV: "BGD08",
    hoTen: "Dương Thị Như Ngọc",
    maPhong: "BGD",
    thuTu: 8,
    chucVu: "Phó Giám đốc",
    quyen: Quyen.LANHDAODONVI,
  },

  // ==================== VĂN PHÒNG ====================

  {
    maNV: "VP01",
    hoTen: "Huỳnh Thanh Phong",
    maPhong: "VP",
    thuTu: 1,
    chucVu: "Chánh văn phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "VP02",
    hoTen: "Trần Thị Mỹ Chi",
    maPhong: "VP",
    thuTu: 2,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP03",
    hoTen: "Trương Kim Hương",
    maPhong: "VP",
    thuTu: 3,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP04",
    hoTen: "Huỳnh Hồ Đạt",
    maPhong: "VP",
    thuTu: 4,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP05",
    hoTen: "Đặng Thị Dân",
    maPhong: "VP",
    thuTu: 5,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP06",
    hoTen: "Nguyễn Tấn Thành",
    maPhong: "VP",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP07",
    hoTen: "Nguyễn Chí Tình",
    maPhong: "VP",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP08",
    hoTen: "Phạm Khắc Dũng",
    maPhong: "VP",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP09",
    hoTen: "Đỗ Quốc Thống",
    maPhong: "VP",
    thuTu: 9,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP10",
    hoTen: "Trương Thị Mai Anh",
    maPhong: "VP",
    thuTu: 10,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP11",
    hoTen: "Nguyễn Hoàng Huệ",
    maPhong: "VP",
    thuTu: 11,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP12",
    hoTen: "Phạm Thị Trúc Lan",
    maPhong: "VP",
    thuTu: 12,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP13",
    hoTen: "Nguyễn Ngọc Hà",
    maPhong: "VP",
    thuTu: 13,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP14",
    hoTen: "Dương Chí Trung",
    maPhong: "VP",
    thuTu: 14,
    chucVu: "Lái xe",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP15",
    hoTen: "Nguyễn Tiến Dũng",
    maPhong: "VP",
    thuTu: 15,
    chucVu: "Lái xe",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP16",
    hoTen: "Trần Lương Quang",
    maPhong: "VP",
    thuTu: 16,
    chucVu: "Lái xe",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP17",
    hoTen: "Võ Duy Minh",
    maPhong: "VP",
    thuTu: 17,
    chucVu: "Lái xe",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP18",
    hoTen: "Phan Thị Kim Tiếng",
    maPhong: "VP",
    thuTu: 18,
    chucVu: "Dọn dẹp",
    quyen: Quyen.USER,
  },
  {
    maNV: "VP19",
    hoTen: "Lê Bửu Túy",
    maPhong: "VP",
    thuTu: 19,
    chucVu: "Dọn dẹp",
    quyen: Quyen.USER,
  },

  // ==================== TỔ CHỨC CÁN BỘ ====================

  {
    maNV: "TC01",
    hoTen: "Nguyễn Thanh Long",
    maPhong: "TCCB",
    thuTu: 1,
    chucVu: "Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "TC02",
    hoTen: "Lê Thành Phong",
    maPhong: "TCCB",
    thuTu: 2,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "TC03",
    hoTen: "Huỳnh Tấn Phước",
    maPhong: "TCCB",
    thuTu: 3,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "TC04",
    hoTen: "Võ Hồng Loan",
    maPhong: "TCCB",
    thuTu: 4,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC05",
    hoTen: "Nguyễn Đình Thi",
    maPhong: "TCCB",
    thuTu: 5,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC06",
    hoTen: "Nguyễn Mai Yến Nhi",
    maPhong: "TCCB",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC07",
    hoTen: "Trương Thị Ngọc Tú",
    maPhong: "TCCB",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC08",
    hoTen: "Nguyễn Văn Nu",
    maPhong: "TCCB",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC09",
    hoTen: "Vũ Thị Thanh Quyên",
    maPhong: "TCCB",
    thuTu: 9,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "TC10",
    hoTen: "Nguyễn Thị Ngọc Ánh",
    maPhong: "TCCB",
    thuTu: 10,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },

  // ==================== NGHIỆP VỤ Y ====================

  {
    maNV: "NY01",
    hoTen: "Trịnh Quang Đính",
    maPhong: "NVY",
    thuTu: 1,
    chucVu: "Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "NY02",
    hoTen: "Hà Thị Cẩm Tú",
    maPhong: "NVY",
    thuTu: 2,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY03",
    hoTen: "Lê Kế Nghiệp",
    maPhong: "NVY",
    thuTu: 3,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY04",
    hoTen: "Huỳnh Thị Ngọc Hiền",
    maPhong: "NVY",
    thuTu: 4,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY05",
    hoTen: "Nguyễn Thị Huệ Tiên",
    maPhong: "NVY",
    thuTu: 5,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY06",
    hoTen: "Thạch Ngọc Sáng",
    maPhong: "NVY",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY07",
    hoTen: "Lương Tú Ngân",
    maPhong: "NVY",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "NY08",
    hoTen: "Nguyễn Ngọc Kim Châu",
    maPhong: "NVY",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },

  // ==================== NGHIỆP VỤ DƯỢC ====================

  {
    maNV: "ND01",
    hoTen: "Lê Đông Anh",
    maPhong: "NVD",
    thuTu: 1,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "ND02",
    hoTen: "Huỳnh Phước Thiện",
    maPhong: "NVD",
    thuTu: 2,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "ND03",
    hoTen: "Huỳnh Phi Kiệt",
    maPhong: "NVD",
    thuTu: 3,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND04",
    hoTen: "Hồ Hồng Thắm",
    maPhong: "NVD",
    thuTu: 4,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND05",
    hoTen: "Trần Cao Minh",
    maPhong: "NVD",
    thuTu: 5,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND06",
    hoTen: "Trần Thị Huyền Trân",
    maPhong: "NVD",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND07",
    hoTen: "Nguyễn Minh Thắng",
    maPhong: "NVD",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND08",
    hoTen: "Ưng Quốc Điền",
    maPhong: "NVD",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND09",
    hoTen: "Trần Hoàng Anh",
    maPhong: "NVD",
    thuTu: 9,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND10",
    hoTen: "Lê Mỹ Phụng",
    maPhong: "NVD",
    thuTu: 10,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "ND11",
    hoTen: "Trần Thị Huỳnh Như",
    maPhong: "NVD",
    thuTu: 11,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },

  // ==================== KẾ HOẠCH - TÀI CHÍNH ====================

  {
    maNV: "KH01",
    hoTen: "Nguyễn Quốc Phục",
    maPhong: "KHTC",
    thuTu: 1,
    chucVu: "Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "KH02",
    hoTen: "Nguyễn Thanh Tòng",
    maPhong: "KHTC",
    thuTu: 2,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "KH03",
    hoTen: "La Thanh Yến",
    maPhong: "KHTC",
    thuTu: 3,
    chucVu: "Kế toán trưởng",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH04",
    hoTen: "Nguyễn Trương Duy Tùng",
    maPhong: "KHTC",
    thuTu: 4,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH05",
    hoTen: "Lê Phước Lộc",
    maPhong: "KHTC",
    thuTu: 5,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH06",
    hoTen: "Huỳnh Minh Hùng",
    maPhong: "KHTC",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH07",
    hoTen: "Nguyễn Văn Nam Tư",
    maPhong: "KHTC",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH08",
    hoTen: "Lương Thị Hồng Nhung",
    maPhong: "KHTC",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH09",
    hoTen: "Thạch Thị Dân",
    maPhong: "KHTC",
    thuTu: 9,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH10",
    hoTen: "Huỳnh Thị Cẩm Tú",
    maPhong: "KHTC",
    thuTu: 10,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH11",
    hoTen: "Võ Quốc Thoại",
    maPhong: "KHTC",
    thuTu: 11,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH12",
    hoTen: "Dương Thị Hồng Thắm",
    maPhong: "KHTC",
    thuTu: 12,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH13",
    hoTen: "Phạm Ngọc Đông Nghi",
    maPhong: "KHTC",
    thuTu: 13,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH14",
    hoTen: "Nguyễn Hữu Hiệp",
    maPhong: "KHTC",
    thuTu: 14,
    chucVu: "Chuyên viên chính",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH15",
    hoTen: "Lê Đông",
    maPhong: "KHTC",
    thuTu: 15,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH16",
    hoTen: "Mai Thị Ngọc Hằng",
    maPhong: "KHTC",
    thuTu: 16,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "KH17",
    hoTen: "Trần Thị Hạnh Nguyên",
    maPhong: "KHTC",
    thuTu: 17,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },

  // ==================== BẢO TRỢ XÃ HỘI ====================

  {
    maNV: "BT01",
    hoTen: "Thạch Khmau",
    maPhong: "BTXH",
    thuTu: 1,
    chucVu: "Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "BT02",
    hoTen: "Ngô Công Đức",
    maPhong: "BTXH",
    thuTu: 2,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "BT03",
    hoTen: "Nguyễn Ngọc Nhân",
    maPhong: "BTXH",
    thuTu: 3,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "BT04",
    hoTen: "Võ Đấu Hoa",
    maPhong: "BTXH",
    thuTu: 4,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "BT05",
    hoTen: "Võ Thị Ngọc Châu Quyên",
    maPhong: "BTXH",
    thuTu: 5,
    chucVu: "Phó Trưởng phòng",
    quyen: Quyen.LANHDAOPHONG,
  },
  {
    maNV: "BT06",
    hoTen: "Bùi Thị Kim Hương",
    maPhong: "BTXH",
    thuTu: 6,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT07",
    hoTen: "Đoàn Thị Bích Vân",
    maPhong: "BTXH",
    thuTu: 7,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT08",
    hoTen: "Hồ Thị Hồng Yến",
    maPhong: "BTXH",
    thuTu: 8,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT09",
    hoTen: "Lưu Thị Oanh",
    maPhong: "BTXH",
    thuTu: 9,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT10",
    hoTen: "Lương Thị Thu Thủy",
    maPhong: "BTXH",
    thuTu: 10,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT11",
    hoTen: "Nguyễn Quốc Cảnh",
    maPhong: "BTXH",
    thuTu: 11,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT12",
    hoTen: "Nguyễn Thị Trang Nhã",
    maPhong: "BTXH",
    thuTu: 12,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT13",
    hoTen: "Nguyễn Thanh Toàn",
    maPhong: "BTXH",
    thuTu: 13,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
  {
    maNV: "BT14",
    hoTen: "Trần Lê Nhã Khanh",
    maPhong: "BTXH",
    thuTu: 14,
    chucVu: "Chuyên viên",
    quyen: Quyen.USER,
  },
];

// ============================================================
// DANH SÁCH PHÒNG
// ============================================================

const phongs = [
  {
    maPhong: "BGD",
    tenPhong: "Ban Giám đốc",
    thuTu: 1,
  },
  {
    maPhong: "VP",
    tenPhong: "Văn phòng",
    thuTu: 2,
  },
  {
    maPhong: "TCCB",
    tenPhong: "Tổ chức cán bộ",
    thuTu: 3,
  },
  {
    maPhong: "NVY",
    tenPhong: "Nghiệp vụ y",
    thuTu: 4,
  },
  {
    maPhong: "NVD",
    tenPhong: "Nghiệp vụ dược",
    thuTu: 5,
  },
  {
    maPhong: "KHTC",
    tenPhong: "Kế hoạch - Tài chính",
    thuTu: 6,
  },
  {
    maPhong: "BTXH",
    tenPhong: "Bảo trợ xã hội - Trẻ em",
    thuTu: 7,
  },
];

// ============================================================
// TẠO USERNAME
//
// Ví dụ:
// Nguyễn Hoàng Huệ  -> nhhue.syt
// Huỳnh Thanh Phong -> htphong.syt
//
// Quy tắc:
// - Bỏ dấu tiếng Việt
// - Lấy chữ cái đầu của họ + các tên đệm
// - Giữ nguyên tên cuối
// - Chuyển thường
// - Thêm .syt
//
// Nếu trùng username:
// - Người xuất hiện trước giữ username gốc
// - Người tiếp theo thêm số: htctu2.syt, htctu3.syt, ...
// ============================================================

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function taoTenDangNhapGoc(hoTen: string): string {
  const clean = removeVietnameseTones(hoTen)
    .trim()
    .replace(/\s+/g, " ");

  const parts = clean.split(" ");

  if (parts.length === 1) {
    return `${parts[0].toLowerCase()}.syt`;
  }

  const ten = parts[parts.length - 1];
  const phanTruoc = parts.slice(0, -1);

  const chuCaiDau = phanTruoc
    .map((p) => p.charAt(0))
    .join("");

  return `${(chuCaiDau + ten).toLowerCase()}.syt`;
}

/**
 * Tạo username ổn định cho toàn bộ danh sách seed.
 * Ví dụ:
 *   Hà Thị Cẩm Tú      -> htctu.syt
 *   Huỳnh Thị Cẩm Tú   -> htctu2.syt
 *
 * Dùng Map theo maNV để mỗi lần chạy seed lại luôn ra cùng username.
 */
function taoDanhSachTenDangNhap(
  danhSach: NhanVienSeed[]
): Map<string, string> {
  const ketQua = new Map<string, string>();
  const soLan = new Map<string, number>();

  for (const nv of danhSach) {
    const usernameGoc = taoTenDangNhapGoc(nv.hoTen);
    const lan = (soLan.get(usernameGoc) ?? 0) + 1;

    soLan.set(usernameGoc, lan);

    const tenDangNhap =
      lan === 1
        ? usernameGoc
        : usernameGoc.replace(/\.syt$/, `${lan}.syt`);

    ketQua.set(nv.maNV, tenDangNhap);
  }

  return ketQua;
}

/**
 * Kiểm tra lỗi dữ liệu ngay trước khi ghi DB.
 * Seed sai dữ liệu thì dừng sớm, tránh tạo DB dang dở.
 */
function kiemTraDuLieuSeed(): void {
  const maNVs = new Set<string>();
  const usernameMap = taoDanhSachTenDangNhap(nhanViens);
  const usernames = new Set<string>();

  for (const nv of nhanViens) {
    if (maNVs.has(nv.maNV)) {
      throw new Error(`Trùng maNV trong seed: ${nv.maNV}`);
    }

    maNVs.add(nv.maNV);

    const username = usernameMap.get(nv.maNV)!;

    if (usernames.has(username)) {
      throw new Error(`Trùng username trong seed: ${username}`);
    }

    usernames.add(username);
  }

  if (usernames.has("admin.syt")) {
    throw new Error(
      'Username "admin.syt" bị trùng với tài khoản ADMIN. Hãy đổi dữ liệu nhân viên.'
    );
  }

  const maPhongs = new Set<string>();

  for (const phong of phongs) {
    if (maPhongs.has(phong.maPhong)) {
      throw new Error(`Trùng maPhong trong seed: ${phong.maPhong}`);
    }

    maPhongs.add(phong.maPhong);
  }

  for (const nv of nhanViens) {
    if (!maPhongs.has(nv.maPhong)) {
      throw new Error(
        `Nhân viên ${nv.maNV} (${nv.hoTen}) tham chiếu maPhong không tồn tại: ${nv.maPhong}`
      );
    }
  }
}
// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("==============================================");
  console.log("BẮT ĐẦU SEED DATABASE");
  console.log("==============================================");

  // Kiểm tra dữ liệu trước khi ghi database.
  console.log("\n[0/4] Kiểm tra dữ liệu seed...");
  kiemTraDuLieuSeed();

  const tenDangNhapMap = taoDanhSachTenDangNhap(nhanViens);

  console.log("Dữ liệu seed hợp lệ.");

  // Hash một lần duy nhất.
  console.log("\n[1/4] Hash password mặc định...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD ||"Syt@2026", 12);

  // Toàn bộ thao tác ghi DB nằm trong transaction:
  // nếu có lỗi giữa chừng thì rollback, tránh DB bị seed dang dở.
  const ketQua = await prisma.$transaction(async (tx) => {
    // ----------------------------------------------------------
    // 2. Tạo / cập nhật phòng
    // ----------------------------------------------------------

    console.log("\n[2/4] Đang tạo/cập nhật phòng...");

    for (const phong of phongs) {
      await tx.phong.upsert({
        where: {
          maPhong: phong.maPhong,
        },
        update: {
          tenPhong: phong.tenPhong,
          thuTu: phong.thuTu,
          // KHÔNG cập nhật hoatDong khi seed lại.
          // Tránh seed vô tình kích hoạt lại phòng đã bị vô hiệu hóa.
        },
        create: {
          maPhong: phong.maPhong,
          tenPhong: phong.tenPhong,
          thuTu: phong.thuTu,
          hoatDong: true,
        },
      });
    }

    console.log(`Đã tạo/cập nhật ${phongs.length} phòng.`);

    // ----------------------------------------------------------
    // 3. Tạo / cập nhật nhân viên + tài khoản
    // ----------------------------------------------------------

    console.log("\n[3/4] Đang tạo/cập nhật nhân viên và tài khoản...");

    let soNhanVien = 0;
    let soTaiKhoan = 0;

    for (const nv of nhanViens) {
      const tenDangNhap = tenDangNhapMap.get(nv.maNV)!;

      await tx.nhanVien.upsert({
        where: {
          maNV: nv.maNV,
        },
        update: {
          hoTen: nv.hoTen,
          maPhong: nv.maPhong,
          thuTu: nv.thuTu,
          chucVu: nv.chucVu,
          quyen: nv.quyen,
          // KHÔNG cập nhật hoatDong khi seed lại.
          // Trạng thái hoạt động phải do nghiệp vụ/admin quản lý.
        },
        create: {
          maNV: nv.maNV,
          hoTen: nv.hoTen,
          maPhong: nv.maPhong,
          thuTu: nv.thuTu,
          chucVu: nv.chucVu,
          hoatDong: true,
          quyen: nv.quyen,
        },
      });

      await tx.taiKhoan.upsert({
        where: {
          maNV: nv.maNV,
        },
        update: {
          // Có thể đồng bộ username từ seed.
          // KHÔNG reset password hoặc trạng thái khóa khi seed lại.
          tenDangNhap,
        },
        create: {
          maNV: nv.maNV,
          tenDangNhap,
          matKhauHash: passwordHash,
          isAdmin: false,
          biKhoa: false,
          soLanDangNhapSaiLienTiep: 0,
        },
      });

      soNhanVien++;
      soTaiKhoan++;

      console.log(
        `  ${nv.maNV.padEnd(6)} | ${nv.hoTen.padEnd(30)} | ${tenDangNhap}`
      );
    }

    // ----------------------------------------------------------
    // 4. Tạo / cập nhật tài khoản ADMIN
    // ----------------------------------------------------------
    // ADMIN01 vẫn cần 1 dòng NhanVien (vì TaiKhoan.maNV bắt buộc trỏ tới NhanVien), nhưng đặt
    // hoatDong: false để KHÔNG xuất hiện trong các dropdown chọn người xử lý/phối hợp — những
    // danh sách đó (getAllNhanVienList, getNhanVienByPhong...) đều lọc hoatDong=true. Tài khoản
    // vẫn đăng nhập được bình thường (đăng nhập không lọc theo hoatDong).

    console.log("\n[4/4] Đang tạo/cập nhật tài khoản ADMIN...");

    await tx.nhanVien.upsert({
      where: {
        maNV: "ADMIN01",
      },
      update: {
        hoTen: "Quản trị hệ thống",
        maPhong: "BGD",
        thuTu: 999,
        chucVu: "Quản trị hệ thống",
        quyen: Quyen.USER,
        // KHÔNG cập nhật hoatDong khi seed lại.
      },
      create: {
        maNV: "ADMIN01",
        hoTen: "Quản trị hệ thống",
        maPhong: "BGD",
        thuTu: 999,
        chucVu: "Quản trị hệ thống",
        hoatDong: false, // ẩn khỏi danh sách chọn người xử lý/phối hợp — chỉ dùng để đăng nhập admin
        quyen: Quyen.USER,
      },
    });

    await tx.taiKhoan.upsert({
      where: {
        maNV: "ADMIN01",
      },
      update: {
        tenDangNhap: "admin.syt",
        isAdmin: true,
        // KHÔNG reset password / khóa tài khoản khi seed lại.
      },
      create: {
        maNV: "ADMIN01",
        tenDangNhap: "admin.syt",
        matKhauHash: passwordHash,
        isAdmin: true,
        biKhoa: false,
        soLanDangNhapSaiLienTiep: 0,
      },
    });

    soNhanVien++;
    soTaiKhoan++;

    return {
      soNhanVien,
      soTaiKhoan,
    };
  },{
    maxWait: 15_000,  // chờ lấy connection (ms)
    timeout: 120_000, // cho phép transaction chạy tối đa 120s
  });

  // ------------------------------------------------------------
  // KẾT QUẢ
  // ------------------------------------------------------------

  console.log("\n==============================================");
  console.log("SEED HOÀN TẤT");
  console.log("==============================================");
  console.log(`Nhân viên: ${ketQua.soNhanVien}`);
  console.log(`Tài khoản: ${ketQua.soTaiKhoan}`);
  console.log("");
  console.log("ADMIN:");
  console.log("  Username : admin.syt");
  console.log("  Password : <giá trị SEED_DEFAULT_PASSWORD>");
  console.log("");
  console.log("Password mặc định cho nhân viên mới:");
  console.log("  <giá trị SEED_DEFAULT_PASSWORD>");
  console.log("");
  console.log("LƯU Ý:");
  console.log(
    "  Chạy seed lần sau KHÔNG reset password, không mở khóa và không reset số lần đăng nhập sai."
  );
  console.log("==============================================");
}

main()
  .catch((error) => {
    console.error("\nSEED THẤT BẠI:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });