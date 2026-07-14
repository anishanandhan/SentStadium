/**
 * AI Recommendation Card — displays the reasoning output with expandable XAI "Why" section.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { LANGUAGE_NAMES } from "@/data/constants";
import type { ReasoningOutput } from "@/types";

interface AIRecommendationCardProps {
  recommendation: ReasoningOutput | null;
  isStale?: boolean;
  isLoading?: boolean;
}

export function AIRecommendationCard({
  recommendation,
  isStale = false,
  isLoading = false,
}: AIRecommendationCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showMultilingual, setShowMultilingual] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            AI Recommendation
          </h3>
        </div>
        <div className="skeleton h-4 w-3/4 mb-2" />
        <div className="skeleton h-4 w-1/2 mb-4" />
        <div className="skeleton h-8 w-24 rounded-full" />
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">
            AI Recommendation
          </h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          No zones exceeding threshold — all clear. Select a zone for detailed
          analysis.
        </p>
      </div>
    );
  }

  const rec = recommendation;

  return (
    <div
      className={`glass-card p-5 ${rec.severity === "critical" ? "animate-pulse-critical" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            AI Recommendation
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={rec.severity} />
          {isStale && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-severity-moderate-bg)] text-[var(--color-severity-moderate)] border border-[var(--color-severity-moderate)]">
              Stale
            </span>
          )}
        </div>
      </div>

      {/* Main recommendation */}
      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-3">
        {rec.recommendation}
      </p>

      {/* Confidence */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[var(--color-text-muted)]">
          Confidence:
        </span>
        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-[var(--color-bg-surface)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${rec.confidence * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
          {(rec.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Expandable: Why (XAI) */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors mb-2 bg-transparent border-none cursor-pointer"
        aria-expanded={showReasoning}
        aria-controls="reasoning-section"
      >
        {showReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Why this recommendation?
      </button>
      {showReasoning && (
        <div
          id="reasoning-section"
          className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-primary)] rounded-lg p-3 mb-3 animate-fade-in"
        >
          {rec.reasoning}
        </div>
      )}

      {/* Suggested actions */}
      {rec.suggestedActions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Suggested Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            {rec.suggestedActions.map((action: string, i: number) => (
              <button
                key={i}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent-muted)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-text-inverse)] transition-colors border-none cursor-pointer"
                onClick={() => {
                  /* Log action — non-functional for demo */
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multilingual alerts */}
      {Object.keys(rec.multilingualAlerts).length > 0 && (
        <>
          <button
            onClick={() => setShowMultilingual(!showMultilingual)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors bg-transparent border-none cursor-pointer"
            aria-expanded={showMultilingual}
            aria-controls="multilingual-section"
          >
            {showMultilingual ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            Multilingual alert preview (
            {Object.keys(rec.multilingualAlerts).length} languages)
          </button>
          {showMultilingual && (
            <div
              id="multilingual-section"
              className="mt-2 space-y-2 animate-fade-in"
            >
              {Object.entries(rec.multilingualAlerts).map(
                ([lang, text]: [string, any]) => (
                  <div
                    key={lang}
                    className="text-xs bg-[var(--color-bg-primary)] rounded-lg p-3"
                  >
                    <span className="font-semibold text-[var(--color-accent)] block mb-1">
                      {LANGUAGE_NAMES[lang] || lang.toUpperCase()}:
                    </span>
                    <div
                      className="text-[var(--color-text-secondary)]"
                      lang={lang}
                      dir={
                        ["ar", "he", "fa", "ur"].includes(lang) ? "rtl" : "ltr"
                      }
                    >
                      {text as string}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
