
import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export const metadata: Metadata = {
  title: "Nhiệm vụ",
  description: "Quản lý và phân công nhiệm vụ",
};

export default function NhiemVuPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Nhiệm vụ" />

      <div className="flex min-h-[500px] items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
            <svg
              className="h-10 w-10 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a3 3 0 006 0M9 5h6M9 12h6M9 16h4"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="mb-3 text-2xl font-semibold text-gray-800 dark:text-white">
            Tính năng đang được xây dựng
          </h2>

          {/* Description */}
          <p className="mx-auto max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Chức năng <strong>Nhiệm vụ</strong> đang được xây dựng và hoàn thiện.
            <br />
            Hệ thống sẽ hỗ trợ phân công, giao việc và theo dõi tiến độ
            <br />
            thực hiện nhiệm vụ của công chức, viên chức.
          </p>

          {/* Status */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Đang phát triển
          </div>
        </div>
      </div>
    </div>
  );
}

