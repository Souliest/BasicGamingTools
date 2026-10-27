// ChecklistManager/js/nodes.js
// Pure tree helpers: lookup, mutation, derived tick state, outline parsing, and legacy conversion.
// No DOM, no localStorage.
//
// Node shapes:
//   leaf    { id, name, desc?, target, value }    ticked iff value >= target (target 1 = plain checkbox)
//   parent  { id, name, desc?, children: [...] }  ticked iff every child is ticked; stores no tick state

const MAX_TARGET = 99999;

// ── Leaf values ────────────────────────────────────────────────────────────

export function clampTarget(raw) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(MAX_TARGET, n);
}

export function makeNode(name, target = 1, done = false, desc = '') {
    const t = clampTarget(target);
    const node = {id: crypto.randomUUID(), name, target: t, value: done ? t : 0};
    if (desc) node.desc = desc;
    return node;
}
export function isLeaf(node) {
    return !node.children || node.children.length === 0;
}

export function targetOf(node) {
    return clampTarget(node.target);
}

export function currentOf(node) {
    const v = parseInt(node.value, 10);
    return Math.max(0, Math.min(targetOf(node), Number.isFinite(v) ? v : 0));
}

// ── Derived state ──────────────────────────────────────────────────────────

export function isDone(node) {
    if (isLeaf(node)) return currentOf(node) >= targetOf(node);
    return node.children.every(isDone);
}

// Direct children only — each level reports on itself.
export function childCounts(node) {
    const children = node.children || [];
    return {done: children.filter(isDone).length, total: children.length};
}

// Ticks (or unticks) every leaf under a node, or the node itself if it is a leaf.
export function setDone(node, done) {
    if (isLeaf(node)) {
        node.target = targetOf(node);
        node.value = done ? node.target : 0;
        return;
    }
    node.children.forEach(c => setDone(c, done));
}

export function stepLeaf(node, dir) {
    if (!isLeaf(node)) return;
    node.target = targetOf(node);
    node.value = Math.max(0, Math.min(node.target, currentOf(node) + dir));
}

// ── Lookup and mutation ────────────────────────────────────────────────────

export function findSiblings(nodes, id) {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) return {list: nodes, index: i};
        if (nodes[i].children) {
            const found = findSiblings(nodes[i].children, id);
            if (found) return found;
        }
    }
    return null;
}

export function findNode(nodes, id) {
    const loc = findSiblings(nodes, id);
    return loc ? loc.list[loc.index] : null;
}

export function removeNode(nodes, id) {
    const loc = findSiblings(nodes, id);
    if (!loc) return false;
    loc.list.splice(loc.index, 1);
    return true;
}

export function moveNode(nodes, id, dir) {
    const loc = findSiblings(nodes, id);
    if (!loc) return false;
    const j = loc.index + dir;
    if (j < 0 || j >= loc.list.length) return false;
    [loc.list[loc.index], loc.list[j]] = [loc.list[j], loc.list[loc.index]];
    return true;
}

// Adds a child. A leaf turning into a parent drops its own counter state.
export function attachChild(parent, child) {
    if (isLeaf(parent)) {
        delete parent.target;
        delete parent.value;
        parent.children = [];
    }
    parent.children.push(child);
}

// ── Parsing ────────────────────────────────────────────────────────────────
// Accepts "Eggs", "Eggs x3", "Pool — Win", "Pool — Win x3", "- Eggs x3",
// "- [ ] Eggs", "- [x] Eggs". The subtitle follows the first em-dash; a counter
// suffix goes last (a counter right after the title, "Pool x3 — Win", is tolerated).

const LINE_RE = /^(?:[-*+•]\s+)?(?:\[([ xX])\]\s+)?(.*)$/;
const COUNT_RE = /^(.*\S)\s+[xX]\s?(\d+)$/;

export function parseLine(raw) {
    const m = LINE_RE.exec(String(raw).trim());
    let text = m ? m[2].trim() : '';
    const done = !!m && (m[1] === 'x' || m[1] === 'X');
    let target = 1;

    const c = COUNT_RE.exec(text);
    if (c) {
        text = c[1].trim();
        target = clampTarget(c[2]);
    }

    let name = text;
    let desc = '';
    const dash = text.indexOf('—');
    if (dash !== -1) {
        name = text.slice(0, dash).trim();
        desc = text.slice(dash + 1).trim();
        if (!c) {
            const c2 = COUNT_RE.exec(name);
            if (c2) {
                name = c2[1].trim();
                target = clampTarget(c2[2]);
            }
        }
    }

    return {name, desc, target, done};
}

// Indented outline → node tree. Nesting follows relative indentation, so any
// consistent mix of tabs/spaces works.
export function parseOutline(text) {
    const roots = [];
    const stack = [{indent: -1, node: null}];
    for (const line of String(text).split(/\r?\n/)) {
        if (!line.trim()) continue;
        const indent = line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
        const {name, desc, target, done} = parseLine(line);
        if (!name) continue;
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        const node = makeNode(name, target, done, desc);
        const parent = stack[stack.length - 1].node;
        if (parent) attachChild(parent, node);
        else roots.push(node);
        stack.push({indent, node});
    }
    return roots;
}

// ── Legacy conversion ──────────────────────────────────────────────────────
// Old shape: { items: [{ name, steps: [{ title, ... }], sortOrder }], session: { stepState } }
// Items become nodes, steps become children, executed steps become ticked.
// Descriptions, tags, resources and batch counts are dropped.

export function convertLegacyProject(project) {
    const stepState = (project.session && project.session.stepState) || {};
    const items = [...(project.items || [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const nodes = items.map(item => {
        const steps = item.steps || [];
        if (steps.length === 0) {
            return {id: item.id, name: item.name, target: 1, value: 0};
        }
        return {
            id: item.id,
            name: item.name,
            children: steps.map(s => ({
                id: s.id,
                name: s.title || '(untitled)',
                target: 1,
                value: ((stepState[s.id] || {}).current || 0) >= 1 ? 1 : 0,
            })),
        };
    });

    return {
        id: project.id,
        name: project.name,
        nodes,
        last_modified: project.last_modified || null,
    };
}
