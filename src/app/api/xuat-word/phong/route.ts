import { NextRequest, NextResponse } from "next/server";
import { LoaiGhiNhan } from "@prisma/client";
import { traCuuKeHoachBaoCao } from "@/lib/actions/tra-cuu";
import { buildKeHoachBaoCaoPhongDocx } from "@/lib/word/ke-hoach-phong-docx";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// GET /api/xuat-word/phong?nam=2026&tuan=33&loai=KEHOACH&maPhong=VP  (maPhong bỏ trống = tất cả)
// Dùng route handler (không phải Server Action) vì cần trả về file nhị phân kèm header tải xuống —
// nút "Xuất Word" ở FE chỉ cần trỏ <a href="..."> tới route này, trình duyệt tự tải file, không cần
// gọi fetch/blob thủ công.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const nam = Number(sp.get("nam"));
  const tuan = Number(sp.get("tuan"));
  const loaiParam = sp.get("loai");
  const maPhong = sp.get("maPhong") || undefined;

  if (!nam || !tuan || (loaiParam !== "KEHOACH" && loaiParam !== "BAOCAO")) {
    return NextResponse.json({ error: "Thiếu hoặc sai tham số nam/tuan/loai" }, { status: 400 });
  }
  const loai = loaiParam as LoaiGhiNhan;

  try {
    const rows = await traCuuKeHoachBaoCao({
      nam,
      tuan,
      loai,
      phamVi: "phong",
      maPhong,
    });
    const buffer = await buildKeHoachBaoCaoPhongDocx({ loai, nam, tuan, rows });

    const tenFile = `${loai === "BAOCAO" ? "BaoCao" : "KeHoach"}_Tuan_${tuan}_${nam}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(tenFile)}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Có lỗi xảy ra khi xuất Word" },
      { status: 500 }
    );
  }
}

// [MỚI] POST /api/xuat-word/phong — xuất theo DANH SÁCH ĐÃ BIÊN TẬP (chỉ LĐ phòng + Admin).
// Body JSON: { nam, tuan, loai, maPhong?, ids: number[] }
// - KHÔNG ghi gì vào DB: chỉ đọc đúng các dòng theo ids rồi dựng file Word trong bộ nhớ, trả thẳng
//   về trình duyệt — không lưu file nào trên server.
// - Không tin client: đọc lại từ DB và chỉ nhận dòng đúng tuần/loại/phòng, chưa xoá, thuộc Phòng
//   hoặc Cá nhân. Thứ tự: theo phòng, trong mỗi phòng dòng vốn của Phòng trước, dòng thêm từ cá
//   nhân nằm CUỐI nhóm phòng (khớp đúng thứ tự đang hiển thị ở giao diện biên tập).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (
    !session.isAdmin &&
    session.quyen !== "LANHDAOPHONG" &&
    session.quyen !== "LANHDAODONVI"
  ) {
    return NextResponse.json(
      {
        error:
          "Chỉ Lãnh đạo phòng, Lãnh đạo đơn vị hoặc Admin mới được xuất theo danh sách đã biên tập",
      },
      { status: 403 }
    );
  }

  let body: { nam?: unknown; tuan?: unknown; loai?: unknown; maPhong?: unknown; ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  const nam = Number(body.nam);
  const tuan = Number(body.tuan);
  const loai = body.loai;
  const maPhong = typeof body.maPhong === "string" && body.maPhong ? body.maPhong : undefined;
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];

  if (!nam || !tuan || (loai !== "KEHOACH" && loai !== "BAOCAO")) {
    return NextResponse.json({ error: "Thiếu hoặc sai tham số nam/tuan/loai" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "Danh sách xuất đang trống" }, { status: 400 });
  }
  if (ids.length > 5000) {
    return NextResponse.json({ error: "Danh sách xuất quá lớn" }, { status: 400 });
  }

  try {
    const rows = await prisma.keHoachTuan.findMany({
      where: {
        id: { in: ids },
        nam,
        tuan,
        loai: loai as LoaiGhiNhan,
        isDeleted: false,
        ...(maPhong ? { maPhong } : {}),
        OR: [{ laCuaPhong: true }, { laCuaCaNhan: true }],
      },
      orderBy: [
        { phong: { thuTu: "asc" } },
        { maPhong: "asc" },
        { laCuaPhong: "desc" },
        { id: "asc" },
      ],
      select: { noiDung: true, phong: { select: { tenPhong: true } } },
    });

    const buffer = await buildKeHoachBaoCaoPhongDocx({
      loai: loai as LoaiGhiNhan,
      nam,
      tuan,
      rows: rows.map((r) => ({ noiDung: r.noiDung, tenPhong: r.phong.tenPhong })),
    });

    const tenFile = `${loai === "BAOCAO" ? "BaoCao" : "KeHoach"}_Tuan_${tuan}_${nam}.docx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(tenFile)}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Có lỗi xảy ra khi xuất Word" },
      { status: 500 }
    );
  }
}
