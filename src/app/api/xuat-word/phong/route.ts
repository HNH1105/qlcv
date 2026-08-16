import { NextRequest, NextResponse } from "next/server";
import { LoaiGhiNhan } from "@prisma/client";
import { traCuuKeHoachBaoCao } from "@/lib/actions/tra-cuu";
import { buildKeHoachBaoCaoPhongDocx } from "@/lib/word/ke-hoach-phong-docx";

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
