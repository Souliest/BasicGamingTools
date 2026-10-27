// ChecklistManager/js/main.js
// Entry point: module-level state, selector, tree interactions, window globals, init IIFE.
//
// Tick state lives in the project blob (project.nodes). UI-only state (_ui) is never persisted.
// All tree edits go through _mutate(): write to localStorage immediately, re-render,
// and schedule a debounced Supabase sync (2s after the last change).

import {
    loadData, loadProject, saveData, localSave, resolveCollision,
    loadTreeState, saveTreeState,
    STORAGE_KEY, STORAGE_SELECTED,
    subscribeToProjectChanges, unsubscribeFromProjectChanges,
} from './storage.js';
import {
    TOOL_CONFIG, cacheSet, cacheDelete, localLoad,
} from '../../common/migrations.js';
import {
    renderMain, rebuildSelector, updateProjectActionButtons, focusAddInput,
} from './render.js';
import {
    openAddProjectModal, openEditProjectModal, closeProjectModal, saveProjectModal,
    promptDeleteProject, cancelDeleteProject, confirmDeleteProject,
    openImportModal, closeImportModal, saveImportModal,
} from './modal.js';
import {
    findNode, removeNode, moveNode, attachChild, makeNode, parseLine, clampTarget,
    isLeaf, isDone, setDone, stepLeaf, convertLegacyProject,
    collectIds, findWithDepth, isExpanded, setExpanded,
} from './nodes.js';
import {initAuth, showCollisionModal} from '../../common/auth-ui.js';
import {supabase} from '../../common/supabase.js';
import {getUser} from '../../common/auth.js';

const CFG = TOOL_CONFIG.checklistManager;

// ── Module-level state ────────────────────────────────────────────────────────

let selectedProjectId = null;
let _syncTimer = null;
let _syncProjectId = null;
let _focusAdd = null;   // add-field key to focus after the next render

const _ui = {
    editMode: false,
    overrides: {},
    editingId: null,
    addingUnder: null,
    armedDeleteId: null,
    resetArmed: false,
};

// ── Local storage read ────────────────────────────────────────────────────────

const _localLoad = () => localLoad(STORAGE_KEY);

// ── Debounced Supabase sync ───────────────────────────────────────────────────

function _scheduleSync(projectId) {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncProjectId = projectId;
    _syncTimer = setTimeout(async () => {
        const id = _syncProjectId;
        _syncTimer = null;
        _syncProjectId = null;
        await saveData(_localLoad(), id);
    }, 2000);
}

async function _flushSync() {
    if (_syncTimer === null) return;
    clearTimeout(_syncTimer);
    const id = _syncProjectId;
    _syncTimer = null;
    _syncProjectId = null;
    await saveData(_localLoad(), id);
}

// ── Legacy conversion ─────────────────────────────────────────────────────────
// Projects saved by the old item/step model are converted in place the first
// time they are rendered. Runs against the stored object, then syncs.

function _ensureNodes(stored) {
    const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
    if (!project || Array.isArray(project.nodes)) return;
    cacheSet(stored, convertLegacyProject(project), CFG);
    localSave(stored);
    _scheduleSync(selectedProjectId);
}

// ── Render orchestration ──────────────────────────────────────────────────────

function _render(stored) {
    _ensureNodes(stored);
    renderMain(selectedProjectId, stored, _ui, _callbacks);
    if (_focusAdd) {
        focusAddInput(_focusAdd);
        _focusAdd = null;
    }
}

function _resetUiState() {
    _ui.editMode = false;
    _ui.overrides = selectedProjectId ? loadTreeState(selectedProjectId) : {};
    _ui.editingId = null;
    _ui.addingUnder = null;
    _ui.armedDeleteId = null;
    _ui.resetArmed = false;
}

// Persists expand/collapse overrides per device (never in the synced blob),
// dropping entries for nodes that no longer exist.
function _persistOverrides() {
    if (!selectedProjectId) return;
    const project = _localLoad().blobs[selectedProjectId];
    if (project && Array.isArray(project.nodes)) {
        const live = new Set(collectIds(project.nodes));
        Object.keys(_ui.overrides).forEach(id => {
            if (!live.has(id)) delete _ui.overrides[id];
        });
    }
    saveTreeState(selectedProjectId, _ui.overrides);
}

// Applies a change to the selected project, persists locally, re-renders, schedules sync.
function _mutate(fn) {
    const stored = _localLoad();
    const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
    if (!project || !Array.isArray(project.nodes)) return;

    _ui.armedDeleteId = null;
    _ui.resetArmed = false;

    fn(project);

    cacheSet(stored, project, CFG);
    localSave(stored);
    _scheduleSync(selectedProjectId);
    _render(stored);
}

// ── Realtime: handle incoming remote update ───────────────────────────────────

function _onRemoteUpdate(payload) {
    // ── DELETE ──
    if (payload.type === 'delete') {
        const id = payload.row && payload.row.id;
        if (!id) return;

        const stored = _localLoad();
        if (!stored.index.find(e => e.id === id)) return;

        cacheDelete(stored, id);
        localSave(stored);

        if (selectedProjectId === id) {
            selectedProjectId = null;
            localStorage.removeItem(STORAGE_SELECTED);
            _resetUiState();
            updateProjectActionButtons(false);
        }

        rebuildSelector(stored.index, selectedProjectId);
        _render(_localLoad());
        return;
    }

    // ── UPDATE ──
    const row = payload.row;
    if (!row || !row.data) return;

    const remoteProject = {...row.data, last_modified: row.updated_at};

    // Local edits in flight win for the open project.
    if (remoteProject.id === selectedProjectId && (_syncTimer !== null || _ui.editingId)) return;

    const stored = _localLoad();
    const indexEntry = stored.index.find(e => e.id === remoteProject.id);

    if (indexEntry) {
        const localTime = indexEntry.last_modified ? new Date(indexEntry.last_modified) : null;
        const remoteTime = remoteProject.last_modified ? new Date(remoteProject.last_modified) : null;
        if (localTime && remoteTime && remoteTime <= localTime) return;
    }

    if (!indexEntry) {
        cacheSet(stored, remoteProject, CFG);
        localSave(stored);
        rebuildSelector(stored.index, selectedProjectId);
        return;
    }

    if (stored.blobs[remoteProject.id]) {
        cacheSet(stored, remoteProject, CFG);
    } else {
        const idx = stored.index.findIndex(e => e.id === remoteProject.id);
        if (idx !== -1) stored.index[idx] = {
            id: remoteProject.id,
            name: remoteProject.name,
            last_modified: remoteProject.last_modified,
        };
    }
    localSave(stored);

    if (remoteProject.id === selectedProjectId) {
        _render(_localLoad());
    }
}

// ── Project selector ──────────────────────────────────────────────────────────

async function selectProject(id) {
    await _flushSync();

    selectedProjectId = id || null;
    _resetUiState();

    if (selectedProjectId) {
        localStorage.setItem(STORAGE_SELECTED, selectedProjectId);
    } else {
        localStorage.removeItem(STORAGE_SELECTED);
    }

    const stored = _localLoad();
    updateProjectActionButtons(
        !!selectedProjectId && !!stored.index.find(e => e.id === selectedProjectId)
    );

    if (!selectedProjectId) {
        _render(stored);
        return;
    }

    const {project, collision} = await loadProject(selectedProjectId);
    if (collision) {
        showCollisionModal(
            selectedProjectId,
            project.name,
            collision,
            resolveCollision,
            () => _afterSelect(),
        );
    } else {
        _afterSelect();
    }
}

function _afterSelect() {
    const stored = _localLoad();
    _ensureNodes(stored);
    const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
    if (project && Array.isArray(project.nodes) && project.nodes.length === 0) _focusAdd = 'root';
    _render(stored);
}

function _restoreSelectedProject(index) {
    const saved = localStorage.getItem(STORAGE_SELECTED);
    if (saved && index.find(e => e.id === saved)) return saved;
    return null;
}

// ── Tree interactions ─────────────────────────────────────────────────────────

function onToggleNode(id) {
    _mutate(p => {
        const n = findNode(p.nodes, id);
        if (n) setDone(n, !isDone(n));
    });
}

function onCounterStep(id, dir) {
    _mutate(p => {
        const n = findNode(p.nodes, id);
        if (n) stepLeaf(n, dir);
    });
}

function onResetNode(id) {
    _mutate(p => {
        const n = findNode(p.nodes, id);
        if (n) setDone(n, false);
    });
}

function onToggleCollapse(id) {
    const stored = _localLoad();
    const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
    if (!project || !Array.isArray(project.nodes)) return;
    const found = findWithDepth(project.nodes, id);
    if (!found) return;
    const open = isExpanded(found.node, found.depth, _ui.overrides);
    setExpanded(project.nodes, id, !open, _ui.overrides);
    _persistOverrides();
    _render(stored);
}

function onMoveNode(id, dir) {
    _mutate(p => moveNode(p.nodes, id, dir));
}

function onStartEdit(id) {
    _ui.editingId = id;
    _ui.armedDeleteId = null;
    _render(_localLoad());
}

function onCancelEdit() {
    _ui.editingId = null;
    _render(_localLoad());
}

function onSaveEdit(id, rawName, rawTarget, rawDesc) {
    const name = String(rawName).trim();
    const desc = String(rawDesc || '').trim();
    if (!name) return;   // stay in the editor until there is a name
    _ui.editingId = null;
    _mutate(p => {
        const n = findNode(p.nodes, id);
        if (!n) return;
        n.name = name;
        if (desc) n.desc = desc;
        else delete n.desc;
        if (isLeaf(n) && rawTarget !== null) {
            const t = clampTarget(rawTarget);
            n.target = t;
            n.value = Math.min(parseInt(n.value, 10) || 0, t);
        }
    });
}

// Deleting a node that has children takes two taps; a leaf goes immediately.
function onDeleteNode(id) {
    const stored = _localLoad();
    const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
    if (!project) return;
    const node = findNode(project.nodes, id);
    if (!node) return;

    if (!isLeaf(node) && _ui.armedDeleteId !== id) {
        _ui.armedDeleteId = id;
        setTimeout(() => {
            if (_ui.armedDeleteId === id) {
                _ui.armedDeleteId = null;
                _render(_localLoad());
            }
        }, 4000);
        _render(stored);
        return;
    }

    _ui.editingId = null;
    _ui.addingUnder = null;
    _mutate(p => removeNode(p.nodes, id));
}

function onStartAdd(id) {
    _ui.addingUnder = _ui.addingUnder === id ? null : id;
    _ui.armedDeleteId = null;
    const stored = _localLoad();
    if (_ui.addingUnder) {
        const project = selectedProjectId ? stored.blobs[selectedProjectId] : null;
        if (project && Array.isArray(project.nodes)) {
            setExpanded(project.nodes, id, true, _ui.overrides);
            _persistOverrides();
        }
        _focusAdd = id;
    }
    _render(stored);
}

function onCancelAdd() {
    _ui.addingUnder = null;
    _render(_localLoad());
}

function onAddNode(parentId, text) {
    const {name, desc, target, done} = parseLine(text);
    if (!name) return;
    _focusAdd = parentId || 'root';
    _mutate(p => {
        const node = makeNode(name, target, done, desc);
        if (parentId) {
            const parent = findNode(p.nodes, parentId);
            if (!parent) return;
            attachChild(parent, node);
            setExpanded(p.nodes, parentId, true, _ui.overrides);
        } else {
            p.nodes.push(node);
        }
    });
    _persistOverrides();
}

function onToggleEditMode() {
    _ui.editMode = !_ui.editMode;
    _ui.editingId = null;
    _ui.addingUnder = null;
    _ui.armedDeleteId = null;
    _ui.resetArmed = false;
    _render(_localLoad());
}

// Two taps: first arms, second resets everything. Disarms after 4 seconds.
function onResetAll() {
    if (!_ui.resetArmed) {
        _ui.resetArmed = true;
        setTimeout(() => {
            if (_ui.resetArmed) {
                _ui.resetArmed = false;
                _render(_localLoad());
            }
        }, 4000);
        _render(_localLoad());
        return;
    }
    _mutate(p => p.nodes.forEach(n => setDone(n, false)));
}

// ── Callbacks passed into render ──────────────────────────────────────────────

const _callbacks = {
    onToggleNode,
    onCounterStep,
    onResetNode,
    onToggleCollapse,
    onMoveNode,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDeleteNode,
    onStartAdd,
    onCancelAdd,
    onAddNode,
    onToggleEditMode,
    onResetAll,
    onOpenImport: () => openImportModal(selectedProjectId),
};

// ── After-save / after-delete callbacks ──────────────────────────────────────

function _afterProjectSaved(savedId) {
    const changed = selectedProjectId !== savedId;
    selectedProjectId = savedId;
    localStorage.setItem(STORAGE_SELECTED, savedId);
    if (changed) _resetUiState();

    const stored = _localLoad();
    rebuildSelector(stored.index, selectedProjectId);

    const project = stored.blobs[savedId];
    if (changed && project && Array.isArray(project.nodes) && project.nodes.length === 0) _focusAdd = 'root';
    _render(stored);
}

async function _afterProjectDeleted(deletedId) {
    if (selectedProjectId === deletedId) {
        selectedProjectId = null;
        localStorage.removeItem(STORAGE_SELECTED);
        _resetUiState();
    }
    const data = await loadData();
    rebuildSelector(data.index, selectedProjectId);
    _render(_localLoad());
}

// ── Window globals ────────────────────────────────────────────────────────────
// Only what index.html's inline Escape handler needs.

window.closeProjectModal = () => closeProjectModal();
window.closeImportModal = () => closeImportModal();

// ── Wire static buttons ───────────────────────────────────────────────────────

function _wireModalButtons() {
    const wire = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    wire('projectSelect', 'change', e => selectProject(e.target.value));
    wire('addProjectBtn', 'click', () => openAddProjectModal());
    wire('editProjectBtn', 'click', () => openEditProjectModal(selectedProjectId));

    wire('pmCancelBtn', 'click', () => closeProjectModal());
    wire('pmSaveBtn', 'click', () => saveProjectModal(_afterProjectSaved));
    wire('pmName', 'keydown', e => {
        if (e.key === 'Enter') saveProjectModal(_afterProjectSaved);
    });
    wire('pmDeleteBtn', 'click', () => promptDeleteProject());
    wire('pmDeleteCancelBtn', 'click', () => cancelDeleteProject());
    wire('pmDeleteConfirmBtn', 'click', () => confirmDeleteProject(_afterProjectDeleted));

    wire('impCancelBtn', 'click', () => closeImportModal());
    wire('impSaveBtn', 'click', () => saveImportModal(() => _render(_localLoad())));

    const projectOverlay = document.getElementById('projectModal');
    if (projectOverlay) {
        projectOverlay.addEventListener('click', e => {
            if (e.target === projectOverlay) closeProjectModal();
        });
    }
    const importOverlay = document.getElementById('importModal');
    if (importOverlay) {
        importOverlay.addEventListener('click', e => {
            if (e.target === importOverlay) closeImportModal();
        });
    }

    // Push pending changes when the tab is hidden so a closed tab doesn't lose the debounce.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') _flushSync();
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
    await initAuth();

    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            subscribeToProjectChanges(session.user.id, _onRemoteUpdate);
        } else {
            unsubscribeFromProjectChanges();
        }
    });

    const data = await loadData();
    selectedProjectId = _restoreSelectedProject(data.index);
    rebuildSelector(data.index, selectedProjectId);

    if (selectedProjectId) await loadProject(selectedProjectId);
    _resetUiState();

    _wireModalButtons();
    _render(_localLoad());

    const user = getUser();
    if (user) subscribeToProjectChanges(user.id, _onRemoteUpdate);
})();
