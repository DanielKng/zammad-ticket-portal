import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';
import { nfShow, nfHide } from './nf-helpers.js';

// nf-status.js - Centralized status/message display logic
// Author: Daniel Könning

export function nfShowStatus(msg, type = 'success', targetModal = null) {
    const duration = NF_CONFIG.ui.statusMessageDuration;
    if (!targetModal) {
        targetModal = getActiveModal();
    }
    
    // Special handling for login modal
    if (targetModal === 'login') {
        showLoginStatus(msg, type, duration);
        return;
    }
    
    const statusElement = nfGetOrCreateStatusElement(targetModal);
    if (!statusElement) return;
    statusElement.textContent = msg;
    statusElement.className = `nf-status-msg${getStatusClass(type)}`;
    applyStatusStyling(statusElement, type);
    nfShow(statusElement);
    setTimeout(() => nfHide(statusElement), duration);
}

function showLoginStatus(msg, type, duration) {
    // Hide all login status elements first
    if (nf.loginHint) nfHide(nf.loginHint);
    if (nf.loginWarning) nfHide(nf.loginWarning);
    if (nf.loginLockout) nfHide(nf.loginLockout);
    
    let targetElement;
    switch (type) {
        case 'info':
            targetElement = nf.loginHint;
            break;
        case 'warning':
        case 'error':
            targetElement = nf.loginWarning;
            break;
        case 'lockout':
            targetElement = nf.loginLockout;
            break;
        default:
            targetElement = nf.loginHint;
    }
    
    if (targetElement) {
        targetElement.textContent = msg;
        nfShow(targetElement);
        if (duration > 0) {
            setTimeout(() => nfHide(targetElement), duration);
        }
    }
}

function getActiveModal() {
    const modals = [
        { element: nf.loginContainer, name: 'login' },
        { element: nf.newTicketContainer, name: 'newticket' },
        { element: nf.ticketDetailContainer, name: 'ticketdetail' },
        { element: nf.ticketListContainer, name: 'ticketlist' }
    ];
    for (const modal of modals) {
        if (modal.element && !modal.element.classList.contains('nf-hidden')) {
            return modal.name;
        }
    }
    return 'main';
}

function getStatusClass(type) {
    return type === 'error' ? ' nf-error' :
           type === 'warning' ? ' nf-warning' :
           type === 'info' ? ' nf-info' : '';
}

function applyStatusStyling(element, type) {
    const styles = {
        error: { background: '#dc3545', border: '2px solid #c0392b', color: 'white' },
        warning: { background: '#ffc107', color: '#2d2d5a' },
        info: { background: '#17a2b8', color: 'white' },
        success: { background: '#28a745', color: 'white' }
    };
    const style = styles[type] || styles.success;
    Object.assign(element.style, style);
}

export function nfGetOrCreateStatusElement(modalType) {
    const modalContainers = {
        'login': nf.loginContainer,
        'newticket': nf.newTicketContainer,
        'ticketdetail': nf.ticketDetailContainer,
        'ticketlist': nf.ticketListContainer,
        'main': nf.start
    };
    const container = modalContainers[modalType];
    if (!container) return null;
    
    let statusElement = container.querySelector('.nf-status-msg');
    if (!statusElement) {
        // No fallback: do not create dynamically
        return null;
    }
    return statusElement;
}

/**
 * Clears login status messages
 * @param {string} type - The type of message to clear ('warning', 'info', 'lockout', 'all')
 */
export function nfClearLoginStatus(type = 'all') {
    if (type === 'all' || type === 'info') {
        if (nf.loginHint) nfHide(nf.loginHint);
    }
    if (type === 'all' || type === 'warning') {
        if (nf.loginWarning) nfHide(nf.loginWarning);
    }
    if (type === 'all' || type === 'lockout') {
        if (nf.loginLockout) nfHide(nf.loginLockout);
    }
}
