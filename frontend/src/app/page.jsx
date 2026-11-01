"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-secondary)",
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: "24px",
          height: "24px",
          border: "2px solid var(--border-subtle)",
          borderTopColor: "var(--accent-primary)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
