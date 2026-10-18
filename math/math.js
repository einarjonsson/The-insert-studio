// Math worksheet engine: makes the problems and lays a page out as plain drawing ops (mm, A4 portrait)
// that math/index.html paints into both the jsPDF document and the live preview canvas.
//
//   MathSheet.generate({ ops, level, layout, size })  -> { layout, size, items: [{ op, a, b, ans }] }
//   MathSheet.layout(sheet, { getName, answers, top }) -> [{ t:'text'|'line', ... }]
//
// All randomness goes through Seed.random() so a seed reproduces the same worksheets.
window.MathSheet = (function () {
  const PER_PAGE = { large: 12, medium: 20, small: 30 };
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

  // ── Page layout ──────────────────────────────────────────────────────────────
  const W = 210, MX = 14, BODY_BOTTOM = 272;
  const CHAR = 0.6 / 2.835;                 // mono glyph advance in mm per pt of font size
  const BASE_PT = { horizontal: { large: 22, medium: 18, small: 16 }, vertical: { large: 28, medium: 24, small: 20 } };

  function layout(sheet, { getName, answers, top }) {
    const out = [];
    const text = (s, x, y, pt, o) => out.push(Object.assign({ t: 'text', s: String(s), x, y, pt }, o));
    const line = (x1, y1, x2, y2, w, c) => out.push({ t: 'line', x1, y1, x2, y2, w, c });

    // name & date line (not on the answer pages)
    const ny = top + 9;
    if (!answers) {
      text('NAME', MX, ny, 6, { c: 'muted' });
      line(MX + 11, ny + 0.8, 118, ny + 0.8, 0.25, 'rule');
      if (getName) text(getName, MX + 13, ny - 0.6, 12, { bold: true, c: 'rust' });
      text('DATE', 128, ny, 6, { c: 'muted' });
      line(128 + 11, ny + 0.8, W - MX, ny + 0.8, 0.25, 'rule');
    }

    const items = sheet.items, n = items.length, vertical = sheet.layout === 'vertical';
    const cols = vertical ? (sheet.size === 'large' ? 4 : 5) : (sheet.size === 'small' ? 3 : 2);
    const rows = Math.ceil(n / cols);
    const bodyTop = top + 17, cellW = (W - MX * 2) / cols, cellH = (BODY_BOTTOM - bodyTop) / rows;
    const base = BASE_PT[sheet.layout][sheet.size];

    if (!vertical) {
      const sums = items.map(p => `${p.a} ${SYMBOL[p.op]} ${p.b} =`);
      const maxChars = Math.max(...sums.map(s => s.length));
      const lineW = cellW * 0.24;
      const pt = Math.min(base, (cellW - 11 - lineW) / (maxChars * CHAR));
      const xr = 9 + maxChars * CHAR * pt;                          // right edge of the sum, relative to the cell
      items.forEach((p, i) => {
        const cx = MX + (i % cols) * cellW, cy = bodyTop + Math.floor(i / cols) * cellH;
        const y = cy + cellH / 2 + pt * 0.123;
        text(i + 1, cx + 2, y - 1, 7, { c: 'muted' });
        text(sums[i], cx + xr, y, pt, { align: 'right', bold: true });
        line(cx + xr + 3, y + 1.6, cx + xr + 3 + lineW, y + 1.6, 0.35, 'muted');
        if (answers) text(p.ans, cx + xr + 3 + lineW / 2, y, pt, { align: 'center', bold: true, c: 'sage' });
      });
    } else {
      const pt = base, cw = CHAR * pt, lh = pt / 2.835 * 1.45;
      items.forEach((p, i) => {
        const cx = MX + (i % cols) * cellW, cy = bodyTop + Math.floor(i / cols) * cellH;
        const d = Math.max(String(p.a).length, String(p.b).length);
        const xr = cx + cellW / 2 + (d + 1.5) * cw / 2;             // right edge of the digits
        const y1 = cy + (cellH - 3.4 * lh) / 2 + lh * 0.9, y2 = y1 + lh;
        text(i + 1, cx + 3, y1 - lh * 0.5, 7, { c: 'muted' });
        text(p.a, xr, y1, pt, { align: 'right', bold: true });
        text(SYMBOL[p.op], xr - d * cw - cw * 0.4, y2, pt, { align: 'right', bold: true });
        text(p.b, xr, y2, pt, { align: 'right', bold: true });
        line(xr - (d + 1.8) * cw, y2 + lh * 0.28, xr + cw * 0.3, y2 + lh * 0.28, 0.5, 'ink');
        if (answers) text(p.ans, xr, y2 + lh * 1.35, pt, { align: 'right', bold: true, c: 'sage' });
      });
    }

    if (!answers) {
      text('SCORE', 146, 281.6, 6, { c: 'muted' });
      line(158, 282.4, 180, 282.4, 0.25, 'rule');
      text('/ ' + n, 182, 281.6, 9, { c: 'muted' });
    }
    return out;
  }

  return { PER_PAGE, OP_LABEL, LEVEL_LABEL, title, generate, layout };
})();
