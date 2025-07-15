import { NF_CONFIG } from './nf-config.js';
import { nf } from './nf-dom.js';

// Author: Daniel Könning
/**
 * Helper functions for UI manipulation and data processing
 */

// UI helper functions
function nfShow(el) {
    el?.classList.remove('nf-hidden');
}

function nfHide(el) {
    el?.classList.add('nf-hidden');
}

function nfSetLoading(isLoading) {
    isLoading ? nfShow(nf.loader) : nfHide(nf.loader);
}

/**
 * Converts a ticket state ID to an English label
 * @param {number} stateId - The numeric state ID
 * @returns {string} The English status label
 */
function nfStateLabel(stateId) {
    const states = window.nfLang.getSystemData('ticketStates');
    return states[stateId] || window.nfLang.getLabel('unknownStatus');
}

export { nfShow, nfHide, nfSetLoading, nfStateLabel };
// Status/message display logic moved to nf-status.js
// File handling logic moved to nf-file-upload.js