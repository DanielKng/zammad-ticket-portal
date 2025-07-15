// Author: Daniel Könning
// ===============================
// nf-utils.js - Central utility functions and classes
// ===============================
// This file contains reusable helper functions, logger system,
// error handling, localStorage wrapper, file validation, and other
// utility functions used across the project.

import { isAllowedStyle, hasProblematicColor } from './nf-helpers.js';

// ===============================
// LOGGER SYSTEM FOR DEBUGGING AND MONITORING
// ===============================

/**
 * Advanced logger class for structured logging with configurable log levels
 * Supports different log levels and can be enabled/disabled for debugging
 */
class NFLogger {
    /**
     * Constructor for logger instance
     * @param {Object} config - Logger configuration object
     * @param {boolean} config.enabled - Enable/disable logging
     * @param {string} config.logLevel - Minimum log level ('debug', 'info', 'warn', 'error')
     */
    constructor(config = {}) {
        this.enabled = config.enabled || false;           // Logger on/off (should be false in production)
        this.level = config.logLevel || 'info';           // Default log level
        this.levels = { verbose: -1, debug: 0, info: 1, warn: 2, error: 3 }; // Numeric level mapping for comparisons
    }
    
    /**
     * Central log method - all other log methods use this
     * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
     * @param {string} message - Main log entry message
     * @param {*} data - Optional additional data (objects, arrays, etc.)
     */
    log(level, message, data = null) {
        if (!this.enabled) return;
        // Only log if level is >= configured level
        if (this.levels[level] < this.levels[this.level]) return;
        const timestamp = new Date().toISOString();
        const prefix = `[NF-${level.toUpperCase()}] ${timestamp}:`;
        if (data) {
            if (level === 'error') {
                console.error(prefix, message, data);
            } else if (level === 'warn') {
                console.warn(prefix, message, data);
            } else if (level === 'info') {
                console.info(prefix, message, data);
            } else if (level === 'debug') {
                console.debug(prefix, message, data);
            } else {
                console.log(prefix, message, data);
            }
        } else {
            if (level === 'error') {
                console.error(prefix, message);
            } else if (level === 'warn') {
                console.warn(prefix, message);
            } else if (level === 'info') {
                console.info(prefix, message);
            } else if (level === 'debug') {
                console.debug(prefix, message);
            } else {
                console.log(prefix, message);
            }
        }
    }
    verbose(message, data) { this.log('verbose', message, data); }
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

// ===============================
// GLOBAL LOGGER INSTANCE
// ===============================
// Create central logger instance with config from NF_CONFIG
let nfLogger;
if (typeof window !== 'undefined' && window.NF_CONFIG && window.NF_CONFIG.debug) {
    nfLogger = new NFLogger({
        enabled: !!window.NF_CONFIG.debug.enabled,
        logLevel: window.NF_CONFIG.debug.logLevel
    });
} else {
    nfLogger = new NFLogger({ enabled: false, logLevel: 'info' });
}

// ===============================
// ADVANCED ERROR CLASS FOR STRUCTURED ERROR HANDLING
// ===============================

/**
 * Advanced error class with additional metadata for better error handling
 * Allows categorized errors with error codes and extra details
 */
class NFError extends Error {
    /**
     * Constructor for advanced error instance
     * @param {string} message - User-friendly error message
     * @param {string} code - Unique error code for programmatic handling
     * @param {*} details - Additional technical details about the error
     */
    constructor(message, code = 'GENERAL_ERROR', details = null) {
        super(message);
        this.name = 'NFError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

// ===============================
// UTILITY FUNCTIONS - CENTRAL HELPER LIBRARY
// ===============================

/**
 * Collection of helper functions for common operations
 * Organized in thematic groups for better clarity
 */
const NFUtils = {
    // ===============================
    // HTML SANITIZATION (BASIC)
    // ===============================
    
    /**
     * Simple HTML sanitization to prevent XSS attacks
     * Converts HTML tags to safe text representation
     * 
     * @param {string} html - Potentially unsafe HTML string
     * @returns {string} Sanitized text version
     */
    sanitizeHtml(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    // ===============================
    // HTML CLEANING FOR SAFE DISPLAY
    // ===============================
    
    /**
     * Cleans HTML content from unwanted inline styles and attributes
     * Removes problematic style attributes from rich-text editors
     * 
     * @param {string} htmlContent - HTML content to clean
     * @returns {string} Cleaned HTML content without unwanted styles
     */
    cleanHtml(htmlContent) {
        if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const allowedStyles = [
                'font-weight', 'font-style', 'text-decoration',
                'text-align', 'margin', 'padding', 'color'
            ];
            const problematicColors = [
                'rgb(219, 219, 220)', 'rgb(219,219,220)',
                '#dbdbdc', '#DBDBDC'
            ];
            const elementsWithStyle = tempDiv.querySelectorAll('[style]');
            elementsWithStyle.forEach(element => {
                const currentStyle = element.getAttribute('style');
                if (hasProblematicColor(currentStyle, problematicColors)) {
                    element.removeAttribute('style');
                    nfLogger?.debug('Removed problematic style attribute', { element: element.tagName, style: currentStyle });
                } else {
                    // Optionally keep only allowed styles
                    const filtered = currentStyle.split(';').filter(s => isAllowedStyle(s, allowedStyles)).join(';');
                    if (filtered) {
                        element.setAttribute('style', filtered);
                    } else {
                        element.removeAttribute('style');
                    }
                }
            });
            const emptySpans = tempDiv.querySelectorAll('span');
            emptySpans.forEach(span => {
                if (!span.hasAttributes() && span.textContent.trim() === '') {
                    span.remove();
                }
            });
            return tempDiv.innerHTML;
        } catch (error) {
            nfLogger?.warn('HTML cleaning failed, returning original content', { error: error.message });
            return htmlContent;
        }
    },

    // ===============================
    // DEBOUNCE FUNCTION FOR PERFORMANCE OPTIMIZATION
    // ===============================
    
    /**
     * Debounce function to reduce API calls on fast user input
     * Prevents excessive search calls during typing
     * 
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms before execution (configurable in NF_CONFIG.ui.debounceTimeout)
     * @returns {Function} Debounced version of the original function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    /**
     * Convenience function for debounce with configured timeout
     * Uses the value from NF_CONFIG.ui.debounceTimeout
     * 
     * @param {Function} func - Function to debounce
     * @returns {Function} Debounced version with configured timeout
     */
    debounceConfigured(func) {
        const timeout = window.NF_CONFIG?.ui?.debounceTimeout || 300;
        return this.debounce(func, timeout);
    },

    // ===============================
    // SAFE LOCALSTORAGE ACCESS WITH ERROR HANDLING
    // ===============================
    
    /**
     * Wrapper object for safe localStorage access with automatic error handling
     * Prevents crashes if storage is full or localStorage is disabled
     */
    storage: {
        /**
         * Stores a value in localStorage with automatic JSON serialization
         * @param {string} key - Unique key for the stored value
         * @param {*} value - Value to store (will be converted to JSON)
         * @returns {boolean} true on success, false on error
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                nfLogger.warn(window.nfLang.getUtilsMessage('localStorageWriteFailed'), { key, error: e.message });
                return false;
            }
        },
        /**
         * Loads a value from localStorage with automatic JSON deserialization
         * @param {string} key - Key of the value to load
         * @param {*} defaultValue - Return value if key does not exist or error occurs
         * @returns {*} Stored value or defaultValue
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                nfLogger.warn(window.nfLang.getUtilsMessage('localStorageReadFailed'), { key, error: e.message });
                return defaultValue;
            }
        },
        /**
         * Removes a value from localStorage
         * @param {string} key - Key of the value to remove
         * @returns {boolean} true on success, false on error
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                nfLogger.warn(window.nfLang.getUtilsMessage('localStorageRemoveFailed'), { key, error: e.message });
                return false;
            }
        }
    },

    // ===============================
    // RETRY MECHANISM FOR ROBUST API CALLS
    // ===============================
    
    /**
     * Retry wrapper for API calls with exponential backoff
     * Automatically retries failed requests with increasing delays
     * 
     * @param {Function} fn - Async function to retry
     * @param {number} maxAttempts - Maximum number of attempts (default: 3)
     * @param {number} delay - Base delay in ms (default: 1000ms)
     * @returns {Promise} Result of the successful function or last error
     */
    withRetry: async function(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                nfLogger?.warn(window.nfLang.getUtilsMessage('retryAttemptFailed', { attempt }), { error: error.message });
                if (attempt === maxAttempts) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
            }
        }
    }
};

// ===============================
// PERFORMANCE MONITORING SYSTEM
// ===============================

/**
 * Simple performance monitoring class for measuring execution times
 * Uses the native Performance API for precise timing
 */
class NFPerformance {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }
    /**
     * Sets a performance mark for the start of a measurement
     * @param {string} markName - Unique name for the mark
     */
    mark(markName) {
        const timestamp = performance.now();
        this.marks.set(markName, timestamp);
        nfLogger.debug(`Performance mark set: ${markName}`, { timestamp });
    }
    /**
     * Ends a measurement and calculates the elapsed time
     * @param {string} measureName - Name for the measurement
     * @param {string} startMark - Name of the start mark
     */
    measure(measureName, startMark) {
        const startTime = this.marks.get(startMark);
        if (!startTime) {
            nfLogger.warn(window.nfLang.getUtilsMessage('performanceMarkNotFound', { mark: startMark }));
            return;
        }
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.measures.set(measureName, duration);
        nfLogger.info(`Performance measure: ${measureName}`, { 
            duration: `${duration.toFixed(2)}ms`,
            startMark 
        });
    }
    /**
     * Gets a stored measurement
     * @param {string} measureName - Name of the measurement
     * @returns {number|null} Duration in ms or null
     */
    getMeasure(measureName) {
        return this.measures.get(measureName) || null;
    }
}

// Global performance instance
const nfPerf = new NFPerformance();

// ===============================
// GLOBAL AVAILABILITY OF ALL UTILITIES
// ===============================
// Make all classes and functions globally available for other modules
window.NFLogger = NFLogger;
window.NFError = NFError;
window.NFUtils = NFUtils;
window.nfLogger = nfLogger;
window.nfReinitializeLogger = nfReinitializeLogger;
window.NFPerformance = NFPerformance;
window.nfPerf = nfPerf;

// Use nfLabels for message and label lookups instead of repeated config calls
/**
 * Returns a system/user message in the current language.
 * Usage: nfGetMessage('ticketCreated')
 */
function nfGetMessage(key, placeholders = {}) {
    return window.nfLang.getMessage(key, placeholders);
}
window.nfGetMessage = nfGetMessage;

// ===============================
// LOGGER REINITIALIZATION FUNCTION
// ===============================
/**
 * Reinitializes the logger with current NF_CONFIG values
 * This should be called after NF_CONFIG is fully loaded
 */
function nfReinitializeLogger() {
    if (typeof window !== 'undefined' && window.NF_CONFIG && window.NF_CONFIG.debug) {
        nfLogger = new NFLogger({
            enabled: !!window.NF_CONFIG.debug.enabled,
            logLevel: window.NF_CONFIG.debug.logLevel || 'info'
        });
        nfLogger.debug('Logger reinitialized with config', {
            enabled: !!window.NF_CONFIG.debug.enabled,
            logLevel: window.NF_CONFIG.debug.logLevel || 'info'
        });
    } else {
        nfLogger = new NFLogger({ enabled: false, logLevel: 'info' });
        nfLogger.warn('Logger reinitialized with defaults - NF_CONFIG not available');
    }
}
