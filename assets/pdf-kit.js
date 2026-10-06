// Shared PDF styling for every generator: embedded brand fonts, panel header/footer,
// fold & cut marks and covers. Everything here is drawn with jsPDF on a white page.
//
//   await PDFKit.preload();            // once, before building documents (fetches fonts)
//   const doc = new jsPDF(...); PDFKit.register(doc);
//   PDFKit.header(doc, ox, oy, pw, { eyebrow, title, accent, number });  // -> y where content may start
//   PDFKit.footer(doc, ox, oy, pw, ph, { number });
//   PDFKit.marks(doc, 'regular' | 'passport', { label, title, horizontal });
//   PDFKit.cover(doc, { kicker, title, subtitle, accent });
//
// jsPDF's built-in fonts only cover Latin-1, so decorative glyphs (✦, □) are drawn as vectors.
window.PDFKit = (function () {
  const COLORS = {
    ink:   [29, 22, 13],
    rust:  [122, 46, 14],
    gold:  [184, 134, 11],
    tan:   [201, 185, 143],   // thin grid lines
    rule:  [210, 195, 157],   // hairlines
    muted: [154, 144, 128],
    wash:  [243, 230, 220],   // pale rust tint for "given" cells
    sage:  [77, 106, 63],
    indigo:[26, 58, 92]
  };

  // ── Fonts ────────────────────────────────────────────────────────────────────
  const FONT_FILES = [
    ['PlayfairDisplay-Regular.ttf',    'Playfair', 'normal'],
    ['PlayfairDisplay-Italic.ttf',     'Playfair', 'italic'],
    ['PlayfairDisplay-Bold.ttf',       'Playfair', 'bold'],
    ['PlayfairDisplay-BoldItalic.ttf', 'Playfair', 'bolditalic'],
    ['DMMono-Regular.ttf',             'DMMono',   'normal'],
    ['DMMono-Medium.ttf',              'DMMono',   'bold']
  ];
  const base = (document.currentScript && document.currentScript.src || '').replace(/pdf-kit\.js.*$/, '') + 'fonts/';
  const cache = {};            // file -> binary string
  let ready = false, loading = null;

  function toBinary(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return s;
  }

  // Fetch the font files once. Resolves true when all loaded; false (and the PDFs fall back to
  // built-in fonts) if anything fails, e.g. when the page is opened offline from a file:// URL.
  function preload() {
    if (ready) return Promise.resolve(true);
    if (!loading) {
      loading = Promise.all(FONT_FILES.map(([file]) =>
        fetch(base + file).then((r) => { if (!r.ok) throw new Error(file); return r.arrayBuffer(); })
          .then((buf) => { cache[file] = toBinary(buf); })
      )).then(() => { ready = true; return true; }).catch(() => { loading = null; return false; });
    }
    return loading;
  }

  function register(doc) {
    if (!ready) return false;
    FONT_FILES.forEach(([file, family, style]) => {
      doc.addFileToVFS(file, cache[file]);
      doc.addFont(file, family, style);
    });
    return true;
  }

  // Family names with a safe fallback.
  const serif = () => (ready ? 'Playfair' : 'times');
  const mono  = () => (ready ? 'DMMono' : 'courier');
  // Map a tool's font setting ('studio' | 'helvetica' | 'times' | 'courier') to a jsPDF family for puzzle glyphs.
  // 'studio' = DM Mono for puzzle digits/letters (lining numerals, very legible); Playfair is for headings.
  const family = (f) => (f === 'studio' ? mono() : f || 'helvetica');

  const set = (doc, fam, style, size, color) => {
    doc.setFont(fam, style); doc.setFontSize(size);
    if (color) doc.setTextColor(color[0], color[1], color[2]);
  };
  const text = (doc, s, x, y, opts, charSpace) => doc.text(s, x, y, charSpace ? Object.assign({ charSpace }, opts) : opts);

  // ── Shapes ───────────────────────────────────────────────────────────────────
  // Four-point star centred on (cx, cy), filled with the current fill colour.
  function star(doc, cx, cy, r) {
    const k = 0.3 * r;
    const pts = [[0, -r], [k, -k], [r, 0], [k, k], [0, r], [-k, k], [-r, 0], [-k, -k]];
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    doc.lines(segs, cx + pts[0][0], cy + pts[0][1], [1, 1], 'F', true);
  }
  // "✦ · ✦" ornament drawn in the current text colour.
  function ornament(doc, cx, cy, r) {
    r = r || 1.6;
    doc.setFillColor(doc.getTextColor());
    star(doc, cx - r * 3.2, cy, r);
    doc.circle(cx, cy, r * 0.22, 'F');
    star(doc, cx + r * 3.2, cy, r);
  }
  // Centred title with a star to its left, in the current font and text colour.
  function starTitle(doc, s, cx, y, r) {
    r = r || 1.5;
    const w = doc.getTextWidth(s), gap = r * 2.2, total = w + gap + r * 2, x0 = cx - total / 2;
    doc.setFillColor(doc.getTextColor());
    star(doc, x0 + r, y - r * 0.95, r);
    doc.text(s, x0 + r * 2 + gap, y);
  }
  // Row of n empty checkboxes starting at x, centred on cy. Returns the right edge.
  function boxes(doc, x, cy, n, size, gap) {
    for (let i = 0; i < n; i++) doc.rect(x + i * (size + gap), cy - size / 2, size, size);
    return x + n * (size + gap) - gap;
  }

  // ── Panel header / footer ────────────────────────────────────────────────────
  const M = 6; // panel side margin for header and footer
  // opts: { eyebrow, title, accent, number, accentColor }. Returns the y (mm) where content may begin.
  function header(doc, ox, oy, pw, opts) {
    const accentColor = opts.accentColor || COLORS.rust;
    const x = ox + M;
    // eyebrow: gold rule + mono label
    doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.2); doc.line(x, oy + 5, x + 4.5, oy + 5);
    set(doc, mono(), 'normal', 4.6, COLORS.gold);
    text(doc, (opts.eyebrow || 'The Insert Studio').toUpperCase(), x + 6.5, oy + 5.6, null, 0.55);
    // title: Playfair, accent word in rust italic
    const size = opts.titleSize || 13;
    set(doc, serif(), 'bold', size, COLORS.ink);
    const ty = oy + 11.2;
    let tx = x;
    if (opts.title) { doc.text(opts.title, tx, ty); tx += doc.getTextWidth(opts.title + ' '); }
    if (opts.accent) { set(doc, serif(), 'bolditalic', size, accentColor); doc.text(opts.accent, tx, ty); }
    // gold rule
    doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.5); doc.line(x, oy + 13.2, x + 16, oy + 13.2);
    // panel number, right
    if (opts.number != null) {
      set(doc, serif(), 'italic', 10, accentColor);
      doc.text(String(opts.number).padStart(2, '0'), ox + pw - M, oy + 10.4, { align: 'right' });
    }
    return oy + 15.8;
  }

  // Hairline + "THE INSERT STUDIO" + italic page number. Content must stop above oy + ph - 8.
  function footer(doc, ox, oy, pw, ph, opts) {
    opts = opts || {};
    const y = oy + ph - 6.4;
    doc.setDrawColor(...COLORS.rule); doc.setLineWidth(0.15); doc.line(ox + M, y, ox + pw - M, y);
    set(doc, mono(), 'normal', 3.4, COLORS.muted);
    text(doc, (opts.label || 'The Insert Studio').toUpperCase(), ox + M, y + 3, null, 0.5);
    if (opts.number != null) {
      set(doc, serif(), 'italic', 6.5, opts.accentColor || COLORS.rust);
      doc.text(String(opts.number).padStart(2, '0'), ox + pw - M, y + 3.4, { align: 'right' });
    }
    return oy + ph - 8;
  }
  const FOOTER_H = 8;

  // ── Fold & cut marks ─────────────────────────────────────────────────────────
  // 'regular': fold at 110mm (dashed), cut at 220mm (dotted); opts.horizontal draws the divider between rows.
  // 'passport': cut lines through the centre.
  function marks(doc, size, opts) {
    opts = opts || {};
    const W = 297, H = 210, label = opts.label || '';
    doc.setLineDashPattern([], 0);
    if (size === 'passport') {
      const pw = 134, ph = 98, sx = (W - pw * 2) / 2, sy = (H - ph * 2) / 2;
      doc.setDrawColor(...COLORS.tan); doc.setLineWidth(0.15);
      for (let c = 0; c < 2; c++) for (let r = 0; r < 2; r++) doc.rect(sx + c * pw, sy + r * ph, pw, ph);
      doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.25); doc.setLineDashPattern([0.8, 2], 0);
      doc.line(sx + pw, sy - 4, sx + pw, sy + ph * 2 + 4);
      doc.line(sx - 4, sy + ph, sx + pw * 2 + 4, sy + ph);
      doc.setLineDashPattern([], 0);
      set(doc, mono(), 'normal', 3.6, COLORS.gold);
      text(doc, ('Cut along dotted lines' + (label ? '  ·  ' + label : '')).toUpperCase(), W / 2, sy - 5, { align: 'center' }, 0.4);
    } else {
      const colW = 110;
      doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.25);
      doc.setLineDashPattern([2, 1.5], 0); doc.line(colW, 0, colW, H);
      doc.setLineDashPattern([0.8, 2], 0); doc.line(2 * colW, 0, 2 * colW, H);
      doc.setLineDashPattern([], 0);
      if (opts.horizontal) {
        doc.setDrawColor(...COLORS.tan); doc.setLineWidth(0.12); doc.setLineDashPattern([1, 2], 0);
        doc.line(0, H / 2, 2 * colW, H / 2); doc.setLineDashPattern([], 0);
      }
      set(doc, mono(), 'normal', 3.6, COLORS.gold);
      text(doc, '- - -  FOLD AT 110MM', 2 * colW + 2, H / 2 - 4, null, 0.3);
      text(doc, '· · ·  CUT AT 220MM', 2 * colW + 2, H / 2, null, 0.3);
      if (label) text(doc, label.toUpperCase(), 2 * colW + 2, H / 2 + 4, null, 0.3);
    }
    if (opts.title) { set(doc, serif(), 'italic', 5, COLORS.muted); doc.text(opts.title, W / 2, H - 3, { align: 'center' }); }
  }

  // ── Cover (front face on the middle 110mm column) ───────────────────────────
  // opts: { kicker, title, subtitle, blank, accentColor }  — `title` may be the reader's own title.
  function cover(doc, opts) {
    const W = 297, H = 210, colW = 110, m = 8;
    const fx = colW + m, fy = m, fw = colW - m * 2, fh = H - m * 2;
    const accent = opts.accentColor || COLORS.rust;
    // dark spine strip with vertical wordmark
    const sw = 9;
    doc.setFillColor(...COLORS.ink); doc.rect(fx, fy, sw, fh, 'F');
    set(doc, serif(), 'bold', 6.5, [212, 168, 67]);
    const wm = 'THE INSERT STUDIO', cs = 1.2;
    const wmW = doc.getTextWidth(wm) + cs * 0.3528 * (wm.length - 1);   // charSpace is in pt
    // rotated text starts at its bottom-left: x is the baseline, y is where the text begins
    doc.text(wm, fx + sw / 2 + 1.1, fy + fh / 2 + wmW / 2, { angle: 90, charSpace: cs });
    // double frame around the face
    doc.setDrawColor(...COLORS.ink); doc.setLineWidth(0.6); doc.rect(fx, fy, fw, fh);
    doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.25); doc.rect(fx + sw + 3, fy + 3, fw - sw - 6, fh - 6);
    const ix = fx + sw + 3, iw = fw - sw - 6, cx = ix + iw / 2;
    for (const [ox, oy, sx, sy] of [[ix, fy + 3, 1, 1], [ix + iw, fy + 3, -1, 1], [ix, fy + fh - 3, 1, -1], [ix + iw, fy + fh - 3, -1, -1]]) {
      doc.setDrawColor(...accent); doc.setLineWidth(0.5);
      doc.line(ox, oy, ox + sx * 5, oy); doc.line(ox, oy, ox, oy + sy * 5);
    }
    // ornament + kicker
    set(doc, mono(), 'normal', 5, COLORS.gold);
    doc.setFillColor(...COLORS.gold);
    const ky = fy + 30;
    star(doc, cx, ky - 9, 1.8);
    text(doc, (opts.kicker || '').toUpperCase(), cx, ky, { align: 'center' }, 1);
    // title (wraps), Playfair
    const title = opts.title || '';
    set(doc, serif(), 'bold', title.length > 18 ? 17 : 22, COLORS.ink);
    const lines = doc.splitTextToSize(title, iw - 14);
    const lh = (title.length > 18 ? 17 : 22) * 0.4;
    let ty = fy + fh * 0.4;
    lines.slice(0, 4).forEach((ln) => { doc.text(ln, cx, ty, { align: 'center' }); ty += lh; });
    // rules + subtitle
    doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.line(cx - 18, ty, cx + 18, ty);
    doc.setDrawColor(...COLORS.gold); doc.setLineWidth(0.15); doc.line(cx - 18, ty + 1.6, cx + 18, ty + 1.6);
    if (opts.subtitle) { set(doc, serif(), 'italic', 8, accent); doc.text(opts.subtitle, cx, ty + 8, { align: 'center' }); }
    if (opts.blank) {      // writing lines for a reader's own title
      doc.setDrawColor(...COLORS.rule); doc.setLineWidth(0.2);
      for (let i = -1; i <= 1; i++) doc.line(ix + 12, fy + fh * 0.7 + i * 8, ix + iw - 12, fy + fh * 0.7 + i * 8);
    }
    set(doc, mono(), 'normal', 3.6, COLORS.muted);
    text(doc, 'THE INSERT STUDIO', cx, fy + fh - 9, { align: 'center' }, 0.8);
  }

  return {
    COLORS, preload, register, serif, mono, family, set, text,
    star, ornament, starTitle, boxes,
    header, footer, FOOTER_H, marks, cover
  };
})();
