"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Filter, RotateCcw, Download, Calendar, Clock, Briefcase } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { WorkLogModal } from "../../../components/worklogs/WorkLogModal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { workLogsApi } from "../../../lib/api/workLogs";
import { projectsApi } from "../../../lib/api/projects";
import { workTypesApi } from "../../../lib/api/workTypes";
import { workStatusesApi } from "../../../lib/api/workStatuses";
import { engineersApi } from "../../../lib/api/engineers";
import { departmentsApi } from "../../../lib/api/departments";
import { formatDate, getDayName } from "../../../lib/utils/dateUtils";
import { formatHours, getStatusBadgeVariant } from "../../../lib/utils/formatters";
import styles from "./worklogs.module.css";

export default function WorkLogsPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filter options
  const [projects, setProjects] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [workStatuses, setWorkStatuses] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Active filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedWorkType, setSelectedWorkType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Modal & deletion states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load filter metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [projRes, typeRes, statusRes] = await Promise.all([
          projectsApi.getAll(),
          workTypesApi.getAll(),
          workStatusesApi.getAll(),
        ]);
        setProjects(projRes || []);
        setWorkTypes(typeRes || []);
        setWorkStatuses(statusRes || []);

        if (isAdmin) {
          const [engRes, deptRes] = await Promise.all([
            engineersApi.getAll({ page_size: 100 }),
            departmentsApi.getAll(),
          ]);
          setEngineers(engRes.items || []);
          setDepartments(deptRes || []);
        }
      } catch (err) {
        console.error("Failed to load filter metadata:", err);
      }
    }
    loadMetadata();
  }, [isAdmin]);

  // Load work logs from backend
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        project_id: selectedProject ? parseInt(selectedProject, 10) : undefined,
        work_type_id: selectedWorkType ? parseInt(selectedWorkType, 10) : undefined,
        status_id: selectedStatus ? parseInt(selectedStatus, 10) : undefined,
      };

      let response;
      if (isAdmin) {
        params.engineer_id = selectedEngineer ? parseInt(selectedEngineer, 10) : undefined;
        params.department_id = selectedDepartment ? parseInt(selectedDepartment, 10) : undefined;
        response = await workLogsApi.getAdminLogs(params);
      } else {
        response = await workLogsApi.getMyLogs(params);
      }

      setLogs(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch work logs:", err);
      toast.error("Failed to retrieve work logs.");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    dateFrom,
    dateTo,
    selectedProject,
    selectedWorkType,
    selectedStatus,
    selectedEngineer,
    selectedDepartment,
    isAdmin,
    toast,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedProject("");
    setSelectedWorkType("");
    setSelectedStatus("");
    setSelectedEngineer("");
    setSelectedDepartment("");
    setPage(1);
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      if (isAdmin) {
        await workLogsApi.deleteAdminLog(logToDelete.id);
      } else {
        await workLogsApi.deleteMyLog(logToDelete.id);
      }
      toast.success("Work log deleted.");
      setLogToDelete(null);
      fetchLogs();
    } catch (err) {
      toast.error(err.message || "Failed to delete log.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary calculations for currently viewed logs
  const totalHoursOnPage = logs.reduce((acc, l) => acc + (parseFloat(l.hours) || 0), 0);
  const avgHoursOnPage = logs.length > 0 ? (totalHoursOnPage / logs.length).toFixed(2) : "0.00";

  const columns = [
    {
      header: "Date",
      key: "work_date",
      width: "150px",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {formatDate(row.work_date)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {getDayName(row.work_date)}
          </div>
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            header: "Engineer",
            key: "engineer",
            render: (row) => (
              <div>
                <div style={{ fontWeight: 500 }}>{row.engineer?.full_name || "—"}</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                  {row.engineer?.employee_code || ""}
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      header: "Project",
      key: "project",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {row.project?.name || "—"}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
            {row.project?.project_code || ""}
          </div>
        </div>
      ),
    },
    {
      header: "Work Type",
      key: "work_type",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {row.work_type?.name || "—"}
        </span>
      ),
    },
    {
      header: "Hours",
      key: "hours",
      align: "right",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {formatHours(row.hours)}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      align: "center",
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.work_status?.name)}>
          {row.work_status?.name || "—"}
        </Badge>
      ),
    },
    {
      header: "Notes",
      key: "notes",
      render: (row) => (
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: "0.75rem",
            maxWidth: "200px",
            display: "inline-block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={row.notes || ""}
        >
          {row.notes || "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (row) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLog(row);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "#f87171" }}
            onClick={(e) => {
              e.stopPropagation();
              setLogToDelete(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title={isAdmin ? "All Technical Work Logs" : "My Work Logs"}
        subtitle="Search, filter, and inspect detailed engineering activity records."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setSelectedLog(null);
              setIsModalOpen(true);
            }}
          >
            + Add Work Log
          </Button>
        }
      />

      {/* Summary KPI row */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Records</span>
          <span className={styles.summaryValue}>{total} logs</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Page Cumulative Hours</span>
          <span className={styles.summaryValue}>{formatHours(totalHoursOnPage)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Average Hours / Entry</span>
          <span className={styles.summaryValue}>{avgHoursOnPage} hrs</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterInputs}>
          <div className={styles.dateInputGroup}>
            <label className={styles.filterLabel}>Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={styles.filterDateInput}
            />
          </div>

          <div className={styles.dateInputGroup}>
            <label className={styles.filterLabel}>Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className={styles.filterDateInput}
            />
          </div>

          {isAdmin && (
            <div className={styles.filterSelectGroup}>
              <label className={styles.filterLabel}>Engineer</label>
              <select
                value={selectedEngineer}
                onChange={(e) => {
                  setSelectedEngineer(e.target.value);
                  setPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="">All Engineers</option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.filterSelectGroup}>
            <label className={styles.filterLabel}>Project</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterSelectGroup}>
            <label className={styles.filterLabel}>Work Type</label>
            <select
              value={selectedWorkType}
              onChange={(e) => {
                setSelectedWorkType(e.target.value);
                setPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="">All Types</option>
              {workTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterSelectGroup}>
            <label className={styles.filterLabel}>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="">All Statuses</option>
              {workStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterActions}>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleResetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyTitle="No work logs found"
        emptyDescription="Try adjusting your filter criteria or record a new work log."
        emptyActionText="+ Add Work Log"
        onEmptyAction={() => {
          setSelectedLog(null);
          setIsModalOpen(true);
        }}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Add / Edit Modal */}
      <WorkLogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLog(null);
        }}
        workLog={selectedLog}
        isAdmin={isAdmin}
        onSuccess={fetchLogs}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(logToDelete)}
        onClose={() => setLogToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Work Log?"
        description={`Are you sure you want to delete the log for ${logToDelete?.hours} hrs on ${logToDelete ? formatDate(logToDelete.work_date) : ""}?`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
