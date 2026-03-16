# ⚡ XP Tracker

A lightweight, browser-based XP tracking tool.

## What It Does

XP Tracker lets you:

- Log individual XP gains manually
- Track total XP and average per gain
- Visualize XP per entry with moving averages (5 and 10)
- See cumulative XP over time
- Estimate XP rates per minute, 15 minutes, and hour
- Review a timestamped entry log

It is designed as a lightweight, general-purpose XP tracker to help approximate gains over blocks of time during
grinding sessions, study sessions, workouts, or anything else that "earns XP."

## Features

- No backend
- No dependencies
- Data saved locally via `localStorage`
- Light/Dark theme toggle
- Fully client-side
- Works offline

## How To Use

1. Open `index.html` in a browser.
2. Enter an XP value.
3. Press **Enter** or click **Enter**.
4. Watch the charts update.

That's it.

## Project Structure

```
XpTracker/
│
├── index.html
├── styles.css
├── js/
│   ├── main.js       # Entry point: state, event wiring, globals, init
│   ├── storage.js    # localStorage keys, loadData, saveData
│   ├── stats.js      # Pure helpers: fmt(), movingAvg()
│   ├── charts.js     # Canvas chart drawing: gain chart and time chart
│   └── render.js     # DOM update functions: stats, chips, log, estimates
└── README.md
```

## Deployment

This project can be hosted on any static hosting platform, including:

- GitHub Pages
- Other static hosting providers

It can also be run locally without any setup.

## Tech Notes

- Vanilla HTML, CSS, and JavaScript (ES modules)
- Custom canvas-based charts (no chart libraries)
- Session-based time tracking
- Moving average calculations for smoothing

## Credits

This project was built with assistance from Claude for development support and refinement.

---

Built for simplicity.
Track the grind.