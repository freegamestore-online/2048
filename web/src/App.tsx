import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "./components/Shell";

type Grid = number[][];

const SIZE = 4;

const TILE_COLORS: Record<number, string> = {
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
};

function createEmptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function addRandomTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = cloneGrid(grid);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function rotateGrid(grid: Grid): Grid {
  const newGrid = createEmptyGrid();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      newGrid[c][SIZE - 1 - r] = grid[r][c];
    }
  }
  return newGrid;
}

function slideLeft(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const newGrid = createEmptyGrid();

  for (let r = 0; r < SIZE; r++) {
    const row = grid[r].filter((v) => v !== 0);
    const merged: number[] = [];
    let i = 0;
    while (i < row.length) {
      if (i + 1 < row.length && row[i] === row[i + 1]) {
        const val = row[i] * 2;
        merged.push(val);
        score += val;
        i += 2;
      } else {
        merged.push(row[i]);
        i++;
      }
    }
    for (let c = 0; c < SIZE; c++) {
      newGrid[r][c] = merged[c] || 0;
      if (newGrid[r][c] !== grid[r][c]) moved = true;
    }
  }

  return { grid: newGrid, score, moved };
}

function move(grid: Grid, direction: "left" | "right" | "up" | "down"): { grid: Grid; score: number; moved: boolean } {
  let rotated = cloneGrid(grid);
  const rotations = { left: 0, down: 1, right: 2, up: 3 }[direction];

  for (let i = 0; i < rotations; i++) rotated = rotateGrid(rotated);

  const result = slideLeft(rotated);

  let finalGrid = result.grid;
  for (let i = 0; i < (4 - rotations) % 4; i++) finalGrid = rotateGrid(finalGrid);

  return { grid: finalGrid, score: result.score, moved: result.moved };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function hasWon(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 2048) return true;
    }
  }
  return false;
}

function initGrid(): Grid {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
}

function getBestScore(): number {
  try {
    return Number(localStorage.getItem("2048-best") || "0");
  } catch {
    return 0;
  }
}

function saveBestScore(score: number) {
  try {
    localStorage.setItem("2048-best", String(score));
  } catch {
    // ignore
  }
}

export default function App() {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(getBestScore);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameOver) return;
      if (won && !keepPlaying) return;

      const result = move(grid, direction);
      if (!result.moved) return;

      const newGrid = addRandomTile(result.grid);
      const newScore = score + result.score;
      setGrid(newGrid);
      setScore(newScore);

      if (newScore > best) {
        setBest(newScore);
        saveBestScore(newScore);
      }

      if (!keepPlaying && hasWon(newGrid)) {
        setWon(true);
        return;
      }

      if (!canMove(newGrid)) {
        setGameOver(true);
      }
    },
    [grid, score, best, gameOver, won, keepPlaying]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = 30;

    if (Math.max(absDx, absDy) < threshold) return;

    if (absDx > absDy) {
      handleMove(dx > 0 ? "right" : "left");
    } else {
      handleMove(dy > 0 ? "down" : "up");
    }
    touchStart.current = null;
  };

  const resetGame = () => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  };

  const continueGame = () => {
    setKeepPlaying(true);
    setWon(false);
  };

  const getTileColor = (value: number): string => {
    if (value === 0) return "rgba(238,228,218,0.35)";
    return TILE_COLORS[value] || "#3c3a32";
  };

  const getTileTextColor = (value: number): string => {
    return value <= 4 ? "#776e65" : "#f9f6f2";
  };

  const getTileFontSize = (value: number): string => {
    if (value >= 1024) return "1.2rem";
    if (value >= 128) return "1.4rem";
    return "1.7rem";
  };

  return (
    <Shell>
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ maxWidth: 400, margin: "0 auto", userSelect: "none" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 className="display-font" style={{ fontSize: "2rem", margin: 0, color: "var(--ink)" }}>
            2048
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "4px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>Score</div>
              <div className="display-font" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
                {score}
              </div>
            </div>
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "4px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>Best</div>
              <div className="display-font" style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
                {best}
              </div>
            </div>
          </div>
        </div>

        {/* New Game button */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={resetGame}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            New Game
          </button>
        </div>

        {/* Grid */}
        <div
          style={{
            position: "relative",
            background: "#bbada0",
            borderRadius: 8,
            padding: 8,
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: 8,
            aspectRatio: "1",
          }}
        >
          {grid.flat().map((value, i) => (
            <div
              key={i}
              style={{
                background: getTileColor(value),
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                aspectRatio: "1",
              }}
            >
              {value > 0 && (
                <span
                  className="display-font"
                  style={{
                    fontSize: getTileFontSize(value),
                    fontWeight: 700,
                    color: getTileTextColor(value),
                  }}
                >
                  {value}
                </span>
              )}
            </div>
          ))}

          {/* Overlay: Game Over */}
          {gameOver && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(238,228,218,0.73)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <span className="display-font" style={{ fontSize: "1.8rem", color: "#776e65" }}>
                Game Over!
              </span>
              <button
                onClick={resetGame}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Overlay: Won */}
          {won && !keepPlaying && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(237,194,46,0.5)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <span className="display-font" style={{ fontSize: "1.8rem", color: "#f9f6f2" }}>
                You Win!
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={continueGame}
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Keep Going
                </button>
                <button
                  onClick={resetGame}
                  style={{
                    background: "var(--panel)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  New Game
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: "0.8rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
          <p><strong style={{ color: "var(--ink)" }}>How to play:</strong> Swipe or use arrow keys to slide all tiles. When two tiles with the same number collide, they merge into one. Reach the 2048 tile to win!</p>
          <p style={{ marginTop: 4 }}>A new tile (2 or 4) appears after each move. Plan ahead — when no moves are left, it's game over.</p>
        </div>
      </div>
    </Shell>
  );
}
