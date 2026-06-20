"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AiSocialOrbit } from "./components/ai-social-orbit";
import "./landing.css";

const features = [
  {
    num: "01",
    title: "Brand Memory",
    description:
      "AISMOS stores voice, audience, offers, claims, visual rules, and past learnings so generated posts stay aligned."
  },
  {
    num: "02",
    title: "Content Studio",
    description:
      "Generate captions, hooks, scripts, and variants with platform-aware structure and tone for every social channel."
  },
  {
    num: "03",
    title: "Trend Engine",
    description:
      "Track social signals and convert relevant topics into brand-safe ideas before they become crowded."
  },
  {
    num: "04",
    title: "Creative AI",
    description:
      "Shape brand-consistent visuals, short-form concepts, and production prompts from one operating context."
  },
  {
    num: "05",
    title: "Smart Calendar",
    description:
      "Queue drafts, approvals, and scheduling decisions around channel timing and campaign priorities."
  },
  {
    num: "06",
    title: "Analytics Loop",
    description:
      "Feed performance signals back into content planning, brand memory, and future generation workflows."
  }
];

const metrics = [
  { value: "10x", label: "Faster Delivery" },
  { value: "6+", label: "Social Networks" },
  { value: "24/7", label: "Operational Loop" },
  { value: "1", label: "Brand Memory Core" }
];

const capabilities = [
  "Content Creation",
  "Brand Voice Alignment",
  "Trend Spotting",
  "Auto-Scheduling",
  "Performance Analytics"
];
const platforms = [
  "Instagram",
  "LinkedIn",
  "X / Twitter",
  "TikTok",
  "YouTube",
  "Facebook"
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.56,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  })
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07
    }
  }
};

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandDesc, setBrandDesc] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleCap = (capability: string) => {
    setSelectedCaps((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !brandName) {
      return;
    }

    setSubmitted(true);
    window.setTimeout(() => {
      const params = new URLSearchParams({
        email,
        workspace: brandName
      });
      window.location.href = `/auth/register?${params.toString()}`;
    }, 500);
  };

  const viewport = { once: true, margin: "-80px" };

  return (
    <div className="landing">
      <div className="grid-bg-overlay" aria-hidden="true" />

      <motion.nav
        className="landing-nav"
        initial={reduceMotion ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <a href="#top" className="landing-nav-brand">
          KOVIXAILABS
        </a>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#metrics">Stats</a>
          <a href="#onboard">Setup</a>
          <a href="/auth/login">Sign In</a>
          <a href="/auth/register" className="nav-cta">
            Get Started
          </a>
        </div>
      </motion.nav>

      <section className="hero" id="top">
        <div className="hero-visual" aria-hidden="true">
          <AiSocialOrbit />
        </div>

        <motion.div
          className="hero-inner"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={stagger}
        >
          <motion.div className="hero-badge" variants={fadeUp} custom={0}>
            AISMOS v1.0 - Social Media OS
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1}>
            Social content engines,{" "}
            <span className="highlight-text">wired with brand memory.</span>
          </motion.h1>

          <motion.p className="hero-description" variants={fadeUp} custom={2}>
            AISMOS remembers your brand, monitors social signals, generates
            channel-ready content, schedules posts, and learns from performance.
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} custom={3}>
            <a href="/auth/register" className="btn-vox btn-vox-primary">
              Start Free Trial <span className="arrow">-&gt;</span>
            </a>
            <a href="#features" className="btn-vox btn-vox-secondary">
              Explore Modules
            </a>
          </motion.div>
        </motion.div>
      </section>

      <div className="features-section-container light-theme" id="features">
        <section className="features-inner">
          <motion.div
            className="features-header"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Everything your brand operation requires.</h2>
            <p>
              Six interconnected AI modules scale social output without
              flattening the voice, rules, and memory that make the brand
              recognizable.
            </p>
          </motion.div>

          <motion.div
            className="features-grid"
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={viewport}
            variants={stagger}
          >
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                className="feature-card"
                variants={fadeUp}
                custom={index}
                whileHover={reduceMotion ? undefined : { y: -6 }}
              >
                <span className="feature-num">{feature.num}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </section>
      </div>

      <section className="metrics-section" id="metrics">
        <motion.div
          className="metrics-grid"
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              className="metric-card"
              variants={fadeUp}
              custom={index}
            >
              <div className="metric-value">{metric.value}</div>
              <div className="metric-label">{metric.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <div className="cta-section-container light-theme" id="onboard">
        <section className="cta-inner">
          <motion.div
            className="cta-header"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Initialize AISMOS for your brand.</h2>
            <p>
              Select your channels and core workflows, then create the account
              that will own the workspace.
            </p>
          </motion.div>

          <motion.form
            className="onboarding-form"
            onSubmit={handleSubmit}
            initial={reduceMotion ? false : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="vox-chips-container">
              <span className="vox-chip-label">Capabilities</span>
              <div className="vox-chip-row">
                {capabilities.map((capability) => (
                  <button
                    key={capability}
                    type="button"
                    className={`vox-chip ${
                      selectedCaps.includes(capability) ? "active" : ""
                    }`}
                    onClick={() => toggleCap(capability)}
                  >
                    {capability}
                  </button>
                ))}
              </div>
            </div>

            <div className="vox-chips-container">
              <span className="vox-chip-label">Publishing platforms</span>
              <div className="vox-chip-row">
                {platforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    className={`vox-chip ${
                      selectedPlatforms.includes(platform) ? "active" : ""
                    }`}
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="vox-input-group">
              <label className="vox-chip-label" htmlFor="brand-name">
                Brand name
              </label>
              <input
                id="brand-name"
                type="text"
                placeholder="Type your brand or workspace name"
                className="vox-input-underline"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                required
              />
            </div>

            <div className="vox-input-group">
              <label className="vox-chip-label" htmlFor="brand-description">
                Brief description
              </label>
              <input
                id="brand-description"
                type="text"
                placeholder="What does this brand need to grow?"
                className="vox-input-underline"
                value={brandDesc}
                onChange={(event) => setBrandDesc(event.target.value)}
              />
            </div>

            <div className="vox-input-group">
              <label className="vox-chip-label" htmlFor="setup-email">
                Email address
              </label>
              <input
                id="setup-email"
                type="email"
                placeholder="you@company.com"
                className="vox-input-underline"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="onboarding-submit-row">
              <button
                type="submit"
                className="btn-vox btn-vox-primary"
                disabled={submitted}
              >
                {submitted ? "Saving Setup..." : "Configure Brand Voice"}{" "}
                <span className="arrow">-&gt;</span>
              </button>
            </div>
          </motion.form>
        </section>
      </div>

      <footer className="landing-footer">
        (c) {new Date().getFullYear()} KOVIXAILABS. All rights reserved.
      </footer>
    </div>
  );
}
