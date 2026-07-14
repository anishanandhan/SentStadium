/**
 * WCAG 2.1 AA Accessibility Audit Tests using axe-core
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import { BrowserRouter } from "react-router-dom";
import { SeverityBadge } from "../components/SeverityBadge";
import { HeroPage } from "../pages/HeroPage";
import { Skeleton } from "../components/SkeletonLoader";

describe("Accessibility Audit (axe-core)", () => {
  it("SeverityBadge should have no WCAG violations", async () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Skeleton loader should be accessible (aria-hidden)", async () => {
    const { container } = render(<Skeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("HeroPage should have no major WCAG violations", async () => {
    const { container } = render(
      <BrowserRouter>
        <HeroPage />
      </BrowserRouter>
    );
    
    // We test the main page structure. 
    // SVG animations inside might cause contrast warnings depending on the rule sets, 
    // but the core structure should pass.
    const results = await axe(container, {
      rules: {
        // Disable specific rules if they flag decorative SVG elements incorrectly,
        // but for this demo, we expect full compliance on standard elements.
      }
    });
    
    expect(results).toHaveNoViolations();
  });
});
