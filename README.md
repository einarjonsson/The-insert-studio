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
| Build a notebook (mix inserts into one PDF) | `notebook/` |

## Structure

- `index.html` — the hub / "book" cover and chapters
- `assets/tokens.css` — shared palette, reset and paper grain (used by the hub and every tool)
- `assets/studio.css` — tool-page layout and components: spine, header, scrolling settings/preview columns, forms, preview sheet, modal
- `assets/studio.js` — renders the shared top bar with links between tools
- `assets/intro.js`, `assets/intro.css`, `assets/intro/<tool>.js` — the illustrated "What is this?" explainer shown on each tool page (opens on a first visit, then from the header button; `#about` or `?intro` forces it)
- `assets/pdf-lib.min.js` — pdf-lib 1.17.1 (MIT), used by the notebook builder to merge PDFs
- `notebook/` — the notebook builder: each insert runs in a hidden `?embed` frame, its own Generate button is driven and the PDF it makes is captured, then all parts are merged
- `assets/pdf-kit.js` — shared PDF styling: embedded brand fonts (`assets/fonts/`), panel header/footer, fold & cut marks, covers
- `assets/jspdf.umd.min.js` — jsPDF 2.5.1, vendored so PDF export works without a CDN
- `<tool>/index.html` — only the tool-specific CSS and logic

Open `index.html` directly or serve the folder with any static server (e.g. GitHub Pages).
