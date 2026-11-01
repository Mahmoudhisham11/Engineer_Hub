"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Edit2, Trash2 } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui/Input";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { departmentsApi } from "../../../../lib/api/departments";
import { formatDate } from "../../../../lib/utils/dateUtils";

export default function DepartmentsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete State
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await departmentsApi.getAll();
      setDepartments(res || []);
    } catch (err) {
      console.error("Failed to load departments:", err);
      toast.error("Failed to load departments list.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d) => {
    setEditingDept(d);
    setName(d.name);
    setDescription(d.description || "");
    setIsActive(d.is_active);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Department name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept.id, payload);
        toast.success("Department updated.");
      } else {
        await departmentsApi.create(payload);
        toast.success("Department created.");
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save department.");
      toast.error(err.message || "Failed to save department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;
    setIsDeleting(true);
    try {
      await departmentsApi.delete(deptToDelete.id);
      toast.success("Department deleted.");
      setDeptToDelete(null);
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || "Cannot delete department with assigned engineers.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: "Department Name",
      key: "name",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</span>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
          {row.description || "—"}
        </span>
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
      header: "Created",
      key: "created_at",
      width: "140px",
      render: (row) => (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
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
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "#f87171" }}
            onClick={() => setDeptToDelete(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title="Departments"
        subtitle="Manage engineering divisions and organizational units."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAdd}>
            + Add Department
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={departments}
        isLoading={isLoading}
        emptyTitle="No departments registered"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? "Edit Department" : "Add Department"}
        subtitle="Specify department name and description."
        maxWidth="460px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSubmitting}>
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {errorMsg && (
            <div
              style={{
                padding: "0.625rem",
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-sm)",
                color: "#f87171",
                fontSize: "0.8125rem",
              }}
            >
              {errorMsg}
            </div>
          )}

          <Input
            label="Department Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Electrical Engineering"
            required
            autoFocus
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
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of department scope..."
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
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <span>Active Department</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deptToDelete)}
        onClose={() => setDeptToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Department?"
        description={`Are you sure you want to delete ${deptToDelete?.name}? If engineers are currently assigned to this department, deletion will be rejected.`}
        confirmText="Delete Department"
        isLoading={isDeleting}
      />
    </div>
  );
}
