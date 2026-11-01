"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Users,
  Briefcase,
  Building2,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { KpiCard } from "../../../../components/ui/KpiCard";
import { Card } from "../../../../components/ui/Card";
import { DataTable } from "../../../../components/ui/DataTable";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { HorizontalBarChart } from "../../../../components/charts/HorizontalBarChart";
import { DonutChart } from "../../../../components/charts/DonutChart";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { analyticsApi } from "../../../../lib/api/analytics";
import { engineersApi } from "../../../../lib/api/engineers";
import { formatHours, formatPercentage } from "../../../../lib/utils/formatters";
import styles from "./analytics.module.css";

export default function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [projStats, setProjStats] = useState([]);
  const [engineers, setEngineers] = useState([]);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, deptRes, projRes, engRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getDepartmentStats(),
        analyticsApi.getProjectStats(),
        engineersApi.getAll({ page_size: 100 }),
      ]);

      setOverview(overviewRes);
      setDeptStats(deptRes.departments || []);
      setProjStats(projRes.projects || []);
      setEngineers(engRes.items || []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Failed to load technical office analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const engineerWorkloadColumns = [
    {
      header: "Engineer",
      key: "full_name",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.full_name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {row.employee_code} &bull; {row.department?.name || "No Dept"}
          </div>
        </div>
      ),
    },
    {
      header: "Department",
      key: "department",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {row.department?.name || "—"}
        </span>
      ),
    },
    {
      header: "Account Status",
      key: "is_active",
      align: "center",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "default"} dot>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (row) => (
        <Link href={`/admin/engineers/${row.id}`}>
          <Button variant="outline" size="sm">
            View Analytics
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Technical Office Analytics"
        subtitle="Aggregated KPIs, department distributions, and engineering workload metrics computed in SQLite."
      />

      {/* Main KPI Grid */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="ACTIVE WORKFORCE"
          value={overview?.active_engineers || 0}
          subtitle={`${overview?.total_engineers || 0} total enrolled engineers`}
          icon={<Users size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="ACTIVE PROJECTS"
          value={overview?.active_projects || 0}
          subtitle={`${overview?.total_projects || 0} registered projects`}
          icon={<Briefcase size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="CUMULATIVE LOGGED EFFORT"
          value={formatHours(overview?.total_hours || 0)}
          subtitle={`${overview?.total_work_logs || 0} recorded work logs`}
          icon={<Clock size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="AVG HOURS / ENGINEER"
          value={formatHours(overview?.average_hours_per_engineer || 0)}
          subtitle="Average effort per engineer"
          icon={<TrendingUp size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="AVG DAILY PRODUCTION"
          value={formatHours(overview?.average_hours_per_working_day || 0)}
          subtitle="Hours per active working day"
          icon={<CheckCircle2 size={18} />}
          isLoading={isLoading}
        />
      </div>

      {/* Analytics Distributions */}
      <div className={styles.chartsGrid}>
        <Card
          title="Hours by Engineering Department"
          subtitle="Distribution of total logged hours across departments"
        >
          <HorizontalBarChart
            data={deptStats.map((d) => ({
              name: d.department_name,
              hours: parseFloat(d.total_hours) || 0,
            }))}
            valueKey="hours"
            labelKey="name"
          />
        </Card>

        <Card
          title="Project Hours Distribution"
          subtitle="Relative effort across active and archived projects"
        >
          <DonutChart
            data={projStats.map((p) => ({
              name: p.project_name,
              hours: parseFloat(p.total_hours) || 0,
            }))}
            size={160}
          />
        </Card>
      </div>

      {/* Detailed Project Distribution Table */}
      <Card
        title="Project Productivity Breakdown"
        subtitle="Aggregated total hours and contributing engineers per project"
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84375rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase" }}>Project Code</th>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase" }}>Project Name</th>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", textAlign: "right" }}>Engineers</th>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", textAlign: "right" }}>Work Logs</th>
                <th style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", textAlign: "right" }}>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {projStats.map((p) => (
                <tr key={p.project_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "var(--accent-primary)" }}>{p.project_code}</td>
                  <td style={{ padding: "0.75rem", fontWeight: 500 }}>{p.project_name}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <Badge variant={p.is_active ? "success" : "default"} size="sm" dot>
                      {p.is_active ? "Active" : "Archived"}
                    </Badge>
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>{p.engineers_count}</td>
                  <td style={{ padding: "0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>{p.work_logs_count}</td>
                  <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                    {formatHours(p.total_hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Engineer Workload Directory */}
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ marginBottom: "0.875rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Engineer Performance Deep Dive</h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Select an engineer to view individual time-series charts and project allocations
          </p>
        </div>

        <DataTable
          columns={engineerWorkloadColumns}
          data={engineers}
          isLoading={isLoading}
          emptyTitle="No engineers found"
        />
      </div>
    </div>
  );
}
