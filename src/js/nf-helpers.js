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

// ===============================
// HTML CLEANING HELPER FUNCTIONS
// ===============================

/**
 * Checks if a CSS style property is allowed
 * @param {string} style - CSS style property to check
 * @param {Array} allowedStyles - Array of allowed style properties
 * @returns {boolean} True if style is allowed
 */
function isAllowedStyle(style, allowedStyles) {
    return allowedStyles.some(allowed => style.trim().startsWith(allowed));
}

/**
 * Checks if a CSS style contains problematic colors
 * @param {string} style - CSS style to check
 * @param {Array} problematicColors - Array of problematic color values
 * @returns {boolean} True if style contains problematic colors
 */
function hasProblematicColor(style, problematicColors) {
    return problematicColors.some(color => style.includes(color));
}

export { nfShow, nfHide, nfSetLoading, nfStateLabel, isAllowedStyle, hasProblematicColor };
// Status/message display logic moved to nf-status.js
// File handling logic moved to nf-file-upload.js