import React from "react";
<<<<<<< Updated upstream
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
=======
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
>>>>>>> Stashed changes
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
<<<<<<< Updated upstream
  maxVisiblePages?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Pagination component for navigating through pages (WCAG 2.2 AA).
 * Supports keyboard navigation and ARIA labels.
=======
  maxVisible?: number;
}

/**
 * Pagination component for navigating through pages.
 * Supports first/last page buttons and customizable visible page range.
>>>>>>> Stashed changes
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
<<<<<<< Updated upstream
  showFirstLast = false,
  maxVisiblePages = 5,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

=======
  showFirstLast = true,
  maxVisible = 5,
}) => {
>>>>>>> Stashed changes
  if (totalPages <= 1) {
    return null;
  }

<<<<<<< Updated upstream
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
=======
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push("...");
      }
>>>>>>> Stashed changes
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

<<<<<<< Updated upstream
=======
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

>>>>>>> Stashed changes
    return pages;
  };

  const visiblePages = getVisiblePages();
<<<<<<< Updated upstream
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <nav
      className={className}
=======

  return (
    <nav
      aria-label="Pagination"
>>>>>>> Stashed changes
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-xs)",
<<<<<<< Updated upstream
        ...style,
      }}
      aria-label={t("pagination.navigation") || "Pagination Navigation"}
=======
      }}
>>>>>>> Stashed changes
    >
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
<<<<<<< Updated upstream
          disabled={isFirstPage}
          aria-label={t("pagination.firstPage") || "First page"}
        >
          {t("pagination.first") || "First"}
        </Button>
      )}

=======
          disabled={currentPage === 1}
          leftIcon={<ChevronsLeft size={16} />}
          aria-label="First page"
        />
      )}
>>>>>>> Stashed changes
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
<<<<<<< Updated upstream
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

=======
        disabled={currentPage === 1}
        leftIcon={<ChevronLeft size={16} />}
        aria-label="Previous page"
      />
      {visiblePages.map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              style={{
                padding: "var(--space-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              ...
            </span>
          );
        }

        const pageNum = page as number;
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "primary" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            aria-label={`Page ${pageNum}`}
            aria-current={currentPage === pageNum ? "page" : undefined}
          >
            {pageNum}
          </Button>
        );
      })}
>>>>>>> Stashed changes
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
<<<<<<< Updated upstream
        disabled={isLastPage}
        aria-label={t("pagination.nextPage") || "Next page"}
        rightIcon={<ChevronRight size={16} />}
      >
        {t("pagination.next") || "Next"}
      </Button>

=======
        disabled={currentPage === totalPages}
        leftIcon={<ChevronRight size={16} />}
        aria-label="Next page"
      />
>>>>>>> Stashed changes
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
<<<<<<< Updated upstream
          disabled={isLastPage}
          aria-label={t("pagination.lastPage") || "Last page"}
        >
          {t("pagination.last") || "Last"}
        </Button>
=======
          disabled={currentPage === totalPages}
          leftIcon={<ChevronsRight size={16} />}
          aria-label="Last page"
        />
>>>>>>> Stashed changes
      )}
    </nav>
  );
};
