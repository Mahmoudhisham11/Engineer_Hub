"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Building2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { DataTable } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { engineersApi } from "../../../../lib/api/engineers";
import { departmentsApi } from "../../../../lib/api/departments";
import { formatDate } from "../../../../lib/utils/dateUtils";
import styles from "./engineers.module.css";

export default function EngineersAdminPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [engineers, setEngineers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, active, inactive

  // Add Engineer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState("ENGINEER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Engineer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEng, setEditingEng] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editEmpCode, setEditEmpCode] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("ENGINEER");

  // Role Toggle Confirm Dialog State
  const [roleTargetEng, setRoleTargetEng] = useState(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEng, setResetEng] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Load departments
  useEffect(() => {
    departmentsApi.getAll().then((res) => setDepartments(res || []));
  }, []);

  const fetchEngineers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        department_id: selectedDept ? parseInt(selectedDept, 10) : undefined,
        is_active: activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
      };

      const res = await engineersApi.getAll(params);
      setEngineers(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error("Failed to load engineers:", err);
      toast.error("Failed to load engineers list.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, selectedDept, activeFilter, toast]);

  useEffect(() => {
    fetchEngineers();
  }, [fetchEngineers]);

  const handleCreateEngineer = async (e) => {
    e.preventDefault();
    setAddError("");

    if (!username.trim() || !email.trim() || !password || !fullName.trim() || !employeeCode.trim() || !departmentId) {
      setAddError("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAddError("Please enter a valid email address with a domain (e.g. name@example.com).");
      return;
    }

    const payload = {
      username: username.trim(),
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      employee_code: employeeCode.trim().toUpperCase(),
      department_id: parseInt(departmentId, 10),
      role: role || "ENGINEER",
      is_active: true,
    };

    setIsSubmitting(true);
    try {
      await engineersApi.create(payload);
      toast.success(`Engineer ${fullName} created successfully.`);
      setIsAddModalOpen(false);
      // Reset form
      setUsername("");
      setEmail("");
      setPassword("");
      setFullName("");
      setEmployeeCode("");
      setDepartmentId("");
      setRole("ENGINEER");
      fetchEngineers();
    } catch (err) {
      setAddError(err.message || "Failed to create engineer.");
      toast.error(err.message || "Failed to create engineer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEngineer = async (e) => {
    e.preventDefault();
    if (!editingEng) return;

    if (editEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        toast.error("Please enter a valid email address with a domain (e.g. name@example.com).");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await engineersApi.update(editingEng.id, {
        full_name: editFullName.trim(),
        department_id: parseInt(editDeptId, 10),
        employee_code: editEmpCode.trim().toUpperCase(),
        email: editEmail.trim(),
        role: editRole,
      });
      toast.success("Engineer profile updated.");
      setIsEditModalOpen(false);
      fetchEngineers();
    } catch (err) {
      toast.error(err.message || "Failed to update engineer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleTargetEng) return;
    const currentEngRole = roleTargetEng.user?.role || "ENGINEER";
    const nextRole = currentEngRole === "ADMIN" ? "ENGINEER" : "ADMIN";

    setIsUpdatingRole(true);
    try {
      await engineersApi.changeRole(roleTargetEng.id, nextRole);
      toast.success(
        nextRole === "ADMIN"
          ? `${roleTargetEng.full_name} is now an Administrator.`
          : `${roleTargetEng.full_name} role changed to Engineer.`
      );
      setRoleTargetEng(null);
      fetchEngineers();
    } catch (err) {
      toast.error(err.message || "Failed to change user role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEng || !newPassword) return;

    setIsResetting(true);
    try {
      await engineersApi.resetPassword(resetEng.id, newPassword);
      toast.success(`Password reset for ${resetEng.full_name}.`);
      setIsResetModalOpen(false);
      setNewPassword("");
      setResetEng(null);
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleActive = async (eng) => {
    try {
      if (eng.is_active) {
        await engineersApi.deactivate(eng.id);
        toast.success(`Engineer ${eng.full_name} deactivated.`);
      } else {
        await engineersApi.activate(eng.id);
        toast.success(`Engineer ${eng.full_name} activated.`);
      }
      fetchEngineers();
    } catch (err) {
      toast.error(err.message || "Failed to change status.");
    }
  };

  const openEditModal = (eng) => {
    setEditingEng(eng);
    setEditFullName(eng.full_name);
    setEditDeptId(String(eng.department_id));
    setEditEmpCode(eng.employee_code);
    setEditEmail(eng.user?.email || "");
    setEditRole(eng.user?.role || "ENGINEER");
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      header: "Code",
      key: "employee_code",
      width: "110px",
      render: (row) => (
        <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
          {row.employee_code}
        </span>
      ),
    },
    {
      header: "Full Name",
      key: "full_name",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.full_name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {row.user?.email || row.user?.username || ""}
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
      header: "Role",
      key: "role",
      width: "120px",
      align: "center",
      render: (row) => {
        const userRole = row.user?.role || "ENGINEER";
        const isAdminRole = userRole === "ADMIN";
        return (
          <Badge
            variant={isAdminRole ? "primary" : "default"}
            style={
              isAdminRole
                ? {
                    background: "rgba(124, 58, 237, 0.15)",
                    color: "#a78bfa",
                    border: "1px solid rgba(124, 58, 237, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }
                : {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }
            }
          >
            {isAdminRole ? <Shield size={12} /> : <UserIcon size={12} />}
            {isAdminRole ? "Admin" : "Engineer"}
          </Badge>
        );
      },
    },
    {
      header: "Status",
      key: "is_active",
      align: "center",
      width: "100px",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "default"} dot>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Enrolled Date",
      key: "created_at",
      width: "120px",
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
      width: "280px",
      render: (row) => {
        const isTargetAdmin = row.user?.role === "ADMIN";
        return (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.35rem" }}>
            {/* Make Admin / Revoke Admin Quick Action */}
            <Button
              variant="ghost"
              size="sm"
              title={isTargetAdmin ? "Demote to Engineer" : "Promote to Admin"}
              style={{
                color: isTargetAdmin ? "#a78bfa" : "var(--accent-primary)",
                background: isTargetAdmin ? "rgba(124, 58, 237, 0.1)" : "rgba(6, 182, 212, 0.08)",
                border: isTargetAdmin ? "1px solid rgba(124, 58, 237, 0.25)" : "1px solid rgba(6, 182, 212, 0.2)",
                fontSize: "0.75rem",
                padding: "0.25rem 0.6rem",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setRoleTargetEng(row);
              }}
            >
              <Shield size={13} style={{ marginRight: "0.25rem" }} />
              {isTargetAdmin ? "Revoke Admin" : "Make Admin"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row);
              }}
            >
              Edit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              title="Reset Password"
              onClick={(e) => {
                e.stopPropagation();
                setResetEng(row);
                setNewPassword("");
                setIsResetModalOpen(true);
              }}
            >
              <KeyRound size={14} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              style={{ color: row.is_active ? "#f87171" : "#34d399" }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(row);
              }}
            >
              {row.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Engineer Directory"
        subtitle="Manage technical engineering personnel, administrative roles, credentials, and departmental assignments."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
            + Enroll Engineer
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by engineer name, employee code, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filtersRight}>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className={styles.statusFilters}>
            <button
              className={`${styles.filterBtn} ${activeFilter === "all" ? styles.activeFilter : ""}`}
              onClick={() => {
                setActiveFilter("all");
                setPage(1);
              }}
            >
              All
            </button>
            <button
              className={`${styles.filterBtn} ${activeFilter === "active" ? styles.activeFilter : ""}`}
              onClick={() => {
                setActiveFilter("active");
                setPage(1);
              }}
            >
              Active
            </button>
            <button
              className={`${styles.filterBtn} ${activeFilter === "inactive" ? styles.activeFilter : ""}`}
              onClick={() => {
                setActiveFilter("inactive");
                setPage(1);
              }}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Engineers Table */}
      <DataTable
        columns={columns}
        data={engineers}
        isLoading={isLoading}
        emptyTitle="No engineers found"
        emptyDescription="Try adjusting your search criteria or enroll a new engineer."
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Add Engineer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll New Engineer"
        subtitle="Creates both system login credentials and an engineering profile in one transaction."
        maxWidth="540px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateEngineer} isLoading={isSubmitting}>
              Enroll Engineer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateEngineer} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {addError && (
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
              {addError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input
              label="Full Name"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ahmed Mahmoud"
              required
              autoFocus
            />
            <Input
              label="Employee Code"
              name="employee_code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENG-010"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Select
              label="Department"
              name="department_id"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departments.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              placeholder="Select Department..."
              required
            />

            <Select
              label="System Role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: "ENGINEER", label: "Engineer (Standard)" },
                { value: "ADMIN", label: "Admin (Full Access)" },
              ]}
              required
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
            <h4 style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Login Credentials
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Input
                label="Username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ahmed.m"
                required
              />
              <Input
                label="Corporate Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ahmed.m@dme.internal"
                required
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Input
                label="Initial Password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Engineer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Engineer Profile"
        subtitle="Update engineer details, departmental alignment, and role permissions."
        maxWidth="480px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateEngineer} isLoading={isSubmitting}>
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateEngineer} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Full Name"
            name="edit_full_name"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input
              label="Employee Code"
              name="edit_emp_code"
              value={editEmpCode}
              onChange={(e) => setEditEmpCode(e.target.value.toUpperCase())}
              required
            />
            <Select
              label="System Role"
              name="edit_role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              options={[
                { value: "ENGINEER", label: "Engineer" },
                { value: "ADMIN", label: "Admin" },
              ]}
              required
            />
          </div>
          <Input
            label="Email"
            name="edit_email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <Select
            label="Department"
            name="edit_dept_id"
            value={editDeptId}
            onChange={(e) => setEditDeptId(e.target.value)}
            options={departments.map((d) => ({
              value: d.id,
              label: d.name,
            }))}
            required
          />
        </form>
      </Modal>

      {/* Role Change Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!roleTargetEng}
        onClose={() => setRoleTargetEng(null)}
        onConfirm={handleConfirmRoleChange}
        title={
          roleTargetEng?.user?.role === "ADMIN"
            ? `Revoke Admin Access for ${roleTargetEng?.full_name}?`
            : `Grant Admin Access to ${roleTargetEng?.full_name}?`
        }
        description={
          roleTargetEng?.user?.role === "ADMIN"
            ? `This will change ${roleTargetEng?.full_name}'s role back to Engineer. They will lose access to administrative panels and reports.`
            : `This will grant ${roleTargetEng?.full_name} full Administrator permissions, allowing them to manage engineers, projects, allocations, and system settings.`
        }
        confirmText={roleTargetEng?.user?.role === "ADMIN" ? "Demote to Engineer" : "Grant Admin Access"}
        cancelText="Cancel"
        variant={roleTargetEng?.user?.role === "ADMIN" ? "danger" : "primary"}
        isLoading={isUpdatingRole}
      />

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Engineer Password"
        subtitle={`Set a new temporary or permanent password for ${resetEng?.full_name}.`}
        maxWidth="420px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleResetPassword} isLoading={isResetting}>
              Reset Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassword}>
          <Input
            label="New Password"
            name="new_password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter secure new password"
            required
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
}
