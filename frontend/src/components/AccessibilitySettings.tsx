/**
 * Accessibility Settings panel — screen reader, high contrast, font size, reduced motion.
 */

import { useState, useEffect } from "react";
import { X, Eye, Type, Monitor, Zap } from "lucide-react";

interface AccessibilitySettingsProps {
  onClose: () => void;
}

export function AccessibilitySettings({ onClose }: AccessibilitySettingsProps) {
  const [highContrast, setHighContrast] = useState(
    () =>
      document.documentElement.getAttribute("data-high-contrast") === "true",
  );
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem("sp-font-size");
    return stored ? parseInt(stored, 10) : 100;
  });
  const [reducedMotion, setReducedMotion] = useState(
    () => localStorage.getItem("sp-reduced-motion") === "true",
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-high-contrast",
      String(highContrast),
    );
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem("sp-font-size", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.style.setProperty("--animation-duration", "0s");
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.style.removeProperty("--animation-duration");
      document.documentElement.classList.remove("reduce-motion");
    }
    localStorage.setItem("sp-reduced-motion", String(reducedMotion));
  }, [reducedMotion]);

  // Keyboard: Escape closes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-4 top-16 w-80 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Accessibility settings"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Accessibility
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
            aria-label="Close accessibility settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* High Contrast */}
          <ToggleSetting
            icon={<Eye size={16} />}
            label="High Contrast Mode"
            description="Increases text and border contrast"
            checked={highContrast}
            onChange={setHighContrast}
          />

          {/* Font Size */}
          <div className="flex items-start gap-3">
            <Type size={16} className="text-[var(--color-text-muted)] mt-0.5" />
            <div className="flex-1">
              <label className="text-sm text-[var(--color-text-primary)] font-medium">
                Font Size: {fontSize}%
              </label>
              <input
                type="range"
                min={75}
                max={150}
                step={5}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full mt-1"
                aria-label={`Font size: ${fontSize}%`}
              />
            </div>
          </div>

          {/* Reduced Motion */}
          <ToggleSetting
            icon={<Zap size={16} />}
            label="Reduced Motion"
            description="Disables animations and transitions"
            checked={reducedMotion}
            onChange={setReducedMotion}
          />

          {/* Screen Reader Info */}
          <div className="flex items-start gap-3">
            <Monitor
              size={16}
              className="text-[var(--color-text-muted)] mt-0.5"
            />
            <div>
              <p className="text-sm text-[var(--color-text-primary)] font-medium">
                Screen Reader Support
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                All interactive elements have ARIA labels. The alert feed uses
                aria-live to announce new alerts automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ToggleSetting({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-start gap-3">
      <span className="text-[var(--color-text-muted)] mt-0.5">{icon}</span>
      <div className="flex-1">
        <label
          htmlFor={id}
          className="text-sm text-[var(--color-text-primary)] font-medium cursor-pointer"
        >
          {label}
        </label>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {description}
        </p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-bg-surface)]"
        } border-none cursor-pointer`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
