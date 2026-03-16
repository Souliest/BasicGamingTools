# BasicGamingTools

BasicGamingTools is a collection of lightweight, browser-based utilities designed to support structured progression
systems, stat tracking, and simple game-adjacent tooling.

Each tool is standalone, fully client-side, and requires no installation or backend.

---

## Philosophy

The goal of this repository is to provide:

- Simple, focused tools
- Clear logic and maintainable structure
- No unnecessary dependencies
- Fast, accessible browser-based usage

These projects prioritize clarity and practicality over complexity.

---

## Tools Included

### XpTracker

Track experience points and monitor progression toward defined XP goals.

### LevelGoalTracker

Track progress from a current level to a target level with real-time updates and local persistence.

### ThingCounter

Track arbitrary counters — kills, collectibles, resources, or anything else — organised into a named tree structure,
grouped by game. Supports bounded and open-ended counters, decrement mode, configurable step sizes, and per-counter
colors.

---

## Technical Overview

All tools in this repository:

- Run entirely in the browser
- Use vanilla HTML, CSS, and JavaScript (ES modules)
- Store data locally using `localStorage`
- Require no build tools or frameworks

Each project is self-contained within its own directory.

---

## Usage

You can:

- Open any tool locally by loading its `index.html` file in a browser
- Host individual tools via GitHub Pages
- Deploy them to any static hosting provider

No configuration is required.

---

## Project Structure

```
BasicGamingTools/
│
├── XpTracker/
│   ├── index.html
│   ├── styles.css
│   ├── js/
│   │   ├── main.js
│   │   ├── storage.js
│   │   ├── stats.js
│   │   ├── charts.js
│   │   └── render.js
│   └── README.md
│
├── LevelGoalTracker/
│   ├── index.html
│   ├── styles.css
│   ├── js/
│   │   ├── main.js
│   │   ├── storage.js
│   │   ├── dates.js
│   │   ├── snapshot.js
│   │   ├── stats.js
│   │   ├── render.js
│   │   └── modal.js
│   └── README.md
│
├── ThingCounter/
│   ├── index.html
│   ├── styles.css
│   ├── js/
│   │   ├── main.js
│   │   ├── storage.js
│   │   ├── swatches.js
│   │   ├── nodes.js
│   │   ├── render.js
│   │   ├── focus.js
│   │   └── modal.js
│   └── README.md
│
└── README.md
```

---

## Future Expansion

Additional focused tools may be added over time following the same design principles.

---

## License

Free to use and modify.