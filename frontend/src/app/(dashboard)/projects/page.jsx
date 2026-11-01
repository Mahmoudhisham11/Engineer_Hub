"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { projectsApi } from "../../../lib/api/projects";
import { formatDate } from "../../../lib/utils/dateUtils";
import styles from "./projects.module.css";

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete & Toggle states
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      // Engineers only get active projects by default from backend or list all for admin
      const res = await projectsApi.getAll(!isAdmin);
      setProjects(res || []);
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("Failed to load projects list.");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setName("");
    setProjectCode("");
    setDescription("");
    setIsActive(true);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProject(p);
    setName(p.name);
    setProjectCode(p.project_code);
    setDescription(p.description || "");
    setIsActive(p.is_active);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    if (!projectCode.trim()) {
      setFormError("Project code is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      project_code: projectCode.trim().toUpperCase(),
      description: description.trim() || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, payload);
        toast.success("Project updated successfully.");
      } else {
        await projectsApi.create(payload);
        toast.success("Project created successfully.");
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      setFormError(err.message || "Failed to save project.");
      toast.error(err.message || "Failed to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      if (p.is_active) {
        await projectsApi.deactivate(p.id);
        toast.success(`Project ${p.name} deactivated.`);
      } else {
        await projectsApi.activate(p.id);
        toast.success(`Project ${p.name} activated.`);
      }
      fetchProjects();
    } catch (err) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectToDelete.id);
      toast.success("Project deleted.");
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.message || "Cannot delete project with historical work logs.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter list
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === "active") return matchesSearch && p.is_active;
    if (statusFilter === "inactive") return matchesSearch && !p.is_active;
    return matchesSearch;
  });

  const columns = [
    {
      header: "Project Code",
      key: "project_code",
      width: "150px",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "var(--accent-primary)", letterSpacing: "0.02em" }}>
          {row.project_code}
        </span>
      ),
    },
    {
      header: "Project Name",
      key: "name",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</div>
          {row.description && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
                maxWidth: "360px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      align: "center",
      width: "120px",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "default"} dot>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created Date",
      key: "created_at",
      width: "140px",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      width: "160px",
      render: (row) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/projects/${row.id}`);
            }}
          >
            Details
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(row);
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActive(row);
                }}
                title={row.is_active ? "Deactivate" : "Activate"}
              >
                {row.is_active ? "Deactivate" : "Activate"}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Engineering Projects"
        subtitle="Manage active construction and engineering projects across DME."
        actions={
          isAdmin && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAddModal}>
              + Add Project
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by project name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {isAdmin && (
          <div className={styles.statusFilters}>
            <button
              className={`${styles.filterBtn} ${statusFilter === "all" ? styles.activeFilter : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({projects.length})
            </button>
            <button
              className={`${styles.filterBtn} ${statusFilter === "active" ? styles.activeFilter : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({projects.filter((p) => p.is_active).length})
            </button>
            <button
              className={`${styles.filterBtn} ${statusFilter === "inactive" ? styles.activeFilter : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive ({projects.filter((p) => !p.is_active).length})
            </button>
          </div>
        )}
      </div>

      {/* Projects Data Table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        isLoading={isLoading}
        emptyTitle="No projects found"
        emptyDescription="Try adjusting your search query or add a new project."
        onRowClick={(row) => router.push(`/projects/${row.id}`)}
      />

      {/* Create / Edit Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? "Edit Project" : "Add New Project"}
        subtitle="Specify project identifier and details for work log tracking."
        maxWidth="480px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveProject} isLoading={isSubmitting}>
              {editingProject ? "Update Project" : "Create Project"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {formError && (
            <div
              style={{
                padding: "0.625rem 0.875rem",
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-sm)",
                color: "#f87171",
                fontSize: "0.8125rem",
              }}
            >
              {formError}
            </div>
          )}

          <Input
            label="Project Code"
            name="project_code"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
            placeholder="e.g. PRJ-2026-001"
            helperText="Unique uppercase project identifier"
            required
            autoFocus
          />

          <Input
            label="Project Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Al-Noor Commercial Tower"
            required
          />

          <div>
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "0.375rem",
              }}
            >
              Description / Scope (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief overview of project scope and site location..."
              style={{
                width: "100%",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "0.625rem 0.75rem",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              fontSize: "0.84375rem",
              color: "var(--text-primary)",
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <span>Active for new work log entries</span>
          </label>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Project?"
        description={`Are you sure you want to permanently delete project ${projectToDelete?.name}? If work logs exist for this project, deletion will be rejected.`}
        confirmText="Delete Project"
        isLoading={isDeleting}
      />
    </div>
  );
}
