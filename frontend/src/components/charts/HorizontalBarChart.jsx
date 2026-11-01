"use client";

import React from "react";

export function HorizontalBarChart({
  data = [], // [{ name: 'Civil', hours: 45.5, count: 10, percentage: 35 }]
  valueKey = "hours",
  labelKey = "name",
  maxValue = null,
  emptyMessage = "No distribution data available",
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "0.8125rem",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const calculatedMax =
    maxValue || Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
      {data.map((item, idx) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.min((val / calculatedMax) * 100, 100);

        return (
          <div key={item.id || idx} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.84375rem",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {item[labelKey] || "Unknown"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                {item.percentage !== undefined && (
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontWeight: 500 }}>
                    {Number(item.percentage).toFixed(0)}%
                  </span>
                )}
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {val.toFixed(1)} hrs
                </span>
              </div>
            </div>

            {/* Progress track */}
            <div
              style={{
                height: "8px",
                width: "100%",
                backgroundColor: "#f1f5f9",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, #38d9f5 0%, #06b6d4 100%)",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.4s ease",
                  boxShadow: "0 0 8px rgba(56, 217, 245, 0.4)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
