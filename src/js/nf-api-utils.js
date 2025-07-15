// nf-api-utils.js - Centralized API fetch utility with retries and error handling
// Author: Daniel Könning

import { NF_CONFIG } from './nf-config.js';

/**
 * Unified API fetch utility with retries and error handling, using config values
 * @param {string} url - The API endpoint
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} [retries] - Number of retry attempts on failure (default: from config)
 * @param {number} [timeout] - Timeout in ms (default: from config)
 * @returns {Promise<Response>} - Resolves with the Response object
 */
export async function nfApiFetch(url, options = {}, retries, timeout) {
    const retryAttempts = typeof retries === 'number' ? retries : NF_CONFIG.api.retryAttempts;
    const timeoutMs = typeof timeout === 'number' ? timeout : NF_CONFIG.api.timeout;
    let lastError;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            // Always return the Response object, let caller handle .ok and .json()
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < retryAttempts) {
                await new Promise(res => setTimeout(res, 500));
            }
        }
    }
    throw lastError;
}

/**
 * Helper for GET requests
 */
export function nfApiGet(url, options = {}, retries, timeout) {
    return nfApiFetch(url, { ...options, method: 'GET' }, retries, timeout);
}

/**
 * Helper for POST requests (JSON)
 */
export function nfApiPost(url, body, options = {}, retries, timeout) {
    return nfApiFetch(url, {
        ...options,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: JSON.stringify(body)
    }, retries, timeout);
}

/**
 * Helper for PUT requests (JSON)
 */
export function nfApiPut(url, body, options = {}, retries, timeout) {
    return nfApiFetch(url, {
        ...options,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: JSON.stringify(body)
    }, retries, timeout);
}
