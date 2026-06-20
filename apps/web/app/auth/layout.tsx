import type { ReactNode } from "react";
import "./auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-grid-overlay" aria-hidden="true" />

      <div className="auth-container">
        <div className="auth-brand">
          <a className="auth-brand-name" href="/">
            KOVIXAILABS
          </a>
          <div className="auth-brand-tagline">
            AI Social Media Operating System
          </div>
        </div>

        {children}

        <div className="auth-footer auth-legal">
          <span>
            (c) {new Date().getFullYear()} KOVIXAILABS. All rights reserved.
          </span>
        </div>
      </div>
    </div>
  );
}
