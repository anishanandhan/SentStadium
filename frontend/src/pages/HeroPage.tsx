/**
 * Hero Page — full landing page per Section 2.1 spec.
 * All content driven from data/constants.ts, nothing hardcoded inline.
 */

import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  Radio,
  Brain,
  ShieldCheck,
  Languages,
  Cloud,
  Sparkles,
  Database,
  Accessibility,
  TestTube,
} from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  STAT_CARDS,
  PROBLEM_SUMMARY,
  HOW_IT_WORKS_STEPS,
  EXPLAINABILITY_EXAMPLE,
  TECH_STACK_BADGES,
  SOURCES,
} from "@/data/constants";
import type { StatCard, HowItWorksStep, Source } from "@/data/constants";

const STEP_ICONS: Record<string, typeof Radio> = {
  Radio,
  Brain,
  ShieldCheck,
  Languages,
};

const TECH_ICONS: Record<string, typeof Cloud> = {
  Cloud,
  Sparkles,
  Database,
  Accessibility,
  TestTube,
};

export function HeroPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* ====== SECTION A: Hero Banner ====== */}
      <section
        className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden"
        aria-label="Hero banner"
      >
        {/* Animated SVG background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          aria-hidden="true"
        >
          <svg viewBox="0 0 800 600" className="w-full h-full">
            <circle
              cx="400"
              cy="300"
              r="300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx="400"
              cy="300"
              r="200"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
            <circle
              cx="400"
              cy="300"
              r="100"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1={400 + 300 * Math.cos((angle * Math.PI) / 180)}
                y1={300 + 300 * Math.sin((angle * Math.PI) / 180)}
                x2="400"
                y2="300"
                stroke="currentColor"
                strokeWidth="0.3"
              />
            ))}
          </svg>
        </div>

        {/* Gradient orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-accent)] rounded-full opacity-[0.04] blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-severity-critical)] rounded-full opacity-[0.03] blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Activity size={36} className="text-[var(--color-accent)]" />
            <span className="text-2xl font-bold font-[var(--font-family-display)] text-[var(--color-text-primary)]">
              StadiumPulse
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-[var(--font-family-display)] text-[var(--color-text-primary)] leading-tight mb-6">
            Two systems. One blind spot.
            <br />
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] bg-clip-text text-transparent">
              StadiumPulse connects them.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            A GenAI reasoning layer that fuses heat and crowd data to predict —
            and explain — safety risk before it happens.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-all shadow-[var(--shadow-glow-accent)] border-none cursor-pointer"
            >
              Open Control Room Dashboard
              <ArrowRight size={18} />
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors no-underline"
            >
              See how it reasons
              <ChevronDown size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ====== SECTION B: The Problem ====== */}
      <section
        className="px-6 py-20 max-w-6xl mx-auto"
        aria-label="The problem"
      >
        <h2 className="text-3xl font-bold font-[var(--font-family-display)] text-center text-[var(--color-text-primary)] mb-12">
          The problem is not hypothetical — it is happening <em>right now</em>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((card: StatCard, i: number) => (
            <article
              key={i}
              className="glass-card p-6 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl font-bold font-[var(--font-family-display)] text-[var(--color-accent)] mb-2">
                {card.number}
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                {card.headline}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {card.description}
                {card.sourceIndex >= 0 && (
                  <sup className="text-[var(--color-accent)] ml-0.5">
                    [{card.sourceIndex + 1}]
                  </sup>
                )}
              </p>
            </article>
          ))}
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-3xl mx-auto text-center">
          {PROBLEM_SUMMARY}
        </p>
      </section>

      {/* ====== SECTION C: How It Works ====== */}
      <section
        id="how-it-works"
        className="px-6 py-20 bg-[var(--color-bg-secondary)]"
        aria-label="How it works"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold font-[var(--font-family-display)] text-center text-[var(--color-text-primary)] mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((step: HowItWorksStep) => {
              const Icon = STEP_ICONS[step.icon] || Radio;
              return (
                <div
                  key={step.step}
                  className="relative glass-card p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center mx-auto mb-4">
                    <Icon size={22} className="text-[var(--color-accent)]" />
                  </div>
                  <span className="absolute top-4 left-4 text-xs font-bold text-[var(--color-text-muted)]">
                    {step.step}
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== SECTION D: Explainability Preview ====== */}
      <section
        className="px-6 py-20 max-w-4xl mx-auto"
        aria-label="Explainability preview"
      >
        <h2 className="text-3xl font-bold font-[var(--font-family-display)] text-center text-[var(--color-text-primary)] mb-4">
          Explainability First
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] text-center mb-10 max-w-2xl mx-auto">
          Every recommendation comes with a visible &quot;why&quot; trail.
          Here&apos;s what control room staff actually see:
        </p>

        <div className="glass-card p-6 max-w-3xl mx-auto">
          {/* Input */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Input Signal
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                {EXPLAINABILITY_EXAMPLE.input.zone}
              </span>
              <span className="px-2 py-1 rounded bg-[var(--color-severity-high-bg)] text-[var(--color-severity-high)]">
                🌡 {EXPLAINABILITY_EXAMPLE.input.heatIndex}
              </span>
              <span className="px-2 py-1 rounded bg-[var(--color-severity-moderate-bg)] text-[var(--color-severity-moderate)]">
                👥 {EXPLAINABILITY_EXAMPLE.input.crowdDensity}
              </span>
              <span className="px-2 py-1 rounded bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                📈 {EXPLAINABILITY_EXAMPLE.input.trend}
              </span>
            </div>
          </div>

          <div className="h-px bg-[var(--color-border)] my-4" />

          {/* Output */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                AI Output
              </h3>
              <SeverityBadge
                severity={EXPLAINABILITY_EXAMPLE.output.severity}
              />
            </div>
            <p className="text-sm text-[var(--color-text-primary)] font-medium mb-3">
              {EXPLAINABILITY_EXAMPLE.output.recommendation}
            </p>
            <div className="bg-[var(--color-bg-primary)] rounded-lg p-4">
              <p className="text-xs font-semibold text-[var(--color-accent)] mb-1">
                Reasoning:
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {EXPLAINABILITY_EXAMPLE.output.reasoning}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SECTION E: Built For ====== */}
      <section
        className="px-6 py-16 bg-[var(--color-bg-secondary)]"
        aria-label="Built for"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold font-[var(--font-family-display)] text-[var(--color-text-primary)] mb-4">
            Built for the 4-minute safety call
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            StadiumPulse is not another wayfinding chatbot for fans — it&apos;s
            the reasoning layer for the people making the 4-minute safety call.
            Designed for control room operators, venue safety officers, and
            event organizers who need to act on compounding risk signals before
            they become incidents.
          </p>
        </div>
      </section>

      {/* ====== SECTION F: Tech & Trust ====== */}
      <section className="px-6 py-12" aria-label="Technology stack">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6">
          {TECH_STACK_BADGES.map((badge: { label: string; icon: string }) => {
            const Icon = TECH_ICONS[badge.icon] || Cloud;
            return (
              <div
                key={badge.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]"
              >
                <Icon size={14} className="text-[var(--color-accent)]" />
                {badge.label}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====== SECTION G: Sources ====== */}
      <footer
        className="px-6 py-16 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
        aria-label="Sources and citations"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold font-[var(--font-family-display)] text-[var(--color-text-primary)] mb-6">
            Sources
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            This project is grounded in verified, current reporting on the 2026
            FIFA World Cup and established stadium-safety research, not
            hypothetical scenarios.
          </p>
          <ol className="space-y-3">
            {SOURCES.map((source: Source, i: number) => (
              <li
                key={i}
                className="text-xs text-[var(--color-text-secondary)] leading-relaxed"
              >
                <span className="font-semibold text-[var(--color-text-primary)]">
                  [{i + 1}]
                </span>{" "}
                {source.claim} —{" "}
                <span className="text-[var(--color-accent)]">
                  {source.organization}
                </span>
                {source.url && (
                  <>
                    {" "}
                    (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      source
                    </a>
                    )
                  </>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity size={18} className="text-[var(--color-accent)]" />
              <span className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-family-display)]">
                StadiumPulse
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              HackToSkill Prompt Wars — Challenge 4: Smart Stadiums &amp;
              Tournament Operations
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
