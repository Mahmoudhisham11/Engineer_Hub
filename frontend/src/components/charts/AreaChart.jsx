"use client";

import React, { useState } from "react";

export function AreaChart({
  data = [], // [{ label: 'Mon', value: 8, isNonWorking: false }]
  height = 220,
  accentColor = "#38d9f5",
  valueFormatter = (v) => `${Number(v).toFixed(1)}h`,
  emptyMessage = "No chart data available",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
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

  const values = data.map((d) => Number(d.value) || 0);
  const maxValue = Math.max(...values, 8); // At least 8h scale
  const padding = { top: 25, right: 25, bottom: 35, left: 40 };

  const chartWidth = 600;
  const chartHeight = height;

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = data.map((d, index) => {
    const x =
      data.length > 1
        ? padding.left + (index / (data.length - 1)) * innerWidth
        : padding.left + innerWidth / 2;
    const y =
      padding.top + innerHeight - ((Number(d.value) || 0) / maxValue) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${
          padding.top + innerHeight
        } L ${points[0].x} ${padding.top + innerHeight} Z`
      : "";

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38d9f5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38d9f5" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + innerHeight * (1 - pct);
          const val = (maxValue * pct).toFixed(0);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="rgba(0, 0, 0, 0.06)"
                strokeDasharray={pct === 0 ? "0" : "4 4"}
              />
              <text
                x={padding.left - 10}
                y={y + 3}
                fill="var(--text-tertiary)"
                fontSize="11"
                fontWeight="500"
                textAnchor="end"
                fontFamily="var(--font-sans)"
              >
                {val}h
              </text>
            </g>
          );
        })}

        {/* Area Fill */}
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

        {/* Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#38d9f5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((pt, idx) => {
          const isHovered = hoverIndex === idx;
          const isZero = (Number(pt.value) || 0) === 0;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Hit target */}
              <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />

              {/* Outer halo */}
              {isHovered && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="9"
                  fill="rgba(56, 217, 245, 0.3)"
                  className="animate-scaleIn"
                />
              )}

              {/* Point circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : pt.isNonWorking ? 3.5 : 4.5}
                fill={pt.isNonWorking ? "#ef4444" : "#1e1f24"}
                stroke="#ffffff"
                strokeWidth="2.5"
              />

              {/* Bottom label */}
              <text
                x={pt.x}
                y={chartHeight - 8}
                fill={pt.isNonWorking ? "#ef4444" : "var(--text-secondary)"}
                fontSize="11"
                fontWeight={isHovered ? "700" : "500"}
                textAnchor="middle"
                fontFamily="var(--font-sans)"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          style={{
            position: "absolute",
            left: `${(points[hoverIndex].x / chartWidth) * 100}%`,
            top: `${(points[hoverIndex].y / chartHeight) * 100}%`,
            transform: "translate(-50%, -125%)",
            backgroundColor: "#1e1f24",
            color: "#ffffff",
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-full)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
            fontSize: "0.75rem",
            fontWeight: 600,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <span>{points[hoverIndex].label}: </span>
          <span style={{ color: "#38d9f5" }}>
            {valueFormatter(points[hoverIndex].value)}
          </span>
        </div>
      )}
    </div>
  );
}
