"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Lock, User, ArrowRight } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./login.module.css";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(usernameOrEmail.trim(), password);
      toast.success(`Welcome back, ${data.user.username}!`);
      router.replace("/dashboard");
    } catch (err) {
      const msg = err.message || "Invalid credentials. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardWrapper}>
        <div className={styles.loginCard}>
          {/* Logo & Header */}
          <div className={styles.header}>
            <img
              src="/logo.png"
              alt="EngineerHub Logo"
              className={styles.logoBadge}
            />
            <h1 className={styles.brandTitle}>EngineerHub</h1>
            <p className={styles.brandSubtitle}>Technical Office Management Platform</p>
          </div>

          {errorMessage && (
            <div className={styles.errorAlert}>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className={styles.form}>
            <Input
              label="Username or Email"
              name="username"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="e.g. your.username or email@company.com"
              icon={<User size={16} />}
              required
              autoFocus
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={<Lock size={16} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              className={styles.submitBtn}
            >
              Sign In
            </Button>
          </form>
        </div>

        <div className={styles.footerText}>
          DME Technical Office Internal System &bull; Secure Authentication
        </div>
      </div>
    </div>
  );
}
