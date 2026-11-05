import { describe, it, expect } from "vitest";
import { canMove, hasWon, maxTile, move } from "../game";

describe("2048 logic", () => {
  it("merges each pair once per move", () => {
    const r = move([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], "left");
    expect(r.grid[0]).toEqual([4, 4, 0, 0]);
    expect(r.score).toBe(8);
    expect(r.moved).toBe(true);
  });

  it("slides in every direction", () => {
    const g = [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(move(g, "right").grid[1][3]).toBe(2);
    expect(move(g, "up").grid[0][1]).toBe(2);
    expect(move(g, "down").grid[3][1]).toBe(2);
  });

  it("reports no movement when nothing changes", () => {
    expect(move([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], "left").moved).toBe(false);
  });

  it("detects a dead board and a win", () => {
    const dead = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2048]];
    expect(canMove(dead)).toBe(false);
    expect(hasWon(dead)).toBe(true);
    expect(maxTile(dead)).toBe(2048);
  });
});
