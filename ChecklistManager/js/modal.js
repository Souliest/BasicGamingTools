// ChecklistManager/js/modal.js
// Barrel file — re-exports from modal-project.js and modal-import.js.
// No logic lives here. Add business logic to the appropriate modal file.

export {
    openAddProjectModal,
    openEditProjectModal,
    closeProjectModal,
    saveProjectModal,
    promptDeleteProject,
    cancelDeleteProject,
    confirmDeleteProject,
} from './modal-project.js';

export {
    openImportModal,
    closeImportModal,
    saveImportModal,
} from './modal-import.js';
