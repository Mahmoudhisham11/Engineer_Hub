"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Search, Filter, RotateCcw, User, Clock, Terminal } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { auditLogsApi } from "../../../../lib/api/auditLogs";
import { formatDateTime } from "../../../../lib/utils/dateUtils";
import styles from "./auditlogs.module.css";

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await auditLogsApi.getAll(params);
      setLogs(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast.error("Failed to retrieve system audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, actionFilter, entityFilter, dateFrom, dateTo, toast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleReset = () => {
    setActionFilter("");
    setEntityFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const getActionBadgeVariant = (action) => {
    if (!action) return "default";
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("CREATE")) return "success";
    if (act.includes("UPDATE") || act.includes("RESET")) return "warning";
    if (act.includes("DELETE") || act.includes("DEACTIVATE")) return "danger";
    return "info";
  };

  const columns = [
    {
      header: "Timestamp",
      key: "timestamp",
      width: "170px",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.78125rem", fontFamily: "var(--font-mono)" }}>
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: "User",
      key: "username",
      width: "150px",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <User size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {row.username || `User #${row.user_id || "—"}`}
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      key: "action",
      width: "160px",
      render: (row) => (
        <Badge variant={getActionBadgeVariant(row.action)} size="sm">
          {row.action}
        </Badge>
      ),
    },
    {
      header: "Target Entity",
      key: "entity_type",
      width: "140px",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
          {row.entity_type ? `${row.entity_type} ${row.entity_id ? `#${row.entity_id}` : ""}` : "System"}
        </span>
      ),
    },
    {
      header: "Details / Payload",
      key: "details",
      render: (row) => {
        if (!row.details) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
        const detailsStr =
          typeof row.details === "object"
            ? JSON.stringify(row.details)
            : String(row.details);

        return (
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.71875rem",
              color: "var(--text-secondary)",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              padding: "0.125rem 0.375rem",
              borderRadius: "3px",
              maxWidth: "400px",
              display: "inline-block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={detailsStr}
          >
            {detailsStr}
          </code>
        );
      },
    },
    {
      header: "IP Address",
      key: "ip_address",
      width: "120px",
      render: (row) => (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          {row.ip_address || "127.0.0.1"}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Activity & Audit Logs"
        subtitle="Immutable security trail of platform logins, credential modifications, and engineering records."
      />

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterInputs}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Action</label>
            <input
              type="text"
              placeholder="e.g. LOGIN, CREATE_WORK_LOG"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Entity Type</label>
            <input
              type="text"
              placeholder="e.g. WORK_LOG, ENGINEER"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={styles.filterDate}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className={styles.filterDate}
            />
          </div>
        </div>

        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset}>
          Reset
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyTitle="No audit records match criteria"
        emptyDescription="System activity logs will be recorded as actions are performed."
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: (p) => setPage(p),
        }}
      />
    </div>
  );
}
