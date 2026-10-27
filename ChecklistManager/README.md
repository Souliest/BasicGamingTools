# Checklist Manager

A lightweight, browser-based hierarchical checklist. Items nest to any depth, each item is either a plain checkbox or
a counter with a target, and a parent ticks itself when everything inside it is done.

This project is fully client-side and requires no installation, backend, or external dependencies. Data is stored
locally in the browser and can optionally sync across devices when signed in.

---

## Overview

Checklist Manager allows you to:

- Build a tree of items, nested as deep as you like
- Count things: any item can have a target ("Eggs x3") and ticks itself when the count is reached
- Give any item a short subtitle ("Pool — Win")
- Bulk-create a whole tree by pasting an indented outline
- Reset everything, or just one branch, and run the list again

A **project** is one checklist (a game, a run, a guide). It is the equivalent of a "game" in other BasicGamingTools
tools.

---

## Concepts

**Leaf** — an item with no children. A leaf has a target (default 1) and a current value. It is ticked when the value
reaches the target. A target of 1 renders as a plain checkbox; a higher target renders as `− 2/5 +`.

**Parent** — an item with children. It stores no tick state of its own: it is ticked when every child is ticked, and
shows `done/total` of its **direct** children. A parent's checkbox ticks or unticks everything inside it.

**Subtitle** — an optional single line shown under an item's title in a smaller font.

---

## Entering Items

Type in the add field and press Enter. The same syntax works in the add field and in the paste-outline box:

| You type                | You get                                    |
|-------------------------|--------------------------------------------|
| `Eggs`                  | A plain checkbox                           |
| `Eggs x3`               | A counter with target 3                    |
| `Pool — Win`            | A checkbox titled "Pool" with subtitle "Win" |
| `Pool — Win x3`         | A counter with a subtitle                  |
| `- [x] Eggs`            | A markdown task, pre-ticked (paste only is typical) |

The subtitle follows the first em-dash (—). The counter suffix always goes last. Hyphens are ordinary characters, so
names like "Cage-Fighting" are safe.

**Paste outline** (📋): one item per line, indented to nest (tabs or spaces, any consistent amount). Pasted items are
appended to the end of the project's top level. Pasting the same text twice creates two copies; nothing is merged.

---

## Features

- Hierarchical items with arbitrary nesting
- Counters with a target; ticks automatically when reached
- Derived parent state and `done/total` counts
- Optional subtitle per item
- Paste an indented outline to create a whole tree at once
- Edit mode: reorder (▲▼), rename and re-target (✎), add sub-items (+), delete (🗑)
- Expand/collapse with depth-based defaults: top level expanded, everything deeper collapsed; collapsing a branch
  collapses everything inside it. Expand state is remembered per device
- Reset a branch (↺ on the parent) or the whole project (two taps)
- Local storage persistence (works offline)
- Optional cross-device sync via Supabase when signed in
- Collision detection: if local and cloud data diverge, a prompt lets you choose which to keep
- No frameworks or build tools

---

## Project Structure

ChecklistManager/
│
├── index.html
├── styles.css
├── js/
│ ├── main.js # Entry point: state, selector, tree interactions, globals, init
│ ├── storage.js # Hybrid storage, plus per-device tree-state helpers
│ ├── nodes.js # Pure helpers: tree lookup/mutation, tick derivation, parsing, expand state
│ ├── render.js # Toolbar, tree, rows, inline editor and add fields
│ ├── modal-project.js # Create/rename/delete project modal
│ ├── modal-import.js # Paste-outline modal
│ └── modal.js # Barrel: re-exports from both modal files
└── README.md


---

## Storage

Project data is stored locally in `localStorage` under `bgt:clm:v2`. When signed in, each project is also persisted as
an individual row in Supabase (`bgt_clm_projects`). Changes write to localStorage immediately; Supabase is updated in
the background after a 2-second debounce.

A project blob is `{ id, name, nodes, last_modified }`. A leaf node is `{ id, name, desc?, target, value }`; a parent is
`{ id, name, desc?, children }`.

Expand/collapse state is stored separately under `bgt:clm:tree-state` as
`{ [projectId]: { [nodeId]: boolean } }`. It is per device and never synced.

Projects saved by the earlier item/step version are converted automatically the first time they are opened: items
become nodes, steps become children, and executed steps become ticked. Descriptions, tags, resources and batch counts
are dropped.

---

## Customization

You can modify:

- Layout in `index.html`
- Styling in `styles.css`
- Logic in the `js/` modules

No build process is required.

---

## License

Free to use and modify.