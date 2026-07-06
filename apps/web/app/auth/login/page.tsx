"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthResponseSchema } from "@kovixalabs/shared";
import { apiUrl } from "../../lib/api";
import { saveAuthSession } from "../../lib/client-auth";

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

async function readApiMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `API returned ${response.status}`;
  } catch {
    return `API returned ${response.status}`;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/v1/auth/login"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response));
      }

      const session = AuthResponseSchema.parse(await response.json());
      saveAuthSession(session);
      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign in."
      );
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
          <h1>Welcome back</h1>
          <p>Sign in to your AISMOS dashboard</p>
        </motion.div>

        {error ? (
          <motion.div
            className="auth-alert"
            role="alert"
            variants={fadeUp}
            custom={1}
          >
            {error}
          </motion.div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div className="auth-field" variants={fadeUp} custom={2}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
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

          <motion.div className="auth-field" variants={fadeUp} custom={3}>
            <label htmlFor="login-password">Password</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
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

          <motion.div className="auth-form-row" variants={fadeUp} custom={4}>
            <label className="auth-checkbox">
              <input type="checkbox" name="remember" id="login-remember" />
              <span>Remember me</span>
            </label>
            <a href="/auth/forgot-password" className="auth-forgot">
              Forgot password?
            </a>
            <a href="/auth/register" className="auth-forgot">
              Create account
            </a>
          </motion.div>

          <motion.div variants={fadeUp} custom={5}>
            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading ? (
                <span className="spinner" aria-label="Signing in" />
              ) : (
                <>
                  Sign In <span className="arrow">-&gt;</span>
                </>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div className="auth-footer" variants={fadeUp} custom={6}>
          New to KOVIXAILABS? <a href="/auth/register">Create one</a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
