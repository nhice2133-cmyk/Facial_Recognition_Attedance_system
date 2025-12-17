/**
 * Main Module
 * Handles initialization, navigation, and theme management
 */

let currentStream = null; // To stop video streams
let currentScanLoop = null; // To stop animation frames

// DOM Elements
const loadingModal = document.getElementById('loading-modal');

/**
 * Initialize the application
 */
async function initializeApp() {
    if (!ensureAuthenticated()) {
        return;
    }

    initTheme();
    initNavigation();

    // Show loading modal
    if (loadingModal) {
        loadingModal.classList.remove('hidden');
        loadingModal.style.display = 'flex';
    }

    try {
        await loadFaceApiModels();
        if (loadingModal) {
            loadingModal.style.display = 'none';
            loadingModal.classList.add('hidden');
        }
    } catch (err) {
        if (loadingModal) {
            loadingModal.innerHTML = `<p class="text-red-500">Error loading AI models. Please refresh.</p>`;
        }
    }

    showPage('dashboard-page'); // Start on dashboard
}

/**
 * Initialize theme system
 */
function initTheme() {
    document.documentElement.classList.add('dark');
}

function ensureAuthenticated() {
    if (typeof isAuthenticated === 'function') {
        const authed = isAuthenticated();
        if (!authed) {
            if (typeof showLoginPage === 'function') {
                showLoginPage();
            }
            return false;
        }
    }
    return true;
}

/**
 * Initialize navigation system
 */
function initNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            if (pageId) {
                showPage(pageId);
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
}

/**
 * Show a specific page and hide others
 * @param {string} pageId - ID of the page to show
 */
function showPage(pageId) {
    if (!ensureAuthenticated() && pageId !== 'dashboard-page') {
        return;
    }

    stopAllStreams(); // Stop camera when switching pages

    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active');

        // Start page-specific logic
        if (pageId === 'dashboard-page') {
            renderDashboard();
        } else if (pageId === 'enrollment-page') {
            startEnrollmentVideo();
        } else if (pageId === 'members-page') {
            renderMembersList();
        } else if (pageId === 'events-page') {
            if (typeof renderEventsList === 'function') {
                renderEventsList();
            }
        } else if (pageId === 'mark-attendance-page') {
            startAttendanceScanner();
        } else if (pageId === 'reports-page') {
            if (typeof loadReportsEvents === 'function') {
                loadReportsEvents().then(() => renderReports());
            } else {
                renderReports();
            }
        }
    }
}

/**
 * Stop all video streams and animation loops
 */
function stopAllStreams() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (currentScanLoop) {
        cancelAnimationFrame(currentScanLoop);
        currentScanLoop = null;
    }
    if (typeof stopAttendanceScanner === 'function') {
        stopAttendanceScanner();
    }
}

/**
 * Get current video stream (for use by other modules)
 * @returns {MediaStream|null}
 */
function getCurrentStream() {
    return currentStream;
}

/**
 * Set current video stream
 * @param {MediaStream} stream
 */
function setCurrentStream(stream) {
    currentStream = stream;
}

/**
 * Get current scan loop ID
 * @returns {number|null}
 */
function getCurrentScanLoop() {
    return currentScanLoop;
}

/**
 * Set current scan loop ID
 * @param {number} loopId
 */
function setCurrentScanLoop(loopId) {
    currentScanLoop = loopId;
}

// Initialize app when DOM is ready (only if authenticated)
document.addEventListener('DOMContentLoaded', () => {
    // Auth module will handle showing landing/login/main app
    // Only initialize if we're authenticated
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        initializeApp();
    }
});

