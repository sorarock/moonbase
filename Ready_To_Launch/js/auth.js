/* ============================================================================
   AUTHENTICATION MANAGER
   Password protection, session management, auto-lock functionality
   ============================================================================ */

const AuthManager = {
    // Session settings
    SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    WARNING_TIMEOUT: 14 * 60 * 1000, // 14 minutes (1 min warning)
    LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_FAILED_ATTEMPTS: 5,
    REMEMBER_ME_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days

    // State
    isLocked: true,
    activityTimer: null,
    warningTimer: null,
    lockoutTimer: null,

    /**
     * Initialize authentication system
     */
    init() {
        console.log('Initializing Authentication Manager...');
        
        // Check if password is set
        if (this.hasPasswordSet()) {
            // Check for remember me token
            if (this.checkRememberMeToken()) {
                this.unlock().catch(err => {
                    console.error('Auto-unlock failed:', err);
                    this.showLoginScreen();
                });
            } else {
                // Check if currently locked out
                if (this.isLockedOut()) {
                    this.showLockoutScreen();
                } else {
                    this.showLoginScreen();
                }
            }
        } else {
            // First time setup
            this.showSetupWizard();
        }

        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Setup form
        const setupForm = document.getElementById('setupForm');
        if (setupForm) {
            setupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSetup();
            });
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Show hint link
        const showHintLink = document.getElementById('showHintLink');
        if (showHintLink) {
            showHintLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPasswordHint();
            });
        }

        // Factory reset link
        const factoryResetLink = document.getElementById('factoryResetLink');
        if (factoryResetLink) {
            factoryResetLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFactoryReset();
            });
        }

        // Lock button
        const lockButton = document.getElementById('lockButton');
        if (lockButton) {
            lockButton.addEventListener('click', () => {
                this.lock();
            });
        }

        // Sync button
        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.addEventListener('click', async () => {
                await StorageManager.syncToCloud();
            });
        }
    },

    // ========================================================================
    // PASSWORD MANAGEMENT
    // ========================================================================

    /**
     * Check if password is set
     * @returns {boolean}
     */
    hasPasswordSet() {
        return localStorage.getItem('masterPasswordHash') !== null;
    },

    /**
     * Hash password using SHA-256
     * @param {string} password - Password to hash
     * @returns {string} Hashed password
     */
    hashPassword(password) {
        return CryptoJS.SHA256(password).toString();
    },

    /**
     * Verify password
     * @param {string} password - Password to verify
     * @returns {boolean} True if correct
     */
    verifyPassword(password) {
        const storedHash = localStorage.getItem('masterPasswordHash');
        const inputHash = this.hashPassword(password);
        return storedHash === inputHash;
    },

    // ========================================================================
    // SETUP WIZARD
    // ========================================================================

    /**
     * Show setup wizard
     */
    showSetupWizard() {
        Utils.toggleElement('#loadingScreen', false);
        Utils.toggleElement('#authScreen', true);
        Utils.toggleElement('#setupWizard', true);
        Utils.toggleElement('#loginScreen', false);
        Utils.toggleElement('#lockoutScreen', false);
    },

    /**
     * Handle setup form submission
     */
    handleSetup() {
        const password = document.getElementById('setupPassword').value;
        const hint = document.getElementById('passwordHint').value;

        // Validate password
        if (!password || password.length < 8) {
            Utils.showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        // Hash and save password
        const passwordHash = this.hashPassword(password);
        localStorage.setItem('masterPasswordHash', passwordHash);

        // Save hint if provided
        if (hint) {
            localStorage.setItem('passwordHint', hint);
        }

        Utils.showNotification('Password created successfully!', 'success');

        // Show app immediately without waiting for Google Drive sync
        // (first-time setup shouldn't be blocked by cloud sync)
        this.isLocked = false;
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionStart', Date.now().toString());

        this.startActivityMonitoring();

        Utils.toggleElement('#authScreen', false);
        Utils.toggleElement('#app', true);

        if (typeof App !== 'undefined') App.init();

        // Initialize Google Drive in background (non-blocking)
        this.initGoogleDriveSync().catch(err => {
            console.error('Google Drive sync failed:', err);
        });
    },

    // ========================================================================
    // LOGIN
    // ========================================================================

    /**
     * Show login screen
     */
    showLoginScreen() {
        Utils.toggleElement('#loadingScreen', false);
        Utils.toggleElement('#authScreen', true);
        Utils.toggleElement('#setupWizard', false);
        Utils.toggleElement('#loginScreen', true);
        Utils.toggleElement('#lockoutScreen', false);

        // Check failed attempts to show hint
        const failedAttempts = this.getFailedAttempts();
        if (failedAttempts >= 3) {
            Utils.toggleElement('#showHintLink', true);
        }

        // Focus password input
        setTimeout(() => {
            document.getElementById('loginPassword')?.focus();
        }, 100);
    },

    /**
     * Handle login form submission
     */
    handleLogin() {
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Verify password
        if (this.verifyPassword(password)) {
            // Reset failed attempts
            this.resetFailedAttempts();

            // Handle remember me
            if (rememberMe) {
                this.setRememberMeToken();
            }

            // Unlock app (now async)
            this.unlock().catch(err => {
                console.error('Unlock failed:', err);
                // Fallback: still show app
                Utils.toggleElement('#authScreen', false);
                Utils.toggleElement('#app', true);
                if (typeof App !== 'undefined') App.init();
            });
        } else {
            // Increment failed attempts
            this.incrementFailedAttempts();
            const failedAttempts = this.getFailedAttempts();

            // Show error
            const errorEl = document.getElementById('loginError');
            if (errorEl) {
                errorEl.textContent = `Incorrect password (${failedAttempts}/${this.MAX_FAILED_ATTEMPTS} attempts)`;
                Utils.toggleElement(errorEl, true);
            }

            // Show hint after 3 attempts
            if (failedAttempts >= 3) {
                Utils.toggleElement('#showHintLink', true);
            }

            // Lockout after max attempts
            if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                this.lockoutUser();
            }

            // Clear password field
            document.getElementById('loginPassword').value = '';
        }
    },

    /**
     * Show password hint
     */
    showPasswordHint() {
        const hint = localStorage.getItem('passwordHint');
        const hintDisplay = document.getElementById('hintDisplay');
        
        if (hint) {
            hintDisplay.innerHTML = `<strong>Hint:</strong> ${hint}`;
            Utils.toggleElement(hintDisplay, true);
        } else {
            hintDisplay.innerHTML = '<em>No password hint was set.</em>';
            Utils.toggleElement(hintDisplay, true);
        }
    },

    // ========================================================================
    // FAILED ATTEMPTS & LOCKOUT
    // ========================================================================

    /**
     * Get failed login attempts
     * @returns {number}
     */
    getFailedAttempts() {
        return parseInt(localStorage.getItem('failedLoginAttempts') || '0');
    },

    /**
     * Increment failed attempts
     */
    incrementFailedAttempts() {
        const attempts = this.getFailedAttempts() + 1;
        localStorage.setItem('failedLoginAttempts', attempts.toString());
        localStorage.setItem('lastFailedAttempt', Date.now().toString());
    },

    /**
     * Reset failed attempts
     */
    resetFailedAttempts() {
        localStorage.removeItem('failedLoginAttempts');
        localStorage.removeItem('lastFailedAttempt');
    },

    /**
     * Lockout user
     */
    lockoutUser() {
        const lockoutUntil = Date.now() + this.LOCKOUT_DURATION;
        localStorage.setItem('lockoutUntil', lockoutUntil.toString());
        this.showLockoutScreen();
    },

    /**
     * Check if user is locked out
     * @returns {boolean}
     */
    isLockedOut() {
        const lockoutUntil = localStorage.getItem('lockoutUntil');
        if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
            return true;
        }
        // Lockout expired, clear it
        localStorage.removeItem('lockoutUntil');
        this.resetFailedAttempts();
        return false;
    },

    /**
     * Show lockout screen
     */
    showLockoutScreen() {
        Utils.toggleElement('#authScreen', true);
        Utils.toggleElement('#setupWizard', false);
        Utils.toggleElement('#loginScreen', false);
        Utils.toggleElement('#lockoutScreen', true);

        // Start countdown timer
        this.startLockoutTimer();
    },

    /**
     * Start lockout countdown timer
     */
    startLockoutTimer() {
        const lockoutUntil = parseInt(localStorage.getItem('lockoutUntil'));
        const timerEl = document.getElementById('lockoutTimer');

        const updateTimer = () => {
            const remaining = lockoutUntil - Date.now();
            
            if (remaining <= 0) {
                clearInterval(this.lockoutTimer);
                this.showLoginScreen();
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        updateTimer();
        this.lockoutTimer = setInterval(updateTimer, 1000);
    },

    // ========================================================================
    // REMEMBER ME
    // ========================================================================

    /**
     * Set remember me token
     */
    setRememberMeToken() {
        const token = Utils.generateId();
        const expiry = Date.now() + this.REMEMBER_ME_DURATION;
        localStorage.setItem('rememberMeToken', token);
        localStorage.setItem('rememberMeExpiry', expiry.toString());
    },

    /**
     * Check remember me token
     * @returns {boolean} True if valid token exists
     */
    checkRememberMeToken() {
        const token = localStorage.getItem('rememberMeToken');
        const expiry = localStorage.getItem('rememberMeExpiry');

        if (token && expiry && Date.now() < parseInt(expiry)) {
            return true;
        }

        // Token expired or missing
        localStorage.removeItem('rememberMeToken');
        localStorage.removeItem('rememberMeExpiry');
        return false;
    },

    /**
     * Clear remember me token
     */
    clearRememberMeToken() {
        localStorage.removeItem('rememberMeToken');
        localStorage.removeItem('rememberMeExpiry');
    },

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /**
     * Unlock app and start session
     */
    async unlock() {
        this.isLocked = false;
        sessionStorage.setItem('sessionActive', 'true');
        sessionStorage.setItem('sessionStart', Date.now().toString());

        // Start activity monitoring first
        this.startActivityMonitoring();

        // CRITICAL: Wait for cloud sync BEFORE showing app
        await this.initGoogleDriveSync();

        // NOW show the app (after data is ready)
        Utils.toggleElement('#authScreen', false);
        Utils.toggleElement('#app', true);

        // Initialize app with fresh data
        if (typeof App !== 'undefined' && typeof App.init === 'function') {
            App.init();
        }

        Utils.showNotification('Welcome back!', 'success', 2000);
    },

    /**
     * Lock app
     */
    lock() {
        this.isLocked = true;
        sessionStorage.removeItem('sessionActive');
        sessionStorage.removeItem('appInitialized');

        // Stop activity monitoring
        this.stopActivityMonitoring();

        // Sign out from Google Drive (optional - keeps user signed in)
        // GoogleDriveManager.signOut();

        // Hide app, show login
        Utils.toggleElement('#app', false);
        this.showLoginScreen();

        Utils.showNotification('Application locked', 'info', 2000);
    },

    /**
     * Initialize Google Drive sync
     */
    async initGoogleDriveSync() {
        try {
            if (typeof GoogleDriveManager === 'undefined') {
                console.log('Google Drive not available');
                return;
            }

            // Initialize Google Drive API
            await GoogleDriveManager.init();

            // Check if already authenticated
            const isAuth = await GoogleDriveManager.checkAuth();

            if (isAuth) {
                console.log('Google Drive already authenticated');

                // Check if local storage has data
                const portfolios = StorageManager.getPortfolios();
                const hasLocalData = portfolios && portfolios.length > 0;

                if (!hasLocalData) {
                    // No local data - this might be first time or new device
                    console.log('No local data found, loading from cloud...');
                    const loaded = await StorageManager.loadFromCloud(true, true); // silent=true, skipReload=true

                    if (loaded) {
                        console.log('✓ Cloud data loaded successfully (no reload needed)');
                    }
                } else {
                    // Has local data - DISABLED auto-sync to prevent 403 errors
                    console.log('Local data exists. Use sync button to manually sync to cloud.');

                    // TEMPORARY: Disable auto-sync on login
                    // The background sync was triggering 403 errors due to stale file IDs
                    // TODO: Re-enable once file verification is confirmed working in production
                    /*
                    StorageManager.syncToCloud().then(() => {
                        console.log('Background sync completed');
                    }).catch(err => {
                        console.error('Background sync failed:', err);
                    });
                    */
                }
            } else {
                console.log('Google Drive not authenticated. Use sync button to authenticate.');
            }

        } catch (error) {
            console.error('Google Drive auto-sync failed:', error);
            // Don't block app if sync fails
        }
    },

    /**
     * Start activity monitoring for auto-lock
     */
    startActivityMonitoring() {
        // Clear any existing timers
        this.stopActivityMonitoring();

        // Set initial timers
        this.resetActivityTimer();

        // Listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        events.forEach(event => {
            document.addEventListener(event, this.handleActivity.bind(this), { passive: true });
        });
    },

    /**
     * Stop activity monitoring
     */
    stopActivityMonitoring() {
        clearTimeout(this.activityTimer);
        clearTimeout(this.warningTimer);
        
        // Remove event listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        events.forEach(event => {
            document.removeEventListener(event, this.handleActivity.bind(this));
        });
    },

    /**
     * Handle user activity
     */
    handleActivity() {
        if (!this.isLocked) {
            this.resetActivityTimer();
        }
    },

    /**
     * Reset activity timer
     */
    resetActivityTimer() {
        // Clear existing timers
        clearTimeout(this.activityTimer);
        clearTimeout(this.warningTimer);

        // Hide warning modal if visible
        Utils.toggleElement('#inactivityModal', false);

        // Set warning timer (1 minute before lock)
        this.warningTimer = setTimeout(() => {
            this.showInactivityWarning();
        }, this.WARNING_TIMEOUT);

        // Set lock timer
        this.activityTimer = setTimeout(() => {
            this.lock();
        }, this.SESSION_TIMEOUT);
    },

    /**
     * Show inactivity warning
     */
    showInactivityWarning() {
        Utils.toggleElement('#inactivityModal', true);
    },

    /**
     * Dismiss inactivity warning (called from HTML)
     */
    dismissInactivityWarning() {
        Utils.toggleElement('#inactivityModal', false);
        this.resetActivityTimer();
    },

    // ========================================================================
    // FACTORY RESET
    // ========================================================================

    /**
     * Handle factory reset
     */
    handleFactoryReset() {
        const confirmation = confirm(
            '⚠️ WARNING: This will delete ALL data including:\n' +
            '- All portfolios\n' +
            '- All transactions\n' +
            '- All account information\n' +
            '- Password and settings\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Have you backed up your data?'
        );

        if (!confirmation) return;

        const finalConfirm = prompt(
            'Type "DELETE ALL DATA" to confirm factory reset:'
        );

        if (finalConfirm === 'DELETE ALL DATA') {
            // Clear all localStorage
            localStorage.clear();
            sessionStorage.clear();

            // Clear remember me
            this.clearRememberMeToken();

            Utils.showNotification('Factory reset complete', 'info', 3000);

            // Reload app
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
};

// Global functions called from HTML
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};

window.dismissInactivityWarning = function() {
    AuthManager.dismissInactivityWarning();
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});

// Export for use in other modules
window.AuthManager = AuthManager;