import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Pagination component for navigating through pages (WCAG 2.2 AA).
 * Supports keyboard navigation and ARIA labels.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = false,
  maxVisiblePages = 5,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

  if (totalPages <= 1) {
    return null;
  }

  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <nav
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-xs)",
        ...style,
      }}
      aria-label={t("pagination.navigation") || "Pagination Navigation"}
    >
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          aria-label={t("pagination.firstPage") || "First page"}
        >
          {t("pagination.first") || "First"}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label={t("pagination.previousPage") || "Previous page"}
        leftIcon={<ChevronLeft size={16} />}
      >
        {t("pagination.previous") || "Previous"}
      </Button>

      {visiblePages[0] > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            aria-label={t("pagination.page", { page: 1 }) || `Page 1`}
          >
            1
          </Button>
          {visiblePages[0] > 2 && (
            <span style={{ padding: "0 var(--space-xs)", color: "var(--color-text-muted)" }}>
              ...
            </span>
          )}
        </>
      )}

      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "primary" : "ghost"}
          size="sm"
          onClick={() => onPageChange(page)}
          aria-label={t("pagination.page", { page }) || `Page ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Button>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span style={{ padding: "0 var(--space-xs)", color: "var(--color-text-muted)" }}>
              ...
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            aria-label={t("pagination.page", { page: totalPages }) || `Page ${totalPages}`}
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        aria-label={t("pagination.nextPage") || "Next page"}
        rightIcon={<ChevronRight size={16} />}
      >
        {t("pagination.next") || "Next"}
      </Button>

      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage}
          aria-label={t("pagination.lastPage") || "Last page"}
        >
          {t("pagination.last") || "Last"}
        </Button>
      )}
    </nav>
  );
};
