import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HeroPage } from "../../pages/HeroPage";

describe("HeroPage", () => {
  it("renders the main heading", () => {
    render(
      <BrowserRouter>
        <HeroPage />
      </BrowserRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /Two systems. One blind spot./i }),
    ).toBeInTheDocument();
  });

  it("renders the stat cards from constants", () => {
    render(
      <BrowserRouter>
        <HeroPage />
      </BrowserRouter>,
    );
    expect(screen.getByText("110")).toBeInTheDocument();
    const elements = screen.getAllByText(/heat-related medical incidents/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("contains navigation links and handles click", async () => {
    render(
      <BrowserRouter>
        <HeroPage />
      </BrowserRouter>,
    );
    const dashLink = screen.getByRole("button", {
      name: /Open Control Room Dashboard/i,
    });
    expect(dashLink).toBeInTheDocument();

    // Click the button inside act to prevent router warning
    await act(async () => {
      dashLink.click();
    });
  });
});
