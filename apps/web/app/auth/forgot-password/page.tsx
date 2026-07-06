"use client";

import { useState, type FormEvent } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `API returned ${response.status}`);
      }

      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send reset email.");
    } finally {
      setIsLoading(false);
    }
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
          <h1>Reset your password</h1>
          <p>Enter your email and we&apos;ll send you a reset link</p>
        </motion.div>

        {sent ? (
          <motion.div className="auth-success" variants={fadeUp} custom={1} role="alert">
            If an account exists with that email, a reset link has been sent.
            Check your inbox and spam folder.
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
                <label htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  className="auth-input"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </motion.div>

              <motion.div variants={fadeUp} custom={3}>
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner" aria-label="Sending..." />
                  ) : (
                    <>
                      Send Reset Link <span className="arrow">-&gt;</span>
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </>
        )}

        <motion.div className="auth-footer" variants={fadeUp} custom={4}>
          <a href="/auth/login">Back to sign in</a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
