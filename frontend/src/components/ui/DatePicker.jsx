"use client";

import React from "react";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { isNonWorkingDay, getDayName } from "../../lib/utils/dateUtils";
import styles from "./DatePicker.module.css";

export function DatePicker({
  label = "Work Date",
  name = "work_date",
  value = "",
  error,
  helperText,
  disabled = false,
  required = true,
  className = "",
  onChange,
  ...props
}) {
  const isWeekend = value ? isNonWorkingDay(value) : false;
  const dayName = value ? getDayName(value) : "";

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={`${styles.inputContainer} ${isWeekend ? styles.warningBorder : ""} ${error ? styles.errorBorder : ""}`}>
        <CalendarIcon size={16} className={styles.icon} />
        <input
          id={name}
          name={name}
          type="date"
          value={value}
          disabled={disabled}
          required={required}
          onChange={onChange}
          className={styles.input}
          {...props}
        />
        {value && (
          <span className={`${styles.dayBadge} ${isWeekend ? styles.weekendBadge : ""}`}>
            {dayName}
          </span>
        )}
      </div>

      {isWeekend && (
        <div className={styles.warningMessage}>
          <AlertCircle size={13} />
          <span>{dayName} is a company non-working day. Backend will reject submissions for this date.</span>
        </div>
      )}

      {error && <span className={styles.errorText}>{error}</span>}
      {!error && !isWeekend && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
}
