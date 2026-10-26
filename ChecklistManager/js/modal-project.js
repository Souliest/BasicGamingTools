// ChecklistManager/js/modal-project.js
// Create/rename project modal. Delete lives in the danger zone of the same modal.

import {saveData, deleteProject, STORAGE_KEY} from './storage.js';
import {cacheSet, TOOL_CONFIG, localLoad} from '../../common/migrations.js';
import {openModal as trapOpen, closeModal as trapClose} from '../../common/utils.js';

const CFG = TOOL_CONFIG.checklistManager;

const _localLoad = () => localLoad(STORAGE_KEY);

// ── Inline error helpers ──────────────────────────────────────────────────────

function _showError(msg) {
    const el = document.getElementById('pmError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function _clearError() {
    const el = document.getElementById('pmError');
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}

// ── Module state ──────────────────────────────────────────────────────────────

let _editingProjectId = null;

// ── Open / close ──────────────────────────────────────────────────────────────

function _open() {
    const overlay = document.getElementById('projectModal');
    overlay.classList.add('open');
    trapOpen(overlay, document.activeElement);
}

export function openAddProjectModal() {
    _editingProjectId = null;
    _clearError();
    document.getElementById('projectModalTitle').textContent = 'New Project';
    document.getElementById('pmName').value = '';
    document.getElementById('pmDanger').style.display = 'none';
    _hideDeleteConfirm();
    _open();
}

export function openEditProjectModal(projectId) {
    if (!projectId) return;
    const stored = _localLoad();
    const project = stored.blobs[projectId];
    if (!project) return;

    _editingProjectId = projectId;
    _clearError();
    document.getElementById('projectModalTitle').textContent = 'Project Settings';
    document.getElementById('pmName').value = project.name || '';
    document.getElementById('pmDanger').style.display = '';
    _hideDeleteConfirm();
    _open();
}

export function closeProjectModal() {
    _editingProjectId = null;
    _hideDeleteConfirm();
    const overlay = document.getElementById('projectModal');
    overlay.classList.remove('open');
    trapClose(overlay);
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveProjectModal(onSaved) {
    const name = document.getElementById('pmName').value.trim();
    if (!name) {
        _showError('Please enter a project name.');
        return;
    }

    const stored = _localLoad();
    let savedId;

    if (_editingProjectId) {
        const project = stored.blobs[_editingProjectId];
        if (!project) {
            _showError('Project not found — please close and try again.');
            return;
        }
        project.name = name;
        cacheSet(stored, project, CFG);
        savedId = _editingProjectId;
    } else {
        const project = {id: crypto.randomUUID(), name, nodes: [], last_modified: null};
        cacheSet(stored, project, CFG);
        savedId = project.id;
    }

    await saveData(stored, savedId);
    closeProjectModal();
    onSaved(savedId);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function promptDeleteProject() {
    document.getElementById('pmDeleteBtn').style.opacity = '0.4';
    document.getElementById('pmDeleteConfirm').style.display = '';
}

export function cancelDeleteProject() {
    _hideDeleteConfirm();
}

export async function confirmDeleteProject(onDeleted) {
    if (!_editingProjectId) return;
    const id = _editingProjectId;
    closeProjectModal();
    await deleteProject(id);
    onDeleted(id);
}

function _hideDeleteConfirm() {
    const btn = document.getElementById('pmDeleteBtn');
    const confirm = document.getElementById('pmDeleteConfirm');
    if (btn) btn.style.opacity = '';
    if (confirm) confirm.style.display = 'none';
}
