"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Select.module.css";

export const Select = forwardRef(function Select(
  {
    label,
    name,
    value,
    defaultValue,
    options = [], // [{ value: 1, label: "Option" }]
    placeholder = "Select an option...",
    error,
    helperText,
    disabled = false,
    required = false,
    className = "",
    onChange,
    onBlur,
    ...props
  },
  ref
) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={`${styles.selectContainer} ${error ? styles.hasError : ""} ${disabled ? styles.disabled : ""}`}>
        <select
          ref={ref}
          id={name}
          name={name}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          onChange={onChange}
          onBlur={onBlur}
          className={styles.select}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={styles.arrow} />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
      {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
    </div>
  );
});
