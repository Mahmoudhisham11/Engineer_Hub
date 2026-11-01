"use client";

import React from "react";

const PALETTE = ["#38d9f5", "#1e1f24", "#60a5fa", "#10b981", "#f59e0b", "#a855f7", "#ec4899"];

export function DonutChart({
  data = [], // [{ name: 'Site Work', hours: 40, percentage: 50 }]
  size = 150,
  strokeWidth = 16,
  emptyMessage = "No distribution data",
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
          fontSize: "0.8125rem",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const total = data.reduce((acc, d) => acc + (Number(d.hours) || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", width: "100%" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Subtle background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            data.map((slice, idx) => {
              const val = Number(slice.hours) || 0;
              const ratio = val / total;
              const strokeDasharray = `${circumference * ratio} ${circumference * (1 - ratio)}`;
              const strokeDashoffset = -circumference * accumulatedAngle;
              accumulatedAngle += ratio;

              return (
                <circle
                  key={slice.id || idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={PALETTE[idx % PALETTE.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              );
            })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {total.toFixed(0)}h
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
            Total
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {data.slice(0, 5).map((slice, idx) => {
          const val = Number(slice.hours) || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
          const color = PALETTE[idx % PALETTE.length];

          return (
            <div
              key={slice.id || idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.8125rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                  }}
                  title={slice.name}
                >
                  {slice.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
                  {pct}%
                </span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.8125rem" }}>
                  {val.toFixed(1)}h
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
