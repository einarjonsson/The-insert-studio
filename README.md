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
| Number Fill-In | `numberfill/` |

## Structure

- `index.html` — the hub / "book" cover and chapters
- `assets/tokens.css` — shared palette, reset and paper grain (used by the hub and every tool)
- `assets/studio.css` — tool-page layout and components: spine, header, scrolling settings/preview columns, forms, preview sheet, modal
- `assets/studio.js` — renders the shared top bar with links between tools
- `assets/pdf-kit.js` — shared PDF styling: embedded brand fonts (`assets/fonts/`), panel header/footer, fold & cut marks, covers
- `assets/jspdf.umd.min.js` — jsPDF 2.5.1, vendored so PDF export works without a CDN
- `<tool>/index.html` — only the tool-specific CSS and logic

Open `index.html` directly or serve the folder with any static server (e.g. GitHub Pages).
