import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, GameTopbar, GameAuth, useGameSounds } from "@freegamestore/games";
import { useLeaderboard } from '@freegamestore/games';
import { SIZE, TILE_COLORS, type Direction, type Grid, addRandomTile, canMove, hasWon, initGrid, maxTile, move } from "./game";

type SoundsApi = ReturnType<typeof useGameSounds>;

function AudioBridge({ apiRef }: { apiRef: React.MutableRefObject<SoundsApi | null> }) {
  const sounds = useGameSounds();
  apiRef.current = sounds;
  return null;
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

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { submitScore } = useLeaderboard("2048");
  const submittedRef = useRef(false);
  const audioRef = useRef<SoundsApi | null>(null);
  const highestTileRef = useRef<number>(maxTile(grid));

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver) return;
      if (won && !keepPlaying) return;

      const result = move(grid, direction);
      if (!result.moved) return;

      audioRef.current?.playMove();
      if (result.score > 0) {
        audioRef.current?.playScore();
      }

      const newGrid = addRandomTile(result.grid);
      const newScore = score + result.score;
      setGrid(newGrid);
      setScore(newScore);

      const newMax = maxTile(newGrid);
      if (newMax > highestTileRef.current) {
        highestTileRef.current = newMax;
        audioRef.current?.playLevelUp();
      }

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
        audioRef.current?.playGameOver();
      }
    },
    [grid, score, best, gameOver, won, keepPlaying]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
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

  // Submit score on game over
  useEffect(() => {
    if (gameOver && !submittedRef.current) {
      submittedRef.current = true;
      submitScore(score);
    }
    if (!gameOver) {
      submittedRef.current = false;
    }
  }, [gameOver, score, submitScore]);

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
    const fresh = initGrid();
    setGrid(fresh);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    highestTileRef.current = maxTile(fresh);
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
    <GameShell
      topbar={
        <GameTopbar
          title="2048"
          stats={[
            { label: "Score", value: score, accent: true },
            { label: "Best", value: best },
          ]}
          rules={
            <div>
              <h3 style={{marginBottom:'0.5rem',fontWeight:700}}>2048</h3>
              <p>Slide and merge tiles to reach 2048.</p>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Controls</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Arrow keys or swipe to slide tiles</li>
              </ul>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Rules</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Matching tiles merge and double</li>
                <li>A new tile appears after each move</li>
                <li>Reach 2048 to win</li>
                <li>Game over when no moves are left</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <AudioBridge apiRef={audioRef} />
      <div className="relative w-full h-full">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ maxWidth: 400, margin: "0 auto", padding: 16, userSelect: "none" }}
        >
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
                    minHeight: "2.75rem",
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
                      minHeight: "2.75rem",
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
                      minHeight: "2.75rem",
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
      </div>
    </GameShell>
  );
}
