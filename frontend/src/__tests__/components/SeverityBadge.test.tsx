import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "../../components/SeverityBadge";

describe("SeverityBadge", () => {
  it("renders correctly for low severity", () => {
    render(<SeverityBadge severity="low" />);
    expect(screen.getByRole("status")).toHaveTextContent("Low");
    expect(screen.getByRole("status")).toHaveClass("severity-badge--low");
  });

  it("renders correctly for critical severity", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByRole("status")).toHaveTextContent("Critical");
    expect(screen.getByRole("status")).toHaveClass("severity-badge--critical");
  });

  it("includes an accessible label", () => {
    render(<SeverityBadge severity="high" />);
    expect(screen.getByLabelText("Severity: High")).toBeInTheDocument();
  });
});
