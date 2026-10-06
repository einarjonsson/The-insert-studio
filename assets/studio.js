// Renders the shared top bar. Usage: <nav class="topbar" data-tool="sudoku"></nav>
(function () {
  var TOOLS = [
    ['sudoku', 'Sudoku'], ['wordsearch', 'Word Search'], ['wandering-library', 'Wandering Library'],
    ['habit', 'Habit'], ['dnd', 'D&D'], ['calligraphy', 'Calligraphy'], ['nonogram', 'Nonogram']
  ];
  var nav = document.querySelector('nav.topbar');
  if (!nav) return;
  var cur = nav.getAttribute('data-tool');
  var links = TOOLS.map(function (t) {
    return '<a href="../' + t[0] + '/"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + t[1].replace('&', '&amp;') + '</a>';
  }).join('');
  nav.innerHTML = '<a href="../">← The Insert Studio</a><div class="topbar-tools">' + links + '</div>';
})();
