// TrophyHunter/js/modal.js
// Barrel file — re-exports from modal-search.js and modal-settings.js.
// This file exists solely to preserve stable import paths for main.js; it
// contains no logic of its own. Do not add business logic here — put it in
// modal-search.js (search/add flow) or modal-settings.js (rename/reset/remove).
// All imports of this module in main.js continue to work without change.

export {openAddGameModal, closeSearchModal} from './modal-search.js';
export {openGameSettingsModal, closeGameSettingsModal} from './modal-settings.js';