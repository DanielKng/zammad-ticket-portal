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
/**
 * Converts a file to a Base64 string for API uploads
 * @param {File} file - The file object
 * @returns {Promise<string>} Base64 string
 */
function nfFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

export { nfShow, nfHide, nfSetLoading, nfStateLabel };
// Status/message display logic moved to nf-status.js