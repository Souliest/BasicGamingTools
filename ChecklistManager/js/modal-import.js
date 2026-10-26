// ChecklistManager/js/modal-import.js
// Paste-an-outline modal: bulk-creates a node hierarchy from indented text.

import {saveData, STORAGE_KEY} from './storage.js';
import {cacheSet, TOOL_CONFIG, localLoad} from '../../common/migrations.js';
import {openModal as trapOpen, closeModal as trapClose} from '../../common/utils.js';
import {parseOutline} from './nodes.js';

const CFG = TOOL_CONFIG.checklistManager;

const _localLoad = () => localLoad(STORAGE_KEY);

function _showError(msg) {
    const el = document.getElementById('impError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function _clearError() {
    const el = document.getElementById('impError');
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}

let _projectId = null;

export function openImportModal(projectId) {
    if (!projectId) return;
    _projectId = projectId;
    _clearError();
    document.getElementById('impText').value = '';
    const overlay = document.getElementById('importModal');
    overlay.classList.add('open');
    trapOpen(overlay, document.activeElement);
}

export function closeImportModal() {
    _projectId = null;
    const overlay = document.getElementById('importModal');
    overlay.classList.remove('open');
    trapClose(overlay);
}

export async function saveImportModal(onSaved) {
    const id = _projectId;
    const parsed = parseOutline(document.getElementById('impText').value);
    if (parsed.length === 0) {
        _showError('Nothing to add — enter at least one line.');
        return;
    }

    const stored = _localLoad();
    const project = stored.blobs[id];
    if (!project) {
        _showError('Project not found — please close and try again.');
        return;
    }

    if (!Array.isArray(project.nodes)) project.nodes = [];
    project.nodes.push(...parsed);

    cacheSet(stored, project, CFG);
    await saveData(stored, id);
    closeImportModal();
    onSaved();
}
