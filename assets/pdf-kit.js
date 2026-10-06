// Small drawing helpers shared by the PDF generators.
// jsPDF's built-in fonts only cover Latin-1, so decorative glyphs such as ✦ or □
// print as garbage ("'&"). Draw those as vector shapes instead.
window.PDFKit = (function () {
  // Four-point star centred on (cx, cy) with radius r, filled with the current fill colour.
  function star(doc, cx, cy, r) {
    var k = 0.3 * r;
    var pts = [[0, -r], [k, -k], [r, 0], [k, k], [0, r], [-k, k], [-r, 0], [-k, -k]];
    var segs = [];
    for (var i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    doc.lines(segs, cx + pts[0][0], cy + pts[0][1], [1, 1], 'F', true);
  }
  // "✦ · ✦" ornament, drawn in the current text colour.
  function ornament(doc, cx, cy, r) {
    r = r || 1.6;
    doc.setFillColor(doc.getTextColor());
    star(doc, cx - r * 3.2, cy, r);
    doc.circle(cx, cy, r * 0.22, 'F');
    star(doc, cx + r * 3.2, cy, r);
  }
  // Centred title with a star to its left, in the current font and text colour.
  function starTitle(doc, text, cx, y, r) {
    r = r || 1.5;
    var w = doc.getTextWidth(text), gap = r * 2.2, total = w + gap + r * 2;
    var x0 = cx - total / 2;
    doc.setFillColor(doc.getTextColor());
    star(doc, x0 + r, y - r * 0.95, r);
    doc.text(text, x0 + r * 2 + gap, y);
  }
  // Row of n empty checkboxes starting at x, centred on cy.
  function boxes(doc, x, cy, n, size, gap) {
    for (var i = 0; i < n; i++) doc.rect(x + i * (size + gap), cy - size / 2, size, size);
    return x + n * (size + gap) - gap;
  }
  return { star: star, ornament: ornament, starTitle: starTitle, boxes: boxes };
})();
