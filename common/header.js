// common/header.js
// Shared Tool Header — call initHeader('Tool Title') once per page, before initTheme().
// Injects a <header> as the first child of <body> with:
//   - responsive ← / ← Tools back link
//   - centered page title
//   - 👤 auth indicator (wired by auth-ui.js initAuth())
//   - fullscreen toggle (hidden on devices where the Fullscreen API is unavailable)
//   - dark/light theme toggle (wired to toggleTheme() from theme.js)

function initHeader(title) {
    const header = document.createElement('header');
    header.className = 'tool-header';
    header.innerHTML = `
    <a class="back-link" href="../">
      <span class="back-arrow">←</span><span class="back-label"> Tools</span>
    </a>
    <h1 class="tool-title">${title}</h1>
    <div class="header-actions">
      <button class="auth-btn" id="authBtn" title="Account">👤</button>
      <button class="fullscreen-toggle" id="fullscreenBtn" title="Enter fullscreen"
              onclick="toggleFullscreen()" style="display:none">
        ${_fullscreenIconEnter()}
      </button>
      <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark">🌙</button>
    </div>
  `;
    document.body.insertBefore(header, document.body.firstChild);

    // Show the button only on devices that support the Fullscreen API.
    // iOS Safari and Firefox iOS do not set fullscreenEnabled — hide cleanly.
    if (document.fullscreenEnabled) {
        const btn = document.getElementById('fullscreenBtn');
        if (btn) btn.style.display = '';
    }

    // Keep icon in sync when the user exits fullscreen via browser gesture
    // (back swipe, Escape key, etc.) rather than our button.
    document.addEventListener('fullscreenchange', _onFullscreenChange);
}

// ── Fullscreen toggle — exposed as a global for the inline onclick ──

function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// ── Sync button icon to actual fullscreen state ──

function _onFullscreenChange() {
    const btn = document.getElementById('fullscreenBtn');
    if (!btn) return;

    if (document.fullscreenElement) {
        btn.innerHTML = _fullscreenIconExit();
        btn.title = 'Exit fullscreen';
    } else {
        btn.innerHTML = _fullscreenIconEnter();
        btn.title = 'Enter fullscreen';
    }
}

// ── SVG icons ──
// Enter: four L-shaped corners pointing outward (expand).
// Exit:  four L-shaped corners pointing inward (compress).
// Both drawn on a 10×10 grid, viewBox="0 0 10 10", stroke-based for crispness.

function _fullscreenIconEnter() {
    return `<svg width="16" height="16" viewBox="0 0 10 10"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="square" aria-hidden="true">
      <!-- top-left corner -->
      <polyline points="3,1 1,1 1,3"/>
      <!-- top-right corner -->
      <polyline points="7,1 9,1 9,3"/>
      <!-- bottom-left corner -->
      <polyline points="1,7 1,9 3,9"/>
      <!-- bottom-right corner -->
      <polyline points="9,7 9,9 7,9"/>
    </svg>`;
}

function _fullscreenIconExit() {
    return `<svg width="16" height="16" viewBox="0 0 10 10"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="square" aria-hidden="true">
      <!-- top-left arrow pointing inward -->
      <polyline points="1,3 3,3 3,1"/>
      <!-- top-right arrow pointing inward -->
      <polyline points="9,3 7,3 7,1"/>
      <!-- bottom-left arrow pointing inward -->
      <polyline points="1,7 3,7 3,9"/>
      <!-- bottom-right arrow pointing inward -->
      <polyline points="9,7 7,7 7,9"/>
    </svg>`;
}