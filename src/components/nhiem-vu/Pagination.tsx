// ĐÍCH: src/components/nhiem-vu/Pagination.tsx (GHI ĐÈ — phóng to nút, active rõ hơn theo góp ý)
"use client";

import React from "react";

const TUY_CHON_MAC_DINH = [10, 25, 50];

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = TUY_CHON_MAC_DINH,
}) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span>Hiển thị</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-10 rounded-lg border border-brand-300 bg-white px-3 text-sm font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>bản ghi</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Tổng số bản ghi <span className="font-medium text-gray-700 dark:text-gray-200">{totalRecords}</span>
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {currentPage > 1 && (
              <button
                onClick={() => onPageChange(currentPage - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-base text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                aria-label="Trang trước"
              >
                ‹
              </button>
            )}

            {pagesAroundCurrent.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === page
                    ? "bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/30"
                    : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
                }`}
              >
                {page}
              </button>
            ))}

            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(currentPage + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-base text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                aria-label="Trang sau"
              >
                »
              </button>
            )}
            {currentPage < totalPages && (
              <button
                onClick={() => onPageChange(totalPages)}
                className="flex h-10 items-center justify-center rounded-lg px-2 text-base text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                aria-label="Trang cuối"
              >
                »|
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
