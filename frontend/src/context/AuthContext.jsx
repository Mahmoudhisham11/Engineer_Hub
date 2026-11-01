"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "../lib/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [engineer, setEngineer] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    try {
      authApi.logout().catch(() => {});
    } finally {
      localStorage.removeItem("engineerhub_token");
      localStorage.removeItem("engineerhub_user");
      localStorage.removeItem("engineerhub_engineer");
      setUser(null);
      setEngineer(null);
      setToken(null);
      router.push("/login");
    }
  }, [router]);

  // Load session from storage on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem("engineerhub_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        const profile = await authApi.getMe();
        setUser(profile.user);
        setEngineer(profile.engineer);
        localStorage.setItem("engineerhub_user", JSON.stringify(profile.user));
        if (profile.engineer) {
          localStorage.setItem("engineerhub_engineer", JSON.stringify(profile.engineer));
        }
      } catch (err) {
        console.warn("Session expired or invalid token:", err);
        localStorage.removeItem("engineerhub_token");
        localStorage.removeItem("engineerhub_user");
        localStorage.removeItem("engineerhub_engineer");
        setUser(null);
        setEngineer(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to token expiration event
    const handleExpired = () => {
      logout();
    };
    window.addEventListener("engineerhub_auth_expired", handleExpired);
    return () => window.removeEventListener("engineerhub_auth_expired", handleExpired);
  }, [logout]);

  const login = async (usernameOrEmail, password) => {
    const data = await authApi.login(usernameOrEmail, password);
    localStorage.setItem("engineerhub_token", data.access_token);
    localStorage.setItem("engineerhub_user", JSON.stringify(data.user));
    if (data.engineer) {
      localStorage.setItem("engineerhub_engineer", JSON.stringify(data.engineer));
    }
    setToken(data.access_token);
    setUser(data.user);
    setEngineer(data.engineer);
    return data;
  };

  const refreshUser = async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile.user);
      setEngineer(profile.engineer);
      localStorage.setItem("engineerhub_user", JSON.stringify(profile.user));
      if (profile.engineer) {
        localStorage.setItem("engineerhub_engineer", JSON.stringify(profile.engineer));
      }
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  const isAuthenticated = Boolean(user && token);
  const isAdmin = user?.role === "ADMIN";
  const isEngineer = user?.role === "ENGINEER";

  return (
    <AuthContext.Provider
      value={{
        user,
        engineer,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        isEngineer,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
