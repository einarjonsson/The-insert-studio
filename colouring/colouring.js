// Colouring page engine: draws a picture as plain outline ops that colouring/index.html paints into
// both the jsPDF document and the live preview canvas. One picture fills one 110 x 105 mm notebook panel.
//
//   ColourPage.sequence(subjects, n)                -> n subjects, mixed and not repeating back to back
//   ColourPage.generate({ subject, detail, thick }) -> [{ t:'poly', pts, w, fill, stroke, closed }]
//
// Pictures are drawn on a VW x VH canvas (two units per mm of the panel's 98 x 78 mm drawing area);
// ColourPage.place() maps that onto a panel.
// Shapes are drawn back to front, each filled white, so the shapes in front hide the lines behind
// them. All randomness goes through Seed.random() so a seed reproduces the same pages.
window.ColourPage = (function () {
  const TAU = Math.PI * 2, VW = 196, VH = 156, FLOOR = 150;
  const SUBJECTS = { flower: 'Flower', butterfly: 'Butterfly', fish: 'Fish', rainbow: 'Rainbow', mandala: 'Mandala' };

  const ri = (lo, hi) => lo + Math.floor(Seed.random() * (hi - lo + 1));
  const pick = (arr) => arr[ri(0, arr.length - 1)];

  function sequence(subjects, n) {
    const seq = [];
    while (seq.length < n) {
      const round = subjects.slice();
      for (let i = round.length - 1; i > 0; i--) { const j = ri(0, i); [round[i], round[j]] = [round[j], round[i]]; }
      if (seq.length && round.length > 1 && round[0] === seq[seq.length - 1]) round.push(round.shift());
      seq.push(...round);
    }
    return seq.slice(0, n);
  }

  // ── Geometry ─────────────────────────────────────────────────────────────────
  function ell(cx, cy, rx, ry, rot, n) {
    rot = rot || 0; n = n || 56;
    const c = Math.cos(rot), s = Math.sin(rot), pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * TAU, x = rx * Math.cos(t), y = ry * Math.sin(t);
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return pts;
  }
  const circ = (cx, cy, r) => ell(cx, cy, r, r, 0, 40);
  function arc(cx, cy, rx, ry, a0, a1, n) {
    n = n || 40;
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return pts;
  }
  function star(cx, cy, R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; pts.push([cx + d * Math.cos(a), cy + d * Math.sin(a)]); }
    return pts;
  }
  // A wavy ribbon rising from (x0, y0) up to y1 (used for stems and seaweed).
  function band(x0, y0, y1, half, amp) {
    const L = [], R = [], xAt = (y) => x0 + amp * Math.sin((y0 - y) / (y0 - y1) * Math.PI * 1.5);
    for (let i = 0; i <= 24; i++) { const y = y0 + (y1 - y0) * i / 24, x = xAt(y); L.push([x - half, y]); R.push([x + half, y]); }
    return { pts: L.concat(R.reverse()), xAt };
  }

  function build(subject, detail, thick) {
    const o = [], W = thick ? 2.2 : 1.2, W2 = W * 0.7;      // line widths in canvas units (0.5 mm each)
    const level = { simple: 0, medium: 1, detailed: 2 }[detail] || 0;
    // Each subject is authored on its own grid, then mapped onto the canvas with tf (scenery uses the canvas directly).
    const IDENT = (p) => p;
    let tf = IDENT;
    const fit = (k, ax, ay, bx, by) => (p) => [bx + (p[0] - ax) * k, by + (p[1] - ay) * k];
    const poly = (pts, opt) => o.push(Object.assign({ t: 'poly', pts: pts.map(tf), w: W, fill: true, stroke: true, closed: true }, opt));
    const line = (pts, w) => poly(pts, { w: w || W2, fill: false, closed: false });

    // Clouds are a few circles: outline them all, then hide the outlines that run inside the cloud.
    function cloud(cx, cy, w) {
      const cs = [[-0.3, 0.04, 0.22], [0, -0.1, 0.28], [0.3, 0.02, 0.22]].map(([dx, dy, r]) => [cx + dx * w, cy + dy * w, r * w]);
      cs.forEach(([x, y, r]) => poly(circ(x, y, r)));
      cs.forEach(([x, y, r]) => poly(circ(x, y, r - W / 2 - 0.05), { stroke: false }));
    }
    function sun(cx, cy, r) {
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; line([[cx + r * 1.35 * Math.cos(a), cy + r * 1.35 * Math.sin(a)], [cx + r * 1.85 * Math.cos(a), cy + r * 1.85 * Math.sin(a)]], W); }
      poly(circ(cx, cy, r));
    }
    function grass(y) {
      const pts = [];
      for (let x = 2; x < VW - 2; x += 8) pts.push([x, y], [x + 4, y - 4 - Seed.random() * 5]);
      pts.push([VW - 2, y]);
      line(pts, W);
    }
    // A flower head: petals around a centre, with optional veins and seed dots.
    function head(cx, cy, R, n, plain) {
      const lv = plain ? 0 : level;
      const ry = Math.min(0.36 * R, 0.6 * R * Math.sin(Math.PI / n) * 1.1);
      for (let k = 0; k < n; k++) {
        const a = k * TAU / n - Math.PI / 2;
        poly(ell(cx + Math.cos(a) * 0.6 * R, cy + Math.sin(a) * 0.6 * R, 0.4 * R, ry, a));
      }
      for (let k = 0; k < n && lv > 0; k++) {
        const a = k * TAU / n - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
        const at = (d, off) => [cx + ca * d * R - sa * off, cy + sa * d * R + ca * off];
        line([at(0.4, 0), at(0.85, 0)]);
        if (lv > 1) { line([at(0.5, ry * 0.4), at(0.78, ry * 0.4)]); line([at(0.5, -ry * 0.4), at(0.78, -ry * 0.4)]); }
      }
      poly(circ(cx, cy, 0.3 * R));
      if (lv > 0) poly(circ(cx, cy, 0.17 * R), { w: W2 });
      if (lv > 1) for (let k = 0; k < 6; k++) { const a = k * TAU / 6; poly(circ(cx + Math.cos(a) * 0.23 * R, cy + Math.sin(a) * 0.23 * R, 0.04 * R + 0.2), { w: W2 }); }
    }
    function smallFlower(x, y, R, n) {
      poly(band(x, FLOOR, y, 1.6, 2.5).pts);
      head(x, y, R, n, true);
    }
    function meadow() {
      if (level < 1) return;
      grass(FLOOR); cloud(170, 30, 42); sun(24, 26, 10);
      if (level > 1) { smallFlower(26, 112, 14, 5); smallFlower(172, 118, 12, 6); }
    }

    if (subject === 'flower') {
      meadow();
      tf = fit(0.62, 105, 40, 98, 6);                  // authored on a 182 x 248 grid
      const cy = 120, st = band(105, 272, cy, 3.6, 12);
      [[-1, 218, 0.45], [1, 238, -0.45]].forEach(([s, y, rot]) => {
        const lx = st.xAt(y) + s * 26;
        poly(ell(lx, y, 27, 11, rot));
        if (level > 0) line([[lx - 22 * Math.cos(rot), y - 22 * Math.sin(rot)], [lx + 22 * Math.cos(rot), y + 22 * Math.sin(rot)]]);
      });
      poly(st.pts);
      head(105, cy, 78, ri(5, 8));
    } else if (subject === 'butterfly') {
      meadow();
      tf = fit(0.6, 105, 140, 98, 76);
      const cy = 140, rad = Math.PI / 180;
      const wing = (s, dx, dy, rx, ry, rot, spot, spotR) => {
        poly(ell(105 + s * dx, cy + dy, rx, ry, rot));
        if (level > 0) poly(circ(105 + s * spot[0], cy + spot[1], spotR), { w: W2 });
        if (level > 1) poly(ell(105 + s * dx, cy + dy, rx * 0.62, ry * 0.6, rot), { w: W2, fill: false });
      };
      [-1, 1].forEach(s => wing(s, 30, 32, 34, 28, s * 35 * rad, [34, 38], 7));
      [-1, 1].forEach(s => wing(s, 44, -30, 46, 36, -s * 30 * rad, [52, -34], 9));
      poly(ell(105, cy, 6.5, 48));
      poly(circ(105, cy - 54, 8));
      [-1, 1].forEach(s => {
        const pts = [];
        for (let i = 0; i <= 12; i++) {                       // antenna: a curve out from the head
          const t = i / 12, u = 1 - t;
          pts.push([105 + s * (u * u * 3 + 2 * u * t * 8 + t * t * 26), u * u * (cy - 60) + 2 * u * t * (cy - 98) + t * t * (cy - 94)]);
        }
        line(pts);
        poly(circ(105 + s * 26, cy - 94, 3), { w: W2 });
      });
    } else if (subject === 'fish') {
      if (level > 0) {
        [[174, 60, 4], [182, 44, 6], [172, 28, 4]].forEach(([x, y, r]) => poly(circ(x, y, r), { w: W2 }));
        poly(band(14, 156, 100, 3, 5).pts); poly(band(184, 156, 108, 3, -5).pts);
      }
      const fishAt = (cx, cy, k, flip, full) => {
        const T = (pts) => pts.map(([x, y]) => [cx + flip * x * k, cy + y * k]);
        poly(T([[-56, 0], [-84, -14], [-98, -38], [-88, -6], [-88, 6], [-98, 38], [-84, 14]]));
        poly(T([[-14, -40], [6, -64], [36, -62], [40, -34]]));
        poly(T([[-4, 38], [8, 58], [28, 40]]));
        poly(T(ell(0, 0, 68, 44, 0, 64)));
        line(T(arc(14, 0, 34, 34, -0.9, 0.9, 12)));
        poly(T(circ(44, -10, 8))); poly(T(circ(46, -10, 3.5)), { w: W2 });
        line(T([[66, 4], [57, 10]]));
        if (full && level === 1) [-34, -14].forEach(xs => {
          const h = 44 * Math.sqrt(1 - (xs / 68) ** 2) - 3, pts = [];
          for (let i = 0; i <= 12; i++) pts.push([xs + 7 * Math.sin(Math.PI * i / 12), -h + 2 * h * i / 12]);
          line(T(pts));
        });
        if (full && level > 1) for (let gx = -50, row = 0; gx <= 14; gx += 13, row++) for (let gy = -30 + (row % 2) * 7; gy <= 30; gy += 14) {
          if ((gx / 62) ** 2 + (gy / 38) ** 2 < 0.5) poly(T(circ(gx, gy, 5.5)), { w: W2, fill: false });
        }
      };
      tf = fit(0.78, 98, 140, 98, 68);
      fishAt(112, 140, 1, 1, true);
      tf = IDENT;
      if (level > 1) { fishAt(48, 128, 0.3, -1, false); fishAt(150, 132, 0.26, 1, false); }
    } else if (subject === 'rainbow') {
      const cx = 98, cy = 104;
      [84, 72, 60, 48, 36].forEach(R => poly(arc(cx, cy, R, R, Math.PI, TAU, 48).concat(arc(cx, cy, R - 12, R - 12, TAU, Math.PI, 48))));
      cloud(cx - 56, cy + 2, 66); cloud(cx + 56, cy + 2, 66);
      if (level > 0) {
        sun(176, 22, 9); cloud(30, 26, 36);
        const hill = (x, rx, ry) => poly(arc(x, VH, rx, ry, Math.PI, TAU, 48));
        hill(150, 46, 30); hill(62, 60, 40);
        if (level > 1) {
          const surf = (x, hx, rx, ry) => VH - ry * Math.sqrt(1 - ((x - hx) / rx) ** 2);
          [[34, 62, 60, 40], [86, 62, 60, 40], [150, 150, 46, 30]].forEach(([x, hx, rx, ry]) => {
            const y = surf(x, hx, rx, ry);
            line([[x, y - 14], [x, y + 2]], W); head(x, y - 14, 8, 5, true);
          });
          [[16, 70], [182, 70], [126, 12], [70, 10]].forEach(([x, y]) => poly(star(x, y, 6, 2.7), { w: W2 }));
        }
      }
    } else {   // mandala
      tf = fit(0.82, 105, 150, 98, 78);
      const n = pick([8, 10, 12, 16]), cx = 105, cy = 150;
      const ring = (r0, r1, off, wf) => {
        const ry = (r0 + r1) / 2 * Math.sin(Math.PI / n) * wf;
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + off, m = (r0 + r1) / 2;
          poly(ell(cx + Math.cos(a) * m, cy + Math.sin(a) * m, (r1 - r0) / 2, ry, a));
          if (level > 1) { const ca = Math.cos(a), sa = Math.sin(a); line([[cx + ca * (r0 + 0.25 * (r1 - r0)), cy + sa * (r0 + 0.25 * (r1 - r0))], [cx + ca * (r1 - 0.15 * (r1 - r0)), cy + sa * (r1 - 0.15 * (r1 - r0))]]); }
        }
      };
      if (level > 1) for (let k = 0; k < n * 2; k++) { const a = k * TAU / (n * 2); poly(circ(cx + Math.cos(a) * 91, cy + Math.sin(a) * 91, 2.6 / 0.82), { w: W2 }); }
      ring(56, 86, 0, 1.0);
      ring(36, 62, Math.PI / n, 1.0);
      if (level > 0) ring(18, 42, 0, 0.95);
      poly(circ(cx, cy, level > 0 ? 17 : 24));
      poly(circ(cx, cy, level > 0 ? 8 : 12), { w: W2 });
    }
    return o;
  }

  // Map canvas points onto a panel: the drawing area is 98 x 78 mm, starting `top` mm below the panel's top edge.
  function place(ops, ox, oy, top) {
    const k = 0.5, x0 = ox + 6, y0 = oy + top;
    return ops.map(o => Object.assign({}, o, { pts: o.pts.map(p => [x0 + p[0] * k, y0 + p[1] * k]), w: o.w * k }));
  }

  return {
    SUBJECTS, sequence, place,
    generate: ({ subject, detail, thick }) => build(subject, detail, thick)
  };
})();
