"use client";

import React from "react";
import styles from "./Badge.module.css";

export function Badge({
  children,
  variant = "default", // default, primary, success, warning, danger, info
  dot = false,
  size = "md", // sm, md
  className = "",
}) {
  return (
    <span
      className={`
        ${styles.badge}
        ${styles[variant] || styles.default}
        ${styles[size] || styles.md}
        ${className}
      `.trim()}
    >
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
