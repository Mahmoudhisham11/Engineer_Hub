"use client";

import React from "react";
import styles from "./Card.module.css";

export function Card({
  children,
  title,
  subtitle,
  actions,
  className = "",
  padding = "md", // none, sm, md, lg
  noBorder = false,
  dark = false,
  frosted = false,
  onClick,
  ...props
}) {
  return (
    <div
      className={`
        ${styles.card}
        ${styles[`padding_${padding}`] || styles.padding_md}
        ${noBorder ? styles.noBorder : ""}
        ${dark ? styles.darkCard : ""}
        ${frosted ? styles.frosted : ""}
        ${onClick ? styles.clickable : ""}
        ${className}
      `.trim()}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className={styles.header}>
          <div>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
