// Math worksheet engine: makes the problems and lays a panel out as plain drawing ops (mm)
// that math/index.html paints into both the jsPDF document and the live preview canvas.
// Output is sized for the 110 x 105 mm notebook panels used by every other insert.
//
//   MathSheet.generate({ ops, level, layout, size })  -> { layout, size, items: [{ op, a, b, ans }] }
//   MathSheet.layout(sheet, { getName, answers, top }) -> [{ t:'text'|'line', ... }]
//
// All randomness goes through Seed.random() so a seed reproduces the same worksheets.
window.MathSheet = (function () {
  const PER_PAGE = { large: 6, medium: 8, small: 12 };   // problems per panel
  const OP_LABEL = { add: 'Add', sub: 'Subtract', mul: 'Multiply' };
  const SYMBOL = { add: '+', sub: '-', mul: '×' };
  const LEVEL_LABEL = { starter: 'Starter', easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const TITLE = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication' };
  const title = (ops) => (ops.length === 1 ? TITLE[ops[0]] : 'Math Mix');

  const ri = (lo, hi) => lo + Math.floor(Seed.random() * (hi - lo + 1));
  const pick = (arr) => arr[ri(0, arr.length - 1)];

  // ── Problems ─────────────────────────────────────────────────────────────────
  function addition(level) {
    let a, b;
    if (level === 'starter') { a = ri(1, 9); b = ri(1, 10 - a); }                    // sum within 10
    else if (level === 'easy') { a = ri(2, 19); b = ri(1, 20 - a); }                 // sum within 20
    else if (level === 'medium') { a = ri(10, 90); b = ri(1, 100 - a); }             // sum within 100
    else do { a = ri(11, 99); b = ri(11, 99); } while (a % 10 + b % 10 < 10);        // must carry
    return { op: 'add', a, b, ans: a + b };
  }
  function subtraction(level) {
    let a, b;
    if (level === 'starter') { a = ri(2, 10); b = ri(1, a - 1); }
    else if (level === 'easy') { a = ri(5, 20); b = ri(1, a - 1); }
    else if (level === 'medium') { a = ri(20, 99); b = ri(1, a - 1); }
    else do { a = ri(21, 99); b = ri(11, a - 1); } while (a % 10 >= b % 10);         // must borrow
    return { op: 'sub', a, b, ans: a - b };
  }
  function multiplication(level) {
    let a, b;
    if (level === 'starter') { a = ri(1, 10); b = pick([2, 5, 10]); }
    else if (level === 'easy') { a = ri(1, 10); b = ri(1, 5); }
    else if (level === 'medium') { a = ri(1, 10); b = ri(1, 10); }
    else { a = ri(2, 12); b = ri(2, 12); }
    if (Seed.random() < 0.5) [a, b] = [b, a];
    return { op: 'mul', a, b, ans: a * b };
  }
  const MAKE = { add: addition, sub: subtraction, mul: multiplication };

  function generate({ ops, level, layout, size }) {
    const n = PER_PAGE[size];
    const seq = Array.from({ length: n }, (_, i) => ops[i % ops.length]);
    for (let i = n - 1; i > 0; i--) { const j = ri(0, i); [seq[i], seq[j]] = [seq[j], seq[i]]; }
    const seen = new Set(), items = [];
    for (const op of seq) {
      let p, tries = 0;
      do { p = MAKE[op](level); } while (seen.has(op + p.a + ',' + p.b) && ++tries < 40);
      seen.add(op + p.a + ',' + p.b);
      items.push(p);
    }
    return { layout, size, items };
  }

  // ── Panel layout ─────────────────────────────────────────────────────────────
  // One worksheet is one 110 x 105 mm notebook panel; four panels fill each side of an A4 landscape sheet.
  const PW = 110, PH = 105, MX = 6, BODY_BOTTOM = PH - 10;
  const CHAR = 0.6 / 2.835;                 // mono glyph advance in mm per pt of font size
  const BASE_PT = { horizontal: { large: 15, medium: 14, small: 12 }, vertical: { large: 18, medium: 16, small: 13 } };
  const COLS = { horizontal: { large: 2, medium: 2, small: 2 }, vertical: { large: 3, medium: 4, small: 4 } };

  // Drawing ops for one panel, in mm relative to the panel's top-left corner. `top` is where the header ends.
  function layout(sheet, { getName, answers, top }) {
    const out = [];
    const text = (s, x, y, pt, o) => out.push(Object.assign({ t: 'text', s: String(s), x, y, pt }, o));
    const line = (x1, y1, x2, y2, w, c) => out.push({ t: 'line', x1, y1, x2, y2, w, c });

    // name line (not on the answer panels)
    const ny = top + 6;
    if (!answers) {
      text('NAME', MX, ny, 5, { c: 'muted' });
      line(MX + 9, ny + 0.8, PW - MX, ny + 0.8, 0.2, 'rule');
      if (getName) text(getName, MX + 11, ny - 0.5, 9, { bold: true, c: 'rust' });
    }

    const items = sheet.items, vertical = sheet.layout === 'vertical';
    const cols = COLS[sheet.layout][sheet.size], rows = Math.ceil(items.length / cols);
    const bodyTop = top + 10, cellW = (PW - MX * 2) / cols, cellH = (BODY_BOTTOM - bodyTop) / rows;
    const base = BASE_PT[sheet.layout][sheet.size];

    if (!vertical) {
      const sums = items.map(p => `${p.a} ${SYMBOL[p.op]} ${p.b} =`);
      const maxChars = Math.max(...sums.map(s => s.length));
      const lineW = cellW * 0.24;
      const pt = Math.min(base, (cellW - 8 - lineW) / (maxChars * CHAR));
      const xr = 5 + maxChars * CHAR * pt;                          // right edge of the sum, relative to the cell
      items.forEach((p, i) => {
        const cx = MX + (i % cols) * cellW, cy = bodyTop + Math.floor(i / cols) * cellH;
        const y = cy + cellH / 2 + pt * 0.123;
        text(i + 1, cx, y - 0.6, 5, { c: 'muted' });
        text(sums[i], cx + xr, y, pt, { align: 'right', bold: true });
        line(cx + xr + 2, y + 1.3, cx + xr + 2 + lineW, y + 1.3, 0.3, 'muted');
        if (answers) text(p.ans, cx + xr + 2 + lineW / 2, y, pt, { align: 'center', bold: true, c: 'sage' });
      });
    } else {
      const pt = base, cw = CHAR * pt, lh = pt / 2.835 * 1.45;
      items.forEach((p, i) => {
        const cx = MX + (i % cols) * cellW, cy = bodyTop + Math.floor(i / cols) * cellH;
        const d = Math.max(String(p.a).length, String(p.b).length);
        const xr = cx + cellW / 2 + (d + 1.5) * cw / 2;             // right edge of the digits
        const y1 = cy + (cellH - 3.4 * lh) / 2 + lh * 0.9, y2 = y1 + lh;
        text(i + 1, cx + 0.5, y1 - lh * 0.55, 5, { c: 'muted' });
        text(p.a, xr, y1, pt, { align: 'right', bold: true });
        text(SYMBOL[p.op], xr - d * cw - cw * 0.4, y2, pt, { align: 'right', bold: true });
        text(p.b, xr, y2, pt, { align: 'right', bold: true });
        line(xr - (d + 1.8) * cw, y2 + lh * 0.28, xr + cw * 0.3, y2 + lh * 0.28, 0.45, 'ink');
        if (answers) text(p.ans, xr, y2 + lh * 1.35, pt, { align: 'right', bold: true, c: 'sage' });
      });
    }
    return out;
  }

  return { PER_PAGE, PW, PH, OP_LABEL, LEVEL_LABEL, title, generate, layout };
})();
