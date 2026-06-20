"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): {
  level: StrengthLevel;
  score: number;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: "weak", score: 1, label: "Weak" };
  if (score <= 2) return { level: "fair", score: 2, label: "Fair" };
  if (score <= 3) return { level: "good", score: 3, label: "Good" };
  return { level: "strong", score: 4, label: "Strong" };
}

async function readApiMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `API returned ${response.status}`;
  } catch {
    return `API returned ${response.status}`;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const workspaceParam = params.get("workspace");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (workspaceParam) {
      setWorkspaceName(workspaceParam);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(apiUrl("/v1/auth/register"), {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            password,
            workspaceName: workspaceName || undefined
          })
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
            : "Could not create account."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [confirmPassword, email, name, password, router, workspaceName]
  );

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div className="auth-card-header" variants={fadeUp} custom={0}>
          <h1>Create your account</h1>
          <p>Start automating your social presence with AI</p>
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
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              className="auth-input"
              placeholder="Yash Sharma"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </motion.div>

          <motion.div className="auth-field" variants={fadeUp} custom={3}>
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
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

          <motion.div className="auth-field" variants={fadeUp} custom={4}>
            <label htmlFor="register-workspace">Workspace name</label>
            <input
              id="register-workspace"
              name="workspace"
              type="text"
              className="auth-input"
              placeholder="Your brand or company"
              autoComplete="organization"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
          </motion.div>

          <motion.div className="auth-field" variants={fadeUp} custom={5}>
            <label htmlFor="register-password">Password</label>
            <div className="password-wrapper">
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

            {strength ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="password-strength">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`password-strength-bar${
                        bar <= strength.score
                          ? ` active ${strength.level}`
                          : ""
                      }`}
                    />
                  ))}
                </div>
                <div className={`password-strength-label ${strength.level}`}>
                  {strength.label}
                </div>
              </motion.div>
            ) : null}
          </motion.div>

          <motion.div className="auth-field" variants={fadeUp} custom={6}>
            <label htmlFor="register-confirm-password">Confirm password</label>
            <div className="password-wrapper">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} custom={7}>
            <label className="auth-checkbox">
              <input type="checkbox" name="terms" id="register-terms" required />
              <span>I agree to product updates and account terms.</span>
            </label>
          </motion.div>

          <motion.div variants={fadeUp} custom={8}>
            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
              id="register-submit"
            >
              {isLoading ? (
                <span className="spinner" aria-label="Creating account" />
              ) : (
                <>
                  Create Account <span className="arrow">-&gt;</span>
                </>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div className="auth-footer" variants={fadeUp} custom={9}>
          Already have an account? <a href="/auth/login">Sign in</a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
