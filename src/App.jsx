import React, { useState, useEffect } from "react";
import "./App.css";

/* ======= Problem / search logic ======= */

const BOARD_SIZE = 8;
const KNIGHT_MOVES = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function isKeySquare(r, c, keys) {
  return keys.some((k) => k && k.row === r && k.col === c);
}

function isGoal(state, door) {
  return state.hasKey && state.row === door.row && state.col === door.col;
}

function reconstructPath(goal) {
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = cur.parent;
  }
  return path.reverse();
}

/* ---- DFS ---- */

function solveDFS(knight, keys, door) {
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => [false, false])
  );
  const start = {
    row: knight.row,
    col: knight.col,
    hasKey: false,
    parent: null,
    depth: 0,
  };
  visited[start.row][start.col][0] = true;

  let nodesExpanded = 0;
  const t0 = performance.now();

  function dfsRec(state) {
    nodesExpanded++;
    if (isGoal(state, door)) return state;

    for (const [dr, dc] of KNIGHT_MOVES) {
      const nr = state.row + dr;
      const nc = state.col + dc;
      if (!inBounds(nr, nc)) continue;
      const nextHasKey = state.hasKey || isKeySquare(nr, nc, keys);
      const idx = nextHasKey ? 1 : 0;
      if (!visited[nr][nc][idx]) {
        visited[nr][nc][idx] = true;
        const child = {
          row: nr,
          col: nc,
          hasKey: nextHasKey,
          parent: state,
          depth: state.depth + 1,
        };
        const res = dfsRec(child);
        if (res) return res;
      }
    }
    return null;
  }

  const goal = dfsRec(start);
  const t1 = performance.now();
  return {
    algorithm: "DFS",
    path: goal ? reconstructPath(goal) : null,
    timeMs: t1 - t0,
    nodesExpanded,
  };
}

/* ---- BFS ---- */

function solveBFS(knight, keys, door) {
  const visited = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => [false, false])
  );
  const q = [];
  const start = {
    row: knight.row,
    col: knight.col,
    hasKey: false,
    parent: null,
    depth: 0,
  };
  visited[start.row][start.col][0] = true;
  q.push(start);

  let nodesExpanded = 0;
  const t0 = performance.now();
  let goal = null;

  while (q.length) {
    const state = q.shift();
    nodesExpanded++;
    if (isGoal(state, door)) {
      goal = state;
      break;
    }

    for (const [dr, dc] of KNIGHT_MOVES) {
      const nr = state.row + dr;
      const nc = state.col + dc;
      if (!inBounds(nr, nc)) continue;
      const nextHasKey = state.hasKey || isKeySquare(nr, nc, keys);
      const idx = nextHasKey ? 1 : 0;
      if (!visited[nr][nc][idx]) {
        visited[nr][nc][idx] = true;
        q.push({
          row: nr,
          col: nc,
          hasKey: nextHasKey,
          parent: state,
          depth: state.depth + 1,
        });
      }
    }
  }

  const t1 = performance.now();
  return {
    algorithm: "BFS",
    path: goal ? reconstructPath(goal) : null,
    timeMs: t1 - t0,
    nodesExpanded,
  };
}

/* ---- A* ---- */

function heuristic(r, c, hasKey, keys, door) {
  const manhattanToDoor = Math.abs(r - door.row) + Math.abs(c - door.col);
  if (hasKey) {
    return Math.ceil(manhattanToDoor / 3);
  }
  let best = Infinity;
  for (const k of keys) {
    if (!k) continue;
    const manToKey = Math.abs(r - k.row) + Math.abs(c - k.col);
    const keyToDoor = Math.abs(k.row - door.row) + Math.abs(k.col - door.col);
    const h = Math.ceil((manToKey + keyToDoor) / 3);
    if (h < best) best = h;
  }
  return best;
}

function solveAStar(knight, keys, door) {
  const open = [];
  const closed = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => [false, false])
  );
  const gScore = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => [Infinity, Infinity])
  );

  const start = {
    row: knight.row,
    col: knight.col,
    hasKey: false,
    parent: null,
    depth: 0,
    g: 0,
    f: heuristic(knight.row, knight.col, false, keys, door),
  };
  open.push(start);
  gScore[start.row][start.col][0] = 0;

  let nodesExpanded = 0;
  const t0 = performance.now();
  let goal = null;

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const state = open.shift();
    const idx = state.hasKey ? 1 : 0;
    if (closed[state.row][state.col][idx]) continue;
    closed[state.row][state.col][idx] = true;
    nodesExpanded++;

    if (isGoal(state, door)) {
      goal = state;
      break;
    }

    for (const [dr, dc] of KNIGHT_MOVES) {
      const nr = state.row + dr;
      const nc = state.col + dc;
      if (!inBounds(nr, nc)) continue;
      const nextHasKey = state.hasKey || isKeySquare(nr, nc, keys);
      const idx2 = nextHasKey ? 1 : 0;
      const tentativeG = state.g + 1;

      if (tentativeG < gScore[nr][nc][idx2]) {
        gScore[nr][nc][idx2] = tentativeG;
        const child = {
          row: nr,
          col: nc,
          hasKey: nextHasKey,
          parent: state,
          depth: state.depth + 1,
          g: tentativeG,
          f: tentativeG + heuristic(nr, nc, nextHasKey, keys, door),
        };
        open.push(child);
      }
    }
  }

  const t1 = performance.now();
  return {
    algorithm: "A*",
    path: goal ? reconstructPath(goal) : null,
    timeMs: t1 - t0,
    nodesExpanded,
  };
}

/* ---- IDS ---- */

function depthLimitedDfs(state, keys, door, limit, visited) {
  let nodesExpanded = 1;
  if (isGoal(state, door)) {
    return { goal: state, nodesExpanded };
  }
  if (state.depth === limit) {
    return { goal: null, nodesExpanded };
  }

  for (const [dr, dc] of KNIGHT_MOVES) {
    const nr = state.row + dr;
    const nc = state.col + dc;
    if (!inBounds(nr, nc)) continue;
    const nextHasKey = state.hasKey || isKeySquare(nr, nc, keys);
    const idx = nextHasKey ? 1 : 0;
    if (!visited[nr][nc][idx]) {
      visited[nr][nc][idx] = true;
      const child = {
        row: nr,
        col: nc,
        hasKey: nextHasKey,
        parent: state,
        depth: state.depth + 1,
      };
      const res = depthLimitedDfs(child, keys, door, limit, visited);
      nodesExpanded += res.nodesExpanded;
      if (res.goal) return { goal: res.goal, nodesExpanded };
    }
  }
  return { goal: null, nodesExpanded };
}

function solveIDS(knight, keys, door) {
  const start = {
    row: knight.row,
    col: knight.col,
    hasKey: false,
    parent: null,
    depth: 0,
  };

  let nodesTotal = 0;
  const t0 = performance.now();
  let goal = null;
  const maxDepth = 15;

  for (let limit = 0; limit <= maxDepth; limit++) {
    const visited = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => [false, false])
    );
    visited[start.row][start.col][0] = true;
    const res = depthLimitedDfs(start, keys, door, limit, visited);
    nodesTotal += res.nodesExpanded;
    if (res.goal) {
      goal = res.goal;
      break;
    }
  }

  const t1 = performance.now();
  return {
    algorithm: "IDS",
    path: goal ? reconstructPath(goal) : null,
    timeMs: t1 - t0,
    nodesExpanded: nodesTotal,
  };
}

/* ======= Helper: which key did this path pick? ======= */

function getChosenKeyIndex(path, keys) {
  if (!path || path.length === 0) return null;
  let hasKey = false;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    if (!prev.hasKey && cur.hasKey && !hasKey) {
      hasKey = true;
      for (let k = 0; k < keys.length; k++) {
        const pk = keys[k];
        if (pk && pk.row === cur.row && pk.col === cur.col) {
          return k; // 0,1,2
        }
      }
    }
  }
  return null;
}

/* ======= Helper: benchmark for comparison timings ======= */

function benchmarkAlgorithm(solver, knight, keys, door, repeats = 40) {
  let last = null;
  const t0 = performance.now();
  for (let i = 0; i < repeats; i++) {
    last = solver(knight, keys, door);
  }
  const t1 = performance.now();
  const avgMs = (t1 - t0) / repeats;
  return { ...last, timeMs: avgMs };
}

/* ======= UI constants ======= */

const placementModes = [
  { id: "knight", label: "Knight" },
  { id: "key1", label: "Key 1" },
  { id: "key2", label: "Key 2" },
  { id: "key3", label: "Key 3" },
  { id: "door", label: "Door" },
];

const algorithms = ["DFS", "BFS", "A*", "IDS"];

/* Preset scenarios (for the dropdown/buttons) */
const presetScenarios = [
  {
    id: "near-key",
    name: "Preset 1 · Knight near key",
    positions: {
      knight: { row: 0, col: 1 },
      keys: [
        { row: 1, col: 3 },
        { row: 5, col: 4 },
        { row: 6, col: 2 },
      ],
      door: { row: 7, col: 7 },
    },
  },
  {
    id: "near-door-key",
    name: "Preset 2 · Key near door",
    positions: {
      knight: { row: 7, col: 0 },
      keys: [
        { row: 1, col: 2 },
        { row: 6, col: 6 },
        { row: 7, col: 5 }, // close to door
      ],
      door: { row: 7, col: 7 },
    },
  },
  {
    id: "tricky-choice",
    name: "Preset 3 · Tricky choice",
    positions: {
      knight: { row: 3, col: 3 },
      keys: [
        { row: 4, col: 5 }, // close to knight
        { row: 6, col: 1 }, // better overall to door
        { row: 1, col: 6 },
      ],
      door: { row: 7, col: 0 },
    },
  },
  {
    id: "spread-out",
    name: "Preset 4 · All spread out",
    positions: {
      knight: { row: 2, col: 2 },
      keys: [
        { row: 0, col: 7 },
        { row: 7, col: 3 },
        { row: 4, col: 0 },
      ],
      door: { row: 6, col: 6 },
    },
  },
];

/* ======= React UI ======= */

function App() {
  const [knight, setKnight] = useState(null);
  const [keys, setKeys] = useState([null, null, null]);
  const [door, setDoor] = useState(null);

  const [placementMode, setPlacementMode] = useState("knight");

  const [selectedAlgo, setSelectedAlgo] = useState("A*");
  const [currentResult, setCurrentResult] = useState(null); // { ...algoResult, chosenKeyIndex, isOptimal }
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);

  const [logText, setLogText] = useState("");
  const [feedback, setFeedback] = useState(
    "Place knight, keys, and door, then run an algorithm."
  );

  const [comparisonRows, setComparisonRows] = useState([]);
  const [optimalMoves, setOptimalMoves] = useState(null); // from BFS baseline

  /* ----- Auto-play effect ----- */

  useEffect(() => {
    if (!isPlaying || !currentResult || !currentResult.path) return;
    if (currentStep >= currentResult.path.length - 1) {
      setIsPlaying(false);
      return;
    }

    const base = 550;
    const delay = base / speed;
    const id = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [isPlaying, currentStep, speed, currentResult]);

  /* ----- Placement helpers ----- */

  const resetAnimationState = () => {
    setIsPlaying(false);
    setCurrentResult(null);
    setCurrentStep(0);
    setLogText("");
  };

  const handleCellClick = (row, col) => {
    resetAnimationState();

    if (placementMode === "knight") {
      setKnight({ row, col });
    } else if (placementMode === "door") {
      setDoor({ row, col });
    } else {
      const idx =
        placementMode === "key1" ? 0 : placementMode === "key2" ? 1 : 2;
      setKeys((prev) => {
        const copy = [...prev];
        copy[idx] = { row, col };
        return copy;
      });
    }
  };

  const randomizePositions = () => {
    const used = new Set();
    const randCell = () => {
      while (true) {
        const r = Math.floor(Math.random() * BOARD_SIZE);
        const c = Math.floor(Math.random() * BOARD_SIZE);
        const k = `${r},${c}`;
        if (!used.has(k)) {
          used.add(k);
          return { row: r, col: c };
        }
      }
    };
    const k = randCell();
    const k1 = randCell();
    const k2 = randCell();
    const k3 = randCell();
    const d = randCell();
    setKnight(k);
    setKeys([k1, k2, k3]);
    setDoor(d);
    resetAnimationState();
    setFeedback("Random configuration generated. Choose an algorithm to run.");
    setOptimalMoves(null);
  };

  const applyPreset = (preset) => {
    const { knight, keys, door } = preset.positions;
    setKnight(knight);
    setKeys(keys);
    setDoor(door);
    resetAnimationState();
    setFeedback(`${preset.name} loaded. Choose an algorithm to run.`);
    setOptimalMoves(null);
  };

  const placeByCoords = (piece, rowStr, colStr) => {
    const r = parseInt(rowStr, 10);
    const c = parseInt(colStr, 10);
    if (
      Number.isNaN(r) ||
      Number.isNaN(c) ||
      r < 0 ||
      r >= BOARD_SIZE ||
      c < 0 ||
      c >= BOARD_SIZE
    ) {
      window.alert("Row/col must be integers between 0 and 7.");
      return;
    }
    handleCellClick(r, c);
    setPlacementMode(
      piece === "Knight"
        ? "knight"
        : piece === "Door"
        ? "door"
        : piece === "Key 1"
        ? "key1"
        : piece === "Key 2"
        ? "key2"
        : "key3"
    );
  };

  /* ----- Running algorithms ----- */

  const validatePositions = () => {
    if (!knight || !door || keys.some((k) => !k)) {
      window.alert("You must place Knight, all 3 Keys, and Door.");
      return false;
    }
    return true;
  };

  const runSingleAlgorithm = (algo, withAnimationLog = true) => {
    if (!validatePositions()) return;

    // BFS baseline to define "optimal moves"
    const bfsBaseline = solveBFS(knight, keys, door);
    const baselineMoves = bfsBaseline.path ? bfsBaseline.path.length - 1 : null;
    setOptimalMoves(baselineMoves);

    let result;
    if (algo === "DFS") result = solveDFS(knight, keys, door);
    else if (algo === "BFS") result = bfsBaseline; // reuse
    else if (algo === "A*") result = solveAStar(knight, keys, door);
    else result = solveIDS(knight, keys, door);

    const chosenKeyIndex = getChosenKeyIndex(result.path, keys);
    const moves = result.path ? result.path.length - 1 : null;
    const isOptimal = baselineMoves != null && moves === baselineMoves;

    const enriched = { ...result, chosenKeyIndex, isOptimal };

    setCurrentResult(enriched);
    setCurrentStep(0);
    setIsPlaying(true);

    if (!result.path) {
      setFeedback(`${algo}: no solution found.`);
      setLogText(`${algo} did not find a solution.\n`);
      return;
    }

    const keyLabel =
      chosenKeyIndex != null ? `Key ${chosenKeyIndex + 1}` : "none";
    const msg = `${algo} chose ${keyLabel}, found a path of ${moves} moves in ${result.timeMs.toFixed(
      3
    )} ms (expanded ${result.nodesExpanded} nodes).${
      isOptimal ? " This matches the optimal number of moves." : ""
    }`;
    setFeedback(msg);

    if (withAnimationLog) {
      setLogText(buildTextTrace(algo, enriched, knight, keys, door));
    }
  };

  const buildTextTrace = (algo, result, knight, keys, door) => {
    const lines = [];
    const path = result.path;
    const start = path[0];

    const keyLabel =
      result.chosenKeyIndex != null
        ? `Key ${result.chosenKeyIndex + 1}`
        : "none";

    lines.push(`--------Using ${algo}---------`);
    lines.push(
      `Initial state: knight=(${start.row},${start.col}), hasKey=${start.hasKey}`
    );
    lines.push(
      `Keys: ${keys
        .map((k, i) => (k ? `K${i + 1}@(${k.row},${k.col})` : `K${i + 1}@-`))
        .join(", ")}`
    );
    lines.push(`Door: (${door.row},${door.col})`);
    lines.push(`Chosen key: ${keyLabel}`);
    lines.push("");

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const cur = path[i];
      lines.push(`Move ${i}: knight -> (${cur.row},${cur.col})`);
      if (!prev.hasKey && cur.hasKey) {
        lines.push(`  -> Picked up key at (${cur.row},${cur.col})`);
      }
      if (cur.hasKey && cur.row === door.row && cur.col === door.col) {
        lines.push("  -> Reached door!");
      }
    }

    lines.push(
      `${algo} took ${path.length - 1} moves, ${result.timeMs.toFixed(3)} ms, ${
        result.nodesExpanded
      } nodes expanded.`
    );
    return lines.join("\n");
  };

  /* ----- Playback controls ----- */

  const handlePlay = () => {
    if (currentResult && currentResult.path) setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleStep = () => {
    if (!currentResult || !currentResult.path) return;
    if (currentStep < currentResult.path.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };
  const handleStepBack = () => {
    if (!currentResult || !currentResult.path) return;
    setIsPlaying(false);
    setCurrentStep((s) => Math.max(0, s - 1));
  };
  const handleResetAnim = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  /* ----- Compare all algorithms (with benchmarking) ----- */

  const runComparison = () => {
    if (!validatePositions()) return;

    const bfsBench = benchmarkAlgorithm(solveBFS, knight, keys, door);
    const optimal = bfsBench.path ? bfsBench.path.length - 1 : null;
    setOptimalMoves(optimal);

    const dfsBench = benchmarkAlgorithm(solveDFS, knight, keys, door);
    const aBench = benchmarkAlgorithm(solveAStar, knight, keys, door);
    const idsBench = benchmarkAlgorithm(solveIDS, knight, keys, door);

    const allResults = [dfsBench, bfsBench, aBench, idsBench];

    const rows = allResults.map((r) => {
      const moves = r.path ? r.path.length - 1 : null;
      const chosenKeyIndex = getChosenKeyIndex(r.path, keys);
      return {
        algorithm: r.algorithm,
        moves,
        timeMs: r.timeMs,
        nodesExpanded: r.nodesExpanded,
        chosenKeyIndex,
        isOptimal: optimal != null && moves === optimal,
      };
    });

    setComparisonRows(rows);

    const solvedRows = rows.filter((r) => r.moves != null);
    if (solvedRows.length > 0) {
      const fastest = solvedRows.reduce((best, r) =>
        r.timeMs < best.timeMs ? r : best
      );
      const label =
        fastest.chosenKeyIndex != null
          ? `Key ${fastest.chosenKeyIndex + 1}`
          : "none";
      setFeedback(
        `Comparison: fastest here is ${
          fastest.algorithm
        } (chose ${label}, ${fastest.timeMs.toFixed(3)} ms, ${
          fastest.moves
        } moves).`
      );
    } else {
      setFeedback("No algorithm found a solution for this configuration.");
    }
  };

  /* ----- State for current animation frame ----- */

  let animKnight = knight;
  let animCollectedIndex = -1;

  if (currentResult && currentResult.path && currentResult.path.length > 0) {
    const path = currentResult.path;
    const stepIndex = Math.min(currentStep, path.length - 1);
    const state = path[stepIndex];
    animKnight = { row: state.row, col: state.col };

    let hasKey = false;
    for (let i = 1; i <= stepIndex; i++) {
      const prev = path[i - 1];
      const cur = path[i];
      if (!prev.hasKey && cur.hasKey && !hasKey) {
        hasKey = true;
        for (let k = 0; k < keys.length; k++) {
          const pk = keys[k];
          if (pk && pk.row === cur.row && pk.col === cur.col) {
            animCollectedIndex = k;
            break;
          }
        }
      }
    }
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Knight &amp; Keys Search Lab</h1>
          <p>
            Visualize how DFS, BFS, A* and IDS choose keys and paths on an 8×8
            chessboard.
          </p>
        </div>
        <span className="badge">AI Project · CMPS453</span>
      </header>

      <main className="app-main">
        {/* LEFT: setup + log */}
        <section className="side-panel left-panel glass">
          <h2>Setup</h2>
          <p className="hint">
            Pick what you want to place, then click a square on the board.
          </p>

          <div className="chip-group">
            {placementModes.map((m) => (
              <button
                key={m.id}
                className={
                  "chip" + (placementMode === m.id ? " chip-active" : "")
                }
                onClick={() => setPlacementMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button className="btn full" onClick={randomizePositions}>
            🎲 Randomize positions
          </button>

          <h3>Presets</h3>
          <div className="chip-group presets">
            {presetScenarios.map((p) => (
              <button
                key={p.id}
                className="chip chip-preset"
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <CoordinatePlacer onPlace={placeByCoords} />

          <h3>Move log</h3>
          <textarea
            className="log-area"
            value={logText}
            onChange={() => {}}
            readOnly
          />
        </section>

        {/* CENTER: board */}
        <section className="board-panel glass">
          <Board
            knight={animKnight}
            keys={keys}
            door={door}
            collectedKeyIndex={animCollectedIndex}
            onCellClick={handleCellClick}
            chosenKeyIndex={currentResult ? currentResult.chosenKeyIndex : null}
          />
        </section>

        {/* RIGHT: controls + stats */}
        <section className="side-panel right-panel glass">
          <h2>Simulation hub</h2>

          <label className="field">
            <span>Algorithm</span>
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value)}
            >
              {algorithms.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button
              className="btn primary full"
              onClick={() => runSingleAlgorithm(selectedAlgo, true)}
            >
              ▶ Run &amp; animate
            </button>
          </div>

          <div className="button-row">
            <button className="btn" onClick={handlePlay}>
              ▶ Play
            </button>
            <button className="btn" onClick={handlePause}>
              ⏸ Pause
            </button>
            <button className="btn" onClick={handleStepBack}>
              ⏮ Step back
            </button>
            <button className="btn" onClick={handleStep}>
              ⏭ Step
            </button>
            <button className="btn" onClick={handleResetAnim}>
              🔁 Reset
            </button>
          </div>

          <label className="field">
            <span>Animation speed ({speed.toFixed(2)}×)</span>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
            />
          </label>

          <StatsDisplay result={currentResult} optimalMoves={optimalMoves} />

          <h3>Insight</h3>
          <p className="feedback">{feedback}</p>

          <button className="btn ghost full" onClick={runComparison}>
            Compare all algorithms
          </button>
        </section>
      </main>

      {/* BOTTOM: comparison table */}
      <section className="comparison-panel glass">
        <h2>Algorithm comparison</h2>
        <ComparisonTable rows={comparisonRows} />
      </section>
    </div>
  );
}

/* ======= Small components ======= */

function Board({
  knight,
  keys,
  door,
  collectedKeyIndex,
  chosenKeyIndex,
  onCellClick,
}) {
  return (
    <div className="board-shell">
      <div className="board">
        {Array.from({ length: BOARD_SIZE }, (_, r) =>
          Array.from({ length: BOARD_SIZE }, (_, c) => {
            const keyIndex = keys.findIndex(
              (k) => k && k.row === r && k.col === c
            );
            const hasKnight = knight && knight.row === r && knight.col === c;
            const isDoor = door && door.row === r && door.col === c;

            let piece = null;

            if (isDoor) {
              piece = (
                <span className="piece piece-door">
                  <span className="piece-icon">🚪</span>
                </span>
              );
            }
            if (keyIndex !== -1 && keyIndex !== collectedKeyIndex) {
              const label = `K${keyIndex + 1}`;
              const isChosen = chosenKeyIndex === keyIndex;
              piece = (
                <span
                  className={
                    "piece piece-key " +
                    `key-${keyIndex + 1}` +
                    (isChosen ? " key-chosen" : "")
                  }
                >
                  <span className="piece-icon">🔑</span>
                  <span className="piece-tag">{label}</span>
                </span>
              );
            }
            if (hasKnight) {
              piece = (
                <span className="piece piece-knight">
                  <span className="piece-icon">♞</span>
                </span>
              );
            }

            const colorClass = (r + c) % 2 === 0 ? "light" : "dark";

            return (
              <div
                key={`${r}-${c}`}
                className={`cell ${colorClass}`}
                onClick={() => onCellClick(r, c)}
              >
                {piece}
                <span className="coord">
                  {r},{c}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="board-legend">
        <div className="legend-item">
          <span className="legend-swatch legend-knight">♞</span>
          <span>Knight</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-key legend-key1">🔑 K1</span>
          <span>Key 1 (green)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-key legend-key2">🔑 K2</span>
          <span>Key 2 (yellow)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-key legend-key3">🔑 K3</span>
          <span>Key 3 (red)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-door">🚪</span>
          <span>Door</span>
        </div>
      </div>
    </div>
  );
}

function CoordinatePlacer({ onPlace }) {
  const [piece, setPiece] = useState("Knight");
  const [row, setRow] = useState("");
  const [col, setCol] = useState("");

  return (
    <div className="coord-card">
      <h3>Place by coordinates</h3>
      <label className="field">
        <span>Piece</span>
        <select value={piece} onChange={(e) => setPiece(e.target.value)}>
          <option>Knight</option>
          <option>Key 1</option>
          <option>Key 2</option>
          <option>Key 3</option>
          <option>Door</option>
        </select>
      </label>
      <div className="coord-row">
        <input
          type="number"
          placeholder="row"
          value={row}
          onChange={(e) => setRow(e.target.value)}
        />
        <input
          type="number"
          placeholder="col"
          value={col}
          onChange={(e) => setCol(e.target.value)}
        />
        <button className="btn tiny" onClick={() => onPlace(piece, row, col)}>
          Place
        </button>
      </div>
    </div>
  );
}

function StatsDisplay({ result, optimalMoves }) {
  if (!result || !result.path) {
    return (
      <div className="stats">
        <div>
          <span className="stats-label">Moves</span>
          <span>—</span>
        </div>
        <div>
          <span className="stats-label">Time</span>
          <span>—</span>
        </div>
        <div>
          <span className="stats-label">Nodes expanded</span>
          <span>—</span>
        </div>
        <div>
          <span className="stats-label">Chosen key</span>
          <span>—</span>
        </div>
        <div>
          <span className="stats-label">Optimal moves (BFS)</span>
          <span>{optimalMoves ?? "—"}</span>
        </div>
        <div>
          <span className="stats-label">Optimal?</span>
          <span>—</span>
        </div>
      </div>
    );
  }
  const moves = result.path.length - 1;
  const keyLabel =
    result.chosenKeyIndex != null ? `Key ${result.chosenKeyIndex + 1}` : "none";
  const isOptimal =
    result.isOptimal ?? (optimalMoves != null && moves === optimalMoves);

  return (
    <div className="stats">
      <div>
        <span className="stats-label">Moves</span>
        <span>{moves}</span>
      </div>
      <div>
        <span className="stats-label">Time</span>
        <span>{result.timeMs.toFixed(3)} ms</span>
      </div>
      <div>
        <span className="stats-label">Nodes expanded</span>
        <span>{result.nodesExpanded}</span>
      </div>
      <div>
        <span className="stats-label">Chosen key</span>
        <span>{keyLabel}</span>
      </div>
      <div>
        <span className="stats-label">Optimal moves (BFS)</span>
        <span>{optimalMoves ?? "—"}</span>
      </div>
      <div>
        <span className="stats-label">Optimal?</span>
        <span className={isOptimal ? "opt-yes" : "opt-no"}>
          {optimalMoves == null ? "—" : isOptimal ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}

function ComparisonTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="comparison-empty">
        Run “Compare all algorithms” to see a side-by-side summary.
      </p>
    );
  }
  return (
    <table className="comparison-table">
      <thead>
        <tr>
          <th>Algorithm</th>
          <th>Key chosen</th>
          <th>Moves</th>
          <th>Optimal</th>
          <th>Time (ms)</th>
          <th>Nodes expanded</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.algorithm}>
            <td>{r.algorithm}</td>
            <td>
              {r.chosenKeyIndex != null ? `Key ${r.chosenKeyIndex + 1}` : "—"}
            </td>
            <td>{r.moves ?? "—"}</td>
            <td>
              {r.moves == null ? (
                "—"
              ) : (
                <span className={r.isOptimal ? "opt-yes" : "opt-no"}>
                  {r.isOptimal ? "Yes" : "No"}
                </span>
              )}
            </td>
            <td>{r.moves != null ? r.timeMs.toFixed(3) : "—"}</td>
            <td>{r.nodesExpanded}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;
