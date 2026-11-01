"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Plus, Edit2, Trash2, Power, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui/Input";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { workStatusesApi } from "../../../../lib/api/workStatuses";
import { getStatusBadgeVariant } from "../../../../lib/utils/formatters";

export default function WorkStatusesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete / Deactivate States
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [inUseStatus, setInUseStatus] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await workStatusesApi.getAll();
      setStatuses(res || []);
    } catch (err) {
      console.error("Failed to load work statuses:", err);
      toast.error("Failed to load work statuses.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleOpenAdd = () => {
    setEditingStatus(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStatus(s);
    setName(s.name);
    setDescription(s.description || "");
    setIsActive(s.is_active);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Status name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (editingStatus) {
        await workStatusesApi.update(editingStatus.id, payload);
        toast.success(`Work status "${payload.name}" updated successfully.`);
      } else {
        await workStatusesApi.create(payload);
        toast.success(`Work status "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchStatuses();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save work status.");
      toast.error(err.message || "Failed to save work status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Active State directly from row
  const handleToggleActive = async (status) => {
    const newActiveState = !status.is_active;
    try {
      await workStatusesApi.update(status.id, {
        name: status.name,
        description: status.description,
        is_active: newActiveState,
      });
      toast.success(
        `Status "${status.name}" is now ${newActiveState ? "Active" : "Inactive"}.`
      );
      fetchStatuses();
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;
    setIsDeleting(true);
    try {
      await workStatusesApi.delete(statusToDelete.id);
      toast.success(`Work status "${statusToDelete.name}" deleted successfully.`);
      setStatusToDelete(null);
      fetchStatuses();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("reference it") || msg.includes("in use") || msg.includes("deactivate")) {
        // Show in-use resolution dialog
        const target = statusToDelete;
        setStatusToDelete(null);
        setInUseStatus({ status: target, message: msg });
      } else {
        toast.error(msg || "Cannot delete work status.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInUse = async () => {
    if (!inUseStatus?.status) return;
    setIsDeactivating(true);
    try {
      await workStatusesApi.update(inUseStatus.status.id, {
        name: inUseStatus.status.name,
        description: inUseStatus.status.description,
        is_active: false,
      });
      toast.success(
        `Status "${inUseStatus.status.name}" was deactivated successfully and won't appear in new work logs.`
      );
      setInUseStatus(null);
      fetchStatuses();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate status.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns = [
    {
      header: "Status Name",
      key: "name",
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.name)}>
          {row.name}
        </Badge>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", fontWeight: 500 }}>
          {row.description || "—"}
        </span>
      ),
    },
    {
      header: "Active Flag",
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
      header: "Actions",
      key: "actions",
      align: "right",
      width: "240px",
      render: (row) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          {/* Quick Activate / Deactivate button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            title={row.is_active ? "Deactivate Status" : "Activate Status"}
            style={{
              color: row.is_active ? "#d97706" : "#059669",
              fontSize: "0.75rem",
            }}
          >
            <Power size={13} style={{ marginRight: "4px" }} />
            {row.is_active ? "Deactivate" : "Activate"}
          </Button>

          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            style={{ color: "#ef4444" }}
            onClick={() => setStatusToDelete(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Work Statuses"
        subtitle="Manage task execution progress states like In Progress, Completed, Under Review, or On Hold."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAdd}>
            Add Status
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={statuses}
        isLoading={isLoading}
        emptyTitle="No work statuses found"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStatus ? "Edit Work Status" : "Add Work Status"}
        subtitle="Define a work completion status."
        maxWidth="480px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSubmitting}>
              {editingStatus ? "Save Changes" : "Create Status"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {errorMsg && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-sm)",
                color: "#dc2626",
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              {errorMsg}
            </div>
          )}

          <Input
            label="Status Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Completed, In Progress, On Hold"
            required
            autoFocus
          />

          <div>
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
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
              placeholder="Brief description of when this status applies..."
              style={{
                width: "100%",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "0.625rem 0.875rem",
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
              gap: "0.625rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              backgroundColor: "var(--bg-surface-elevated)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)", width: "16px", height: "16px" }}
            />
            <span>Active for Selection (Available for engineers to log hours)</span>
          </label>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusToDelete)}
        onClose={() => setStatusToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Work Status?"
        description={`Are you sure you want to delete status "${statusToDelete?.name}"?`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* Status In Use Dialog -> Suggest Deactivation */}
      {inUseStatus && (
        <Modal
          isOpen={true}
          onClose={() => setInUseStatus(null)}
          title="Status In Use"
          subtitle="This status cannot be deleted because existing work logs reference it."
          maxWidth="480px"
          footer={
            <>
              <Button variant="secondary" onClick={() => setInUseStatus(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeactivateInUse}
                isLoading={isDeactivating}
              >
                Deactivate Instead
              </Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.875rem 1rem",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "#92400e",
                fontSize: "0.84375rem",
                lineHeight: "1.4",
              }}
            >
              <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Why can't this be deleted?</strong>
                <p style={{ marginTop: "0.25rem", color: "#78350f" }}>
                  {inUseStatus.message}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "0.84375rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Deactivating <strong>&ldquo;{inUseStatus.status.name}&rdquo;</strong> will hide it from future work log selections while keeping all historical records and analytics accurate.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
