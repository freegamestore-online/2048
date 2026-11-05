import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

const board = (c: HTMLElement) => [...c.querySelectorAll("[style*='aspect-ratio']")].map((el) => el.textContent).join(",");

describe("App", () => {
  it("offers a mid-game restart in the topbar", () => {
    render(<App />);
    expect(screen.getByLabelText("Restart")).toBeTruthy();
  });

  it("moves tiles with WASD", () => {
    const { container } = render(<App />);
    const before = board(container);
    // Some direction always moves a fresh 2-tile board, and every move adds a tile.
    for (const key of ["w", "a", "s", "d"]) fireEvent.keyDown(window, { key });
    expect(board(container)).not.toBe(before);
  });
});
