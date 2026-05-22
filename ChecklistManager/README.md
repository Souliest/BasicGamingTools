# Checklist Manager

A lightweight, browser-based tool for managing resettable checklists with resource tracking and tag-based filtering.

This project is fully client-side and requires no installation, backend, or external dependencies. Data is stored
locally in the browser and can optionally sync across devices when signed in.

---

## Overview

Checklist Manager allows you to:

- Define checklist items, each with an ordered list of steps
- Track resource consumption across your active items
- Filter items and steps independently using project-defined tags
- Pin items you are actively working through and focus on them exclusively
- Reset session state without losing your item definitions

The application is designed around the idea that a checklist is something you run repeatedly — the structure stays
stable while the session state resets between runs.

---

## Concepts

**Project** — the top-level container. Defines the resources, item tags, and step tags available within it.
Equivalent to a "game" in other BasicGamingTools tools.

**Item** — a named checklist entry, equivalent to a task or procedure. Contains an ordered list of steps and
can be tagged with item-level tags.

**Step** — an individual action within an item. Steps have a title, an optional description, step-level tags,
and optional resource costs. Steps are completed by tapping the `+` button at runtime.

**Resource** — a finite slot tracked across your active items. Defined at the project level with a name, emoji,
and capacity. Resources are consumed at the step level — a step declares how many slots of each resource it uses.

**Item tags** — project-defined labels applied to items. Used to filter which items are visible. Filtering is
union-based: items matching any active item tag are shown.

**Step tags** — project-defined labels applied to steps. Used to filter which steps are visible within an item.
Filtering is union-based. Items with no matching steps are hidden entirely when a step filter is active.

---

## Features

- Hierarchical structure: projects → items → steps
- Two independent filter levels: item tags and step tags
- Resource tracking at the step level with per-execution multiplication
- Pin items for focus; 📌 focus mode hides all non-pinned items
- Collapse/expand items individually; pinned items expand automatically
- Briefing modal: tap any item name to review all step details at a glance
- Briefing toggle: show all steps or only steps matching the active step filter
- Sort items by name (A→Z / Z→A) or manually reorder with ▲▼ arrows
- Session reset at three scopes: per-item, pinned items only, or all items
- Debounced Supabase sync — steps write to localStorage immediately, cloud syncs in the background
- Collision detection: if local and cloud data diverge, a prompt lets you choose which to keep
- Local storage persistence (works offline)
- Optional cross-device sync via Supabase when signed in
- No frameworks or build tools

---

## Project Structure

```
ChecklistManager/
│
├── index.html
├── styles.css
├── js/
│   ├── main.js          # Entry point: state, selector, session management, globals, init
│   ├── storage.js       # Hybrid storage: localStorage, Supabase, session persistence
│   ├── render.js        # All HTML builders: filter bar, tally, item panels, step rows
│   ├── modal-project.js # Create/edit project modal (resources, tags)
│   ├── modal-item.js    # Create/edit item modal (steps, resource costs)
│   └── modal.js         # Barrel: re-exports from both modal files
└── README.md
```

---

## Getting Started

1. Open Checklist Manager from the main tools page.
2. Click **+ Project** to create a project.
3. In the project modal, add resources (name, emoji, available slots) and define your item tags and step tags.
4. Click **+ Item** to add checklist items.
5. For each item, give it a name, assign item tags, and add steps.
6. For each step, add a title, optional description, step tags, and resource costs if applicable.
7. Long-press any item to pin it. Tap 📌 in the View bar to enter focus mode.

---

## Tracking a Session

- Tap the **+** button on a step to mark it done. If a step can be executed multiple times (e.g. repeated
  batches of the same task), tap **+** again — each tap adds one execution and multiplies the step's resource
  cost accordingly. A **×N** count appears below the button when N > 1.
- Completed steps dim. An item shows **✔** when all currently visible steps are done.
- The **Inventory** tally at the top shows resource consumption across pinned items only, updated live.
- To undo a step, use the **↺** button on the item to reset all its steps, or use **↺ Reset** in the View
  bar to reset everything.

---

## Filters

```
Filters: [Item ▾]  [Step ▾]
View:    [📌] [✏️] [≡]  [↺ Reset]
```

**Item ▾** — select an item tag to show only items carrying that tag. Multiple tags can be active
simultaneously; matching is union (items matching any active tag are shown). Active filters appear as
dismissible pills below the filter bar.

**Step ▾** — select a step tag to show only steps carrying that tag within visible items. Items with no
matching steps are hidden entirely.

**📌** — toggle focus mode. Hides the All Items section; shows only the Pinned section. Pinned items
expand automatically on entry.

**✏️** — toggle reorder mode (only available in manual sort). Items show ▲▼ arrows for repositioning.

**≡** — cycle sort order: manual → A→Z → Z→A → manual.

**↺ Reset** — reset all step state across all items. Requires two taps (confirm on second tap).

The active filter pills row shows a small **Aa / 😀** toggle to switch between showing tag names and
tag emoji in the pills.

---

## Pinning and Focus Mode

Long-press any item to pin or unpin it. Pinned items appear in a **📌 Pinned** section at the top of the
list and remain in the All Items section as well — pinning is a mirror, not a move.

The Pinned section has its own **↺ Pinned** reset button that resets only pinned items' steps.

Tap **📌** in the View bar to enter focus mode. The All Items section disappears; only pinned items are
shown, and they expand automatically. The **↺ Reset** button remains visible in focus mode.

---

## Briefing Modal

Tap any item's name to open the briefing modal. This is a read-only view showing all step titles,
descriptions, and tags in order — useful for reviewing what a procedure involves before starting.

A toggle at the top switches between:

- **All Steps** — every step regardless of active filters
- **Filtered** — only steps matching the current active step-tag filter

The toggle preference is remembered globally (not per-item) and restored on next open.

---

## Resource Tracking

Resources are defined at the project level (name, emoji, total slots available). Each step can declare
how many slots of each resource it uses.

When you execute a step (tap **+**), the resource cost is committed. Executing the same step again
(a second batch) commits the cost a second time. The **Inventory** tally reflects the total committed
resources across all pinned items and updates live as you work.

If committed resources exceed a resource's capacity, that resource turns orange in the tally — a planning
signal, not a hard limit.

The tally only appears when at least one item is pinned.

---

## Storage

Project data is stored locally in `localStorage` under `bgt:clm:v2`. When signed in, each project is
also persisted as an individual row in Supabase (`bgt_clm_projects`). Step state writes to localStorage
immediately on every tap; Supabase is updated in the background after a 2-second debounce.

---

## Customization

You can modify:

- Layout in `index.html`
- Styling in `styles.css`
- Logic and session behavior in the `js/` modules

No build process is required.

---

## License

Free to use and modify.