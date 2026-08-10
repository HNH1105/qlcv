import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import KeHoachBaoCaoBoard from "@/components/ca-nhan/KeHoachBaoCaoBoard";

export const metadata: Metadata = {
  title: "Báo cáo cá nhân",
  description: "Nhập và xem lại báo cáo công tác cá nhân theo tuần",
};

export default function CaNhanBaoCaoPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Báo cáo cá nhân" />
      <KeHoachBaoCaoBoard loai="BAOCAO" />
    </div>
  );
}
