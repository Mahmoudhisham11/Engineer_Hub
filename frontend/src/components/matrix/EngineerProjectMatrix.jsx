"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  Users,
  TrendingUp,
  ArrowUpRight,
  Info,
  CalendarRange,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { analyticsApi } from "../../lib/api/analytics";
import { departmentsApi } from "../../lib/api/departments";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useToast } from "../../context/ToastContext";
import { formatHours } from "../../lib/utils/formatters";
import { formatDate } from "../../lib/utils/dateUtils";
import styles from "./EngineerProjectMatrix.module.css";

export function EngineerProjectMatrix() {
  const toast = useToast();
  const [matrixData, setMatrixData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filter states
  const [filterMode, setFilterMode] = useState("current_month"); // 'current_month' | 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  });
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load departments for filter dropdown
  useEffect(() => {
    departmentsApi
      .getAll()
      .then((res) => setDepartments(res || []))
      .catch((err) => console.error("Failed to load departments:", err));
  }, []);

  // Compute current filter parameters
  const currentParams = useMemo(() => {
    let params = {};
    if (selectedDept) {
      params.department_id = selectedDept;
    }

    if (filterMode === "current_month") {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      params.month = `${d.getFullYear()}-${m}`;
    } else if (filterMode === "month") {
      params.month = selectedMonth;
    } else if (filterMode === "custom") {
      if (customFrom) params.date_from = customFrom;
      if (customTo) params.date_to = customTo;
    }
    return params;
  }, [filterMode, selectedMonth, customFrom, customTo, selectedDept]);

  // Fetch matrix data
  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await analyticsApi.getMatrix(currentParams);
      setMatrixData(res);
    } catch (err) {
      console.error("Failed to load matrix data:", err);
      toast.error("Failed to load allocation matrix.");
    } finally {
      setIsLoading(false);
    }
  }, [currentParams, toast]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // Handle Excel Export
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await analyticsApi.exportMatrixExcel(currentParams);
      toast.success("Excel allocation matrix downloaded successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error(err.message || "Failed to download Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  // Generate Month Options for Selector (Current year + past year)
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Filter rows by engineer name search
  const filteredRows = useMemo(() => {
    if (!matrixData?.rows) return [];
    if (!searchQuery.trim()) return matrixData.rows;

    const q = searchQuery.toLowerCase().trim();
    return matrixData.rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.employee_code.toLowerCase().includes(q) ||
        r.department_name.toLowerCase().includes(q)
    );
  }, [matrixData, searchQuery]);

  const projects = matrixData?.projects || [];
  const period = matrixData?.period_summary;

  return (
    <div className={styles.container}>
      {/* 1. Filter Toolbar */}
      <div className={styles.filterBar}>
        <div className={styles.filterTopRow}>
          {/* Quick Pill Buttons */}
          <div className={styles.quickPills}>
            <button
              className={`
                ${styles.quickBtn}
                ${filterMode === "current_month" ? styles.quickBtnCyanActive : ""}
              `.trim()}
              onClick={() => {
                setFilterMode("current_month");
                const d = new Date();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                setSelectedMonth(`${d.getFullYear()}-${m}`);
              }}
            >
              This Month
            </button>
            <button
              className={`
                ${styles.quickBtn}
                ${filterMode === "month" ? styles.quickBtnActive : ""}
              `.trim()}
              onClick={() => setFilterMode("month")}
            >
              Select Month
            </button>
            <button
              className={`
                ${styles.quickBtn}
                ${filterMode === "custom" ? styles.quickBtnActive : ""}
              `.trim()}
              onClick={() => setFilterMode("custom")}
            >
              Custom Date Range
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Engineer Search Box */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={15} style={{ position: "absolute", left: "0.875rem", color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Search engineer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Export to Excel Button */}
            <Button
              variant="primary"
              size="md"
              icon={<Download size={15} />}
              onClick={handleExportExcel}
              isLoading={isExporting}
            >
              Export to Excel
            </Button>
          </div>
        </div>

        {/* Filter Inputs Row */}
        <div className={styles.filterInputsRow}>
          {filterMode === "month" && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={styles.selectInput}
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterMode === "custom" && (
            <>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>From:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>To:</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </>
          )}

          {/* Department Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Working Days & Capacity Summary Banner */}
      {period && (
        <div className={styles.periodBanner}>
          <div className={styles.periodStatsGroup}>
            {/* Working Days Pill */}
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Period Working Days</span>
              <div className={styles.statValue}>
                <span className={styles.workingDaysBadge}>
                  <CheckCircle2 size={14} />
                  {period.working_days_count} Working Days
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                  ({period.weekend_days_count} Fri/Sat off)
                </span>
              </div>
            </div>

            {/* Standard Capacity */}
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Expected Standard Capacity</span>
              <div className={styles.statValue}>
                <span>{formatHours(period.expected_hours_per_engineer)}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                  / engineer
                </span>
              </div>
            </div>

            {/* Total Logged Hours */}
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Team Total Logged</span>
              <div className={styles.statValue} style={{ color: "#0284c7" }}>
                {formatHours(matrixData?.overall_total_hours || 0)}
              </div>
            </div>

            {/* Engineers & Projects */}
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Active in Period</span>
              <div className={styles.statValue}>
                <span>{matrixData?.active_engineers_count || 0} Engineers</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>•</span>
                <span>{matrixData?.active_projects_count || 0} Projects</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <CalendarRange size={14} />
            <span>
              {formatDate(period.start_date, { month: "short", day: "numeric" })} —{" "}
              {formatDate(period.end_date, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      )}

      {/* 3. Interactive Matrix Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                {/* Sticky Column: Engineer */}
                <th className={`${styles.th} ${styles.stickyHeader}`}>Engineer</th>

                {/* Dynamic Project Columns */}
                {projects.map((proj) => (
                  <th key={proj.project_id} className={styles.th}>
                    <div className={styles.projectHeaderContent}>
                      <span className={styles.projectTitle} title={proj.name}>
                        {proj.name}
                      </span>
                      <span className={styles.projectCodePill}>{proj.project_code}</span>
                      <span className={styles.projectHoursTotal}>
                        {formatHours(proj.total_hours)}
                      </span>
                    </div>
                  </th>
                ))}

                {/* Summary Column: Total Logged Hours */}
                <th className={styles.th} style={{ textAlign: "right" }}>
                  <div className={styles.projectHeaderContent} style={{ alignItems: "flex-end" }}>
                    <span className={styles.projectTitle}>Total Logged</span>
                    <span className={styles.projectCodePill}>Period Hours</span>
                  </div>
                </th>

                {/* Summary Column: Capacity % */}
                <th className={styles.th} style={{ textAlign: "right" }}>
                  <div className={styles.projectHeaderContent} style={{ alignItems: "flex-end" }}>
                    <span className={styles.projectTitle}>Capacity %</span>
                    <span className={styles.projectCodePill}>vs. Standard</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={projects.length + 3}
                    style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <div className="animate-spin" style={{ width: "20px", height: "20px", border: "2px solid #e2e8f0", borderTopColor: "var(--accent-primary)", borderRadius: "50%" }} />
                      <span>Computing engineer-project allocation matrix...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={projects.length + 3}
                    style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}
                  >
                    No engineer logs recorded in this period.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const hasHours = parseFloat(row.total_hours) > 0;
                  const capPct = row.capacity_percentage;

                  return (
                    <tr key={row.engineer_id} className={styles.tr}>
                      {/* Sticky Cell: Engineer Information */}
                      <td className={`${styles.td} ${styles.stickyCell}`}>
                        <div className={styles.engineerInfo}>
                          <div className={styles.engineerName}>{row.full_name}</div>
                          <div className={styles.engineerMeta}>
                            <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                              {row.employee_code}
                            </span>
                            <Badge variant="default" size="sm">
                              {row.department_name}
                            </Badge>
                            {hasHours && (
                              <span className={styles.daysActiveBadge}>
                                {row.active_days_count} / {period?.working_days_count} days
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Project Cells */}
                      {projects.map((proj) => {
                        const alloc = row.allocations?.[proj.project_id] || row.allocations?.[String(proj.project_id)];
                        const hoursVal = alloc ? parseFloat(alloc.hours) : 0;
                        const pctLogged = alloc ? alloc.percentage_of_logged : 0;

                        if (hoursVal === 0) {
                          return (
                            <td key={proj.project_id} className={styles.td}>
                              <div className={styles.emptyCellDash}>—</div>
                            </td>
                          );
                        }

                        return (
                          <td key={proj.project_id} className={styles.td}>
                            <div className={styles.allocationCell}>
                              <span className={styles.hoursNum}>{formatHours(hoursVal)}</span>
                              <span
                                className={`
                                  ${pctLogged >= 40 ? styles.pctPillCyan : pctLogged >= 20 ? styles.pctPillDark : styles.pctPillLight}
                                `.trim()}
                                title={`${pctLogged}% of logged hours`}
                              >
                                {pctLogged.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Logged Hours */}
                      <td className={styles.td} style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                          {formatHours(row.total_hours)}
                        </span>
                      </td>

                      {/* Capacity % Utilization */}
                      <td className={styles.td} style={{ textAlign: "right" }}>
                        {hasHours ? (
                          <Badge
                            variant={
                              capPct >= 90 && capPct <= 110
                                ? "success"
                                : capPct > 110
                                ? "primary"
                                : "warning"
                            }
                            size="md"
                          >
                            {capPct.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                            0.0% (Absent)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className={`${styles.tr} ${styles.summaryRow}`}>
                  <td className={`${styles.td} ${styles.stickyCell}`}>
                    <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.875rem" }}>
                      Team Summary ({filteredRows.length} Engineers)
                    </div>
                  </td>

                  {projects.map((proj) => (
                    <td key={proj.project_id} className={styles.td}>
                      <div className={styles.allocationCell}>
                        <span style={{ fontWeight: 800, color: "#0284c7" }}>
                          {formatHours(proj.total_hours)}
                        </span>
                      </div>
                    </td>
                  ))}

                  <td className={styles.td} style={{ textAlign: "right" }}>
                    <span className={styles.grandTotalBadge}>
                      {formatHours(matrixData?.overall_total_hours || 0)}
                    </span>
                  </td>

                  <td className={styles.td} style={{ textAlign: "right" }}>
                    <Badge variant="cyanSolid" size="sm">
                      100%
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
