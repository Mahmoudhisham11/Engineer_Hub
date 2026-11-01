"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  Briefcase,
  Users,
  Building2,
  Tag,
  CheckCircle,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  User as UserIcon,
  Layers,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/Badge";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const pathname = usePathname();
  const { user, engineer, isAdmin, logout } = useAuth();

  const engineerNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "My Work Logs", href: "/work-logs", icon: <Clock size={18} /> },
    { label: "Calendar", href: "/calendar", icon: <Calendar size={18} /> },
    { label: "Projects", href: "/projects", icon: <Briefcase size={18} /> },
  ];

  const adminNavItems = [
    { label: "Allocation", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Engineers", href: "/admin/engineers", icon: <Users size={18} /> },
    { label: "Projects", href: "/projects", icon: <Briefcase size={18} /> },
    { label: "Departments", href: "/admin/departments", icon: <Building2 size={18} /> },
    { label: "Work Types", href: "/admin/work-types", icon: <Tag size={18} /> },
    { label: "Work Statuses", href: "/admin/work-statuses", icon: <CheckCircle size={18} /> },
    { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 size={18} /> },
    { label: "Activity Logs", href: "/admin/audit-logs", icon: <ShieldAlert size={18} /> },
  ];

  const navItems = isAdmin ? adminNavItems : engineerNavItems;

  const displayName = engineer?.full_name || user?.username || "User";
  const displayRole = user?.role || "ENGINEER";

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <img
          src="/logo.png"
          alt="EngineerHub Logo"
          className={styles.logoImg}
        />
        <div className={styles.brandText}>
          <span className={styles.brandName}>EngineerHub</span>
          <span className={styles.brandTag}>Developed by Mostafa Sayed</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSectionLabel}>
          {isAdmin ? "ADMINISTRATION" : "WORKSPACE"}
        </div>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Profile */}
      <div className={styles.footer}>
        <Link
          href="/settings"
          className={`${styles.navLink} ${pathname === "/settings" ? styles.active : ""}`}
          style={{ marginBottom: "0.5rem" }}
        >
          <span className={styles.navIcon}>
            <Settings size={18} />
          </span>
          <span className={styles.navLabel}>Settings</span>
        </Link>

        <div className={styles.userCard}>
          <div className={styles.userAvatar}>
            <UserIcon size={16} />
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName} title={displayName}>
              {displayName}
            </div>
            <div className={styles.userMeta}>
              <Badge variant={isAdmin ? "primary" : "info"} size="sm">
                {displayRole}
              </Badge>
            </div>
          </div>
          <button
            onClick={logout}
            className={styles.logoutBtn}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
