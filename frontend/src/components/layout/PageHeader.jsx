"use client";

import React from "react";

export function PageHeader({
  title,
  subtitle,
  actions = null,
  breadcrumbs = null,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div>
        {breadcrumbs && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: "0.25rem",
            }}
          >
            {breadcrumbs}
          </div>
        )}
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "0.84375rem",
              color: "var(--text-secondary)",
              marginTop: "0.25rem",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
