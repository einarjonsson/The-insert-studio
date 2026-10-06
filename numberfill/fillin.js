// Number fill-in puzzle engine: grid pattern, number fill, uniqueness check and page layout.
// Works in the browser (window.FillIn) and in Node (module.exports) so it can be tested on its own.
(function (root) {
  'use strict';

  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Difficulty -> longest number allowed (in digits). Grid size also grows with difficulty (see GRID).
  const LEVELS = {
    easy:   { maxLen: 4, density: 0.30 },
    medium: { maxLen: 5, density: 0.28 },
    hard:   { maxLen: 6, density: 0.27 }
  };
  // Grid size per notebook size and difficulty.
  const GRID = {
    regular:  { easy: 7, medium: 9,  hard: 10 },
    passport: { easy: 8, medium: 10, hard: 12 }
  };

  // ── Pattern ──────────────────────────────────────────────────────────────────
  function findSlots(black, n) {
    const slots = [];
    const run = (cells, dir) => { if (cells.length >= 2) slots.push({ dir, r: cells[0][0], c: cells[0][1], len: cells.length, cells }); };
    for (let r = 0; r < n; r++) {
      let cur = [];
      for (let c = 0; c < n; c++) { if (black[r][c]) { run(cur, 'A'); cur = []; } else cur.push([r, c]); }
      run(cur, 'A');
    }
    for (let c = 0; c < n; c++) {
      let cur = [];
      for (let r = 0; r < n; r++) { if (black[r][c]) { run(cur, 'D'); cur = []; } else cur.push([r, c]); }
      run(cur, 'D');
    }
    return slots;
  }

  function validPattern(black, n, lv) {
    const slots = findSlots(black, n);
    // enough numbers to be a puzzle, not so many that the list overflows the page
    if (slots.length < Math.round(1.9 * n) || slots.length > Math.round(3.6 * n)) return null;
    if (slots.some((s) => s.len > lv.maxLen)) return null;
    // every white cell must sit in at least one slot
    const covered = Array.from({ length: n }, () => Array(n).fill(false));
    slots.forEach((s) => s.cells.forEach(([r, c]) => { covered[r][c] = true; }));
    let whites = 0, seen = 0, start = null;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!black[r][c]) { whites++; if (!covered[r][c]) return null; if (!start) start = [r, c]; }
    }
    // white cells must be one connected region
    const mark = Array.from({ length: n }, () => Array(n).fill(false));
    const stack = [start]; mark[start[0]][start[1]] = true;
    while (stack.length) {
      const [r, c] = stack.pop(); seen++;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && !black[rr][cc] && !mark[rr][cc]) { mark[rr][cc] = true; stack.push([rr, cc]); }
      }
    }
    if (seen !== whites) return null;
    return slots;
  }

  // Black out a cell inside any run that is longer than `maxLen` (and its 180° partner).
  function breakLongRuns(black, n, maxLen) {
    for (let guard = 0; guard < 80; guard++) {
      const long = findSlots(black, n).filter((s) => s.len > maxLen);
      if (!long.length) return true;
      const s = long[rnd(long.length)];
      const k = 1 + rnd(s.len - 2);            // interior cell, never the run's ends
      const [r, c] = s.cells[k];
      black[r][c] = true; black[n - 1 - r][n - 1 - c] = true;
    }
    return false;
  }

  function makePattern(n, lv) {
    for (let attempt = 0; attempt < 800; attempt++) {
      const black = Array.from({ length: n }, () => Array(n).fill(false));
      const target = Math.round(n * n * lv.density);
      let count = 0, guard = 0;
      while (count < target && guard++ < 400) {
        const r = rnd(n), c = rnd(n), r2 = n - 1 - r, c2 = n - 1 - c; // 180° symmetry
        if (black[r][c]) continue;
        black[r][c] = true; count++;
        if (!black[r2][c2]) { black[r2][c2] = true; count++; }
      }
      if (!breakLongRuns(black, n, lv.maxLen)) continue;
      const slots = validPattern(black, n, lv);
      if (slots) return { black, slots };
    }
    return null;
  }

  // ── Fill: random digits 1-9, every number distinct ───────────────────────────
  function fillPattern(black, slots, n) {
    const grid = Array.from({ length: n }, () => Array(n).fill(0));
    const order = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!black[r][c]) order.push([r, c]);
    // slots complete when their last cell in reading order is assigned
    const doneAt = new Map();
    slots.forEach((s) => {
      const last = s.cells.reduce((a, b) => (b[0] * n + b[1] > a[0] * n + a[1] ? b : a));
      const k = last[0] * n + last[1];
      if (!doneAt.has(k)) doneAt.set(k, []);
      doneAt.get(k).push(s);
    });
    const used = new Set();
    let steps = 0;
    function go(i) {
      if (i === order.length) return true;
      if (++steps > 20000) return false;
      const [r, c] = order[i];
      const finishing = doneAt.get(r * n + c) || [];
      for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        grid[r][c] = d;
        const made = [];
        let ok = true;
        for (const s of finishing) {
          const str = s.cells.map(([rr, cc]) => grid[rr][cc]).join('');
          if (used.has(str)) { ok = false; break; }
          made.push(str);
        }
        if (ok) {
          made.forEach((m) => used.add(m));
          if (go(i + 1)) return true;
          made.forEach((m) => used.delete(m));
        }
        grid[r][c] = 0;
      }
      return false;
    }
    return go(0) ? grid : null;
  }

  // ── Solver (counts solutions up to `limit`) ──────────────────────────────────
  function countSolutions(black, slots, n, numbers, givenIdx, limit) {
    const cells = Array.from({ length: n }, () => Array(n).fill(0));
    const byLen = {};
    numbers.forEach((s) => { (byLen[s.length] = byLen[s.length] || []).push(s); });
    const usedNum = new Set();
    const placed = new Array(slots.length).fill(false);
    let found = 0, nodes = 0, capped = false;

    function fits(slot, str) {
      for (let k = 0; k < slot.len; k++) {
        const v = cells[slot.cells[k][0]][slot.cells[k][1]];
        if (v && String(v) !== str[k]) return false;
      }
      return true;
    }
    function put(slot, str) {
      const changed = [];
      for (let k = 0; k < slot.len; k++) {
        const [r, c] = slot.cells[k];
        if (!cells[r][c]) { cells[r][c] = +str[k]; changed.push([r, c]); }
      }
      return changed;
    }

    // givens go in first (their numbers are known from the solution grid, passed in via givenIdx = [{i,str}])
    const undo0 = [];
    for (const g of givenIdx) {
      undo0.push(put(slots[g.i], g.str));
      usedNum.add(g.str); placed[g.i] = true;
    }

    function search(left) {
      if (found >= limit || capped) return;
      if (++nodes > 60000) { capped = true; return; }
      if (left === 0) { found++; return; }
      // slot with the fewest candidates
      let best = -1, bestCands = null;
      for (let i = 0; i < slots.length; i++) {
        if (placed[i]) continue;
        const cands = (byLen[slots[i].len] || []).filter((s) => !usedNum.has(s) && fits(slots[i], s));
        if (!cands.length) return;
        if (best < 0 || cands.length < bestCands.length) { best = i; bestCands = cands; if (cands.length === 1) break; }
      }
      for (const s of bestCands) {
        const changed = put(slots[best], s);
        usedNum.add(s); placed[best] = true;
        search(left - 1);
        usedNum.delete(s); placed[best] = false;
        changed.forEach(([r, c]) => { cells[r][c] = 0; });
        if (found >= limit || capped) return;
      }
    }
    search(slots.length - givenIdx.length);
    return capped ? -1 : found;
  }

  // ── Puzzle ───────────────────────────────────────────────────────────────────
  function generate(size, difficulty) {
    const lv = LEVELS[difficulty] || LEVELS.medium;
    const n = (GRID[size] || GRID.regular)[difficulty] || 9;
    let fallback = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const pat = makePattern(n, lv);
      if (!pat) continue;
      const solved = fillPattern(pat.black, pat.slots, n);
      if (!solved) continue;
      const slots = pat.slots.map((s) => Object.assign({}, s, { str: s.cells.map(([r, c]) => solved[r][c]).join('') }));
      const numbers = slots.map((s) => s.str);
      // always write in the longest number as a starting point; add more only if the puzzle is still ambiguous
      const byLength = slots.map((s, i) => ({ i, str: s.str, len: s.len })).sort((a, b) => b.len - a.len || rnd(3) - 1);
      let given = [], unique = false;
      for (let h = 1; h <= 3 && !unique; h++) {
        given = byLength.slice(0, h).map(({ i, str }) => ({ i, str }));
        const res = countSolutions(pat.black, slots, n, numbers, given, 2);
        if (res === 1) unique = true;
      }
      const puzzle = build(n, pat.black, slots, solved, given, unique);
      if (unique) return puzzle;
      fallback = puzzle;
    }
    return fallback;
  }

  function build(n, black, slots, solved, given, unique) {
    const givenSet = new Set(given.map((g) => g.i));
    // grid shown to the player: only the given numbers are written in
    const shown = Array.from({ length: n }, () => Array(n).fill(0));
    given.forEach((g) => slots[g.i].cells.forEach(([r, c]) => { shown[r][c] = solved[r][c]; }));
    // list of numbers still to place, grouped by length and sorted
    const groups = {};
    slots.forEach((s, i) => { if (!givenSet.has(i)) (groups[s.len] = groups[s.len] || []).push(s.str); });
    const list = Object.keys(groups).map(Number).sort((a, b) => a - b)
      .map((len) => ({ len, nums: groups[len].sort() }));
    return { n, black, slots, solved, shown, given: given.map((g) => g.i), list, unique, count: slots.length - given.length };
  }

  // ── Page layout (all in mm, relative to the panel's top-left) ────────────────
  // layout.gx/gy/cell: grid; layout.columns: [{x, y, len, nums, header}] for the number list.
  function layout(puzzle, pw, ph, size) {
    const n = puzzle.n, margin = 5, titleH = 8;
    const fontPt = size === 'passport' ? 7 : 6.2;
    const lineH = fontPt / 2.835 * 1.5;
    const digitW = fontPt / 2.835 * 0.62;
    const gap = 3.2, headH = 3.6;

    function pack(rows, maxW) {
      const cols = [];
      let x = 0;
      for (const g of puzzle.list) {
        const headW = (String(g.len).length + 7) * (fontPt - 1.4) / 2.835 * 0.62; // e.g. "3 DIGITS"
        const colW = Math.max(g.len * digitW + 1.5, headW);
        for (let i = 0; i < g.nums.length; i += rows) {
          cols.push({ x, len: g.len, header: i === 0 ? g.len + ' digits' : '', nums: g.nums.slice(i, i + rows), w: colW });
          x += colW + gap;
        }
      }
      const totalW = x - gap;
      return totalW <= maxW ? { cols, totalW } : null;
    }

    let cell, gx, gy, listX, listY, packed;
    if (size === 'passport') {
      const availH = ph - margin * 2 - titleH;
      const rows = Math.floor((availH - headH) / lineH);
      for (cell = Math.min(7.5, availH / n); cell > 3; cell -= 0.05) {
        packed = pack(rows, pw - margin * 2 - cell * n - 6);
        if (packed) break;
      }
      gx = margin; gy = margin + titleH;
      listX = gx + cell * n + 6; listY = gy;
    } else {
      const availW = pw - margin * 2;
      for (cell = Math.min(8, availW / n); cell > 3; cell -= 0.05) {
        const listH = ph - margin * 2 - titleH - cell * n - 3;
        const rows = Math.floor((listH - headH) / lineH);
        if (rows < 3) continue;
        packed = pack(rows, availW);
        if (packed) break;
      }
      gx = margin + (availW - cell * n) / 2; gy = margin + titleH;
      listX = margin + (availW - (packed ? packed.totalW : 0)) / 2; listY = gy + cell * n + 3;
    }
    if (!packed) packed = { cols: [], totalW: 0 };
    return {
      n, cell, gx, gy, fontPt, lineH, digitW, headH, margin, titleH,
      columns: packed.cols.map((c) => Object.assign(c, { x: listX + c.x, y: listY }))
    };
  }

  const api = { generate, layout, countSolutions, makePattern, fillPattern, findSlots, LEVELS, GRID };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FillIn = api;
})(typeof window !== 'undefined' ? window : globalThis);
