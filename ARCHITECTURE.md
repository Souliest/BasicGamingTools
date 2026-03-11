# BasicGamingTools — Architecture Reference

This document captures the conventions, patterns, and decisions used across all tools.
Paste it at the start of a new session to orient quickly.

---

## Repository Structure

```
BasicGamingTools/
├── index.html                  # Root tool index — dynamically built from tools.js
├── ARCHITECTURE.md             # This file
├── common/
│   ├── tools.js                # TOOLS array — the single source of truth for the index
│   ├── theme.js                # initTheme(), toggleTheme() — shared across all tools
│   ├── theme.css               # CSS variables, dark/light themes
│   ├── header.js               # initHeader(title) — injects shared header into every tool
│   └── header.css              # .tool-header styles
└── ToolName/
    ├── index.html
    ├── styles.css
    └── script.js
```

---

## Adding a New Tool

1. Create a `ToolName/` folder with `index.html`, `styles.css`, `script.js`
2. Add one entry to `common/tools.js` — the root index updates automatically
3. Follow the script load order and storage key conventions below

---

## Script Load Order (every tool page)

```html
<script src="../common/theme.js"></script>
<script src="../common/header.js"></script>
<script>
  initHeader('Tool Title');
  initTheme(optionalCallback); <!-- pass a redraw function if the tool has canvas charts -->
</script>
<script src="script.js"></script>
```

`initHeader` must be called before `initTheme` so the theme toggle button exists in the DOM when `initTheme` looks for it.

---

## common/tools.js

Exports a `TOOLS` array. Each entry:

```js
{ name: 'Display Name', path: './ToolFolder/', description: 'One line description.' }
```

The root `index.html` maps over this array to render the tool cards. No edits to `index.html` needed when adding tools. Keep entries in alphabetical order by name.

---

## common/theme.js

- `initTheme(onToggle?)` — reads `bgt:theme` from localStorage, applies `.light` class to `<body>` if set, syncs the toggle button icon. `onToggle` is an optional callback (e.g. to redraw canvas charts after a theme switch).
- `toggleTheme()` — flips `.light` on `<body>`, writes to `bgt:theme`, calls `onToggle` if set.
- Default theme is **dark**. Light mode adds the `.light` class.

---

## common/header.js

- `initHeader(title)` — injects a `<header class="tool-header">` as the first child of `<body>`.
- Header contains: back link (← on mobile, ← Tools on ≥400px), centered `<h1>`, theme toggle button.
- Called identically in every tool — there are no per-tool variations.

---

## localStorage Keys

All keys follow the pattern `bgt:tool-name:descriptor`. Namespace prefix `bgt` prevents collisions with other projects sharing the same origin (`souliest.github.io`).

| Key | Tool | Contents |
|---|---|---|
| `bgt:theme` | global | `'light'` or `'dark'` (absent = dark) |
| `bgt:xp-tracker:gains` | XpTracker | JSON array of `{ xp, ts }` objects |
| `bgt:xp-tracker:start` | XpTracker | Session start timestamp as string |
| `bgt:level-goal-tracker:data` | LevelGoalTracker | JSON `{ games: [...] }` |
| `bgt:level-goal-tracker:selected-game` | LevelGoalTracker | Selected game id string |
| `bgt:thing-counter:data` | ThingCounter | JSON `{ games: [...] }` |
| `bgt:thing-counter:selected-game` | ThingCounter | Selected game id string |

**Rules:**
- Never clobber an existing new-format key when migrating or defaulting
- Always use named constants for keys in `script.js` (e.g. `const STORAGE_KEY = 'bgt:...'`) — no inline string literals

---

## CSS Conventions

Theme variables are defined in `common/theme.css` and available everywhere.

Key variables:
```css
--bg          /* page background */
--panel       /* card / panel background */
--border      /* borders and grid lines */
--text        /* primary text */
--muted       /* secondary / label text */
--accent      /* primary accent (cyan: #00e5ff) */
--accent2     /* secondary accent (orange: #ff6b35) */
--input-bg    /* form input background */
--stat-bg     /* stat/label row background */
--glow        /* box-shadow glow using accent color */
```

- Dark mode is the default (no class on `<body>`)
- Light mode applies when `<body>` has the `.light` class
- Fonts: `Orbitron` for headings/values, `Share Tech Mono` for body/UI
- Tool pages use a max-width centered column layout (`max-width: 640px` typical)

---

## HTML Conventions

- All `<label>` elements must have a matching `for="inputId"` attribute pointing to the associated input's `id`. This is required for accessibility and avoids linter warnings.
- Hidden/overlay inputs that are visually replaced by custom display elements (e.g. a `<div>` styled as a value display) should use `aria-label` instead of a visible `<label>`.
- Do not use inline `onclick` attributes in JavaScript-generated HTML (e.g. inside `innerHTML` template strings). Always use `addEventListener` after setting `innerHTML`, or use `data-action` / `data-*` attributes on elements and delegate from a parent listener.

---

## JavaScript Conventions

- Avoid optional chaining (`?.`) on DOM element properties such as `classList` — some linters flag it as unresolved. Use an explicit null check instead: `if (el) el.classList.remove(...)`.
- When multiple functions need the same loaded data, pass it as a parameter rather than calling `loadData()` independently in each — avoids duplicated-code warnings and unnecessary re-parses.
- Node IDs are generated as `'node_' + Date.now() + '_' + Math.floor(Math.random() * 99999)` — collision-safe for single-user local data.
- Game IDs are generated as `'game_' + Date.now()`.

---

## Event Handling Pattern for Dynamically Rendered Nodes

When rendering tree nodes or cards via `innerHTML`, wire all interactions with `addEventListener` rather than inline `onclick`. Use `data-action` attributes to identify button intent:

```js
el.innerHTML = `
    <button data-action="edit">✎</button>
    <button data-action="delete">🗑</button>
`;
el.querySelector('[data-action="edit"]').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(node.id);
});
```

This avoids the "deprecated inline handler" linter warning and keeps node IDs out of HTML attributes.

---

## Popover / Floating UI Pattern

When a click on an element should toggle a popover open, and a `document` click listener is used to close it on outside clicks, the toggle handler **must call `event.stopPropagation()`** to prevent the document listener from immediately closing the popover on the same click that opened it.

```js
// HTML: onclick="togglePopover(event)"
function togglePopover(event) {
    event.stopPropagation();   // ← essential
    const pop = document.getElementById('myPopover');
    pop.classList.toggle('open');
}

document.addEventListener('click', () => {
    const pop = document.getElementById('myPopover');
    if (pop) pop.classList.remove('open');
});
```

---

## Per-Tool Notes

### XpTracker (`/XpTracker/`)
- Tracks XP gains in a session with timestamps
- Canvas-based charts: `gainChart` (bar + moving averages), `timeChart` (cumulative XP over time)
- `initTheme(redrawCharts)` — charts must be redrawn on theme toggle to pick up new CSS variable values
- `window.addEventListener('resize', redrawCharts)` for responsive canvas sizing
- Session resets wipe both storage keys

### LevelGoalTracker (`/LevelGoalTracker/`)
- Tracks levelling progress toward a deadline across multiple games
- Daily snapshot rolls over at midnight: `maybeRollSnapshot(game)` checks `snapshot.date` vs today
- `initTheme()` called with no callback — no canvas
- `setInterval(renderMain, 60000)` — auto-refreshes every minute so daily targets stay current
- Game data is a single JSON blob under `bgt:level-goal-tracker:data`; selected game id is stored separately

### ThingCounter (`/ThingCounter/`)
- Hierarchical counter tracker: counters organised into an arbitrary-depth tree of branches, grouped by game
- **Two UI bars:** a selector bar (game dropdown + ✎ game settings + `+ Game`) and a tree action bar (`+ Branch`, `+ Counter`, ✏️ edit mode toggle) — the tree action bar is only visible when a game is selected
- **Separate Add/Edit modals** for branches and counters — no combined node-type modal
- **Counter types:**
    - `open` — unbounded, value ≥ 0
    - `bounded` — has `min`, `max`, `initial` (reset target). Fill bar shown. `clampValue` uses `Math.max(min, Math.min(max, val))`
- **Decrement counters** (`decrement: true`): dominant button is `−`, fill bar drains left-to-right (bar width = `(value - min) / (max - min) * 100%`). Formula is the same for both increment and decrement — decrement just means the user taps `−` most often
- **Edit mode** (global toggle): reveals `+` / `✎` / `🗑` on branches and `✎` / `×1` / `↺` / `🗑` on counters. Ghost "add counter" buttons appear at the bottom of each branch and the root
- **Single-node edit mode**: double-click or long-press (500ms) any node to activate local edit controls for that node only, without entering global edit mode
- **Focus modal**: tap counter name → large value display, ±1 row, editable step, ±step row, ↺ reset to initial, fill bar (bounded only)
- **Step shown in counter buttons** when step ≠ 1 (e.g. `−5`, `+5`)
- `initialValue(node)` returns `node.initial` if set, otherwise `node.max` for decrement bounded, `node.min` for increment bounded, `0` for open
- Counter card padding: 14px top/bottom
- **Color palette**: 20 named colors covering the full hue wheel (Cherry → Rose). Stored as `{ color: '#hex', name: 'Name' }` objects in a `SWATCHES` array. Default color: Aqua (`#2ED9FF`). The color picker uses a display field (filled circle + name) that opens a floating popover of 20 plain circles on click

---

## Decisions & Rationale

- **One `tools.js` registry** — keeps the index DRY; adding a tool is one line
- **`bgt:` prefix** — `souliest.github.io` is a shared origin; prefixing avoids stomping on other projects' keys
- **Dark-first theming** — `.light` class is additive; absence of the class = dark, which is the default
- **`initHeader` before `initTheme`** — theme toggle button must exist in DOM before `initTheme` queries for it
- **No inline localStorage string literals** — all keys are constants so they're easy to find and change
- **No inline `onclick` in generated HTML** — use `addEventListener` + `data-action` attributes; avoids deprecated-handler warnings and keeps IDs out of markup
- **`stopPropagation` on popover toggles** — document-level close listeners will fire on the same click that opens a popover unless the opener stops bubbling
- **Separate Add and Edit modals per node type** — cleaner UX than a combined modal with a type-switch radio; also avoids the type-change complexity when editing existing nodes
- **`min` field on bounded counters** — makes decrement counters with a non-zero floor (e.g. health that floors at 1) straightforward without special-casing
- **`initial` field separate from `min`/`max`** — reset target is not always the floor or ceiling; storing it explicitly avoids re-deriving it on reset