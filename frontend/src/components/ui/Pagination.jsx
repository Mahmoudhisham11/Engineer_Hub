"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";

export function Pagination({
  page = 1,
  pageSize = 25,
  total = 0,
  totalPages = 1,
  onPageChange,
  className = "",
}) {
  if (total <= 0) return null;

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className={`${styles.pagination} ${className}`}>
      <div className={styles.info}>
        Showing <span className={styles.highlight}>{startRecord}</span> to{" "}
        <span className={styles.highlight}>{endRecord}</span> of{" "}
        <span className={styles.highlight}>{total}</span> records
      </div>

      <div className={styles.controls}>
        <button
          className={styles.pageBtn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <span className={styles.pageIndicator}>
          Page {page} of {totalPages || 1}
        </span>

        <button
          className={styles.pageBtn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
