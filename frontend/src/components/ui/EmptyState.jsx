"use client";

import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon = <FolderOpen size={36} />,
  title = "No records found",
  description = "There are no records matching your current criteria.",
  actionText = null,
  onAction = null,
  actionIcon = null,
  className = "",
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
        color: "var(--text-secondary)",
      }}
    >
      <div
        style={{
          color: "var(--text-tertiary)",
          marginBottom: "0.875rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h4
        style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: "var(--text-primary)",
          marginBottom: "0.25rem",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-tertiary)",
          maxWidth: "360px",
          lineHeight: 1.5,
          marginBottom: actionText ? "1.25rem" : 0,
        }}
      >
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
