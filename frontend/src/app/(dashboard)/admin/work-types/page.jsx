"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Edit2, Trash2, Power, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui/Input";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { workTypesApi } from "../../../../lib/api/workTypes";
import { formatDate } from "../../../../lib/utils/dateUtils";

export default function WorkTypesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [types, setTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete / In Use States
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [inUseType, setInUseType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await workTypesApi.getAll();
      setTypes(res || []);
    } catch (err) {
      console.error("Failed to load work types:", err);
      toast.error("Failed to load work types.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleOpenAdd = () => {
    setEditingType(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingType(t);
    setName(t.name);
    setDescription(t.description || "");
    setIsActive(t.is_active);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Work type name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (editingType) {
        await workTypesApi.update(editingType.id, payload);
        toast.success(`Work type "${payload.name}" updated successfully.`);
      } else {
        await workTypesApi.create(payload);
        toast.success(`Work type "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchTypes();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save work type.");
      toast.error(err.message || "Failed to save work type.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item) => {
    const newActiveState = !item.is_active;
    try {
      await workTypesApi.update(item.id, {
        name: item.name,
        description: item.description,
        is_active: newActiveState,
      });
      toast.success(
        `Work type "${item.name}" is now ${newActiveState ? "Active" : "Inactive"}.`
      );
      fetchTypes();
    } catch (err) {
      toast.error(err.message || "Failed to update work type.");
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    setIsDeleting(true);
    try {
      await workTypesApi.delete(typeToDelete.id);
      toast.success(`Work type "${typeToDelete.name}" deleted successfully.`);
      setTypeToDelete(null);
      fetchTypes();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("reference it") || msg.includes("in use") || msg.includes("deactivate")) {
        const target = typeToDelete;
        setTypeToDelete(null);
        setInUseType({ item: target, message: msg });
      } else {
        toast.error(msg || "Cannot delete work type.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInUse = async () => {
    if (!inUseType?.item) return;
    setIsDeactivating(true);
    try {
      await workTypesApi.update(inUseType.item.id, {
        name: inUseType.item.name,
        description: inUseType.item.description,
        is_active: false,
      });
      toast.success(
        `Work type "${inUseType.item.name}" was deactivated successfully and won't appear in new work logs.`
      );
      setInUseType(null);
      fetchTypes();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate work type.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns = [
    {
      header: "Work Type",
      key: "name",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</span>
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
      header: "Actions",
      key: "actions",
      align: "right",
      width: "240px",
      render: (row) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            title={row.is_active ? "Deactivate" : "Activate"}
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
            onClick={() => setTypeToDelete(row)}
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
        title="Work Types"
        subtitle="Manage engineering activity classifications such as Design, Site Supervision, Quantity Surveying, etc."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAdd}>
            Add Work Type
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={types}
        isLoading={isLoading}
        emptyTitle="No work types found"
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingType ? "Edit Work Type" : "Add Work Type"}
        subtitle="Define a category of engineering activity."
        maxWidth="480px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSubmitting}>
              {editingType ? "Save Changes" : "Create Type"}
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
            label="Work Type Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Structural Design, Site Inspection"
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
              placeholder="Brief description of this work category..."
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
            <span>Active for Selection (Available for engineers to select)</span>
          </label>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(typeToDelete)}
        onClose={() => setTypeToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Work Type?"
        description={`Are you sure you want to delete work type "${typeToDelete?.name}"?`}
        confirmText="Delete"
        isLoading={isDeleting}
      />

      {/* In Use Resolution Modal */}
      {inUseType && (
        <Modal
          isOpen={true}
          onClose={() => setInUseType(null)}
          title="Work Type In Use"
          subtitle="This work type cannot be deleted because existing work logs reference it."
          maxWidth="480px"
          footer={
            <>
              <Button variant="secondary" onClick={() => setInUseType(null)}>
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
                  {inUseType.message}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "0.84375rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Deactivating <strong>&ldquo;{inUseType.item.name}&rdquo;</strong> will hide it from future work log entries while preserving all existing project history and stats.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
