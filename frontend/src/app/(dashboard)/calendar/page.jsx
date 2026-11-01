"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Briefcase,
  AlertCircle,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { WorkLogModal } from "../../../components/worklogs/WorkLogModal";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { workLogsApi } from "../../../lib/api/workLogs";
import {
  getMonthDays,
  toIsoDateString,
  getTodayIsoString,
  formatDate,
  getDayName,
  isNonWorkingDay,
} from "../../../lib/utils/dateUtils";
import { formatHours, getStatusBadgeVariant } from "../../../lib/utils/formatters";
import styles from "./calendar.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected date for side drawer
  const [selectedDateIso, setSelectedDateIso] = useState(getTodayIsoString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchMonthLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const firstDayStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const lastDayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const params = {
        date_from: firstDayStr,
        date_to: lastDayStr,
        page_size: 200,
      };

      const res = isAdmin
        ? await workLogsApi.getAdminLogs(params)
        : await workLogsApi.getMyLogs(params);

      setLogs(res.items || []);
    } catch (err) {
      console.error("Failed to load month calendar logs:", err);
      toast.error("Failed to load calendar data.");
    } finally {
      setIsLoading(false);
    }
  }, [year, month, isAdmin, toast]);

  useEffect(() => {
    fetchMonthLogs();
  }, [fetchMonthLogs]);

  const monthDays = getMonthDays(year, month);

  // Group logs by ISO date string
  const logsByDate = logs.reduce((acc, log) => {
    const d = log.work_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(log);
    return acc;
  }, {});

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateIso(getTodayIsoString());
  };

  const selectedDayLogs = logsByDate[selectedDateIso] || [];
  const selectedDayHours = selectedDayLogs.reduce(
    (sum, l) => sum + (parseFloat(l.hours) || 0),
    0
  );
  const isSelectedNonWorking = isNonWorkingDay(selectedDateIso);

  return (
    <div className={styles.container}>
      <PageHeader
        title="Technical Work Calendar"
        subtitle="Visual calendar of working days, logged engineering hours, and scheduled tasks."
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className={styles.monthNav}>
              <button onClick={prevMonth} className={styles.navArrow} aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <span className={styles.currentMonthLabel}>
                {MONTH_NAMES[month]} {year}
              </span>
              <button onClick={nextMonth} className={styles.navArrow} aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        }
      />

      <div className={styles.calendarLayout}>
        {/* Main Calendar Grid */}
        <div className={styles.gridContainer}>
          {/* Day of week headers */}
          <div className={styles.weekHeaders}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => {
              const isWeekend = idx === 5 || idx === 6; // Fri or Sat
              return (
                <div
                  key={dayName}
                  className={`${styles.weekHeaderCell} ${isWeekend ? styles.weekendHeader : ""}`}
                >
                  {dayName}
                  {isWeekend && <span className={styles.offBadge}>Off</span>}
                </div>
              );
            })}
          </div>

          {/* Calendar Day Cells */}
          <div className={styles.daysGrid}>
            {monthDays.map((dayItem, idx) => {
              const dayLogs = logsByDate[dayItem.isoString] || [];
              const dayHours = dayLogs.reduce(
                (sum, l) => sum + (parseFloat(l.hours) || 0),
                0
              );
              const isSelected = selectedDateIso === dayItem.isoString;
              const isToday = dayItem.isoString === getTodayIsoString();

              return (
                <div
                  key={dayItem.isoString || idx}
                  className={`
                    ${styles.dayCell}
                    ${!dayItem.isCurrentMonth ? styles.otherMonth : ""}
                    ${dayItem.isNonWorking ? styles.nonWorkingCell : ""}
                    ${isSelected ? styles.selectedCell : ""}
                    ${isToday ? styles.todayCell : ""}
                  `}
                  onClick={() => setSelectedDateIso(dayItem.isoString)}
                >
                  <div className={styles.dayCellHeader}>
                    <span className={`${styles.dayNumber} ${isToday ? styles.todayNumber : ""}`}>
                      {dayItem.dayNumber}
                    </span>
                    {dayHours > 0 && (
                      <span className={styles.dayHoursBadge}>
                        {dayHours.toFixed(1)}h
                      </span>
                    )}
                  </div>

                  <div className={styles.dayEvents}>
                    {dayItem.isNonWorking && (
                      <div className={styles.nonWorkingTag}>
                        Non-Working
                      </div>
                    )}

                    {dayLogs.slice(0, 2).map((log) => (
                      <div
                        key={log.id}
                        className={styles.logChip}
                        title={`${log.project?.name || "Project"}: ${log.hours}h (${log.work_type?.name || ""})`}
                      >
                        <span className={styles.logDot} />
                        <span className={styles.logProjectName}>
                          {log.project?.name || "Project"}
                        </span>
                        <span className={styles.logHours}>{log.hours}h</span>
                      </div>
                    ))}

                    {dayLogs.length > 2 && (
                      <div className={styles.moreLogs}>
                        +{dayLogs.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Drawer */}
        <div className={styles.detailsDrawer}>
          <div className={styles.drawerHeader}>
            <div>
              <div className={styles.drawerDate}>
                {formatDate(selectedDateIso, { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div className={styles.drawerWeekday}>
                {getDayName(selectedDateIso)} &bull; {isSelectedNonWorking ? "Company Non-Working Day" : "Working Day"}
              </div>
            </div>
            {isSelectedNonWorking ? (
              <Badge variant="danger" size="sm">
                Holiday
              </Badge>
            ) : (
              <Badge variant="primary" size="sm">
                {selectedDayHours.toFixed(1)} hrs
              </Badge>
            )}
          </div>

          {isSelectedNonWorking && (
            <div className={styles.weekendAlert}>
              <AlertCircle size={15} />
              <span>
                Friday and Saturday are DME non-working days. Technical logs cannot be submitted on these dates.
              </span>
            </div>
          )}

          <div className={styles.drawerLogsList}>
            <div className={styles.drawerSectionTitle}>
              Recorded Work Activity ({selectedDayLogs.length})
            </div>

            {selectedDayLogs.length === 0 ? (
              <div className={styles.emptyDrawer}>
                <Clock size={28} />
                <p>No work logs recorded for this day.</p>
                {!isSelectedNonWorking && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      setModalDate(selectedDateIso);
                      setIsModalOpen(true);
                    }}
                  >
                    Add Log for This Date
                  </Button>
                )}
              </div>
            ) : (
              selectedDayLogs.map((log) => (
                <div key={log.id} className={styles.logDetailCard}>
                  <div className={styles.logDetailHeader}>
                    <span className={styles.logDetailProject}>
                      {log.project?.name || "Project"}
                    </span>
                    <span className={styles.logDetailHours}>
                      {formatHours(log.hours)}
                    </span>
                  </div>

                  <div className={styles.logDetailMeta}>
                    <span>{log.work_type?.name}</span>
                    &bull;
                    <Badge variant={getStatusBadgeVariant(log.work_status?.name)} size="sm">
                      {log.work_status?.name}
                    </Badge>
                  </div>

                  {log.notes && (
                    <div className={styles.logDetailNotes}>
                      {log.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!isSelectedNonWorking && (
            <div className={styles.drawerFooter}>
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={15} />}
                style={{ width: "100%" }}
                onClick={() => {
                  setModalDate(selectedDateIso);
                  setIsModalOpen(true);
                }}
              >
                Add Work Log for Date
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Work Log Modal */}
      <WorkLogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalDate(null);
        }}
        initialDate={modalDate}
        isAdmin={isAdmin}
        onSuccess={fetchMonthLogs}
      />
    </div>
  );
}
