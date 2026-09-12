// ĐÍCH: src/lib/actions/giao-ban/index.ts
//
// File này CHỈ re-export — không chứa logic. Giữ để "@/lib/actions/giao-ban" vẫn import được như
// trước (Next.js tự resolve thư mục có index.ts), trong khi code thật đã tách theo từng nhóm
// nghiệp vụ để dễ tái sử dụng/import lẻ (theo yêu cầu tách file cho module Nhiệm vụ/Nhắc việc
// dùng song song). Muốn import gọn hơn, ít kéo theo code không liên quan, có thể import thẳng từ
// file con, ví dụ:
//   import { dongBoHoanThanhTuNguon } from "@/lib/actions/giao-ban/hoan-thanh";
//   import { chuyenNhiemVuThanhGiaoBan, kiemTraDaCoGiaoBanDangSong } from "@/lib/actions/giao-ban/nguon";

export * from "./cuoc-hop";
export * from "./noi-dung";
export * from "./nguoi-xu-ly";
export * from "./hoan-thanh";
export * from "./chuyen-tuan";
export * from "./huy";
export * from "./nguon";
export * from "./import";
