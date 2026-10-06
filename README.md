# The Insert Studio

Printable Traveler's Notebook insert generators, all in one static site (no build step).

| Tool | Path |
|---|---|
| Sudoku | `sudoku/` |
| Word Search | `wordsearch/` |
| The Wandering Library | `wandering-library/` |
| Habit Tracker | `habit/` |
| D&D Inserts | `dnd/` |
| Calligraphy Practice | `calligraphy/` |
| Nonogram | `nonogram/` |

## Structure

- `index.html` — the hub / "book" cover and chapters
- `assets/studio.css` — shared palette, top bar, header, two-column layout, forms, preview and modal styles
- `assets/studio.js` — renders the shared top bar with links between tools
- `assets/jspdf.umd.min.js` — jsPDF 2.5.1, vendored so PDF export works without a CDN
- `<tool>/index.html` — only the tool-specific CSS and logic

Open `index.html` directly or serve the folder with any static server (e.g. GitHub Pages).
