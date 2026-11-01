"use client";

import React from "react";
import styles from "./Button.module.css";

export function Button({
  children,
  type = "button",
  variant = "primary", // primary, secondary, outline, ghost, danger
  size = "md", // sm, md, lg
  isLoading = false,
  disabled = false,
  icon = null,
  iconPosition = "left",
  className = "",
  onClick,
  ...props
}) {
  const buttonClass = `
    ${styles.button}
    ${styles[variant] || styles.primary}
    ${styles[size] || styles.md}
    ${isLoading ? styles.loading : ""}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <span className={styles.spinner} />
      )}
      {!isLoading && icon && iconPosition === "left" && (
        <span className={styles.icon}>{icon}</span>
      )}
      <span className={styles.label}>{children}</span>
      {!isLoading && icon && iconPosition === "right" && (
        <span className={styles.icon}>{icon}</span>
      )}
    </button>
  );
}
