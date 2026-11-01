"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";
import styles from "./DataTable.module.css";

export function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries available to display.",
  emptyActionText = null,
  onEmptyAction = null,
  pagination = null, // { page, pageSize, total, totalPages, onPageChange }
  onRowClick = null,
  className = "",
}) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key || col.header}
                  style={{
                    width: col.width || "auto",
                    textAlign: col.align || "left",
                  }}
                  className={styles.th}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className={styles.tr}>
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className={styles.td}>
                      <Skeleton width={cIdx === 0 ? "80%" : "60%"} height="16px" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className={styles.emptyTd}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionText={emptyActionText}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            )}

            {!isLoading && data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className={`${styles.tr} ${onRowClick ? styles.clickableTr : ""}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key || col.header}
                    style={{ textAlign: col.align || "left" }}
                    className={styles.td}
                  >
                    {col.render ? col.render(row) : row[col.key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
