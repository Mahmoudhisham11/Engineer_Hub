"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { DatePicker } from "../ui/DatePicker";
import { projectsApi } from "../../lib/api/projects";
import { workTypesApi } from "../../lib/api/workTypes";
import { workStatusesApi } from "../../lib/api/workStatuses";
import { engineersApi } from "../../lib/api/engineers";
import { workLogsApi } from "../../lib/api/workLogs";
import { useToast } from "../../context/ToastContext";
import { getTodayIsoString, isNonWorkingDay } from "../../lib/utils/dateUtils";

export function WorkLogModal({
  isOpen = false,
  onClose,
  onSuccess,
  workLog = null, // If provided, edit mode
  isAdmin = false,
  initialEngineerId = null,
  initialDate = null,
}) {
  const [workDate, setWorkDate] = useState(getTodayIsoString());
  const [projectId, setProjectId] = useState("");
  const [hours, setHours] = useState("8.00");
  const [workTypeId, setWorkTypeId] = useState("");
  const [workStatusId, setWorkStatusId] = useState("");
  const [engineerId, setEngineerId] = useState("");
  const [notes, setNotes] = useState("");

  const [projects, setProjects] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [workStatuses, setWorkStatuses] = useState([]);
  const [engineers, setEngineers] = useState([]);

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const toast = useToast();
  const isEdit = Boolean(workLog);

  // Load dropdown options
  useEffect(() => {
    if (!isOpen) return;

    async function loadMetadata() {
      setIsLoadingMetadata(true);
      try {
        const [projRes, typeRes, statusRes] = await Promise.all([
          projectsApi.getAll(true),
          workTypesApi.getAll(true),
          workStatusesApi.getAll(true),
        ]);
        setProjects(projRes || []);
        setWorkTypes(typeRes || []);
        setWorkStatuses(statusRes || []);

        if (isAdmin && !isEdit) {
          const engRes = await engineersApi.getAll({ is_active: true, page_size: 100 });
          setEngineers(engRes.items || []);
        }
      } catch (err) {
        console.error("Failed to load work log options:", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    loadMetadata();
  }, [isOpen, isAdmin, isEdit]);

  // Set form fields on open
  useEffect(() => {
    if (isOpen) {
      setFormError("");
      if (workLog) {
        setWorkDate(workLog.work_date || getTodayIsoString());
        setProjectId(String(workLog.project_id || ""));
        setHours(String(workLog.hours || "8.00"));
        setWorkTypeId(String(workLog.work_type_id || ""));
        setWorkStatusId(String(workLog.work_status_id || ""));
        setNotes(workLog.notes || "");
      } else {
        setWorkDate(initialDate || getTodayIsoString());
        setProjectId("");
        setHours("8.00");
        setWorkTypeId("");
        setWorkStatusId("");
        setNotes("");
        if (initialEngineerId) {
          setEngineerId(String(initialEngineerId));
        }
      }
    }
  }, [isOpen, workLog, initialDate, initialEngineerId]);

  // Auto-select first default option if available
  useEffect(() => {
    if (!isEdit && isOpen) {
      if (!projectId && projects.length > 0) setProjectId(String(projects[0].id));
      if (!workTypeId && workTypes.length > 0) setWorkTypeId(String(workTypes[0].id));
      if (!workStatusId && workStatuses.length > 0) setWorkStatusId(String(workStatuses[0].id));
      if (isAdmin && !engineerId && engineers.length > 0) setEngineerId(String(engineers[0].id));
    }
  }, [projects, workTypes, workStatuses, engineers, isEdit, isOpen, projectId, workTypeId, workStatusId, isAdmin, engineerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Frontend validation check for non-working days
    if (isNonWorkingDay(workDate)) {
      setFormError("Work logs cannot be recorded on Fridays or Saturdays.");
      toast.error("Friday and Saturday are company non-working days.");
      return;
    }

    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0) {
      setFormError("Hours must be greater than 0.");
      return;
    }

    if (!projectId) {
      setFormError("Please select a project.");
      return;
    }
    if (!workTypeId) {
      setFormError("Please select a work type.");
      return;
    }
    if (!workStatusId) {
      setFormError("Please select a work status.");
      return;
    }

    const payload = {
      work_date: workDate,
      project_id: parseInt(projectId, 10),
      hours: parseFloat(numHours.toFixed(2)),
      work_type_id: parseInt(workTypeId, 10),
      work_status_id: parseInt(workStatusId, 10),
      notes: notes.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        if (isAdmin) {
          await workLogsApi.updateAdminLog(workLog.id, payload);
        } else {
          await workLogsApi.updateMyLog(workLog.id, payload);
        }
        toast.success("Work log updated successfully.");
      } else {
        if (isAdmin && engineerId) {
          await workLogsApi.createAdminLog({
            ...payload,
            engineer_id: parseInt(engineerId, 10),
          });
        } else {
          await workLogsApi.createMyLog(payload);
        }
        toast.success("Work log recorded successfully.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.message || "Failed to save work log.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? null : onClose}
      title={isEdit ? "Edit Work Log" : "Add Work Log"}
      subtitle={
        isEdit
          ? "Update details for this work log entry."
          : "Record daily technical engineering activity and hours."
      }
      maxWidth="520px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            {isEdit ? "Save Changes" : "Save Work Log"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

        {isAdmin && !isEdit && (
          <Select
            label="Engineer"
            name="engineer_id"
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
            options={engineers.map((e) => ({
              value: e.id,
              label: `${e.full_name} (${e.employee_code})`,
            }))}
            required
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <DatePicker
            label="Work Date"
            name="work_date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
          />

          <Input
            label="Hours Spent"
            name="hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 8.00"
            required
          />
        </div>

        <Select
          label="Project"
          name="project_id"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={projects.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.project_code})`,
          }))}
          required
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Select
            label="Work Type"
            name="work_type_id"
            value={workTypeId}
            onChange={(e) => setWorkTypeId(e.target.value)}
            options={workTypes.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
            required
          />

          <Select
            label="Work Status"
            name="work_status_id"
            value={workStatusId}
            onChange={(e) => setWorkStatusId(e.target.value)}
            options={workStatuses.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            required
          />
        </div>

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
            Notes / Activity Description (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe specific engineering tasks, calculations, or deliverables..."
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
      </form>
    </Modal>
  );
}
