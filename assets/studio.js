// Renders the shared top bar. Usage: <nav class="topbar" data-tool="sudoku"></nav>
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
  nav.innerHTML = '<a href="../">← The Insert Studio</a><div class="topbar-tools">' + links + '</div>';
})();
