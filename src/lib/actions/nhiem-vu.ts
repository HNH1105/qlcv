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
  Quyen, // FIX: thêm import Quyen
} from "@prisma/client";

// ==========================================================================================
// PHASE 1 — CORE
// ==========================================================================================

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
  daHoanThanhPhanViecCuaToi?: boolean;
};

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
  tanSuatNhac: z.enum(["HANG_TUAN", "HANG_THANG", "HANG_QUY", "HANG_NAM"]).nullable().optional(),
  ngayBatDauNhac: z.date().nullable().optional(),
  ngayKetThucNhac: z.date().nullable().optional(),
});

export async function taoNhiemVu(input: z.infer<typeof TaoNhiemVuSchema>) {
  const session = await requireSession();
  const data = TaoNhiemVuSchema.parse(input);

  const duocTao =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, data.phongChuTriId);
  if (!duocTao) {
    throw new Error("Bạn không có quyền giao nhiệm vụ cho phòng này.");
  }

  if (data.hanXuLy && data.tanSuatNhac) {
    throw new Error("Chỉ chọn 1 trong 2: Hạn xử lý cụ thể HOẶC Nhắc lặp lại định kỳ.");
  }

  if (data.nguoiXuLyChinhId && data.nguoiPhoiHopIds.includes(data.nguoiXuLyChinhId)) {
    throw new Error("Người xử lý chính không được đồng thời là người phối hợp.");
  }

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
          ngayNhacTiepTheo: data.ngayBatDauNhac ?? null,
          phongPhoiHop: {
            create: data.phongPhoiHopIds
              .filter((ma) => ma !== data.phongChuTriId)
              .map((maPhong) => ({ maPhong })),
          },
          nguoiPhoiHop: { create: duLieuPhoiHop },
        },
      });

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
    { timeout: 15000 }
  );

  return { id: nhiemVu.id };
}

// ------------------------------------------------------------------------------------------
// ĐỌC
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
  await requireSession();

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
// ĐỔI TRẠNG THÁI
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

export async function baoCaoHoanThanh(nhiemVuId: number, ketQua: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  if (nv.nguoiXuLyChinhId !== session.maNV) {
    throw new Error("Chỉ người xử lý chính mới được báo cáo hoàn thành.");
  }

  const kq = validateTransition(nv.trangThai, "CHO_DUYET", null, {
    quyen: session.quyen as Quyen, // FIX
    laLanhDaoPhongChuTri: false,
  });
  if (!kq.hopLe) throw new Error(kq.loi);

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

export async function duyetHoanThanh(nhiemVuId: number, ghiChu?: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "HOANTHANH", null, {
    quyen: session.quyen as Quyen, // FIX
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "DUYET_HOANTHANH", "HOANTHANH", session.maNV, ghiChu ?? null, {
      nguoiDuyetId: session.maNV,
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

export async function yeuCauXuLyLai(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "DANGXULY", lyDo, {
    quyen: session.quyen as Quyen, // FIX
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

export async function moLaiNhiemVu(nhiemVuId: number, ghiChu?: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "DANGXULY", null, {
    quyen: session.quyen as Quyen, // FIX
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "MO_LAI", "DANGXULY", session.maNV, ghiChu ?? null);
  });
}

export async function tamDungNhiemVu(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "TAMDUNG", lyDo, {
    quyen: session.quyen as Quyen, // FIX
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "TAMDUNG", "TAMDUNG", session.maNV, lyDo);
  });
}

export async function huyNhiemVu(nhiemVuId: number, lyDo: string) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const kq = validateTransition(nv.trangThai, "HUY", lyDo, {
    quyen: session.quyen as Quyen, // FIX
    laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
  });
  if (!kq.hopLe) throw new Error(kq.loi);

  await prisma.$transaction(async (tx: PrismaTx) => {
    await ghiLogVaDoiTrangThai(tx, nhiemVuId, "HUY", "HUY", session.maNV, lyDo);
  });
}

// ------------------------------------------------------------------------------------------
// CRUD CƠ BẢN
// ------------------------------------------------------------------------------------------

const CAC_TRANG_THAI_CHO_SUA_NOI_DUNG: TrangThaiNhiemVu[] = ["CHO_PHAN_CONG", "DANGXULY"];

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

export async function doiHanXuLy(nhiemVuId: number, hanMoi: Date | null) {
  const session = await requireSession();
  const nv = await layNhiemVuHoacLoi(nhiemVuId);

  const duocPhepThucHien =
    laBGD(session.quyen) || laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId);
  if (!duocPhepThucHien) throw new Error("Chỉ BGĐ hoặc Lãnh đạo phòng chủ trì được đổi hạn.");

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
// PHÂN CÔNG BỔ SUNG
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

  const dsPhoiHopSauKhiLoc = nguoiXuLyChinhMoiId
    ? danhSachPhoiHopMoi.filter((ma) => ma !== nguoiXuLyChinhMoiId)
    : danhSachPhoiHopMoi;

  const nguoiXuLyCuId = nv.nguoiXuLyChinhId;
  const laLanDauCoNguoiXuLy = !nguoiXuLyCuId && !!nguoiXuLyChinhMoiId;
  const coDoiNguoiXuLy = nguoiXuLyCuId !== nguoiXuLyChinhMoiId;

  let denTrangThai = nv.trangThai;
  if (laLanDauCoNguoiXuLy) {
    const kq = validateTransition(nv.trangThai, "DANGXULY", null, {
      quyen: session.quyen as Quyen, // FIX
      laLanhDaoPhongChuTri: laLanhDaoPhongChuTri(session.quyen, session.maPhong, nv.phongChuTriId),
    });
    if (!kq.hopLe) throw new Error(kq.loi);
    denTrangThai = "DANGXULY";
  }

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
// ĐỔI PHÒNG CHỦ TRÌ
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
// PHASE 4 — SUBTASK
// ------------------------------------------------------------------------------------------

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
    await tinhLaiTienDoTuSubTask(tx, sub.nhiemVuId);
  });
}

// ------------------------------------------------------------------------------------------
// PHASE 5 — NHẮC ĐỊNH KỲ
// ------------------------------------------------------------------------------------------

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
// PHASE 7 — DASHBOARD
// ------------------------------------------------------------------------------------------

const SO_NGAY_CANH_BAO = 3;

export type CanhBaoRow = {
  id: number;
  tieuDe: string;
  loai: "SAP_DEN_HAN" | "QUA_HAN" | "DINH_KY_SAP_NHAC";
  moc: Date;
};

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
// TRA CỨU
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
  soDongMoiTrang?: number;
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

// ------------------------------------------------------------------------------------------
// NGƯỜI PHỐI HỢP TỰ CẬP NHẬT
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
// NHIỆM VỤ TÔI GIAO
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