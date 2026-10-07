// Renders the shared top bar. Usage: <nav class="topbar" data-tool="sudoku"></nav>
// Embed mode (?embed): the notebook builder shows a tool's settings inside its own page.
// Chrome (top bar, header, generate button) is hidden by CSS; the builder drives generation.
(function () {
  if (!/[?&]embed\b/.test(location.search)) return;
  document.documentElement.classList.add('embed');
  function tidy() {
    // the builder owns notebook size, cover and printing, so hide those controls here
    var none = document.querySelector('input[name="cover"][value="none"]');
    if (none) { none.checked = true; var g = none.closest('.radio-group'); if (g) g.style.display = 'none'; }
    document.querySelectorAll('input[name="size"], input[name="nbsize"]').forEach(function (i) { var s = i.closest('.section'); if (s) s.style.display = 'none'; });
    var d = document.getElementById('duplexBanner'); if (d) { var s2 = d.closest('.section'); if (s2) s2.style.display = 'none'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tidy); else tidy();
})();

(function () {
  // collapsible settings sections
  document.querySelectorAll('.settings-panel .section > .section-title').forEach(function (h) {
    h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.setAttribute('aria-expanded', 'true');
    function flip() { var c = h.parentNode.classList.toggle('collapsed'); h.setAttribute('aria-expanded', String(!c)); }
    h.addEventListener('click', flip);
    h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  });
  var TOOLS = [
    ['sudoku', 'Sudoku'], ['wordsearch', 'Word Search'], ['wandering-library', 'Wandering Library'],
    ['habit', 'Habit'], ['dnd', 'D&D'], ['calligraphy', 'Calligraphy'], ['nonogram', 'Nonogram'], ['numberfill', 'Number Fill-In']
  ];
  var nav = document.querySelector('nav.topbar');
  if (!nav) return;
  var cur = nav.getAttribute('data-tool');
  var links = TOOLS.map(function (t) {
    return '<a href="../' + t[0] + '/"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + t[1].replace('&', '&amp;') + '</a>';
  }).join('');
  var idx = TOOLS.findIndex(function (x) { return x[0] === cur; });
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'], WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
  var spine = document.createElement('div');
  spine.className = 'spine';
  spine.innerHTML = '<div class="spine-title">The Insert Studio</div><div class="spine-rule"></div><div class="spine-num">' + (idx >= 0 ? ROMAN[idx] : '') + '</div>';
  document.body.appendChild(spine);
  var logo = document.querySelector('header .logo');
  if (logo && idx >= 0) {
    var header = logo.closest('header');
    var box = logo.parentNode === header ? document.createElement('div') : logo.parentNode;
    if (box !== logo.parentNode) { header.insertBefore(box, logo); box.appendChild(logo); }
    box.classList.add('header-titles');
    var eb = document.createElement('div');
    eb.className = 'chapter-eyebrow';
    eb.textContent = 'Chapter ' + WORDS[idx];
    box.insertBefore(eb, box.firstChild);
  }
  var current = TOOLS.filter(function (x) { return x[0] === cur; })[0];
  nav.innerHTML = '<a href="../">← The Insert Studio</a><div class="topbar-tools">' + links + '<a class="topbar-nb" href="../notebook/">★ Build a notebook</a></div>' +
    '<button class="topbar-menu" type="button" aria-expanded="false" aria-controls="toolDrawer">' + (current ? current[1].replace('&', '&amp;') : 'Tools') + '</button>';
  var drawer = document.createElement('div');
  drawer.className = 'topbar-drawer'; drawer.id = 'toolDrawer';
  drawer.innerHTML = '<a href="../">← All tools</a>' + links + '<a class="topbar-nb" href="../notebook/">★ Build a notebook</a>';
  document.body.appendChild(drawer);
  var btn = nav.querySelector('.topbar-menu');
  btn.addEventListener('click', function () {
    var open = drawer.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { drawer.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });

  // Tap the preview on a phone to open it large, scrollable and pinch-zoomable.
  var sheet = document.querySelector('.preview-sheet');
  if (sheet) sheet.addEventListener('click', function () {
    if (window.innerWidth > 900) return;
    var canvas = sheet.querySelector('canvas'); if (!canvas) return;
    var box = document.createElement('div'); box.className = 'lightbox';
    box.innerHTML = '<div class="lightbox-bar"><span>Preview · scroll or pinch</span><button type="button">Close</button></div><div class="lightbox-scroll"><img alt="Large preview"></div>';
    // re-render the preview at 4x so the zoomed image stays sharp, then put the normal one back
    var dpr = window.devicePixelRatio, big = false;
    if (typeof window.updatePreview === 'function') {
      try { Object.defineProperty(window, 'devicePixelRatio', { value: 4, configurable: true }); window.updatePreview(); big = true; } catch (e) {}
    }
    box.querySelector('img').src = sheet.querySelector('canvas').toDataURL('image/png');
    if (big) { Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true }); window.updatePreview(); }
    function close() { box.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    box.querySelector('button').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  });
})();

// Load the "What is this?" intro (styles + engine) on tool pages.
(function () {
  if (!document.querySelector('nav.topbar')) return;
  var base = (document.currentScript && document.currentScript.src || '').replace(/studio\.js.*$/, '');
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = base + 'intro.css'; document.head.appendChild(css);
  var js = document.createElement('script'); js.src = base + 'intro.js'; document.head.appendChild(js);
})();
