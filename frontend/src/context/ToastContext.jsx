"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 4500) => {
      if (!message) return;
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, message: String(message), type };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg, dur) => addToast(msg, "success", dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, "error", dur || 6000), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, "warning", dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, "info", dur), [addToast]);

  const toast = useMemo(
    () => ({
      success,
      error,
      warning,
      info,
    }),
    [success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          pointerEvents: "none",
          maxWidth: "420px",
          width: "calc(100vw - 3rem)",
        }}
      >
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          // Solid dark pill styling with vivid accent borders and pure white readable typography
          const accentColor = isSuccess
            ? "#10b981"
            : isError
            ? "#ef4444"
            : isWarning
            ? "#f59e0b"
            : "#38d9f5";

          const iconBg = isSuccess
            ? "rgba(16, 185, 129, 0.2)"
            : isError
            ? "rgba(239, 68, 68, 0.2)"
            : isWarning
            ? "rgba(245, 158, 11, 0.2)"
            : "rgba(56, 217, 245, 0.2)";

          const title = isSuccess
            ? "Success"
            : isError
            ? "Notice"
            : isWarning
            ? "Warning"
            : "Information";

          return (
            <div
              key={t.id}
              className="animate-slideUp"
              style={{
                pointerEvents: "auto",
                backgroundColor: "#1e1f24",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: "16px",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.25)",
                padding: "0.875rem 1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                color: "#ffffff",
              }}
            >
              {/* Icon Container */}
              <div
                style={{
                  backgroundColor: iconBg,
                  color: accentColor,
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {isSuccess && <CheckCircle2 size={18} />}
                {isError && <XCircle size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {!isSuccess && !isError && !isWarning && <Info size={18} />}
              </div>

              {/* Text content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {title}
                </div>
                <div style={{ fontSize: "0.84375rem", color: "#f8fafc", lineHeight: "1.4", fontWeight: 500 }}>
                  {t.message}
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
