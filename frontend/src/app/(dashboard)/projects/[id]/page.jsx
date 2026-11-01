"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { KpiCard } from "../../../../components/ui/KpiCard";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { WorkLogModal } from "../../../../components/worklogs/WorkLogModal";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { projectsApi } from "../../../../lib/api/projects";
import { workLogsApi } from "../../../../lib/api/workLogs";
import { formatDate, getDayName } from "../../../../lib/utils/dateUtils";
import { formatHours, getStatusBadgeVariant } from "../../../../lib/utils/formatters";

export default function ProjectDetailsPage({ params }) {
  // Unwrap params in React 19 / Next.js 15
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;

  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadProjectDetails() {
      setIsLoading(true);
      try {
        const [projRes, logsRes] = await Promise.all([
          projectsApi.getById(projectId),
          isAdmin
            ? workLogsApi.getAdminLogs({ project_id: projectId, page_size: 50 })
            : workLogsApi.getMyLogs({ project_id: projectId, page_size: 50 }),
        ]);

        setProject(projRes);
        setLogs(logsRes.items || []);
        setTotalLogs(logsRes.total || 0);
      } catch (err) {
        console.error("Failed to load project details:", err);
        toast.error("Failed to load project details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (projectId) {
      loadProjectDetails();
    }
  }, [projectId, isAdmin, toast]);

  const totalHours = logs.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
  const uniqueEngineersCount = new Set(logs.map((l) => l.engineer_id)).size;

  const columns = [
    {
      header: "Date",
      key: "work_date",
      width: "150px",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{formatDate(row.work_date)}</div>
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
              <span style={{ fontWeight: 500 }}>{row.engineer?.full_name || "—"}</span>
            ),
          },
        ]
      : []),
    {
      header: "Work Type",
      key: "work_type",
      render: (row) => <span>{row.work_type?.name || "—"}</span>,
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
            maxWidth: "240px",
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
  ];

  if (!project && !isLoading) {
    return (
      <div>
        <Link href="/projects">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
            Back to Projects
          </Button>
        </Link>
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ marginBottom: "-0.5rem" }}>
        <Link href="/projects">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Back to Projects
          </Button>
        </Link>
      </div>

      <PageHeader
        title={project?.name || "Loading Project..."}
        subtitle={project?.description || `Project Code: ${project?.project_code || ""}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Badge variant={project?.is_active ? "success" : "default"} dot>
              {project?.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsModalOpen(true)}
            >
              + Log Hours
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        <KpiCard
          title="TOTAL LOGGED HOURS"
          value={formatHours(totalHours)}
          subtitle="Cumulative effort on this project"
          icon={<Clock size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="TOTAL WORK ENTRIES"
          value={totalLogs}
          subtitle="Recorded task logs"
          icon={<CheckCircle size={18} />}
          isLoading={isLoading}
        />
        <KpiCard
          title="ENGINEERS ENGAGED"
          value={uniqueEngineersCount}
          subtitle="Team members contributing"
          icon={<Users size={18} />}
          isLoading={isLoading}
        />
      </div>

      {/* Historical Logs Table */}
      <div style={{ marginTop: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.875rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Project Activity & Logs</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Detailed chronological records for this project
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={logs}
          isLoading={isLoading}
          emptyTitle="No logs for this project yet"
          emptyDescription="Start recording daily engineering progress for this project."
        />
      </div>

      <WorkLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isAdmin={isAdmin}
        onSuccess={() => {
          // reload logs
          projectsApi.getById(projectId).then(setProject);
          const fetchMethod = isAdmin ? workLogsApi.getAdminLogs : workLogsApi.getMyLogs;
          fetchMethod({ project_id: projectId, page_size: 50 }).then((res) => {
            setLogs(res.items || []);
            setTotalLogs(res.total || 0);
          });
        }}
      />
    </div>
  );
}
