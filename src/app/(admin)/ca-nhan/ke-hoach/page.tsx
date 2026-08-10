import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import KeHoachBaoCaoBoard from "@/components/ca-nhan/KeHoachBaoCaoBoard";

export const metadata: Metadata = {
  title: "Kế hoạch cá nhân",
  description: "Nhập và xem lại kế hoạch công tác cá nhân theo tuần",
};

export default function CaNhanKeHoachPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Kế hoạch cá nhân" />
      <KeHoachBaoCaoBoard loai="KEHOACH" />
    </div>
  );
}
