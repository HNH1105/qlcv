// src/lib/prisma.ts
//
// Bổ sung so với bản gốc: Query Extension tự động lọc isDeleted=false cho các model có soft-delete
// (NhiemVu, KeHoachTuan, NhiemVuSubTask) trên các thao tác đọc — thay vì trông chờ từng Server
// Action tự nhớ thêm điều kiện (đây là lỗ hổng ChatGPT + Claude review đều chỉ ra: Prisma KHÔNG tự
// lọc soft-delete, quên 1 chỗ là dữ liệu đã xoá vẫn lộ ra).
//
// NGUYÊN TẮC: mặc định LUÔN lọc isDeleted=false. Muốn xem cả bản ghi đã xoá (màn hình audit/admin),
// gọi tường minh với `where: { isDeleted: undefined }` (xem cả 2) hoặc `where: { isDeleted: true }`
// (chỉ bản đã xoá) — KHÔNG cố "ẩn hoàn toàn" theo kiểu không ai lấy lại được, tránh bó tay nhu cầu
// audit thật sự cần xem bản ghi đã xoá.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

const prismaBase = globalForPrisma.prismaBase ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}

// Danh sách model có cột isDeleted — chỉ các model liệt kê ở đây mới bị extension can thiệp.
// Tên field đúng theo Prisma Client (camelCase, không phải @@map trong DB).
const SOFT_DELETE_MODELS = new Set(["NhiemVu", "KeHoachTuan", "NhiemVuSubTask"]);

// Chèn isDeleted: false vào where NẾU caller chưa tự chỉ định — presence-check bằng `in`, không
// phải giá trị, để phân biệt "không truyền gì" (áp mặc định) với "truyền tường minh isDeleted:
// undefined" (nghĩa là chủ động muốn xem cả 2 loại, Prisma bỏ qua field có giá trị undefined khi
// dựng câu query nhưng KEY vẫn tồn tại trong object nên bắt được ở đây).
function apDungMacDinhChuaXoa<T extends { where?: Record<string, unknown> }>(args: T): T {
  const where = args.where ?? {};
  if ("isDeleted" in where) {
    return args; // caller đã tự quyết định (kể cả isDeleted: undefined để xem tất cả) — tôn trọng
  }
  return { ...args, where: { ...where, isDeleted: false } };
}

export const prisma = prismaBase.$extends({
  name: "soft-delete-filter",
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args = apDungMacDinhChuaXoa(args as { where?: Record<string, unknown> }) as typeof args;
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args = apDungMacDinhChuaXoa(args as { where?: Record<string, unknown> }) as typeof args;
        }
        return query(args);
      },
      async count({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args = apDungMacDinhChuaXoa(args as { where?: Record<string, unknown> }) as typeof args;
        }
        return query(args);
      },
      // CỐ Ý KHÔNG can thiệp findUnique — xem comment ở SOFT_DELETE_MODELS phía trên.
    },
  },
});

// ============================================================================================
// CLIENT RIÊNG CHO AUDIT/ADMIN — KHÔNG lọc isDeleted.
//
// Theo góp ý review: không nên để quy ước ngầm `where: { isDeleted: undefined }` rải rác trong
// nhiều Server Action nghiệp vụ — chỉ cần 1 dev vô tình gõ dòng đó ở 1 action bình thường là đã âm
// thầm làm lộ dữ liệu đã xoá. Thay vào đó, export RIÊNG 1 client KHÔNG qua extension, đặt tên rõ
// ràng để dễ grep toàn bộ chỗ dùng (`grep -rn "prismaAudit"`) và bắt buộc code review khi có dòng
// mới gọi tới nó. Client nghiệp vụ bình thường (`prisma`) và client audit (`prismaAudit`) trỏ CHUNG
// 1 kết nối (`prismaBase`), chỉ khác ở việc có áp filter hay không.
export const prismaAudit = prismaBase;

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

