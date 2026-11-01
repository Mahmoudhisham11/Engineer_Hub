"use client";

import React from "react";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import styles from "./Header.module.css";

export function Header() {
  const { user, engineer } = useAuth();
  const displayName = engineer?.full_name || user?.username || "User";

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.welcomeText}>
          Welcome, <span className={styles.userName}>{displayName}</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <Link href="/settings" className={styles.iconBtn} title="Settings">
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}

export default Header;
