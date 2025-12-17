/**
 * Authentication Module
 * Handles login, logout, and session management
 */

// Default credentials (in production, this would be handled by a backend)
const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

/**
 * Show landing page
 */
function showLandingPage() {
    document.getElementById('landing-page').classList.remove('hidden');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-layout').classList.add('hidden');
}

/**
 * Show login page
 */
function showLoginPage() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');

    // Clear form
    const form = document.getElementById('login-form');
    if (form) form.reset();
    hideLoginError();

    // Reset password visibility to hidden
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    if (passwordInput && eyeIcon && eyeOffIcon) {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('hidden');
        eyeOffIcon.classList.add('hidden');
    }

    // Load remembered username if available (after form reset)
    // Use setTimeout to ensure form reset completes first
    setTimeout(() => {
        loadRememberedCredentials();
    }, 0);

    // Re-initialize password toggle when login page is shown
    initPasswordToggle();
}

/**
 * Show main app
 */
function showMainApp() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
}

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
function handleLogin(event) {
    event.preventDefault();
    hideLoginError();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    // Validate credentials
    if (username === DEFAULT_CREDENTIALS.username && password === DEFAULT_CREDENTIALS.password) {
        // Store session
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('username', username);

        // Handle remember me - save flag and password temporarily in sessionStorage
        // Credentials will be saved to localStorage on logout if remember me was checked
        if (rememberMe) {
            // Save flag and password temporarily (will be cleared on page refresh)
            sessionStorage.setItem('rememberMeChecked', 'true');
            sessionStorage.setItem('tempPassword', password);
        } else {
            // Clear flag if unchecked
            sessionStorage.removeItem('rememberMeChecked');
            sessionStorage.removeItem('tempPassword');
            // Also clear any existing remembered credentials
            clearRememberedCredentials();
        }

        // Show main app
        showMainApp();

        // Initialize app if not already initialized
        if (typeof initializeApp === 'function') {
            initializeApp();
        }
    } else {
        showLoginError('Invalid username or password. Please try again.');
    }
}

/**
 * Clear remembered credentials from localStorage
 */
function clearRememberedCredentials() {
    localStorage.removeItem('rememberedUsername');
    localStorage.removeItem('rememberedPassword');
    localStorage.removeItem('rememberMeEnabled');
}

/**
 * Load remembered credentials
 */
function loadRememberedCredentials() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    const rememberMeEnabled = localStorage.getItem('rememberMeEnabled');

    if (rememberedUsername && rememberMeEnabled === 'true') {
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const rememberMeCheckbox = document.getElementById('remember-me');

        if (usernameInput) {
            usernameInput.value = rememberedUsername;
        }

        if (passwordInput && rememberedPassword) {
            passwordInput.value = rememberedPassword;
        }

        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Check if remember me was checked during login
    const rememberMeWasChecked = sessionStorage.getItem('rememberMeChecked') === 'true';

    // Get current username from session (if available)
    const currentUsername = sessionStorage.getItem('username');

    // If remember me was checked, save credentials to localStorage for next login
    if (rememberMeWasChecked && currentUsername) {
        // Get the password that was entered during login (stored temporarily in sessionStorage)
        const password = sessionStorage.getItem('tempPassword') || DEFAULT_CREDENTIALS.password;

        localStorage.setItem('rememberedUsername', currentUsername);
        localStorage.setItem('rememberedPassword', password);
        localStorage.setItem('rememberMeEnabled', 'true');
    } else {
        // Clear remembered credentials if remember me was not checked
        clearRememberedCredentials();
    }

    // Clear session (including temporary password)
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('rememberMeChecked');
    sessionStorage.removeItem('tempPassword');

    // Stop all streams
    if (typeof stopAllStreams === 'function') {
        stopAllStreams();
    }

    // Show landing page
    showLandingPage();
}

/**
 * Show login error message
 * @param {string} message - Error message to display
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

/**
 * Hide login error message
 */
function hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
    return sessionStorage.getItem('isAuthenticated') === 'true';
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');

    if (passwordInput && eyeIcon && eyeOffIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.add('hidden');
            eyeOffIcon.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('hidden');
            eyeOffIcon.classList.add('hidden');
        }
    }
}

/**
 * Initialize password toggle functionality
 */
function initPasswordToggle() {
    const toggleButton = document.getElementById('toggle-password');
    if (toggleButton) {
        // Use onclick assignment to prevent duplicate listeners
        toggleButton.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePasswordVisibility();
        };
    }
}

/**
 * Show forgot password modal
 */
function showForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    const form = document.getElementById('forgot-password-form');
    const message = document.getElementById('forgot-password-message');
    const usernameInput = document.getElementById('forgot-username');

    if (modal) {
        modal.classList.remove('hidden');
    }
    if (form) {
        form.reset();
    }
    if (message) {
        message.className = 'hidden';
        message.textContent = '';
    }
    if (usernameInput) {
        usernameInput.focus();
    }
}

/**
 * Close forgot password modal
 */
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    const message = document.getElementById('forgot-password-message');
    const form = document.getElementById('forgot-password-form');

    if (modal) {
        modal.classList.add('hidden');
    }
    if (message) {
        message.className = 'hidden';
        message.textContent = '';
    }
    if (form) {
        form.reset();
    }
}

/**
 * Handle forgot password form submission
 * @param {Event} event - Form submit event
 */
function handleForgotPassword(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('forgot-username');
    const message = document.getElementById('forgot-password-message');

    if (!usernameInput || !message) return;

    const username = usernameInput.value.trim();
    message.classList.add('hidden');
    message.textContent = '';

    if (!username) {
        message.textContent = 'Please enter your username.';
        message.className = 'p-3 rounded-lg text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200';
        message.classList.remove('hidden');
        return;
    }

    if (username === DEFAULT_CREDENTIALS.username) {
        message.innerHTML = `
            <div class="space-y-2">
                <p class="font-semibold text-green-700 dark:text-green-200">Password Reminder</p>
                <p class="text-gray-700 dark:text-gray-200">Your default password is: <span class="font-mono font-semibold">${DEFAULT_CREDENTIALS.password}</span></p>
                <p class="text-xs text-gray-600 dark:text-gray-400">Use these demo credentials to log in.</p>
            </div>
        `;
        message.className = 'p-3 rounded-lg text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 space-y-2';
        message.classList.remove('hidden');
    } else {
        message.textContent = 'Username not found. Please try again.';
        message.className = 'p-3 rounded-lg text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200';
        message.classList.remove('hidden');
    }
}

/**
 * Initialize forgot password interactions
 */
function initForgotPassword() {
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.onclick = (e) => {
            e.preventDefault();
            showForgotPasswordModal();
        };
    }

    const form = document.getElementById('forgot-password-form');
    if (form) {
        form.onsubmit = handleForgotPassword;
    }

    const closeBtn = document.getElementById('close-forgot-password-modal');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            closeForgotPasswordModal();
        };
    }

    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeForgotPasswordModal();
            }
        });
    }
}

/**
 * Initialize authentication check on page load
 */
function initAuth() {
    // Clear remembered credentials on page load/refresh (browser close or refresh)
    // This ensures credentials are only saved after logout, not after refresh
    clearRememberedCredentials();

    // Initialize password toggle
    initPasswordToggle();

    // Initialize forgot password interactions
    initForgotPassword();

    // Check if user is already authenticated
    if (isAuthenticated()) {
        showMainApp();
        // App will be initialized by main.js
    } else {
        showLandingPage();
    }
}

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

