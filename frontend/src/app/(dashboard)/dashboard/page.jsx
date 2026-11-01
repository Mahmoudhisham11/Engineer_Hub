"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  Calendar,
  Building2,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Timer,
  Monitor,
  Zap,
  MessageSquare,
  Ruler,
  Link2,
  CheckCircle,
  Laptop,
  Grid,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../../../components/layout/PageHeader";
import { KpiCard } from "../../../components/ui/KpiCard";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Badge } from "../../../components/ui/Badge";
import { AreaChart } from "../../../components/charts/AreaChart";
import { DonutChart } from "../../../components/charts/DonutChart";
import { WorkLogModal } from "../../../components/worklogs/WorkLogModal";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EngineerProjectMatrix } from "../../../components/matrix/EngineerProjectMatrix";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { engineersApi } from "../../../lib/api/engineers";
import { analyticsApi } from "../../../lib/api/analytics";
import { workLogsApi } from "../../../lib/api/workLogs";
import {
  getTodayIsoString,
  formatDate,
  isNonWorkingDay,
  getDayName,
} from "../../../lib/utils/dateUtils";
import { formatHours, getStatusBadgeVariant } from "../../../lib/utils/formatters";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { user, engineer, isAdmin, isEngineer } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);

  // Engineer state
  const [engineerStats, setEngineerStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  // Admin state
  const [overallStats, setOverallStats] = useState(null);

  // Work log modal & delete states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active timer state for widget
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAdmin) {
        // Load Admin Analytics Overview KPIs
        const overviewRes = await analyticsApi.getOverview();
        setOverallStats(overviewRes);
      } else {
        // Load Engineer Data
        const [statsRes, logsRes] = await Promise.all([
          engineersApi.getMyStatistics(),
          workLogsApi.getMyLogs({ page: 1, page_size: 8 }),
        ]);

        setEngineerStats(statsRes);
        setRecentLogs(logsRes.items || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      toast.error("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    loadDashboardData();

    const handleCreated = () => {
      loadDashboardData();
    };
    window.addEventListener("engineerhub_worklog_created", handleCreated);
    return () => window.removeEventListener("engineerhub_worklog_created", handleCreated);
  }, [loadDashboardData]);

  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      if (isAdmin) {
        await workLogsApi.deleteAdminLog(logToDelete.id);
      } else {
        await workLogsApi.deleteMyLog(logToDelete.id);
      }
      toast.success("Work log deleted successfully.");
      setLogToDelete(null);
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to delete work log.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate today's hours for engineer
  const todayIso = getTodayIsoString();
  const todayHours =
    recentLogs
      .filter((l) => l.work_date === todayIso)
      .reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0) || 0;

  // Weekly hours chart data
  const getWeeklyChartData = () => {
    if (!engineerStats || !engineerStats.daily_hours) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days.map((d, i) => ({ label: d, value: 0, isNonWorking: i === 5 || i === 6 }));
    }

    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const match = engineerStats.daily_hours.find((pt) => pt.period === iso);
      const isWeekend = isNonWorkingDay(d);
      result.push({
        label: `${getDayName(d, true)} ${d.getDate()}`,
        value: match ? parseFloat(match.hours) : 0,
        isNonWorking: isWeekend,
      });
    }
    return result;
  };

  // Weekly bar data for visual widget
  const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];
  const weeklyBarData = dayNamesShort.map((day, idx) => {
    const isPeak = idx === 4; // Thursday peak
    const heightPct = isPeak ? 90 : idx === 1 ? 75 : idx === 2 ? 65 : idx === 3 ? 55 : idx === 5 || idx === 6 ? 30 : 45;
    return {
      day,
      height: `${heightPct}%`,
      isActive: isPeak,
      isDark: idx === 1 || idx === 2 || idx === 3,
      bubbleText: isPeak ? "5h 23m" : null,
    };
  });

  // Define table columns for Engineer
  const workLogColumns = [
    {
      header: "Date",
      key: "work_date",
      width: "140px",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {formatDate(row.work_date)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {getDayName(row.work_date)}
          </div>
        </div>
      ),
    },
    {
      header: "Project",
      key: "project",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
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
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          {row.work_type?.name || "—"}
        </span>
      ),
    },
    {
      header: "Hours",
      key: "hours",
      align: "right",
      render: (row) => (
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
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
              setIsLogModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "#ef4444" }}
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

  const displayName = engineer?.full_name || user?.username || "Engineer";

  return (
    <div className={styles.dashboardContainer}>
      {/* ========================================================================= */}
      {/* 1. ENGINEER VIEW                                                         */}
      {/* ========================================================================= */}
      {isEngineer && (
        <>
          <div className={styles.heroSection}>
            <div className={styles.heroGreeting}>
              <h1 className={styles.welcomeTitle}>
                Welcome in, {displayName.split(" ")[0]}
              </h1>

              <div className={styles.heroPills}>
                <div className={styles.heroPillGroup}>
                  <span className={styles.heroPillLabel}>Active Tasks</span>
                  <span className={styles.pillDark}>15%</span>
                </div>
                <div className={styles.heroPillGroup}>
                  <span className={styles.heroPillLabel}>Site Work</span>
                  <span className={styles.pillCyan}>15%</span>
                </div>
                <div className={styles.heroPillGroup}>
                  <span className={styles.heroPillLabel}>Project Time</span>
                  <span className={styles.pillStriped}>15%</span>
                </div>
                <div className={styles.heroPillGroup}>
                  <span className={styles.heroPillLabel}>Office Output</span>
                  <span className={styles.pillOutline}>10%</span>
                </div>
              </div>
            </div>

            <div className={styles.heroCounters}>
              <div className={styles.heroCounterItem}>
                <span className={styles.heroCounterNumber}>
                  {engineerStats?.active_working_days_count || 24}
                </span>
                <span className={styles.heroCounterLabel}>Days Active</span>
              </div>
              <div className={styles.heroCounterItem}>
                <span className={styles.heroCounterNumber}>
                  {engineerStats?.hours_by_project?.length || 12}
                </span>
                <span className={styles.heroCounterLabel}>Projects</span>
              </div>
              <div className={styles.heroCounterItem}>
                <span className={styles.heroCounterNumber}>
                  {recentLogs.length || 48}
                </span>
                <span className={styles.heroCounterLabel}>Work Logs</span>
              </div>
            </div>
          </div>

          <div className={styles.visualGrid}>
            {/* Column 1: Engineer Profile & Accordions */}
            <div className={styles.profileColumn}>
              <div className={styles.profileCard}>
                <div className={styles.profileCardBg} />
                <div className={styles.profileCardContent}>
                  <div>
                    <div className={styles.profileName}>{displayName}</div>
                    <div className={styles.profileRole}>
                      {engineer?.department?.name || "Structural Engineer"}
                    </div>
                  </div>
                  <div className={styles.profileHoursPill}>
                    {formatHours(engineerStats?.total_hours || 160)}
                  </div>
                </div>
              </div>

              <div className={styles.accordionList}>
                <div className={styles.accordionItem}>
                  <span>Pension contributions</span>
                  <ChevronDown size={16} color="var(--text-tertiary)" />
                </div>
                <div className={styles.accordionItem}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Laptop size={16} color="var(--accent-primary)" />
                    <div>
                      <div>Workstation Setup</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                        DME CAD Terminal
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </div>
                <div className={styles.accordionItem}>
                  <span>Compensation Summary</span>
                  <ChevronDown size={16} color="var(--text-tertiary)" />
                </div>
                <div className={styles.accordionItem}>
                  <span>Technical Office Benefits</span>
                  <ChevronDown size={16} color="var(--text-tertiary)" />
                </div>
              </div>
            </div>

            {/* Column 2: Progress Bars, Time Tracker & Schedule */}
            <div className={styles.centerColumn}>
              <div className={styles.centerTopRow}>
                {/* Progress Widget */}
                <div className={styles.progressWidget}>
                  <div className={styles.widgetHeader}>
                    <div>
                      <span className={styles.widgetTitle}>Progress</span>
                      <div className={styles.widgetValue}>
                        {formatHours(todayHours || 6.1)}
                      </div>
                    </div>
                    <button className={styles.widgetArrowBtn} title="View progress details">
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className={styles.barChartRow}>
                    {weeklyBarData.map((bar, i) => (
                      <div key={i} className={styles.barCol}>
                        {bar.bubbleText && (
                          <span className={styles.floatingHourBubble}>{bar.bubbleText}</span>
                        )}
                        <div
                          className={`
                            ${styles.barPill}
                            ${bar.isActive ? styles.barPillActive : ""}
                            ${bar.isDark ? styles.barPillDark : ""}
                          `.trim()}
                          style={{ height: bar.height }}
                        />
                        <span className={styles.barDayLabel}>{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Tracker Widget */}
                <div className={styles.timeTrackerWidget}>
                  <div className={styles.widgetHeader}>
                    <span className={styles.widgetTitle}>Time tracker</span>
                    <button className={styles.widgetArrowBtn} title="View timesheet">
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className={styles.trackerCenter}>
                    <div className={styles.trackerCircleWrapper}>
                      <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="5"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#38d9f5"
                          strokeWidth="7"
                          strokeDasharray="180 260"
                          strokeLinecap="round"
                          transform="rotate(-40 50 50)"
                          style={{ filter: "drop-shadow(0 0 6px rgba(56,217,245,0.6))" }}
                        />
                      </svg>
                      <div className={styles.trackerCenterText}>
                        <div className={styles.trackerHours}>2:35</div>
                        <div className={styles.trackerLabel}>Work time</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.trackerControls}>
                    <button
                      className={styles.trackerBtn}
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      title="Toggle Timer"
                    >
                      {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      className={styles.trackerBtn}
                      onClick={() => {
                        setSelectedLog(null);
                        setIsLogModalOpen(true);
                      }}
                      title="Log Hours"
                    >
                      <Timer size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedule Timeline Widget */}
              <div className={styles.scheduleWidget}>
                <div className={styles.scheduleHeader}>
                  <span className={styles.scheduleMonth}>
                    {formatDate(todayIso, { month: "long", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                    Today Schedule
                  </span>
                </div>

                <div className={styles.scheduleTimeline}>
                  <div className={styles.scheduleRow}>
                    <span className={styles.scheduleTime}>8:00 am</span>
                    <div className={styles.scheduleEventDark}>
                      <div>
                        <div className={styles.scheduleEventTitle}>Weekly Technical Office Sync</div>
                        <div className={styles.scheduleEventSub} style={{ color: "#9ca3af" }}>
                          Discuss progress on structural drawings & site logs
                        </div>
                      </div>
                      <Badge variant="cyanSolid" size="sm">Active</Badge>
                    </div>
                  </div>

                  <div className={styles.scheduleRow}>
                    <span className={styles.scheduleTime}>10:00 am</span>
                    <div className={styles.scheduleEventLight}>
                      <div>
                        <div className={styles.scheduleEventTitle}>Site Inspection Session</div>
                        <div className={styles.scheduleEventSub}>
                          Quality review & safety checks
                        </div>
                      </div>
                      <Badge variant="default" size="sm">Upcoming</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Onboarding & Dark Tasks Card */}
            <div className={styles.tasksColumn}>
              <div className={styles.onboardingWidget}>
                <div className={styles.onboardingHeader}>
                  <span className={styles.onboardingTitle}>Productivity</span>
                  <span className={styles.onboardingPct}>88%</span>
                </div>
                <div className={styles.onboardingSegmentRow}>
                  <div className={styles.onboardingSegmentCyan}>Target</div>
                  <div className={styles.onboardingSegmentDark} />
                  <div className={styles.onboardingSegmentGray} />
                </div>
              </div>

              <div className={styles.darkTasksCard}>
                <div className={styles.darkTasksHeader}>
                  <span className={styles.darkTasksTitle}>Active Tasks</span>
                  <span className={styles.darkTasksCounter}>2/8</span>
                </div>

                <div className={styles.darkTasksList}>
                  <div className={styles.darkTaskItem}>
                    <div className={styles.darkTaskLeft}>
                      <div className={styles.darkTaskIcon}>
                        <Monitor size={14} />
                      </div>
                      <div>
                        <div className={styles.darkTaskTitle}>Review Structural Calculations</div>
                        <div className={styles.darkTaskDate}>Today 08:30</div>
                      </div>
                    </div>
                    <CheckCircle size={16} className={styles.darkTaskCheck} />
                  </div>

                  <div className={styles.darkTaskItem}>
                    <div className={styles.darkTaskLeft}>
                      <div className={styles.darkTaskIcon}>
                        <Zap size={14} />
                      </div>
                      <div>
                        <div className={styles.darkTaskTitle}>Submit Daily Work Log</div>
                        <div className={styles.darkTaskDate}>Today 09:30</div>
                      </div>
                    </div>
                    <CheckCircle size={16} className={styles.darkTaskCheck} />
                  </div>

                  <div className={styles.darkTaskItem}>
                    <div className={styles.darkTaskLeft}>
                      <div className={styles.darkTaskIcon}>
                        <MessageSquare size={14} />
                      </div>
                      <div>
                        <div className={styles.darkTaskTitle}>Discuss Q3 Milestone Goals</div>
                        <div className={styles.darkTaskDate}>Today 11:00</div>
                      </div>
                    </div>
                    <div className={styles.darkTaskCircle} />
                  </div>

                  <div className={styles.darkTaskItem}>
                    <div className={styles.darkTaskLeft}>
                      <div className={styles.darkTaskIcon}>
                        <Ruler size={14} />
                      </div>
                      <div>
                        <div className={styles.darkTaskTitle}>Shop Drawing Annotations</div>
                        <div className={styles.darkTaskDate}>Tomorrow 09:00</div>
                      </div>
                    </div>
                    <div className={styles.darkTaskCircle} />
                  </div>

                  <div className={styles.darkTaskItem}>
                    <div className={styles.darkTaskLeft}>
                      <div className={styles.darkTaskIcon}>
                        <Link2 size={14} />
                      </div>
                      <div>
                        <div className={styles.darkTaskTitle}>Safety Compliance Policy</div>
                        <div className={styles.darkTaskDate}>Tomorrow 14:00</div>
                      </div>
                    </div>
                    <div className={styles.darkTaskCircle} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "1.25rem" }}>
            <Card
              title="Weekly Hours Distribution"
              subtitle="Daily activity (Fridays & Saturdays marked as company non-working days)"
            >
              <AreaChart data={getWeeklyChartData()} height={210} />
            </Card>

            <Card
              title="Hours by Work Type"
              subtitle="Breakdown of design, site, inspection & office tasks"
            >
              <DonutChart data={engineerStats?.hours_by_work_type || []} size={150} />
            </Card>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.875rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Recent Work Logs
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  Your latest activity submissions
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.625rem" }}>
                <Link href="/work-logs">
                  <Button variant="secondary" size="sm" icon={<ArrowUpRight size={14} />} iconPosition="right">
                    View All Logs
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setSelectedLog(null);
                    setIsLogModalOpen(true);
                  }}
                >
                  Add Work Log
                </Button>
              </div>
            </div>

            <DataTable
              columns={workLogColumns}
              data={recentLogs}
              isLoading={isLoading}
              emptyTitle="No work logs recorded yet"
              emptyDescription="Start tracking your daily engineering tasks and site hours."
              emptyActionText="Add Your First Work Log"
              onEmptyAction={() => {
                setSelectedLog(null);
                setIsLogModalOpen(true);
              }}
            />
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN ALLOCATION VIEW (ONLY KPI CARDS, FILTER & MATRIX TABLE)          */}
      {/* ========================================================================= */}
      {isAdmin && (
        <>
          {/* Header Title */}
          <PageHeader
            title="Allocation"
            subtitle="Monitor engineer workload, project percentage distribution, and period capacity against 5-day standard working weeks."
          />

          {/* Admin Top KPI Cards */}
          <div className={styles.kpiGridAdmin}>
            <KpiCard
              title="ACTIVE ENGINEERS"
              value={overallStats?.active_engineers || 0}
              subtitle={`${overallStats?.total_engineers || 0} total enrolled`}
              icon={<Users size={18} />}
              isLoading={isLoading}
            />
            <KpiCard
              title="ACTIVE PROJECTS"
              value={overallStats?.active_projects || 0}
              subtitle={`${overallStats?.total_projects || 0} total projects`}
              icon={<Briefcase size={18} />}
              isLoading={isLoading}
            />
            <KpiCard
              title="TOTAL WORK LOGS"
              value={overallStats?.total_work_logs || 0}
              subtitle="Recorded submissions"
              icon={<CheckCircle2 size={18} />}
              isLoading={isLoading}
            />
            <KpiCard
              title="CUMULATIVE HOURS"
              value={formatHours(overallStats?.total_hours || 0)}
              subtitle="All departments total"
              icon={<Clock size={18} />}
              isLoading={isLoading}
            />
            <KpiCard
              title="AVG HOURS / ENGINEER"
              value={formatHours(overallStats?.average_hours_per_engineer || 0)}
              subtitle="Productivity metric"
              icon={<TrendingUp size={18} />}
              isLoading={isLoading}
            />
          </div>

          {/* Dedicated Engineer-Project Allocation Matrix Table with Filters & Excel Export */}
          <div style={{ marginTop: "0.5rem" }}>
            <EngineerProjectMatrix />
          </div>
        </>
      )}

      {/* Add / Edit Work Log Modal */}
      <WorkLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedLog(null);
        }}
        workLog={selectedLog}
        isAdmin={isAdmin}
        onSuccess={loadDashboardData}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(logToDelete)}
        onClose={() => setLogToDelete(null)}
        onConfirm={handleDeleteLog}
        title="Delete Work Log?"
        description={`Are you sure you want to delete this work log (${logToDelete?.hours} hrs on ${logToDelete ? formatDate(logToDelete.work_date) : ""})? This action cannot be undone.`}
        confirmText="Delete Log"
        isLoading={isDeleting}
      />
    </div>
  );
}
