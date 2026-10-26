// ChecklistManager/js/render.js
// HTML builders for the checklist tree, toolbar, and selector helpers.
// Receives data and UI state as parameters — no loadData() calls inside this module.
//
// ui: { editMode, collapsed:Set, editingId, addingUnder, armedDeleteId, resetArmed }

import {escHtml} from '../../common/utils.js';
import {isLeaf, isDone, childCounts, targetOf, currentOf} from './nodes.js';

// ── Selector bar helpers ──────────────────────────────────────────────────────

export function updateProjectActionButtons(hasProject) {
    const editBtn = document.getElementById('editProjectBtn');
    if (editBtn) editBtn.style.display = hasProject ? '' : 'none';
}

export function rebuildSelector(index, selectedProjectId) {
    const sel = document.getElementById('projectSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— select a project —</option>';
    index.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        if (e.id === selectedProjectId) opt.selected = true;
        sel.appendChild(opt);
    });
    updateProjectActionButtons(
        !!selectedProjectId && !!index.find(e => e.id === selectedProjectId)
    );
}

// ── Small DOM helpers ─────────────────────────────────────────────────────────

function _el(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}

function _btn(className, text, title, fn) {
    const b = _el('button', className);
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', () => fn());
    return b;
}

export function focusAddInput(key) {
    const input = document.querySelector(`[data-add-for="${CSS.escape(key)}"]`);
    if (input) input.focus();
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderMain(selectedProjectId, stored, ui, callbacks) {
    const content = document.getElementById('mainContent');
    if (!content) return;

    if (!selectedProjectId) {
        content.classList.remove('edit-mode');
        content.innerHTML = `
            <div class="empty-state">
                <div class="big">✅</div>
                ${stored.index.length === 0
            ? 'No projects yet.<br>Hit <strong>+ Project</strong> to get started.'
            : 'Select a project above.'}
            </div>
        `;
        return;
    }

    const project = stored.blobs[selectedProjectId];
    if (!project) {
        content.innerHTML = '';
        return;
    }

    const nodes = project.nodes || [];
    const adding = ui.editMode || nodes.length === 0;

    content.innerHTML = '';
    content.classList.toggle('edit-mode', ui.editMode);

    content.appendChild(_renderToolbar(nodes, ui, callbacks, adding));

    if (ui.editMode) {
        const banner = _el('div', 'clm-edit-banner');
        banner.textContent = '✏️ Edit mode';
        content.appendChild(banner);
    }

    if (nodes.length === 0) {
        const hint = _el('div', 'clm-empty-hint');
        hint.innerHTML = 'Nothing here yet.<br>Type an item below and press Enter. ' +
            '<strong>Eggs x3</strong> makes a counter.<br>Or paste a whole outline with 📋.';
        content.appendChild(hint);
    }

    const tree = _el('div', 'clm-tree');
    nodes.forEach((n, i) => {
        tree.appendChild(_renderNode(n, ui, callbacks, {first: i === 0, last: i === nodes.length - 1}));
    });
    if (adding) tree.appendChild(_renderAddField('root', callbacks));
    content.appendChild(tree);

    if (ui.editingId) {
        const input = content.querySelector('.clm-edit-name');
        if (input) {
            input.focus();
            input.select();
        }
    }
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function _renderToolbar(nodes, ui, cb, adding) {
    const bar = _el('div', 'clm-toolbar');

    const done = nodes.filter(isDone).length;
    const summary = _el('span', 'clm-summary' + (nodes.length > 0 && done === nodes.length ? ' clm-summary-done' : ''));
    summary.textContent = nodes.length > 0 ? `${done}/${nodes.length}` : '';
    bar.appendChild(summary);

    bar.appendChild(_btn(
        'btn btn-ghost clm-tool-btn' + (ui.editMode ? ' active' : ''),
        '✏️',
        ui.editMode ? 'Exit edit mode' : 'Edit mode',
        cb.onToggleEditMode
    ));

    if (adding) {
        bar.appendChild(_btn('btn btn-ghost clm-tool-btn', '📋', 'Paste an outline', cb.onOpenImport));
    }

    const reset = _btn(
        'btn btn-ghost clm-tool-btn clm-reset-btn' + (ui.resetArmed ? ' armed' : ''),
        ui.resetArmed ? '↺ Sure?' : '↺ Reset',
        'Untick everything',
        cb.onResetAll
    );
    if (nodes.length === 0) reset.disabled = true;
    bar.appendChild(reset);

    return bar;
}

// ── Node ──────────────────────────────────────────────────────────────────────

function _renderNode(node, ui, cb, pos) {
    const wrap = _el('div', 'clm-node');
    wrap.dataset.id = node.id;

    wrap.appendChild(
        ui.editingId === node.id ? _renderEditor(node, cb) : _renderRow(node, ui, cb, pos)
    );

    const leaf = isLeaf(node);
    const showAdd = ui.addingUnder === node.id;

    if ((!leaf && !ui.collapsed.has(node.id)) || showAdd) {
        const kids = _el('div', 'clm-children');
        const children = node.children || [];
        children.forEach((c, i) => {
            kids.appendChild(_renderNode(c, ui, cb, {first: i === 0, last: i === children.length - 1}));
        });
        if (showAdd) kids.appendChild(_renderAddField(node.id, cb));
        wrap.appendChild(kids);
    }

    return wrap;
}

function _renderRow(node, ui, cb, pos) {
    const leaf = isLeaf(node);
    const done = isDone(node);
    const target = targetOf(node);
    const counter = leaf && target > 1;
    const collapsed = ui.collapsed.has(node.id);
    const armed = ui.armedDeleteId === node.id;
    const name = escHtml(node.name);

    const row = _el('div', 'clm-row' + (done ? ' clm-done' : '') + (leaf ? '' : ' clm-parent'));

    const toggleHtml = leaf ? '' : `
        <button class="clm-toggle" data-action="collapse"
                aria-expanded="${!collapsed}"
                aria-label="${collapsed ? 'Expand' : 'Collapse'} ${name}">${collapsed ? '▶' : '▼'}</button>`;

    let tailHtml = '';
    if (counter) {
        const v = currentOf(node);
        tailHtml = `
            <span class="clm-counter">
                <button class="clm-step-btn" data-action="minus"
                        aria-label="Decrease ${name}" ${v <= 0 ? 'disabled' : ''}>−</button>
                <span class="clm-counter-val" aria-live="polite" aria-atomic="true">${v}/${target}</span>
                <button class="clm-step-btn clm-step-plus" data-action="plus"
                        aria-label="Increase ${name}" ${v >= target ? 'disabled' : ''}>+</button>
            </span>`;
    } else if (!leaf) {
        const c = childCounts(node);
        tailHtml = `<span class="clm-count">${c.done}/${c.total}</span>`;
    }

    let controlsHtml = '';
    if (ui.editMode) {
        controlsHtml = `
            <div class="clm-edit-controls">
                <button class="clm-node-btn" data-action="up" aria-label="Move up" ${pos.first ? 'disabled' : ''}>▲</button>
                <button class="clm-node-btn" data-action="down" aria-label="Move down" ${pos.last ? 'disabled' : ''}>▼</button>
                <button class="clm-node-btn" data-action="edit" aria-label="Edit ${name}">✎</button>
                <button class="clm-node-btn blue" data-action="add" aria-label="Add sub-item to ${name}">+</button>
                <button class="clm-node-btn red${armed ? ' armed' : ''}" data-action="delete"
                        aria-label="Delete ${name}">${armed ? 'Delete?' : '🗑'}</button>
            </div>`;
    } else if (!leaf) {
        controlsHtml = `
            <button class="clm-node-btn" data-action="reset"
                    aria-label="Reset ${name}" title="Untick everything inside">↺</button>`;
    }

    row.innerHTML = `
        <span class="clm-toggle-slot">${toggleHtml}</span>
        <button class="clm-check${done ? ' clm-check-on' : ''}" data-action="tick"
                role="checkbox" aria-checked="${done}"
                aria-label="${name}">${done ? '✔' : ''}</button>
        <span class="clm-name" data-action="name">${name}</span>
        ${tailHtml}
        ${controlsHtml}
    `;

    const on = (action, fn) => {
        const el = row.querySelector(`[data-action="${action}"]`);
        if (el) el.addEventListener('click', e => {
            e.stopPropagation();
            fn();
        });
    };

    on('tick', () => cb.onToggleNode(node.id));
    on('minus', () => cb.onCounterStep(node.id, -1));
    on('plus', () => cb.onCounterStep(node.id, 1));
    on('collapse', () => cb.onToggleCollapse(node.id));
    on('reset', () => cb.onResetNode(node.id));
    on('up', () => cb.onMoveNode(node.id, -1));
    on('down', () => cb.onMoveNode(node.id, 1));
    on('edit', () => cb.onStartEdit(node.id));
    on('add', () => cb.onStartAdd(node.id));
    on('delete', () => cb.onDeleteNode(node.id));

    // Name tap: parents collapse/expand, plain leaves tick, counters do nothing.
    on('name', () => {
        if (!leaf) cb.onToggleCollapse(node.id);
        else if (!counter) cb.onToggleNode(node.id);
    });

    return row;
}

// ── Inline editor ─────────────────────────────────────────────────────────────

function _renderEditor(node, cb) {
    const leaf = isLeaf(node);
    const row = _el('div', 'clm-row clm-editor');

    row.innerHTML = `
        <input type="text" class="clm-edit-name" value="${escHtml(node.name)}"
               maxlength="120" aria-label="Name" autocomplete="off">
        ${leaf ? `<input type="number" class="clm-edit-target" value="${targetOf(node)}"
               min="1" max="99999" aria-label="Target count"
               title="Target count (1 = plain checkbox)">` : ''}
        <button class="clm-ed-btn" data-action="save" aria-label="Save">✔</button>
        <button class="clm-ed-btn" data-action="cancel" aria-label="Cancel">✕</button>
    `;

    const nameIn = row.querySelector('.clm-edit-name');
    const targetIn = row.querySelector('.clm-edit-target');
    const save = () => cb.onSaveEdit(node.id, nameIn.value, targetIn ? targetIn.value : null);

    [nameIn, targetIn].forEach(input => {
        if (!input) return;
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            } else if (e.key === 'Escape') {
                cb.onCancelEdit();
            }
        });
    });
    row.querySelector('[data-action="save"]').addEventListener('click', save);
    row.querySelector('[data-action="cancel"]').addEventListener('click', () => cb.onCancelEdit());

    return row;
}

// ── Inline add field ──────────────────────────────────────────────────────────

function _renderAddField(key, cb) {
    const row = _el('div', 'clm-add-row');
    row.innerHTML = `
        <input type="text" class="clm-add-input" data-add-for="${escHtml(key)}"
               placeholder="Add item…  (e.g. Eggs x3)" maxlength="120"
               aria-label="Add item" autocomplete="off">
        <button class="clm-ed-btn" data-action="add-submit" aria-label="Add">+</button>
    `;

    const input = row.querySelector('input');
    const submit = () => {
        if (!input.value.trim()) return;
        cb.onAddNode(key === 'root' ? null : key, input.value);
    };

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        } else if (e.key === 'Escape' && key !== 'root') {
            cb.onCancelAdd();
        }
    });
    row.querySelector('[data-action="add-submit"]').addEventListener('click', submit);

    return row;
}
