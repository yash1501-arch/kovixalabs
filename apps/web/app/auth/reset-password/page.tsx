"use client";

import { useState, type FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiUrl } from "../../lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  })
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(searchParams);
  const tokenParam = resolvedParams.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/v1/auth/reset-password"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: tokenParam, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `API returned ${response.status}`);
      }

      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not reset password.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!tokenParam) {
    return (
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div className="auth-card-header" variants={fadeUp} custom={0}>
            <h1>Invalid reset link</h1>
            <p>This link is missing the reset token. Please check the link you received.</p>
          </motion.div>
          <motion.div className="auth-footer" variants={fadeUp} custom={1}>
            <a href="/auth/forgot-password">Request a new reset link</a>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div className="auth-card-header" variants={fadeUp} custom={0}>
          <h1>Set new password</h1>
          <p>Choose a new password for your account</p>
        </motion.div>

        {done ? (
          <motion.div className="auth-success" variants={fadeUp} custom={1} role="alert">
            Password reset successfully! Redirecting to sign in...
          </motion.div>
        ) : (
          <>
            {error ? (
              <motion.div className="auth-alert" variants={fadeUp} custom={1} role="alert">
                {error}
              </motion.div>
            ) : null}

            <form onSubmit={handleSubmit} className="auth-form">
              <motion.div className="auth-field" variants={fadeUp} custom={2}>
                <label htmlFor="reset-password">New password</label>
                <div className="password-wrapper">
                  <input
                    id="reset-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="auth-input"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </motion.div>

              <motion.div className="auth-field" variants={fadeUp} custom={3}>
                <label htmlFor="reset-confirm">Confirm new password</label>
                <input
                  id="reset-confirm"
                  name="confirmPassword"
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </motion.div>

              <motion.div variants={fadeUp} custom={4}>
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner" aria-label="Resetting..." />
                  ) : (
                    <>
                      Reset Password <span className="arrow">-&gt;</span>
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </>
        )}

        <motion.div className="auth-footer" variants={fadeUp} custom={5}>
          <a href="/auth/login">Back to sign in</a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
