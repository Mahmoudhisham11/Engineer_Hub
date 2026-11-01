"use client";

import React from "react";
import styles from "./KpiCard.module.css";

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend, // { value: "+12%", isPositive: true, label: "vs last month" }
  isLoading = false,
  className = "",
  onClick,
}) {
  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ""} ${className}`}
      onClick={onClick}
    >
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.skeletonValue} />
        ) : (
          <div className={styles.value}>{value}</div>
        )}

        {(subtitle || trend) && (
          <div className={styles.footer}>
            {trend && (
              <span
                className={`${styles.trend} ${
                  trend.isPositive ? styles.positive : styles.negative
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
