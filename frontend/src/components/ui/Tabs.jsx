"use client";

import React from "react";
import styles from "./Tabs.module.css";

export function Tabs({
  tabs = [], // [{ id: 'all', label: 'All', count: 12 }]
  activeTab,
  onChange,
  className = "",
}) {
  return (
    <div className={`${styles.tabsContainer} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`${styles.countBadge} ${isActive ? styles.activeCountBadge : ""}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
