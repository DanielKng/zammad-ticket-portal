import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfShow, nfHide } from './nf-helpers.js';
import { nfSetLoading } from './nf-helpers.js';
import { nfShowStatus, nfClearLoginStatus } from './nf-status.js';
import { nfAuthenticateUser } from './nf-api.js';
import nfModal from './nf-modal.js';

// Author: Daniel Könning
// ===============================
// nf-ui.js - UI control and navigation
// ===============================
// This file manages navigation between different views
// of the ticket frontend and controls the modal system with overlays.

// ===============================
// SHOW MAIN MENU
// ===============================

/**
 * Shows the main menu (start screen) and hides all other containers
 * Resets the UI state to the start page
 */
function nfShowStart() {
    window.nfLogger.debug('nfShowStart called');
    // Hide all other containers first
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // Open the main overlay modal
    nfModal.open('nf_modal_overlay');
    
    // ===============================
    // EVENT HANDLER CLEANUP
    // ===============================
    // Clean up login handlers when login modal is closed
    nfCleanupLoginHandlers();
    
    // Remove all blur effects using modal system
    nfModal.unblurBackground();
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after main menu is shown
    nfSetLoading(false);
    
    window.nfLogger.debug('nfShowStart completed successfully');
}

// ===============================
// SHOW TICKET LIST
// ===============================

/**
 * Shows the ticket list with main menu in the background
 * Implements layered modal system with blur effect
 */
function nfShowTicketList() {
    console.log('[DEBUG] nfShowTicketList called');
    
    // Show/hide elements first
    nfShow(nf.start);                 // Show main menu in background
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    
    // Open the ticket list modal (this will show it, set focus, and blur background)
    nfModal.open('nf_ticketlist_container');
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after ticket list is shown
    nfSetLoading(false);
}

// ===============================
// SHOW TICKET DETAILS
// ===============================

/**
 * Shows the ticket details with nested background modals
 * Implements three-layer modal system: Details > List > Main menu
 * Background layers (main menu and ticket list) should be blurred
 */
function nfShowTicketDetail() {
    // Show/hide elements first
    nfShow(nf.start);                 // Show main menu in background
    nfShow(nf.ticketListContainer);   // Show ticket list in middle layer
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form

    // Open the ticket detail modal (this will show it, set focus, and blur background layers)
    nfModal.open('nf_ticketdetail_container');

    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after ticket details are shown
    nfSetLoading(false);
}

// ===============================
// SHOW LOGIN FORM
// ===============================

/**
 * Shows the login form with main menu in the background
 * Used for authentication before protected actions
 */
function nfShowLogin() {
    // Show/hide elements first
    nfShow(nf.start);                 // Show main menu in background
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.newTicketContainer);    // Hide new ticket form

    // Open the login modal (this will show it, set focus, and blur background)
    nfModal.open('nf_login_container');

    // ===============================
    // MANAGE LOGIN HINTS AND STATE
    // ===============================
    nfUpdateLoginDisplay();
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after login form is shown
    nfSetLoading(false);
}

// ===============================
// UPDATE LOGIN DISPLAY
// ===============================

/**
 * Updates the display of the login form based on the current state
 * Shows hints, warnings, or lockout messages as appropriate
 */
function showLockoutMessage() {
    const lockoutMessage = NF_CONFIG.ui.login.lockoutMessage;
    nfShowStatus(lockoutMessage, 'lockout', 'login');
    nf.loginSubmit.disabled = true;
}

function showNormalLoginDisplay() {
    nf.loginSubmit.disabled = false;
    const credentialsHint = window.nfLang.getMessage('credentialsHint');
    if (credentialsHint) {
        nfShowStatus(credentialsHint, 'info', 'login');
    }
}

function showAttemptsWarning() {
    const maxAttempts = NF_CONFIG.ui.login.maxAttempts;
    const remaining = maxAttempts - nf._loginAttempts;
    if (remaining > 0) {
        const attemptsTemplate = NF_CONFIG.ui.login.attemptsWarningTemplate;
        const warningMessage = attemptsTemplate.replace('{remaining}', remaining);
        nfShowStatus(warningMessage, 'warning', 'login');
    }
}

function nfUpdateLoginDisplay() {
    if (!nf.loginContainer || !nf.loginHint || !nf.loginWarning || !nf.loginLockout || !nf.loginSubmit) return;
    if (nf._isAccountLocked) {
        showLockoutMessage();
        return;
    }
    showNormalLoginDisplay();
    if (nf._loginAttempts > 0) {
        showAttemptsWarning();
    } else {
        // Clear warning messages using the centralized status system
        nfClearLoginStatus('warning');
    }
}

// ===============================
// HIDE ALL MODALS
// ===============================

/**
 * Hides all modals and overlays and resets the UI
 * Used for a complete reset of the user interface
 */
function nfHideAll() {
    nfHide(nf.overlay);               // Hide overlay (closes modal system)
    nfHide(nf.start);                 // Hide main menu
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    nfHide(nf.newTicketContainer);    // Hide new ticket form
    // ===============================
    // EVENT HANDLER CLEANUP
    // ===============================
    // Clean up login handlers on complete close
    nfCleanupLoginHandlers();
    // ===============================
    // REMOVE ALL BLUR EFFECTS
    // ===============================
    // Remove all blur effects using modal system
    nfModal.unblurBackground();
    // Focus back on trigger button
    const trigger = document.getElementById('nf-zammad-trigger');
    if (trigger) trigger.focus();
    // Reset aria attributes
    const ids = [
        'nf_modal_overlay',
        'nf_ticketlist_container',
        'nf_ticketdetail_container',
        'nf_gallery_overlay',
        'nf_login_container',
        'nf_new_ticket_container'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('aria-hidden', 'true');
    });
    // Make main content accessible again
    const mainContent = document.querySelector('body > :not(.nf-modal-overlay):not(.nf-ticketlist-container):not(.nf-ticketdetail-container):not(.nf-gallery-overlay):not(.nf-login-container):not(.nf-newticket-container)');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'false');
}

// ===============================
// SHOW NEW TICKET FORM
// ===============================

/**
 * Shows the form for a new ticket with main menu in the background
 * Allows users to create new support requests
 */
function nfShowNewTicket() {
    // Show/hide elements first
    nfShow(nf.start);                 // Show main menu in background
    nfHide(nf.ticketListContainer);   // Hide ticket list
    nfHide(nf.ticketDetailContainer); // Hide ticket details
    nfHide(nf.loginContainer);        // Hide login form
    
    // Open the new ticket modal (this will show it, set focus, and blur background)
    nfModal.open('nf_new_ticket_container');
    
    // ===============================
    // DISABLE LOADER
    // ===============================
    // Hide loading spinner after form is shown
    nfSetLoading(false);
}

// ===============================
// AUTHENTICATION REQUIRED - WRAPPER FUNCTION
// ===============================

/**
 * Ensures that the user is logged in before executing an action
 * Implements automatic login redirection and seamless navigation
 * 
 * @param {Function} next - Callback function to be executed after successful login
 */
function handleLoginSuccess(next) {
    nfHide(nf.loginContainer);
    // Remove all blur effects using modal system
    nfModal.unblurBackground();
    nfCleanupLoginHandlers();
    next();
}

function handleLoginError(error) {
    nfUpdateLoginDisplay();
    if (error.code === 'ACCOUNT_LOCKED') {
        nfShowStatus(error.message, 'error', 'login');
        nfCleanupLoginHandlers();
    } else if (error.code === 'INVALID_CREDENTIALS' && error.attemptsWarning) {
        nfShowStatus(error.message, 'error', 'login');
    } else {
        nfShowStatus(error.message || 'Login failed', 'error', 'login');
    }
    nfSetLoading(false);
}

function nfRequireLogin(next) {
    if (nf.userToken && nf.userId) { next(); return; }
    nfShowLogin();
    nfCleanupLoginHandlers();
    const handler = async (e) => {
        e.preventDefault();
        nfSetLoading(true);
        const username = nf.loginUser.value;
        const password = nf.loginPass.value;
        try {
            await nfAuthenticateUser(username, password);
            handleLoginSuccess(next);
        } catch (error) {
            handleLoginError(error);
        }
    };
    nf._currentLoginHandler = handler;
    nf.loginForm.addEventListener('submit', handler);
}

// ===============================
// HELPER FUNCTIONS FOR LOGIN HANDLER MANAGEMENT
// ===============================

/**
 * Cleans up all login event handlers to avoid duplicates
 * Prevents accumulation of event handlers during multiple login attempts
 */
function nfCleanupLoginHandlers() {
    // Remove saved handler if present
    if (nf._currentLoginHandler && nf.loginForm) {
        nf.loginForm.removeEventListener('submit', nf._currentLoginHandler);
        nf._currentLoginHandler = null;
    }
}

/**
 * Removes blur effect from all modal containers
 */


// ===============================
// RESET LOGIN STATE
// ===============================

/**
 * Resets the login state completely (except account locking)
 * Called when closing the login modal
 */
function nfResetLoginState() {
    // Clean up event handlers
    nfCleanupLoginHandlers();
    
    // Reset login attempts only if the account is not locked
    // (Lock remains until the next successful login)
    if (!nf._isAccountLocked) {
        nf._loginAttempts = 0;
    }
    
    // Clear form contents for security
    if (nf.loginForm) {
        nf.loginForm.reset();
    }
}

export { nfShowStart, nfRequireLogin, nfShowTicketList, nfShowTicketDetail, nfShowNewTicket, nfHideAll, nfResetLoginState };
