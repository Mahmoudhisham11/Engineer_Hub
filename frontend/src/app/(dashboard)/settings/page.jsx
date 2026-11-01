"use client";

import React, { useState } from "react";
import {
  User,
  Lock,
  Shield,
  Building2,
  Calendar,
  Save,
  CheckCircle2,
  Server,
  Layers,
  Clock,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { authApi } from "../../../lib/api/auth";
import { engineersApi } from "../../../lib/api/engineers";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { user, engineer, isAdmin, isEngineer, refreshUser } = useAuth();
  const toast = useToast();

  // Profile update state (for Engineer)
  const [fullName, setFullName] = useState(engineer?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await engineersApi.updateMyProfile({ full_name: fullName.trim() });
      await refreshUser();
      toast.success("Profile information updated.");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Settings & Profile"
        subtitle="Manage your personal account details, credentials, and platform preferences."
      />

      <div className={styles.grid}>
        {/* Account Details */}
        <Card
          title="Account Profile"
          subtitle="Your personal profile information and corporate role"
        >
          <div className={styles.profileSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Role</span>
              <span className={styles.infoValue}>
                <Badge variant={isAdmin ? "primary" : "info"}>
                  {user?.role || "USER"}
                </Badge>
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Username</span>
              <span className={styles.infoValue}>{user?.username || "—"}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Corporate Email</span>
              <span className={styles.infoValue}>{user?.email || "—"}</span>
            </div>

            {isEngineer && engineer && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Employee Code</span>
                  <span className={styles.infoValue} style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                    {engineer.employee_code}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Department</span>
                  <span className={styles.infoValue}>
                    {engineer.department?.name || "Unassigned"}
                  </span>
                </div>

                <form onSubmit={handleUpdateProfile} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <Input
                    label="Full Name"
                    name="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your legal full name"
                    required
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={<Save size={14} />}
                      isLoading={isUpdatingProfile}
                    >
                      Save Profile
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Card>

        {/* Change Password */}
        <Card
          title="Security & Password"
          subtitle="Update your password to keep your account secure"
        >
          <form onSubmit={handleChangePassword} className={styles.form}>
            {passwordError && (
              <div className={styles.errorAlert}>
                {passwordError}
              </div>
            )}

            <Input
              label="Current Password"
              name="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Input
              label="New Password"
              name="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              name="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<Lock size={14} />}
                isLoading={isChangingPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* System Policy & Calendar Info */}
      <Card
        title="Technical Office Operational Policies"
        subtitle="Active platform configuration and company calendar rules"
      >
        <div className={styles.policyGrid}>
          <div className={styles.policyItem}>
            <div className={styles.policyIcon}>
              <Calendar size={18} />
            </div>
            <div>
              <div className={styles.policyTitle}>Company Non-Working Days</div>
              <div className={styles.policyText}>
                Fridays and Saturdays are enforced company non-working days. Work logs submitted on these dates will be strictly rejected by the backend validation engine.
              </div>
            </div>
          </div>

          <div className={styles.policyItem}>
            <div className={styles.policyIcon}>
              <Clock size={18} />
            </div>
            <div>
              <div className={styles.policyTitle}>Daily Hours Policy</div>
              <div className={styles.policyText}>
                Work logs must be recorded with positive decimal hours. Cumulative logged effort per engineer cannot exceed the 24-hour daily threshold per calendar date.
              </div>
            </div>
          </div>

          <div className={styles.policyItem}>
            <div className={styles.policyIcon}>
              <Server size={18} />
            </div>
            <div>
              <div className={styles.policyTitle}>Centralized SQLite Architecture</div>
              <div className={styles.policyText}>
                The system uses a single high-performance SQLite engine configured with Write-Ahead Logging (WAL) and automatic lock recovery over UNC network shares.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
