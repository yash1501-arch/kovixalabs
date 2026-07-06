"use client";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app-error">
      <div className="app-error-card">
        <h1>Something went wrong</h1>
        <p className="lede">{error.message || "An unexpected error occurred. Please try again."}</p>
        <button className="btn-vox btn-vox-primary" onClick={reset} type="button">
          Try Again <span className="arrow">-&gt;</span>
        </button>
      </div>
    </div>
  );
}
