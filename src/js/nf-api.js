import { nfApiFetch, nfApiGet, nfApiPost, nfApiPut, nfApiDelete } from './nf-api-utils.js';
import { ZAMMAD_API_URL, nf } from './nf-dom.js';
import { nfFileToBase64 } from './nf-file-upload.js';

// Author: Daniel Könning
// ===============================
// nf-api.js - API communication and authentication with Zammad
// ===============================
// This file contains all functions for communication with the Zammad API.
// It manages authentication, ticket CRUD operations, caching, and error handling.
// All API calls are asynchronous and use the modern fetch() API with retry mechanism.

// ===============================
// USER AUTHENTICATION
// ===============================

/**
 * Authenticates a user against the Zammad API and stores the credentials
 * Uses HTTP Basic Authentication and validates credentials via /users/me endpoint
 * 
 * @param {string} username - Username or email address
 * @param {string} password - User password in plain text
 * @returns {Promise<Object>} User data object from Zammad or throws error
 */
async function nfAuthenticateUser(username, password) {
    // Performance measurement start (with fallback)
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark('auth-start');
    }
    
    try {
        // ===============================
        // INPUT VALIDATION
        // ===============================
        const cleanUsername = username.trim();  // Remove whitespace from start/end
        const cleanPassword = password.trim();  // Remove whitespace from start/end
        nfLogger.debug('Cleaned username', { cleanUsername });
        nfLogger.debug('Cleaned password length', { length: cleanPassword.length, masked: true });
        // Check if both fields are filled
        if (!cleanUsername || !cleanPassword) {
            nfLogger.error('Missing credentials', { cleanUsername, cleanPassword });
            const errorMessage = nfGetMessage('missingCredentials');
            if (typeof NFError !== 'undefined') {
                throw new NFError(errorMessage, 'MISSING_CREDENTIALS');
            } else {
                throw new Error(errorMessage);
            }
        }
        
        // ===============================
        // CREATE BASIC AUTH CREDENTIALS
        // ===============================
        const authString = `${cleanUsername}:${cleanPassword}`;  // Format: "user:pass"
        const credentials = btoa(authString);                    // Base64 encoding for HTTP Basic Auth
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Attempting authentication', { username: cleanUsername });
        }
        
        window.nfLogger.debug('Authentication starting', { 
            username: cleanUsername,
            hasConfig: !!window.NF_CONFIG,
            apiUrl: ZAMMAD_API_URL()
        });
        
        // ===============================
        // API CALL FOR AUTHENTICATION
        // ===============================
        // Use /users/me endpoint to validate credentials
        nfLogger.debug('About to fetch', { url: `${ZAMMAD_API_URL()}/users/me` });
        const response = await nfApiGet(`${ZAMMAD_API_URL()}/users/me`, {
            headers: {
                'Authorization': `Basic ${credentials}`,  // HTTP Basic Authentication Header
                'Content-Type': 'application/json'
            }
        });
        
        // ===============================
        // RESPONSE VALIDATION
        // ===============================
        if (!response.ok) {
            if (response.status === 401) {
                // ===============================
                // LOGIN ATTEMPTS TRACKING
                // ===============================
                nf._loginAttempts++;
                const maxAttempts = window.NF_CONFIG.ui.login.maxAttempts;
                
                if (nf._loginAttempts >= maxAttempts) {
                    // Lock account after too many attempts
                    nf._isAccountLocked = true;
                    const lockoutMessage = nfGetMessage('lockoutMessage');
                    const errorMessage = lockoutMessage;
                    if (typeof NFError !== 'undefined') {
                        throw new NFError(errorMessage, 'ACCOUNT_LOCKED');
                    } else {
                        throw new Error(errorMessage);
                    }
                }
                
                // 401 = Unauthorized - invalid credentials
                // Simplified: no remaining attempts, just a generic warning
                const errorMessage = nfGetMessage('invalidCredentials');
                const warningMessage = nfGetMessage('attemptsWarning');
                if (typeof NFError !== 'undefined') {
                    const error = new NFError(errorMessage, 'INVALID_CREDENTIALS');
                    error.attemptsWarning = warningMessage;
                    throw error;
                } else {
                    const error = new Error(errorMessage);
                    error.attemptsWarning = warningMessage;
                    throw error;
                }
            }
            // Other HTTP errors (500, 503, etc.)
            const errorMessage = nfGetMessage('authFailed', undefined, { status: response.status });
            if (typeof NFError !== 'undefined') {
                throw new NFError(errorMessage, 'AUTH_FAILED');
            } else {
                throw new Error(errorMessage);
            }
        }
        
        // ===============================
        // SUCCESSFUL AUTHENTICATION
        // ===============================
        const userData = await response.json();  // Parse JSON response
        nf.userToken = credentials;              // Store Base64 credentials for further API calls
        nf.userId = userData.id;                 // Store user ID for ticket assignment
        
        // ===============================
        // RESET LOGIN ATTEMPTS
        // ===============================
        // Reset all attempt counters on successful login
        nf._loginAttempts = 0;
        nf._isAccountLocked = false;
        
        // ===============================
        // OPTIONALLY STORE SESSION DATA
        // ===============================
        // Store session information in local storage (if NFUtils available)
        if (typeof NFUtils !== 'undefined' && NFUtils.storage) {
            NFUtils.storage.set('nf_session', {
                userId: userData.id,
                username: cleanUsername,
                timestamp: Date.now()              // Timestamp for session timeout
            });
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Authentication successful', { userId: userData.id });
        }
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure('Authentication', 'auth-start');  // Complete performance measurement
        }
        
        return userData;  // Return user data to calling function
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Authentication failed', { error: error.message });
        }
        throw error;  // Pass error to calling function
    }
}

// ===============================
// LOAD TICKET DETAILS AND MESSAGES
// ===============================

/**
 * Loads detailed information for a specific ticket including all messages/articles
 * Combines ticket data and related articles in a single object
 * 
 * @param {number} ticketId - The unique ID of the ticket in Zammad
 * @returns {Promise<Object>} Ticket object with attached messages or throws error
 */
async function nfFetchTicketDetail(ticketId) {
    const cacheKey = `ticket_detail_${ticketId}`;  // Cache key for specific ticket
    
    // ===============================
    // CACHE CHECK (WITH FALLBACK)
    // ===============================
    // Check if cached ticket details are available
    if (typeof nfCache !== 'undefined') {
        const cached = nfCache.get(cacheKey);
        if (cached) {
            if (typeof nfLogger !== 'undefined') {
                const cacheAgeMs = Date.now() - (cached.cachedAt || 0);
                const cacheAgeSeconds = Math.round(cacheAgeMs / 1000);
                nfLogger.debug('Using cached ticket detail', { key: cacheKey, ticketId, cacheAgeSeconds });
                nfLogger.info('Ticket detail loaded from cache', { ticketId, cacheAgeSeconds });
            }
            return cached;  // Return cached details without API call
        } else {
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('No cached ticket detail found, fetching from API', { key: cacheKey, ticketId });
            }
        }
    }
    
    // Performance measurement start (with fallback)
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark('fetch-ticket-detail-start');
    }
    
    try {
        // ===============================
        // LOAD TICKET BASIC DATA
        // ===============================
        // Load the basic information of the ticket (title, status, date, etc.)
        const ticketResponse = await nfApiGet(`${ZAMMAD_API_URL()}/tickets/${ticketId}`, {
            headers: {
                'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                'Content-Type': 'application/json'
            }
        });
        
        if (!ticketResponse.ok) throw new Error('Error loading ticket details');
        
        const ticket = await ticketResponse.json();  // Parse ticket basic data
        
        // ===============================
        // LOAD TICKET ARTICLES/MESSAGES
        // ===============================
        // Load all articles (messages, replies, internal notes) of the ticket
        const articlesResponse = await nfApiGet(`${ZAMMAD_API_URL()}/ticket_articles/by_ticket/${ticketId}`, {
            headers: {
                'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                'Content-Type': 'application/json'
            }
        });
        
        if (!articlesResponse.ok) throw new Error('Error loading ticket articles');
        
        const articles = await articlesResponse.json();  // Parse articles array
        ticket.articles = articles;                       // Add articles to ticket object
        
        // ===============================
        // PREPARE MESSAGES FOR DISPLAY
        // ===============================
        // Convert Zammad articles to a uniform format for the UI
        ticket.messages = (articles || []).map(a => ({
            from: a.from || (a.sender_id === 1 ? 'Support' : 'User'),  // Determine sender (Support/User)
            date: a.created_at,     // Message creation date
            body: a.body || ''      // Message content (HTML or text)
        }));
        
        // ===============================
        // CONDITIONAL CACHE TICKET DETAILS
        // ===============================
        // Cache strategy based on ticket age and state:
        // - Active current year tickets: cache for 15 minutes (refreshable)
        // - Closed current year tickets: cache for 4 hours (recent, might get updates)
        // - Archived tickets (previous years): cache for 30 days (stable, rarely change)
        if (typeof nfCache !== 'undefined') {
            const ticketYear = new Date(ticket.created_at).getFullYear();
            const currentYear = new Date().getFullYear();
            const ticketStateId = ticket.state_id;
            
            // Get closed state IDs from config
            const closedStateIds = window.NF_CONFIG.ui.filters.statusCategories.closed;
            const isClosedTicket = closedStateIds.includes(ticketStateId);
            
            let cacheTTL;
            let cacheDescription;
            let cacheReason;
            
            if (ticketYear < currentYear) {
                // Archived tickets (any status): long cache
                cacheTTL = window.NF_CONFIG.ui.cache.archivedTicketDetailTTL;
                cacheDescription = 'long-term (archived)';
                cacheReason = 'previous year';
            } else if (isClosedTicket) {
                // Current year closed tickets: medium cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearClosedTicketDetailTTL;
                cacheDescription = 'medium-term (closed current year)';
                cacheReason = 'closed current year';
            } else {
                // Current year active tickets: short cache (refreshable)
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearActiveTicketDetailTTL;
                cacheDescription = 'short-term (active current year)';
                cacheReason = 'active current year';
            }
            
            // Add timestamp for better logging
            ticket.cachedAt = Date.now();
            nfCache.set(cacheKey, ticket, cacheTTL);
            
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Ticket detail cache strategy', { 
                    key: cacheKey, 
                    ticketId, 
                    articleCount: articles.length, 
                    strategy: cacheDescription,
                    reason: cacheReason,
                    ttlMinutes: Math.round(cacheTTL / (60 * 1000)),
                    ticketYear,
                    currentYear,
                    ticketStateId,
                    isClosedTicket,
                    localStorage: true 
                });
            }
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Ticket detail fetched successfully', { ticketId, articleCount: articles.length });
        }
        
        // Performance measurement complete (with fallback)
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure('Fetch Ticket Detail', 'fetch-ticket-detail-start');
        }
        
        return ticket;  // Return complete ticket object
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Failed to fetch ticket detail', { ticketId, error: error.message });
        }
        throw error;  // Pass error to calling function
    }
}

// ===============================
// CREATE NEW TICKET
// ===============================

/**
 * Creates a new ticket in Zammad with optional file attachments
 * Automatically converts files to Base64 for API upload
 * 
 * @param {string} subject - Subject/title of the new ticket
 * @param {string} body - Message text of the ticket (can contain HTML)
 * @param {FileList|Array} files - Optional: array of file objects for attachments
 * @returns {Promise<Object>} The created ticket object or throws error
 */
async function nfCreateTicket(subject, body, files) {
    try {
        // ===============================
        // INPUT VALIDATION
        // ===============================
        if (!subject || !body) throw new Error('Subject and message are required');
        
        // ===============================
        // PROCESS FILE ATTACHMENTS
        // ===============================
        let attachments = [];
        if (files && files.length > 0) {
            // Iterate over all selected files
            for (const file of files) {
                const base64Data = await nfFileToBase64(file);  // Convert file to Base64
                attachments.push({
                    filename: file.name,      // Original file name
                    data: base64Data,        // Base64 encoded file data
                    'mime-type': file.type   // MIME type of the file (e.g. image/jpeg)
                });
            }
        }
        
        // ===============================
        // STRUCTURE TICKET DATA
        // ===============================
        // Create ticket object according to Zammad API schema
        const ticketData = {
            title: subject,                    // Ticket title
            group_id: window.NF_CONFIG.ui.defaultGroup,  // Default group from configuration
            customer_id: nf.userId,           // Use ID of logged in user
            article: {                        // First message of the ticket
                subject: subject,             // Subject of the first message
                body: body,                   // Content of the first message
                type: 'web',                  // Type: web (created via web interface)
                attachments: attachments.length > 0 ? attachments : undefined  // Attachments only if present
            }
        };
        
        // ===============================
        // API CALL TO CREATE TICKET
        // ===============================
        // Send POST request to Zammad API to create ticket
        const response = await nfApiPost(`${ZAMMAD_API_URL()}/tickets`, ticketData, {
            headers: {
                'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error creating ticket');
        
        return await response.json();  // Return created ticket object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}

// ===============================
// SEND TICKET REPLY
// ===============================

/**
 * Sends a reply/note to an existing ticket with optional attachments
 * Distinguishes between public replies and internal notes
 * 
 * @param {number} ticketId - ID of the ticket to reply to
 * @param {string} text - Reply text (can contain HTML)
 * @param {FileList|Array} files - Optional: array of file objects for attachments
 * @returns {Promise<Object>} Updated ticket object or throws error
 */
async function nfSendReply(ticketId, text, files) {
    try {
        // ===============================
        // STRUCTURE REPLY DATA
        // ===============================
        // Create article object for the reply
        const articleData = {
            ticket_id: ticketId,   // ID of the ticket
            body: text,           // Reply text
            type: 'web',          // Type: 'web' for web interface replies
            internal: false       // false = public reply, true = internal note
        };
        
        // ===============================
        // API CALL FOR REPLY
        // ===============================
        // Create new article/reply via POST request to ticket_articles endpoint
        const response = await nfApiPost(`${ZAMMAD_API_URL()}/ticket_articles`, articleData, {
            headers: {
                'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error creating reply');
        
        // ===============================
        // PROCESS ATTACHMENTS (OPTIONAL)
        // ===============================
        // If files were attached, upload them separately
        if (files && files.length > 0) {
            for (const file of files) {
                const base64Data = await nfFileToBase64(file);  // Convert file to Base64
                const attachmentData = {
                    filename: file.name,         // Original file name
                    data: base64Data,           // Base64 encoded file data
                    'Content-Type': file.type   // MIME type of the file
                };
                
                // ===============================
                // SINGLE ATTACHMENT UPLOAD
                // ===============================
                // Upload each attachment separately (Zammad API requirement)
                await nfApiPost(`${ZAMMAD_API_URL()}/ticket_attachment`, attachmentData, {
                    headers: {
                        'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                        'Content-Type': 'application/json'
                    }
                });
            }
        }
        
        return await response.json();  // Return updated ticket object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}

// ===============================
// CLOSE TICKET
// ===============================

/**
 * Closes a ticket by setting the status to 'Closed' (ID: 4)
 * This is a final action - closed tickets can only be reopened by administrators
 * 
 * @param {number} ticketId - ID of the ticket to close
 * @returns {Promise<Object>} Updated ticket object or throws error
 */
async function nfCloseTicket(ticketId) {
    try {
        // ===============================
        // API CALL TO CLOSE TICKET
        // ===============================
        // Update only the status of the ticket via PUT request
        const response = await nfApiPut(`${ZAMMAD_API_URL()}/tickets/${ticketId}`, { state_id: 4 }, {
            headers: {
                'Authorization': `Basic ${nf.userToken}`,  // Use stored credentials
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error closing ticket');
        
        return await response.json();  // Return updated ticket object
    } catch (error) {
        throw error;  // Pass error to calling function
    }
}

// ===============================
// ADVANCED TICKET FILTER FUNCTIONS
// ===============================

/**
 * Loads tickets based on filter criteria (status category, year, etc.)
 * Supports smart caching for different filter combinations
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.statusCategory - 'active', 'closed', or 'all'
 * @param {number} filters.year - Year for archive filter (only for closed)
 * @param {string} filters.sortOrder - 'date_desc' or 'date_asc'
 * @returns {Promise<Array>} Array of filtered ticket objects
 */
async function nfFetchTicketsFiltered(filters = {}) {
    // ===============================
    // PREPARE FILTER PARAMETERS
    // ===============================
    const {
        statusCategory = window.NF_CONFIG?.ui?.filters?.defaultStatusFilter || 'active',
        year = new Date().getFullYear(),
        sortOrder = window.NF_CONFIG?.ui?.filters?.defaultSortOrder || 'date_desc',
        searchQuery = ''
    } = filters;
    
    // ===============================
    // GENERATE CACHE KEY
    // ===============================
    const cacheKey = `tickets_${statusCategory}_${year}_${nf.userId}`;
    const currentYear = new Date().getFullYear();
    
    // ===============================
    // CONDITIONAL CACHING BASED ON YEAR AND STATUS
    // ===============================
    // Cache strategy:
    // - Current year active: 15 minutes (refreshable)
    // - Current year closed: 4 hours (recent, might get updates)
    // - Archived (previous years): 30 days (stable)
    if (typeof nfCache !== 'undefined') {
        const cached = nfCache.get(cacheKey);
        if (cached) {
            let cacheType;
            if (year < currentYear) {
                cacheType = 'archived';
            } else if (statusCategory === 'closed') {
                cacheType = 'current year closed';
            } else {
                cacheType = 'current year active';
            }
            
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug(`Loaded tickets from cache (${cacheType})`, {
                    key: cacheKey,
                    count: cached.length,
                    statusCategory,
                    year,
                    currentYear,
                    cacheType
                });
            }
            return nfSortTickets(cached, sortOrder);
        }
    }
    
    // For current year tickets or cache miss, fetch from API
    if (typeof nfLogger !== 'undefined') {
        const cachingStrategy = year < currentYear ? 'archived (will cache)' : 'current year (no cache)';
        nfLogger.debug('Fetching filtered tickets', {
            query: searchQuery,
            statusCategory,
            year,
            cacheKey,
            strategy: cachingStrategy
        });
    }
    
    // Performance measurement start
    if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
        nfPerf.mark(`fetch-tickets-${statusCategory}-start`);
    }
    
    try {
        // ===============================
        // QUERY PARAMETERS FOR ZAMMAD API
        // ===============================
        let query = `customer_id:${nf.userId}`;
        
        // Add status filter
        const statusCategories = window.NF_CONFIG?.ui?.filters?.statusCategories;
        if (statusCategory !== 'all' && statusCategories) {
            const stateIds = statusCategories[statusCategory];
            if (stateIds && stateIds.length > 0) {
                const stateQuery = stateIds.map(id => `state_id:${id}`).join(' OR ');
                query += ` AND (${stateQuery})`;
            }
        }
        
        // Add year filter (only for closed tickets or specific years)
        if (statusCategory === 'closed' && year !== new Date().getFullYear()) {
            const yearStart = `${year}-01-01T00:00:00Z`;
            const yearEnd = `${year}-12-31T23:59:59Z`;
            query += ` AND created_at:[${yearStart} TO ${yearEnd}]`;
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.debug('Fetching filtered tickets', { 
                query, 
                statusCategory, 
                year,
                cacheKey 
            });
        }
        
        // ===============================
        // API CALL WITH RETRY MECHANISM
        // ===============================
        const baseUrl = window.NF_CONFIG?.api?.baseUrl;
        
        let response;
        if (typeof NFUtils !== 'undefined' && NFUtils.withRetry) {
            response = await NFUtils.withRetry(async () => {
                return nfApiFetch(`${baseUrl}/tickets/search?query=${encodeURIComponent(query)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${nf.userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }, window.NF_CONFIG?.api?.retryAttempts || 3);
        } else {
            response = await nfApiFetch(`${baseUrl}/tickets/search?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${nf.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // ===============================
        // RESPONSE VALIDATION
        // ===============================
        if (!response.ok) {
            const errorMessage = `API error loading filtered tickets: ${response.status} ${response.statusText}`;
            if (typeof NFError !== 'undefined') {
                throw new NFError(errorMessage, 'FETCH_FILTERED_TICKETS_FAILED');
            } else {
                throw new Error(errorMessage);
            }
        }
        
        const result = await response.json();
        const ticketsArray = Array.isArray(result) ? result : (result.tickets || []);
        
        // ===============================
        // CONDITIONAL CACHING BASED ON YEAR AND STATUS
        // ===============================
        if (typeof nfCache !== 'undefined') {
            let cacheTTL;
            let cacheDescription;
            
            if (year < currentYear) {
                // Archived tickets (previous years): long cache
                cacheTTL = window.NF_CONFIG.ui.cache.archivedTicketListTTL;
                cacheDescription = 'archived (30 days)';
            } else if (statusCategory === 'closed') {
                // Current year closed tickets: medium cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearClosedTicketListTTL;
                cacheDescription = 'current year closed (4 hours)';
            } else {
                // Current year active tickets: short cache
                cacheTTL = window.NF_CONFIG.ui.cache.currentYearActiveTicketListTTL;
                cacheDescription = 'current year active (15 minutes)';
            }
            
            nfCache.set(cacheKey, ticketsArray, cacheTTL);
            if (typeof nfLogger !== 'undefined') {
                nfLogger.debug('Cached ticket list', {
                    key: cacheKey,
                    count: ticketsArray.length,
                    cacheType: cacheDescription,
                    ttlMinutes: Math.round(cacheTTL / (60 * 1000)),
                    statusCategory,
                    year,
                    currentYear
                });
            }
        }
        
        if (typeof nfLogger !== 'undefined') {
            const cacheStatus = year < currentYear ? 'cached' : 'not cached (current year)';
            nfLogger.info('Filtered tickets fetched successfully', {
                count: ticketsArray.length,
                statusCategory,
                year,
                cacheStatus
            });
        }
        
        if (typeof nfLogger !== 'undefined') {
            nfLogger.info('Filtered tickets fetched successfully', { 
                count: ticketsArray.length,
                statusCategory,
                year
            });
        }
        
        // Performance measurement complete
        if (typeof nfPerf !== 'undefined' && window.NF_CONFIG?.debug?.enabled) {
            nfPerf.measure(`Fetch Filtered Tickets (${statusCategory})`, `fetch-tickets-${statusCategory}-start`);
        }
        
        return nfSortTickets(ticketsArray, sortOrder);
    } catch (error) {
        if (typeof nfLogger !== 'undefined') {
            nfLogger.error('Failed to fetch filtered tickets', { 
                error: error.message,
                statusCategory,
                year
            });
        }
        throw error;
    }
}

/**
 * Sorts tickets by various criteria
 * 
 * @param {Array} tickets - Array of ticket objects
 * @param {string} sortOrder - 'date_desc', 'date_asc', 'status', 'subject'
 * @returns {Array} Sorted array of tickets
 */
function nfSortTickets(tickets, sortOrder = 'date_desc') {
    const sortedTickets = [...tickets]; // Create copy to not mutate original
    
    switch (sortOrder) {
        case 'date_asc':
            return sortedTickets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        case 'date_desc':
            return sortedTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'status':
            return sortedTickets.sort((a, b) => (a.state_id || 0) - (b.state_id || 0));
        case 'subject':
            return sortedTickets.sort((a, b) => {
                const titleA = (a.title || a.subject || '').toLowerCase();
                const titleB = (b.title || b.subject || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
        default:
            return sortedTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

export { nfAuthenticateUser, nfFetchTicketsFiltered, nfCloseTicket, nfSendReply, nfFetchTicketDetail, nfCreateTicket };