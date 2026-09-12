"use server";

import { z } from "zod";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { validateTransition } from "@/lib/nhiem-vu/state-machine";
import { taoThongBaoTrongTx, taoThongBaoNhieuNguoiTrongTx } from "@/lib/nhiem-vu/thong-bao-helper";
import {
  HanhDongNhiemVu,
  MucDoUuTien,
  TanSuatNhac,
  TrangThaiNhiemVu,
} from "@prisma/client";

// ==========================================================================================
// PHASE 1 — CORE: tạo mới, đọc danh sách/chi tiết, toàn bộ hành động đổi trạng thái.
// Phase 3 (đổi phòng chủ trì) gộp luôn vào file này vì dùng chung transaction pattern với các
// hành động đổi trạng thái — tách file riêng sẽ phải import qua lại không cần thiết.
// ==========================================================================================

// ------------------------------------------------------------------------------------------
// Kiểu dữ liệu dùng chung
// ------------------------------------------------------------------------------------------

export type NhiemVuRow = {
  id: number;
  tieuDe: string;
  mucDoUuTien: MucDoUuTien;
  trangThai: TrangThaiNhiemVu;
  hanXuLy: Date | null;
  tienDoPhanTram: number;
  phongChuTriId: string;
  tenPhongChuTri: string;
  nguoiXuLyChinh: { maNV: string; hoTen: string } | null;
  // MỚI — CHỈ có giá trị khi lấy theo vai trò "phoiHop" (getNhiemVuCuaToi). Trạng thái hoàn thành
  // PHẦN VIỆC RIÊNG của người phối hợp đang xem, KHÁC hẳn trangThai chung của cả nhiệm vụ — dùng
  // để phân loại "đã xử lý/chưa xử lý" đúng góc nhìn của người phối hợp thay vì mượn trạng thái
  // tổng thể (vốn do người xử lý chính quyết định).
  daHoanThanhPhanViecCuaToi?: boolean;
};

// Danh sách CHỈ chọn field tóm tắt — KHÔNG kéo theo noiDung/log/subtask đầy đủ (đúng nguyên tắc đã
// chốt: "chỉ load danh sách lúc đầu", chi tiết load riêng khi vào /nhiem-vu/[id]).
const SELECT_TOM_TAT = {
  id: true,
  tieuDe: true,
  mucDoUuTien: true,
  trangThai: true,
  hanXuLy: true,
  tienDoPhanTram: true,
  phongChuTriId: true,
  phongChuTri: { select: { tenPhong: true } },
  nguoiXuLyChinh: { select: { maNV: true, hoTen: true } },
} as const;

function toRow(r: {
  id: number;
  tieuDe: string;
  mucDoUuTien: MucDoUuTien;
  trangThai: TrangThaiNhiemVu;
  hanXuLy: Date | null;
  tienDoPhanTram: number;
  phongChuTriId: string;
  phongChuTri: { tenPhong: string };
  nguoiXuLyChinh: { maNV: string; hoTen: string } | null;
}): NhiemVuRow {
  return {
    id: r.id,
    tieuDe: r.tieuDe,
    mucDoUuTien: r.mucDoUuTien,
    trangThai: r.trangThai,
    hanXuLy: r.hanXuLy,
    tienDoPhanTram: r.tienDoPhanTram,
    phongChuTriId: r.phongChuTriId,
    tenPhongChuTri: r.phongChuTri.tenPhong,
    nguoiXuLyChinh: r.nguoiXuLyChinh,
  };
}

// ------------------------------------------------------------------------------------------
// Helper quyền — tránh lặp lại logic "có phải BGĐ/LĐ phòng chủ trì" ở nhiều action
// ------------------------------------------------------------------------------------------

async function layNhiemVuHoacLoi(id: number) {
  const nv = await prisma.nhiemVu.findFirst({ where: { id } });
  if (!nv) throw new Error("Không tìm thấy nhiệm vụ hoặc đã bị xoá.");
  return nv;
}

function laBGD(quyen: string) {
  return quyen === "LANHDAODONVI";
}

function laLanhDaoPhongChuTri(quyen: string, maPhongNguoiDung: string, phongChuTriId: string) {
  return quyen === "LANHDAOPHONG" && maPhongNguoiDung === phongChuTriId;
}

// (Hàm assertNhanVienDangHoatDong đã bị xoá — validate hoạt động giờ làm bằng 1 câu findMany theo
// lô, gộp thẳng vào taoNhiemVu/phanCongBoSung ngay trước khi mở transaction, để tránh nhiều lượt
// gọi DB tuần tự bên trong transaction gây timeout.)

// ------------------------------------------------------------------------------------------
// TẠO MỚI
// ------------------------------------------------------------------------------------------

const TaoNhiemVuSchema = z.object({
  tieuDe: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
  noiDung: z.string().trim().optional(),
  mucDoUuTien: z.nativeEnum(MucDoUuTien).default("THUONG"),
  nguon: z.string().trim().optional(),
  vanBanLienQuan: z.string().trim().optional(),
  linkFile: z.string().trim().optional(),
  nguoiGiaoId: z.string().min(1),
  ngayGiao: z.date().optional(),
  hanXuLy: z.date().nullable().optional(),
  phongChuTriId: z.string().min(1),
  nguoiXuLyChinhId: z.string().nullable().optional(),
  phongPhoiHopIds: z.array(z.string()).default([]),
  nguoiPhoiHopIds: z.array(z.string()).default([]),
  // Nhắc định kỳ — loại trừ với hanXuLy (validate ở dưới)
  tanSuatNhac: z.enum(["HANG_TUAN", "HANG_THANG", "HANG_QUY", "HANG_NAM"]).nullable().optional(),
  ngayBatDauNhac: z.date().nullable().optional(),
  ngayKetThucNhac: z.date().nullable().optional(),
});

export async function taoNhiemVu(input: z.infer<typeof TaoNhiemVuSchema>) {
  const session = await requireSession();
  const data = TaoNhiemVuSchema.parse(input);

  // Chỉ BGĐ hoặc LĐ phòng (đúng phòng chủ trì đang chọn) được tạo.
  const duocTao =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, data.phongChuTriId);
  if (!duocTao) {
    throw new Error("Bạn không có quyền giao nhiệm vụ cho phòng này.");
  }

  // Không cho vừa có hạn cụ thể vừa nhắc định kỳ — loại trừ nhau (thiết kế "giống Google Calendar").
  if (data.hanXuLy && data.tanSuatNhac) {
    throw new Error("Chỉ chọn 1 trong 2: Hạn xử lý cụ thể HOẶC Nhắc lặp lại định kỳ.");
  }

  // Người xử lý chính (nếu có) KHÔNG được trùng danh sách phối hợp — invariant đã chốt.
  if (data.nguoiXuLyChinhId && data.nguoiPhoiHopIds.includes(data.nguoiXuLyChinhId)) {
    throw new Error("Người xử lý chính không được đồng thời là người phối hợp.");
  }

  // Validate nguoiGiaoId server-side — không tin dữ liệu UI đã lọc đúng (đúng góp ý review).
  const nguoiGiao = await prisma.nhanVien.findFirst({
    where: { maNV: data.nguoiGiaoId, hoatDong: true },
  });
  if (!nguoiGiao) throw new Error("Người giao không hợp lệ.");
  const nguoiGiaoHopLe =
    nguoiGiao.quyen === "LANHDAODONVI" ||
    (nguoiGiao.quyen === "LANHDAOPHONG" && nguoiGiao.maPhong === data.phongChuTriId);
  if (!nguoiGiaoHopLe) {
    throw new Error("Người giao phải là BGĐ hoặc Lãnh đạo của đúng phòng chủ trì.");
  }

  const trangThaiKhoiTao: TrangThaiNhiemVu = data.nguoiXuLyChinhId ? "DANGXULY" : "CHO_PHAN_CONG";

  // ===== ĐỌC TRƯỚC, NGOÀI TRANSACTION =====
  // Lý do sửa: bản cũ đọc từng người (findUnique nhân viên + findUnique phòng) TUẦN TỰ BÊN TRONG
  // transaction — với vài người phối hợp, số lượt gọi DB cộng dồn dễ vượt quá 5000ms mặc định của
  // Prisma interactive transaction (lỗi "Transaction already closed"). Gom hết thành 1 câu
  // findMany duy nhất, đọc XONG rồi mới mở transaction — transaction chỉ còn thao tác ghi, nhanh
  // và ổn định bất kể số người phối hợp nhiều hay ít.
  const dsMaNVCanKiemTra = [
    ...(data.nguoiXuLyChinhId ? [data.nguoiXuLyChinhId] : []),
    ...data.nguoiPhoiHopIds,
  ];
  const dsNhanVienHopLe =
    dsMaNVCanKiemTra.length > 0
      ? await prisma.nhanVien.findMany({
          where: { maNV: { in: dsMaNVCanKiemTra }, hoatDong: true },
          select: { maNV: true, maPhong: true, phong: { select: { tenPhong: true } } },
        })
      : [];
  const banDoNhanVien = new Map(dsNhanVienHopLe.map((nv) => [nv.maNV, nv]));

  for (const maNV of dsMaNVCanKiemTra) {
    if (!banDoNhanVien.has(maNV)) {
      throw new Error(`Nhân viên ${maNV} không tồn tại hoặc đã ngừng hoạt động.`);
    }
  }

  const duLieuPhoiHop = data.nguoiPhoiHopIds.map((maNV) => {
    const nv = banDoNhanVien.get(maNV)!;
    return { maNV, maPhong: nv.maPhong, tenPhongLucDo: nv.phong.tenPhong };
  });

  // ===== CHỈ GHI — transaction gọn, không còn query đọc bên trong =====
  const nhiemVu = await prisma.$transaction(
    async (tx: PrismaTx) => {
      const created = await tx.nhiemVu.create({
        data: {
          tieuDe: data.tieuDe,
          noiDung: data.noiDung,
          mucDoUuTien: data.mucDoUuTien,
          nguon: data.nguon,
          vanBanLienQuan: data.vanBanLienQuan,
          linkFile: data.linkFile,
          nguoiTaoId: session.maNV,
          nguoiGiaoId: data.nguoiGiaoId,
          ngayGiao: data.ngayGiao ?? new Date(),
          hanXuLy: data.hanXuLy ?? null,
          phongChuTriId: data.phongChuTriId,
          nguoiXuLyChinhId: data.nguoiXuLyChinhId ?? null,
          trangThai: trangThaiKhoiTao,
          tanSuatNhac: data.tanSuatNhac ?? null,
          ngayBatDauNhac: data.ngayBatDauNhac ?? null,
          ngayKetThucNhac: data.ngayKetThucNhac ?? null,
          ngayNhacTiepTheo: data.ngayBatDauNhac ?? null, // lần đầu = chính ngày bắt đầu
          phongPhoiHop: {
            create: data.phongPhoiHopIds
              .filter((ma) => ma !== data.phongChuTriId) // không cho trùng chủ trì ngay từ lúc tạo
              .map((maPhong) => ({ maPhong })),
          },
          nguoiPhoiHop: { create: duLieuPhoiHop },
        },
      });

      // Ghi TAO_MOI luôn luôn. Nếu tạo kèm sẵn người xử lý chính, ghi THÊM 1 dòng PHAN_CONG riêng
      // ngay sau đó (trong CÙNG transaction) — đây là 2 hành động nghiệp vụ khác nhau (tạo nhiệm
      // vụ / phân công người), audit log nên tách rõ thay vì gộp vào 1 dòng ghiChu.
      await tx.nhiemVuLog.create({
        data: {
          nhiemVuId: created.id,
          hanhDong: "TAO_MOI",
          nguoiThucHienId: session.maNV,
          ghiChu: null,
        },
      });
      if (data.nguoiXuLyChinhId) {
        await tx.nhiemVuLog.create({
          data: {
            nhiemVuId: created.id,
            hanhDong: "PHAN_CONG",
            nguoiThucHienId: session.maNV,
            tuGiaTri: null,
            denGiaTri: data.nguoiXuLyChinhId,
            ghiChu: "Phân công ngay lúc tạo nhiệm vụ",
          },
        });
        await taoThongBaoTrongTx(tx, {
          nguoiNhanId: data.nguoiXuLyChinhId,
          tieuDe: `Bạn được giao nhiệm vụ: ${data.tieuDe}`,
          loai: "NHIEM_VU_DUOC_GIAO",
          duongDan: `/nhiem-vu/${created.id}`,
        });
      }

      return created;
    },
    { timeout: 15000 } // tăng từ mặc định 5000ms — an toàn hơn cho DB có độ trễ mạng (VD: Neon/pooled)
  );

  return { id: nhiemVu.id };
}

// ------------------------------------------------------------------------------------------
// ĐỌC — danh sách (tóm tắt) & chi tiết (đầy đủ)
// ------------------------------------------------------------------------------------------

export async function getNhiemVuCuaToi(vaiTro: "xuLyChinh" | "phoiHop"): Promise<NhiemVuRow[]> {
  const session = await requireSession();

  if (vaiTro === "xuLyChinh") {
    const rows = await prisma.nhiemVu.findMany({
      where: { nguoiXuLyChinhId: session.maNV },
      select: SELECT_TOM_TAT,
      orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
    });
    return rows.map(toRow);
  }

  // Nhánh "phoiHop": lấy KÈM daHoanThanhPhanViec của ĐÚNG người đang xem (where lồng bên trong
  // include chỉ trả về 1 dòng phối hợp — của chính session.maNV) để trang "Của tôi" phân loại
  // đã/chưa xử lý theo góc nhìn cá nhân, không mượn trạng thái chung của nhiệm vụ.
  const rows = await prisma.nhiemVu.findMany({
    where: { nguoiPhoiHop: { some: { maNV: session.maNV } } },
    select: {
      ...SELECT_TOM_TAT,
      nguoiPhoiHop: {
        where: { maNV: session.maNV },
        select: { daHoanThanhPhanViec: true },
      },
    },
    orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
  });

  return rows.map((r) => ({
    ...toRow(r),
    daHoanThanhPhanViecCuaToi: r.nguoiPhoiHop[0]?.daHoanThanhPhanViec ?? false,
  }));
}

export async function getNhiemVuPhong(): Promise<NhiemVuRow[]> {
  const session = await requireSession();
  if (session.quyen !== "LANHDAOPHONG" && session.quyen !== "LANHDAODONVI") {
    throw new Error("Chỉ Lãnh đạo phòng hoặc Ban Giám đốc được xem trang này.");
  }
  // LĐ phòng: chỉ phòng mình. BGĐ dùng trang Tra cứu để xem toàn đơn vị — trang này giữ đúng phạm
  // vi "quản lý phòng", không mở rộng cho BGĐ xem mọi phòng ở đây.
  if (session.quyen === "LANHDAODONVI") {
    throw new Error("Ban Giám đốc dùng trang Tra cứu để xem toàn đơn vị.");
  }

  const rows = await prisma.nhiemVu.findMany({
    where: { phongChuTriId: session.maPhong },
    select: SELECT_TOM_TAT,
    orderBy: [{ trangThai: "asc" }, { hanXuLy: "asc" }],
  });

  return rows.map(toRow);
}

export async function getNhiemVuChiTiet(id: number) {
  await requireSession(); // công khai cho ai đăng nhập, chỉ cần chặn truy cập ẩn danh

  const nv = await prisma.nhiemVu.findFirst({
    where: { id },
    include: {
      phongChuTri: { select: { tenPhong: true } },
      nguoiTao: { select: { maNV: true, hoTen: true } },
      nguoiGiao: { select: { maNV: true, hoTen: true } },
      nguoiXuLyChinh: { select: { maNV: true, hoTen: true } },
      nguoiBaoCao: { select: { maNV: true, hoTen: true } },
      nguoiDuyet: { select: { maNV: true, hoTen: true } },
      phongPhoiHop: { include: { phong: { select: { tenPhong: true } } } },
      nguoiPhoiHop: { include: { nhanVien: { select: { hoTen: true } } } },
      subTasks: { where: { isDeleted: false }, orderBy: { thuTu: "asc" } },
      logs: {
        orderBy: { thoiGian: "desc" },
        include: { nguoiThucHien: { select: { hoTen: true } } },
      },
      nguonKeHoachTuan: { select: { id: true, nam: true, tuan: true } },
    },
  });

  if (!nv) throw new Error("Không tìm thấy nhiệm vụ hoặc đã bị xoá.");
  return nv;
}

// ------------------------------------------------------------------------------------------
// CÁC HÀNH ĐỘNG ĐỔI TRẠNG THÁI — đều đi qua validateTransition() trước khi update
// ------------------------------------------------------------------------------------------

async function ghiLogVaDoiTrangThai(
  tx: PrismaTx,
  nhiemVuId: number,
  hanhDong: HanhDongNhiemVu,
  denTrangThai: TrangThaiNhiemVu,
  nguoiThucHienId: string,
  ghiChu: string | null,
  extraUpdate: Record<string, unknown> = {}
) {
  await tx.nhiemVu.update({
    where: { id: nhiemVuId },
    data: { trangThai: denTrangThai, nguoiCapNhatId: nguoiThucHienId, ...extraUpdate },
  });
  await tx.nhiemVuLog.create({
    data: { nhiemVuId, hanhDong, nguoiThucHienId, ghiChu },
  });
}

/** Người xử lý chính báo cáo hoàn thành — DANGXULY -> CHO_DUYET */
export async function baoCaoHoanThanh(nhiemVuId: number, ketQua: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  if (nv.nguoiXuLyChinhId !== session.maNV) {
    throw new Error("Chỉ người xử lý chính mới được báo cáo hoàn thành.");
  }

  const kq = validateTransition(nv.trangThai, "CHO_DUYET", null, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: false, // hành động cá nhân, quyền thật đã kiểm ở dòng trên
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  // Thứ tự transaction BẮT BUỘC: đọc ketQua cũ -> ghi log chứa bản cũ -> update ketQua mới.
  // Không được update trước rồi mới ghi log — nếu log lỗi giữa chừng, lịch sử báo cáo mất vĩnh viễn.
  await prisma.$transaction(async (tx: PrismaTx) => {
    const ketQuaCu = nv.ketQua;
    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "BAO_CAO_HOANTHANH",
        nguoiThucHienId: session.maNV,
        ghiChu: `Kết quả báo cáo: ${ketQua}${ketQuaCu ? `\n\n(Kết quả trước đó: ${ketQuaCu})` : ""}`,
      },
    });
    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: {
        ketQua,
        trangThai: "CHO_DUYET",
        nguoiBaoCaoHoanThanhId: session.maNV,
        nguoiCapNhatId: session.maNV,
      },
    });

    // Gửi cho TẤT CẢ LĐ phòng chủ trì — 1 phòng có thể có nhiều hơn 1 người giữ quyen=LANHDAOPHONG.
    const dsLanhDao = await tx.nhanVien.findMany({
      where: { maPhong: nv.phongChuTriId, quyen: "LANHDAOPHONG", hoatDong: true },
      select: { maNV: true },
    });
    await taoThongBaoNhieuNguoiTrongTx(
      tx,
      dsLanhDao.map((n: { maNV: string }) => n.maNV),
      {
        tieuDe: `Nhiệm vụ chờ duyệt: ${nv.tieuDe}`,
        loai: "NHIEM_VU_CHO_DUYET",
        duongDan: `/nhiem-vu/${nhiemVuId}`,
      }
    );
  });
}

/** LĐ phòng chủ trì duyệt — CHO_DUYET -> HOANTHANH */
export async function duyetHoanThanh(nhiemVuId: number, ghiChu?: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "HOANTHANH", null, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "DUYET_HOANTHANH", "HOANTHANH", session.maNV, ghiChu ?? null, {
      nguoiDuyetId: session.maNV, // CHỈ set ở đây — đúng nguyên tắc không chọn trước
      thoiGianHoanThanh: new Date(),
      tienDoPhanTram: 100,
    });
    if (nv.nguoiXuLyChinhId) {
      await taoThongBaoTrongTx(tx, {
        nguoiNhanId: nv.nguoiXuLyChinhId,
        tieuDe: `Nhiệm vụ đã được duyệt hoàn thành: ${nv.tieuDe}`,
        loai: "NHIEM_VU_DA_DUYET",
        duongDan: `/nhiem-vu/${nhiemVuId}`,
      });
    }
  });
}

/** LĐ phòng chủ trì yêu cầu làm lại — CHO_DUYET -> DANGXULY, bắt buộc lý do */
export async function yeuCauXuLyLai(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "DANGXULY", lyDo, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "YEU_CAU_XULY_LAI", "DANGXULY", session.maNV, lyDo);
    if (nv.nguoiXuLyChinhId) {
      await taoThongBaoTrongTx(tx, {
        nguoiNhanId: nv.nguoiXuLyChinhId,
        tieuDe: `Yêu cầu xử lý lại: ${nv.tieuDe}`,
        noiDung: lyDo,
        loai: "NHIEM_VU_YEU_CAU_LAM_LAI",
        duongDan: `/nhiem-vu/${nhiemVuId}`,
      });
    }
  });
}

/** Mở lại — HOANTHANH|TAMDUNG -> DANGXULY, lý do optional */
export async function moLaiNhiemVu(nhiemVuId: number, ghiChu?: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "DANGXULY", null, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "MO_LAI", "DANGXULY", session.maNV, ghiChu ?? null);
  });
}

/** Tạm dừng — (DANGXULY|CHO_PHAN_CONG) -> TAMDUNG, bắt buộc lý do */
export async function tamDungNhiemVu(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "TAMDUNG", lyDo, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "TAMDUNG", "TAMDUNG", session.maNV, lyDo);
  });
}

/** Huỷ — (DANGXULY|CHO_PHAN_CONG) -> HUY, bắt buộc lý do, KHÔNG có đường quay lại */
export async function huyNhiemVu(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "HUY", lyDo, {
    quyen: session.quyen,
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "HUY", "HUY", session.maNV, lyDo);
  });
}

// ------------------------------------------------------------------------------------------
// CRUD CƠ BẢN CÒN LẠI — sửa tiêu đề/nội dung/ưu tiên, đổi hạn, cập nhật tiến độ thủ công.
// Thuộc phạm vi Phase 1 "Core CRUD" (khác Phase 4 subtask / Phase 5 định kỳ / Phase 6 thông báo).
// ------------------------------------------------------------------------------------------

const CAC_TRANG_THAI_CHO_SUA_NOI_DUNG: TrangThaiNhiemVu[] = ["CHO_PHAN_CONG", "DANGXULY"];

/** Sửa tieuDe/noiDung/mucDoUuTien — CHỈ khi còn CHO_PHAN_CONG/DANGXULY (mục 4.1 spec) */
export async function suaThongTinCoBan(
  nhiemVuId: number,
  data: { tieuDe?: string; noiDung?: string; mucDoUuTien?: MucDoUuTien }
) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const duocPhepThucHien =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId);
  if (!duocPhepThucHien) throw new Error("Chỉ BGĐ hoặc Lãnh đạo phòng chủ trì được sửa.");

  if (!CAC_TRANG_THAI_CHO_SUA_NOI_DUNG.includes(nv.trangThai)) {
    throw new Error("Không thể sửa nội dung khi nhiệm vụ đã chờ duyệt/hoàn thành/tạm dừng/huỷ.");
  }

  await prisma.$transaction(async (tx: PrismaTx) => {
    if (data.tieuDe !== undefined || data.noiDung !== undefined) {
      await tx.nhiemVuLog.create({
        data: {
          nhiemVuId,
          hanhDong: "THAY_DOI_NOI_DUNG",
          nguoiThucHienId: session.maNV,
          tuGiaTri: nv.tieuDe,
          denGiaTri: data.tieuDe ?? nv.tieuDe,
          ghiChu: data.noiDung !== undefined ? `Nội dung mới: ${data.noiDung}` : null,
        },
      });
    }
    if (data.mucDoUuTien !== undefined && data.mucDoUuTien !== nv.mucDoUuTien) {
      await tx.nhiemVuLog.create({
        data: {
          nhiemVuId,
          hanhDong: "THAY_DOI_UU_TIEN",
          nguoiThucHienId: session.maNV,
          tuGiaTri: nv.mucDoUuTien,
          denGiaTri: data.mucDoUuTien,
        },
      });
    }
    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: {
        tieuDe: data.tieuDe ?? undefined,
        noiDung: data.noiDung ?? undefined,
        mucDoUuTien: data.mucDoUuTien ?? undefined,
        nguoiCapNhatId: session.maNV,
      },
    });
  });
}

/** Đổi hạn xử lý — không giới hạn theo trạng thái (có thể cần dời hạn cả khi đang xử lý dở) */
export async function doiHanXuLy(nhiemVuId: number, hanMoi: Date | null) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const duocPhepThucHien =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId);
  if (!duocPhepThucHien) throw new Error("Chỉ BGĐ hoặc Lãnh đạo phòng chủ trì được đổi hạn.");

  // Không reject hạn quá khứ — chỉ cảnh báo ở UI (đã chốt ở spec mục 6.10). "Quá hạn" luôn tính
  // động (derived) lúc hiển thị, KHÔNG lưu cứng field boolean ở đây.
  await prisma.$transaction(async (tx: PrismaTx) => {
    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: { hanXuLy: hanMoi, nguoiCapNhatId: session.maNV },
    });
    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "THAY_DOI_HAN",
        nguoiThucHienId: session.maNV,
        tuGiaTri: nv.hanXuLy ? nv.hanXuLy.toISOString().slice(0, 10) : null,
        denGiaTri: hanMoi ? hanMoi.toISOString().slice(0, 10) : null,
      },
    });
  });
}

/** Cập nhật tiến độ % thủ công — CHỈ dùng khi nhiệm vụ CHƯA có subtask (Phase 4 sẽ tự động ẩn ô
 * này trên UI khi subTasks.length > 0, ở đây chặn thêm 1 lớp server-side cho chắc). */
export async function capNhatTienDoThuCong(nhiemVuId: number, tienDoMoi: number) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  if (nv.nguoiXuLyChinhId !== session.maNV) {
    throw new Error("Chỉ người xử lý chính mới được cập nhật tiến độ.");
  }
  if (tienDoMoi < 0 || tienDoMoi > 100) {
    throw new Error("Tiến độ phải nằm trong khoảng 0-100.");
  }

  const soLuongSubTask = await prisma.nhiemVuSubTask.count({ where: { nhiemVuId } });
  if (soLuongSubTask > 0) {
    throw new Error("Nhiệm vụ đang dùng checklist con — tiến độ được tự tính, không nhập tay được.");
  }

  await prisma.$transaction(async (tx: PrismaTx) => {
    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: { tienDoPhanTram: tienDoMoi, nguoiCapNhatId: session.maNV },
    });
    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "CAP_NHAT_TIENDO",
        nguoiThucHienId: session.maNV,
        tuGiaTri: String(nv.tienDoPhanTram),
        denGiaTri: String(tienDoMoi),
      },
    });
  });
}

// ------------------------------------------------------------------------------------------
// PHÂN CÔNG BỔ SUNG — đổi người xử lý chính + sửa danh sách phối hợp, lặp lại được nhiều lần
// (mục 3.1 spec). KHÔNG phải hành động đổi trangThai theo nghĩa state machine (trừ trường hợp
// CHO_PHAN_CONG -> DANGXULY khi lần đầu có người xử lý), nên không gọi validateTransition mà tự
// kiểm tra quyền + điều kiện riêng.
// ------------------------------------------------------------------------------------------

export async function phanCongBoSung(
  nhiemVuId: number,
  nguoiXuLyChinhMoiId: string | null,
  danhSachPhoiHopMoi: string[],
  ghiChu?: string
) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const duocPhepThucHien =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId);
  if (!duocPhepThucHien) throw new Error("Chỉ BGĐ hoặc Lãnh đạo phòng chủ trì được phân công.");

  if (nv.trangThai === "HOANTHANH" || nv.trangThai === "HUY") {
    throw new Error("Không thể phân công lại nhiệm vụ đã hoàn thành hoặc đã huỷ.");
  }

  // Invariant: xử lý chính không trùng phối hợp — tự động loại khỏi phối hợp nếu trùng.
  const dsPhoiHopSauKhiLoc = nguoiXuLyChinhMoiId
    ? danhSachPhoiHopMoi.filter((ma) => ma !== nguoiXuLyChinhMoiId)
    : danhSachPhoiHopMoi;

  const nguoiXuLyCuId = nv.nguoiXuLyChinhId;
  const laLanDauCoNguoiXuLy = !nguoiXuLyCuId && !!nguoiXuLyChinhMoiId;
  const coDoiNguoiXuLy = nguoiXuLyCuId !== nguoiXuLyChinhMoiId;

  // Lần đầu gán người xử lý (CHO_PHAN_CONG -> DANGXULY) LÀ 1 transition thật trên bản ghi đã tồn
  // tại — đi qua validateTransition() để nhất quán với nguyên tắc "mọi đổi trangThai phải qua state
  // machine", dù bảng transition đã cho phép sẵn trường hợp này (khác lúc TẠO MỚI: tạo mới là INSERT,
  // không có "trạng thái trước đó" để mà transition, nên không áp dụng cùng yêu cầu).
  let denTrangThai = nv.trangThai;
  if (laLanDauCoNguoiXuLy) {
    const kq = validateTransition(nv.trangThai, "DANGXULY", null, {
      quyen: session.quyen,
      laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
    });
    if (!kq.hopLe) throw new Error(kq.loi);
    denTrangThai = "DANGXULY";
  }

  // ===== ĐỌC TRƯỚC, NGOÀI TRANSACTION (cùng lý do đã sửa ở taoNhiemVu) =====
  const dsMaNVCanKiemTra = [
    ...(nguoiXuLyChinhMoiId ? [nguoiXuLyChinhMoiId] : []),
    ...dsPhoiHopSauKhiLoc,
  ];
  const dsNhanVienHopLe =
    dsMaNVCanKiemTra.length > 0
      ? await prisma.nhanVien.findMany({
          where: { maNV: { in: dsMaNVCanKiemTra }, hoatDong: true },
          select: { maNV: true, maPhong: true, phong: { select: { tenPhong: true } } },
        })
      : [];
  const banDoNhanVien = new Map(dsNhanVienHopLe.map((nv) => [nv.maNV, nv]));
  for (const maNV of dsMaNVCanKiemTra) {
    if (!banDoNhanVien.has(maNV)) {
      throw new Error(`Nhân viên ${maNV} không tồn tại hoặc đã ngừng hoạt động.`);
    }
  }
  const phoiHopCu = await prisma.nhiemVuNguoiPhoiHop.findMany({ where: { nhiemVuId } });
  const maCu = new Set(phoiHopCu.map((p: { maNV: string }) => p.maNV));
  const maMoi = new Set(dsPhoiHopSauKhiLoc);
  const canDongBoLaiPhoiHop = maCu.size !== maMoi.size || [...maCu].some((m) => !maMoi.has(m));
  const duLieuPhoiHopMoi = dsPhoiHopSauKhiLoc.map((maNV) => {
    const nv = banDoNhanVien.get(maNV)!;
    return { nhiemVuId, maNV, maPhong: nv.maPhong, tenPhongLucDo: nv.phong.tenPhong };
  });

  // ===== CHỈ GHI =====
  await prisma.$transaction(
    async (tx: PrismaTx) => {
      await tx.nhiemVu.update({
        where: { id: nhiemVuId },
        data: {
          nguoiXuLyChinhId: nguoiXuLyChinhMoiId,
          trangThai: denTrangThai,
          nguoiCapNhatId: session.maNV,
        },
      });

      if (coDoiNguoiXuLy) {
        await tx.nhiemVuLog.create({
          data: {
            nhiemVuId,
            hanhDong: laLanDauCoNguoiXuLy ? "PHAN_CONG" : "THAY_DOI_NGUOIXULY",
            nguoiThucHienId: session.maNV,
            tuGiaTri: nguoiXuLyCuId,
            denGiaTri: nguoiXuLyChinhMoiId,
            ghiChu: ghiChu ?? null,
          },
        });
        if (nguoiXuLyChinhMoiId) {
          await taoThongBaoTrongTx(tx, {
            nguoiNhanId: nguoiXuLyChinhMoiId,
            tieuDe: `Bạn được phân công xử lý: ${nv.tieuDe}`,
            loai: "NHIEM_VU_PHAN_CONG",
            duongDan: `/nhiem-vu/${nhiemVuId}`,
          });
        }
      }

      // Đồng bộ lại danh sách phối hợp: xoá hết rồi tạo lại theo danh sách mới — đơn giản, đúng cho
      // quy mô nhỏ (vài người/nhiệm vụ). Dữ liệu đã chuẩn bị sẵn ở duLieuPhoiHopMoi, transaction
      // không còn phải đọc gì thêm.
      if (canDongBoLaiPhoiHop) {
        await tx.nhiemVuNguoiPhoiHop.deleteMany({ where: { nhiemVuId } });
        if (duLieuPhoiHopMoi.length > 0) {
          await tx.nhiemVuNguoiPhoiHop.createMany({ data: duLieuPhoiHopMoi });
        }
        await tx.nhiemVuLog.create({
          data: {
            nhiemVuId,
            hanhDong: "PHAN_CONG",
            nguoiThucHienId: session.maNV,
            ghiChu: `Cập nhật danh sách phối hợp: ${dsPhoiHopSauKhiLoc.join(", ") || "(rỗng)"}`,
          },
        });
      }
    },
    { timeout: 15000 }
  );
}

// ------------------------------------------------------------------------------------------
// ĐỔI PHÒNG CHỦ TRÌ — chỉ BGĐ. Reset người xử lý + về CHO_PHAN_CONG + loại phòng phối hợp trùng,
// TẤT CẢ trong 1 transaction (invariant đã chốt ở spec mục 3.2).
// ------------------------------------------------------------------------------------------

export async function doiPhongChuTri(nhiemVuId: number, phongMoiId: string, lyDo: string) {
  const session = await requireSession();
  if (!laBGD(session.quyen)) {
    throw new Error("Chỉ Ban Giám đốc được đổi phòng chủ trì.");
  }
  if (!lyDo?.trim()) {
    throw new Error("Bắt buộc nhập lý do khi đổi phòng chủ trì.");
  }

  const nv = await layNhiemVuHoacLoi(nhiemVuId);
  if (nv.phongChuTriId === phongMoiId) {
    throw new Error("Phòng chủ trì mới phải khác phòng hiện tại.");
  }
  if (nv.trangThai === "HOANTHANH" || nv.trangThai === "HUY") {
    throw new Error("Không thể đổi phòng chủ trì của nhiệm vụ đã hoàn thành hoặc đã huỷ.");
  }

  await prisma.$transaction(async (tx: PrismaTx) => {
    // Loại phòng mới khỏi danh sách phối hợp NẾU đang trùng — tránh 1 phòng vừa chủ trì vừa phối hợp.
    await tx.nhiemVuPhong.deleteMany({ where: { nhiemVuId, maPhong: phongMoiId } });

    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: {
        phongChuTriId: phongMoiId,
        nguoiXuLyChinhId: null,
        trangThai: "CHO_PHAN_CONG",
        nguoiCapNhatId: session.maNV,
      },
    });

    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "THAY_DOI_PHONG_CHU_TRI",
        nguoiThucHienId: session.maNV,
        tuGiaTri: nv.phongChuTriId,
        denGiaTri: phongMoiId,
        ghiChu: lyDo,
      },
    });
  });
}

// ------------------------------------------------------------------------------------------
// PHASE 4 — SUBTASK (checklist con). Quyết định mặc định (CHƯA được xác nhận riêng trong hội
// thoại, áp dụng theo đúng tinh thần đơn giản đã chốt xuyên suốt): CHỈ người xử lý chính được
// thêm/sửa/tick/xoá — LĐ phòng xem qua trang chi tiết nhưng không can thiệp trực tiếp vào
// checklist của người xử lý. Không giới hạn cứng số lượng subtask (chỉ giới hạn độ dài nội dung).
// CẦN BẠN XÁC NHẬN LẠI nếu muốn khác (VD: cho LĐ phòng sửa/xoá, hoặc gán subtask cho từng người
// phối hợp riêng).
// ------------------------------------------------------------------------------------------

/** Tính lại tienDoPhanTram từ subtask — công thức đơn giản, không trọng số (đã chốt ở spec mục 6.5).
 * Nếu KHÔNG còn subtask nào (đã xoá hết), GIỮ NGUYÊN tienDoPhanTram hiện có — không tự reset về 0,
 * để chuyển êm sang chế độ nhập tay mà không mất dữ liệu (spec mục 6.6). */
async function tinhLaiTienDoTuSubTask(tx: PrismaTx, nhiemVuId: number) {
  const subTasks = await tx.nhiemVuSubTask.findMany({ where: { nhiemVuId } });
  if (subTasks.length === 0) return;
  const daXong = subTasks.filter((s: { daHoanThanh: boolean }) => s.daHoanThanh).length;
  const phanTram = Math.round((daXong / subTasks.length) * 100);
  await tx.nhiemVu.update({ where: { id: nhiemVuId }, data: { tienDoPhanTram: phanTram } });
}

async function assertLaNguoiXuLyChinh(nhiemVuId: number, maNV: string) {
  const nv = await layNhiemVuHoacLoi(nhiemVuId);
  if (nv.nguoiXuLyChinhId !== maNV) {
    throw new Error("Chỉ người xử lý chính mới được thao tác với checklist.");
  }
  return nv;
}

export async function themSubTask(nhiemVuId: number, noiDung: string) {
  const session = await requireSession();
  await assertLaNguoiXuLyChinh(nhiemVuId, session.maNV);
  if (!noiDung.trim()) throw new Error("Vui lòng nhập nội dung việc con.");
  if (noiDung.length > 500) throw new Error("Nội dung việc con quá dài (tối đa 500 ký tự).");

  await prisma.$transaction(async (tx: PrismaTx) => {
    const soLuong = await tx.nhiemVuSubTask.count({ where: { nhiemVuId } });
    await tx.nhiemVuSubTask.create({
      data: { nhiemVuId, noiDung, thuTu: soLuong, nguoiTaoId: session.maNV },
    });
    // Thêm subtask mới (chưa tick) làm tổng số tăng -> % giảm tương ứng, cần tính lại ngay.
    await tinhLaiTienDoTuSubTask(tx, nhiemVuId);
  });
}

export async function suaSubTask(subTaskId: number, noiDungMoi: string) {
  const session = await requireSession();
  const sub = await prisma.nhiemVuSubTask.findFirst({ where: { id: subTaskId } });
  if (!sub) throw new Error("Không tìm thấy việc con.");
  await assertLaNguoiXuLyChinh(sub.nhiemVuId, session.maNV);
  if (!noiDungMoi.trim()) throw new Error("Nội dung không được để trống.");

  await prisma.nhiemVuSubTask.update({ where: { id: subTaskId }, data: { noiDung: noiDungMoi } });
}

export async function tickSubTask(subTaskId: number, daHoanThanh: boolean) {
  const session = await requireSession();
  const sub = await prisma.nhiemVuSubTask.findFirst({ where: { id: subTaskId } });
  if (!sub) throw new Error("Không tìm thấy việc con.");
  await assertLaNguoiXuLyChinh(sub.nhiemVuId, session.maNV);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await tx.nhiemVuSubTask.update({
      where: { id: subTaskId },
      data: {
        daHoanThanh,
        nguoiHoanThanhId: daHoanThanh ? session.maNV : null,
        thoiGianHoanThanh: daHoanThanh ? new Date() : null,
      },
    });
    // Cố ý KHÔNG ghi NhiemVuLog cho từng lần tick — tránh loãng timeline chính (đã chốt spec mục 6.4).
    await tinhLaiTienDoTuSubTask(tx, sub.nhiemVuId);
  });
}

export async function xoaSubTask(subTaskId: number) {
  const session = await requireSession();
  const sub = await prisma.nhiemVuSubTask.findFirst({ where: { id: subTaskId } });
  if (!sub) throw new Error("Không tìm thấy việc con.");
  await assertLaNguoiXuLyChinh(sub.nhiemVuId, session.maNV);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await tx.nhiemVuSubTask.update({ where: { id: subTaskId }, data: { isDeleted: true } });
    // Nếu đây là subtask cuối cùng, tinhLaiTienDoTuSubTask() tự bỏ qua (count=0) -> tienDoPhanTram
    // giữ nguyên giá trị hiện có, đúng hành vi "chuyển êm sang nhập tay" đã chốt.
    await tinhLaiTienDoTuSubTask(tx, sub.nhiemVuId);
  });
}

// ------------------------------------------------------------------------------------------
// PHASE 5 — NHẮC ĐỊNH KỲ: "Xong đợt". Người xử lý chính tự tick, KHÔNG qua duyệt LĐ phòng (đã
// chốt). Reset tiến độ + (nếu có subtask) reset checklist cho đợt mới + tính ngày nhắc kế tiếp +
// tự tắt dungNhacLai nếu vượt ngayKetThucNhac.
// ------------------------------------------------------------------------------------------

/** Cộng thêm N tháng vào 1 ngày, GIỮ NGUYÊN "ngày trong tháng" — kẹp về ngày cuối tháng đích nếu
 * ngày gốc không tồn tại ở đó (VD: 31/01 + 1 tháng -> 28 hoặc 29/02, không tự nhảy sang tháng 3). */
function addThangGiuNgay(date: Date, soThang: number): Date {
  const nam = date.getUTCFullYear();
  const thang = date.getUTCMonth();
  const ngay = date.getUTCDate();
  const ngayCuoiThangDich = new Date(Date.UTC(nam, thang + soThang + 1, 0)).getUTCDate();
  return new Date(Date.UTC(nam, thang + soThang, Math.min(ngay, ngayCuoiThangDich)));
}

function tinhNgayNhacTiepTheo(tuNgay: Date, tanSuat: TanSuatNhac): Date {
  switch (tanSuat) {
    case "HANG_TUAN": {
      const d = new Date(tuNgay);
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    }
    case "HANG_THANG":
      return addThangGiuNgay(tuNgay, 1);
    case "HANG_QUY":
      return addThangGiuNgay(tuNgay, 3);
    case "HANG_NAM":
      return addThangGiuNgay(tuNgay, 12);
  }
}

export async function hoanThanhDotDinhKy(nhiemVuId: number) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  if (nv.nguoiXuLyChinhId !== session.maNV) {
    throw new Error("Chỉ người xử lý chính mới được đánh dấu xong đợt.");
  }
  if (!nv.tanSuatNhac) {
    throw new Error("Nhiệm vụ này không phải dạng nhắc định kỳ.");
  }
  if (nv.dungNhacLai) {
    throw new Error("Nhiệm vụ đã dừng nhắc, không thể tiếp tục đánh dấu xong đợt.");
  }

  const moc = nv.ngayNhacTiepTheo ?? nv.ngayBatDauNhac;
  if (!moc) throw new Error("Thiếu ngày bắt đầu nhắc, không tính được đợt tiếp theo.");

  const ngayNhacMoi = tinhNgayNhacTiepTheo(moc, nv.tanSuatNhac);
  const vuotHan = nv.ngayKetThucNhac ? ngayNhacMoi.getTime() > nv.ngayKetThucNhac.getTime() : false;
  const soDotMoi = nv.soDotDaXong + 1;

  await prisma.$transaction(async (tx: PrismaTx) => {
    // Reset checklist cho đợt mới NẾU nhiệm vụ đang dùng chế độ subtask — tránh đợt mới hiển thị
    // 100% kế thừa từ đợt cũ (đã chốt spec mục 6.7).
    await tx.nhiemVuSubTask.updateMany({
      where: { nhiemVuId, isDeleted: false },
      data: { daHoanThanh: false, nguoiHoanThanhId: null, thoiGianHoanThanh: null },
    });

    await tx.nhiemVu.update({
      where: { id: nhiemVuId },
      data: {
        tienDoPhanTram: 0,
        soDotDaXong: soDotMoi,
        ngayNhacTiepTheo: ngayNhacMoi,
        dungNhacLai: vuotHan,
        nguoiCapNhatId: session.maNV,
      },
    });

    // Action log RIÊNG (HOAN_THANH_DOT_DINH_KY), KHÔNG dùng chung BAO_CAO_HOANTHANH — để phân biệt
    // rõ trên timeline giữa "báo cáo hoàn thành nhiệm vụ thật" và "xong 1 đợt định kỳ" (đã chốt).
    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "HOAN_THANH_DOT_DINH_KY",
        nguoiThucHienId: session.maNV,
        ghiChu: `Hoàn thành đợt ${soDotMoi}${vuotHan ? " — đã tới hạn kết thúc, tự động dừng nhắc từ đây" : ""}`,
      },
    });
  });
}

// ------------------------------------------------------------------------------------------
// PHASE 7 — DASHBOARD: cảnh báo hạn, thống kê tổng quan, tra cứu có phân trang server-side.
// ------------------------------------------------------------------------------------------

const SO_NGAY_CANH_BAO = 3; // đã chốt: dùng chung 3 ngày cho cả nhiệm vụ thường và định kỳ

export type CanhBaoRow = {
  id: number;
  tieuDe: string;
  loai: "SAP_DEN_HAN" | "QUA_HAN" | "DINH_KY_SAP_NHAC";
  moc: Date;
};

/** Phạm vi dữ liệu tự co theo quyền — BGĐ toàn đơn vị, LĐ phòng phạm vi phòng, user thường "của tôi". */
function phamViTheoQuyen(session: { quyen: string; maPhong: string; maNV: string }) {
  if (session.quyen === "LANHDAODONVI") return {};
  if (session.quyen === "LANHDAOPHONG") return { phongChuTriId: session.maPhong };
  return { nguoiXuLyChinhId: session.maNV };
}

export async function getCanhBaoHanNhiemVu(): Promise<CanhBaoRow[]> {
  const session = await requireSession();
  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);
  const moc = new Date(homNay);
  moc.setDate(moc.getDate() + SO_NGAY_CANH_BAO);
  const phamVi = phamViTheoQuyen(session);

  const [sapHan, quaHan, dinhKySapNhac] = await Promise.all([
    prisma.nhiemVu.findMany({
      where: { ...phamVi, hanXuLy: { gte: homNay, lte: moc }, trangThai: { notIn: ["HOANTHANH", "HUY"] } },
      select: { id: true, tieuDe: true, hanXuLy: true },
    }),
    prisma.nhiemVu.findMany({
      where: { ...phamVi, hanXuLy: { lt: homNay }, trangThai: { notIn: ["HOANTHANH", "HUY"] } },
      select: { id: true, tieuDe: true, hanXuLy: true },
    }),
    prisma.nhiemVu.findMany({
      where: { ...phamVi, tanSuatNhac: { not: null }, dungNhacLai: false, ngayNhacTiepTheo: { gte: homNay, lte: moc } },
      select: { id: true, tieuDe: true, ngayNhacTiepTheo: true },
    }),
  ]);

  const ket: CanhBaoRow[] = [
    ...sapHan.map((r) => ({ id: r.id, tieuDe: r.tieuDe, loai: "SAP_DEN_HAN" as const, moc: r.hanXuLy! })),
    ...quaHan.map((r) => ({ id: r.id, tieuDe: r.tieuDe, loai: "QUA_HAN" as const, moc: r.hanXuLy! })),
    ...dinhKySapNhac.map((r) => ({
      id: r.id,
      tieuDe: r.tieuDe,
      loai: "DINH_KY_SAP_NHAC" as const,
      moc: r.ngayNhacTiepTheo!,
    })),
  ];
  return ket.sort((a, b) => a.moc.getTime() - b.moc.getTime());
}

export type ThongKeTongQuan = {
  tongSo: number;
  theoTrangThai: Partial<Record<TrangThaiNhiemVu, number>>;
  soQuaHan: number;
  theoPhong: { maPhong: string; tenPhong: string; theoTrangThai: Partial<Record<TrangThaiNhiemVu, number>> }[];
};

export async function getThongKeTongQuan(): Promise<ThongKeTongQuan> {
  const session = await requireSession();
  const phamVi =
    session.quyen === "USER"
      ? {
          OR: [{ nguoiXuLyChinhId: session.maNV }, { nguoiPhoiHop: { some: { maNV: session.maNV } } }],
        }
      : phamViTheoQuyen(session);

  const rows = await prisma.nhiemVu.findMany({
    where: phamVi,
    select: { trangThai: true, hanXuLy: true, phongChuTriId: true, phongChuTri: { select: { tenPhong: true } } },
  });

  const homNay = new Date();
  homNay.setHours(0, 0, 0, 0);

  const theoTrangThai: Partial<Record<TrangThaiNhiemVu, number>> = {};
  let soQuaHan = 0;
  const theoPhongMap = new Map<string, { tenPhong: string; theoTrangThai: Partial<Record<TrangThaiNhiemVu, number>> }>();

  for (const r of rows) {
    theoTrangThai[r.trangThai] = (theoTrangThai[r.trangThai] ?? 0) + 1;
    if (r.hanXuLy && r.hanXuLy < homNay && r.trangThai !== "HOANTHANH" && r.trangThai !== "HUY") {
      soQuaHan++;
    }
    if (!theoPhongMap.has(r.phongChuTriId)) {
      theoPhongMap.set(r.phongChuTriId, { tenPhong: r.phongChuTri.tenPhong, theoTrangThai: {} });
    }
    const p = theoPhongMap.get(r.phongChuTriId)!;
    p.theoTrangThai[r.trangThai] = (p.theoTrangThai[r.trangThai] ?? 0) + 1;
  }

  return {
    tongSo: rows.length,
    theoTrangThai,
    soQuaHan,
    theoPhong: Array.from(theoPhongMap.entries()).map(([maPhong, v]) => ({ maPhong, ...v })),
  };
}

// ------------------------------------------------------------------------------------------
// TRA CỨU — công khai (ai đăng nhập cũng xem), phân trang SERVER-SIDE (khác Phòng/Của tôi vốn
// phân trang client-side vì quy mô nhỏ — Tra cứu là toàn cơ quan, có thể nhiều dữ liệu hơn).
// ------------------------------------------------------------------------------------------

const SO_DONG_TRA_CUU = 15;

export type TraCuuParams = {
  tuNgay?: Date;
  denNgay?: Date;
  theoLoaiNgay?: "ngayGiao" | "hanXuLy";
  phongChuTriId?: string;
  nguoiXuLyChinhId?: string;
  nguoiGiaoId?: string;
  nguoiTaoId?: string;
  trangThai?: TrangThaiNhiemVu;
  mucDoUuTien?: MucDoUuTien;
  tuKhoa?: string;
  chiQuaHan?: boolean;
  trang?: number;
  soDongMoiTrang?: number; // MỚI — cho phép người dùng chọn 10/25/50, mặc định giữ 15 như cũ
};

export async function traCuuNhiemVu(params: TraCuuParams): Promise<{ rows: NhiemVuRow[]; tongSo: number }> {
  await requireSession();

  const truongNgay = params.theoLoaiNgay ?? "hanXuLy";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (params.tuNgay || params.denNgay) {
    where[truongNgay] = {
      ...(params.tuNgay ? { gte: params.tuNgay } : {}),
      ...(params.denNgay ? { lte: params.denNgay } : {}),
    };
  }
  if (params.phongChuTriId) where.phongChuTriId = params.phongChuTriId;
  if (params.nguoiXuLyChinhId) where.nguoiXuLyChinhId = params.nguoiXuLyChinhId;
  if (params.nguoiGiaoId) where.nguoiGiaoId = params.nguoiGiaoId;
  if (params.nguoiTaoId) where.nguoiTaoId = params.nguoiTaoId;
  if (params.mucDoUuTien) where.mucDoUuTien = params.mucDoUuTien;
  if (params.tuKhoa) {
    where.OR = [
      { tieuDe: { contains: params.tuKhoa, mode: "insensitive" } },
      { noiDung: { contains: params.tuKhoa, mode: "insensitive" } },
    ];
  }

  // LƯU Ý: nếu vừa chọn "chỉ quá hạn" vừa chọn 1 trangThai cụ thể (VD: HOANTHANH) — 2 điều kiện này
  // mâu thuẫn nghiệp vụ (đã hoàn thành thì không thể "quá hạn" nữa) — ưu tiên chiQuaHan, bỏ qua lựa
  // chọn trangThai của người dùng trong trường hợp đó thay vì để where rỗng bất thường.
  if (params.chiQuaHan) {
    const homNay = new Date();
    homNay.setHours(0, 0, 0, 0);
    where.hanXuLy = { ...(where.hanXuLy ?? {}), lt: homNay };
    where.trangThai = { notIn: ["HOANTHANH", "HUY"] };
  } else if (params.trangThai) {
    where.trangThai = params.trangThai;
  }

  const trang = params.trang ?? 1;
  const soDongMoiTrang = params.soDongMoiTrang ?? SO_DONG_TRA_CUU;

  const [rows, tongSo] = await Promise.all([
    prisma.nhiemVu.findMany({
      where,
      select: SELECT_TOM_TAT,
      orderBy: [{ hanXuLy: "asc" }, { id: "desc" }],
      skip: (trang - 1) * soDongMoiTrang,
      take: soDongMoiTrang,
    }),
    prisma.nhiemVu.count({ where }),
  ]);

  return { rows: rows.map(toRow), tongSo };
}

// Ghi chú: hàm suaThongTinCoBan() đã được định nghĩa đầy đủ ở phần "CRUD CƠ BẢN CÒN LẠI" phía trên
// (gần đầu file, ngay sau huyNhiemVu()) — dùng đúng logic mô tả ở spec mục 4.1. Không định nghĩa
// lại ở đây để tránh lỗi "Duplicate function implementation".

// ------------------------------------------------------------------------------------------
// NGƯỜI PHỐI HỢP TỰ CẬP NHẬT — ghi chú đóng góp + đánh dấu hoàn thành PHẦN VIỆC của riêng họ.
// KHÁC với báo cáo hoàn thành của người xử lý chính: đây chỉ là theo dõi cho từng cá nhân phối
// hợp, KHÔNG ảnh hưởng trangThai hay tienDoPhanTram chung của cả NhiemVu.
// ------------------------------------------------------------------------------------------

export async function capNhatPhoiHopCuaToi(
  nhiemVuId: number,
  data: { ghiChu?: string; daHoanThanhPhanViec?: boolean }
) {
  const session = await requireSession();

  const dong = await prisma.nhiemVuNguoiPhoiHop.findFirst({
    where: { nhiemVuId, maNV: session.maNV },
  });
  if (!dong) {
    throw new Error("Bạn không phải là người phối hợp của nhiệm vụ này.");
  }

  await prisma.$transaction(async (tx: PrismaTx) => {
    await tx.nhiemVuNguoiPhoiHop.update({
      where: { id: dong.id },
      data: {
        ghiChu: data.ghiChu !== undefined ? data.ghiChu : undefined,
        daHoanThanhPhanViec: data.daHoanThanhPhanViec !== undefined ? data.daHoanThanhPhanViec : undefined,
        thoiGianHoanThanhPhanViec:
          data.daHoanThanhPhanViec === true
            ? new Date()
            : data.daHoanThanhPhanViec === false
              ? null
              : undefined,
      },
    });

    // Tận dụng action log có sẵn DONG_GOP_PHOIHOP (không thêm enum mới) — ghi rõ trong ghiChu đây
    // là cập nhật ghi chú hay đánh dấu hoàn thành phần việc, để phân biệt khi đọc lại timeline.
    const moTa =
      data.daHoanThanhPhanViec !== undefined
        ? data.daHoanThanhPhanViec
          ? "Đã hoàn thành phần việc phối hợp"
          : "Bỏ đánh dấu hoàn thành phần việc phối hợp"
        : `Cập nhật ghi chú đóng góp: ${data.ghiChu}`;
    await tx.nhiemVuLog.create({
      data: {
        nhiemVuId,
        hanhDong: "DONG_GOP_PHOIHOP",
        nguoiThucHienId: session.maNV,
        ghiChu: moTa,
      },
    });
  });
}

// ------------------------------------------------------------------------------------------
// TRANG "NHIỆM VỤ TÔI GIAO" — dành cho BGĐ/LĐ phòng theo dõi những nhiệm vụ họ đứng tên Người
// giao (nguoiGiaoId), xem đang thực hiện tới đâu — KHÁC "Nhiệm vụ của tôi" (vốn lọc theo Xử lý
// chính/Phối hợp) và KHÁC "Nhiệm vụ Phòng" (lọc theo phòng chủ trì, chỉ LĐ đúng phòng đó xem được).
// Người giao có thể ở phòng khác/BGĐ nên không dùng lại getNhiemVuPhong().
// ------------------------------------------------------------------------------------------

export async function getNhiemVuToiGiao(): Promise<NhiemVuRow[]> {
  const session = await requireSession();
  if (session.quyen !== "LANHDAODONVI" && session.quyen !== "LANHDAOPHONG") {
    throw new Error("Chỉ BGĐ hoặc Lãnh đạo phòng mới giao được nhiệm vụ.");
  }

  const rows = await prisma.nhiemVu.findMany({
    where: { nguoiGiaoId: session.maNV },
    select: SELECT_TOM_TAT,
    orderBy: [{ trangThai: "asc" }, { hanXuLy: "asc" }],
  });

  return rows.map(toRow);
}
