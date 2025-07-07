// Author: Daniel Könning
// ===============================
// nf-config.js - Central configuration file for the Zammad ticket system
// ===============================
// This file contains all important configuration settings for the entire
// ticket frontend. API URLs, UI behavior, security policies
// and debug options are managed centrally here and can be easily adjusted.

// ===============================
// MAIN CONFIGURATION OBJECT
// ===============================
const NF_CONFIG = {
    // ===============================
    // API SETTINGS (Server communication)
    // ===============================
    api: {
        // Base URL of the Zammad API - all API calls use this as the base
        baseUrl: 'https://helpdesk.yourdomain.de/api/v1',
        
        // Knowledge Base configuration for articles and FAQ
        knowledgeBase: {
            id: "1",              // ID of the Knowledge Base in Zammad
            locale: "de-de",      // Article language (German)
            flavor: "public"      // Access mode (public = publicly visible articles)
        },
        
        timeout: 10000,      // API timeout in milliseconds (10 seconds)
        retryAttempts: 3     // Number of retry attempts for failed API calls
    },
    
    // ===============================
    // EXTERNAL LINKS AND RESOURCES
    // ===============================
    links: {
        // URL to the helpdesk/knowledge portal - used for the "To Knowledge Portal" button
        knowledgePortal: 'https://helpdesk.yourdomain.de/help/de-de',
        // Base URL for helpdesk (without /api/v1) - for article links and frontend URLs
        helpdeskBase: 'https://helpdesk.yourdomain.de'
    },
    
    // ===============================
    // SYSTEM SETTINGS (Emails, organization details)
    // ===============================
    system: {
        // Email addresses for system recognition
        supportEmail: 'it-service@yourdomain.com',
        // Asset paths and UI resources
        assets: {
            triggerButtonImage: '../../public/img/it-service_portal.png',
            triggerButtonAlt: 'IT-Service Portal',
            triggerButtonLabel: 'Open IT-Service Portal',
            // ARIA labels for accessibility
            aria: {
                closeMainDialog: 'Close main dialog',
                closeTicketList: 'Close ticket list',
                closeTicketDetails: 'Close ticket details',
                closeGallery: 'Close gallery',
                previousImage: 'Previous image',
                nextImage: 'Next image',
                closeLogin: 'Close login',
                closeNewTicket: 'Close new ticket creation',
                galleryView: 'Gallery view',
                openTicket: 'Open ticket: {title}',
                openArticle: 'Open article: {title}'
            },
            // This is used to hide system-generated emails in the ticket detail view
            // Example: 'IT-Support' hides all emails from the IT-Support system
            // This is useful to avoid cluttering the ticket detail with system messages
            // Adjust this list as needed to filter out unwanted system emails
            // Note: This is a simple string match, so ensure the strings are unique enough to
            // avoid false positives.
            // If you want to filter by email address, use the full email address instead.
            systemEmailFilter: [
                'IT-Support'
            ]
        },
        // Email separators for email content cleanup (used in nf-ticket-detail.js)
        // Adjust this list for your language and organization as needed
        emailSeparators: [
            'From:', 
            'Sent:',
            'To:',
            'Subject:',
            'Best regards',
            'Kind regards',
            'Department',
            'Phone:'
        ],
        // UI labels (for multilingual support or easy adjustment)
        labels: {
            // Main modal
            modalTitle: 'How can we help?',
            modalSubtitle: 'Search the knowledge portal or create a support ticket.',
            searchPlaceholder: 'Search the knowledge portal…',
            closeButton: 'Close',
            // Knowledge portal card
            knowledgePortalTitle: 'Knowledge Portal',
            knowledgePortalDesc: 'Find answers to frequently asked questions',
            knowledgePortalButton: 'To Knowledge Portal',
            // Ticket system card
            ticketSystemTitle: 'Ticket System',
            ticketSystemDesc: 'Create or manage your support requests',
            createTicketButton: 'Create Ticket',
            viewTicketsButton: 'View My Tickets',
            // Ticket list
            ticketListFilters: {
                active: 'Active Tickets',
                closed: 'Closed Tickets',
                all: 'All Tickets'
            },
            ticketListSort: {
                date_desc: 'Newest first',
                date_asc: 'Oldest first',
                status: 'By status',
                subject: 'By subject'
            },
            ticketListHeaders: {
                id: '#',
                subject: 'Subject',
                created: 'Created on',
                status: 'Status'
            },
            ticketListEmpty: 'No tickets found.',
            reloadButton: 'Reload', // Label for the reload button in the ticket list
            // Ticket detail
            ticketDetailActions: {
                reply: 'Reply',
                replyPlaceholder: 'Your reply...',
                sendReply: 'Send reply',
                cancelReply: 'Cancel',
                closeTicket: 'Mark ticket as resolved'
            },
            // Gallery
            galleryAlt: 'Attachment',
            // Status mapping
            unknownStatus: 'Unknown',
            // Login
            loginTitle: 'Login',
            loginLabels: {
                username: 'Username',
                password: 'Password',
                usernamePlaceholder: 'Username',
                passwordPlaceholder: 'Password',
                submitButton: 'Login'
            },
            // Login error messages
            loginErrors: {
                missingCredentials: 'Username and password are required',
                invalidCredentials: 'Invalid login credentials',
                accountLocked: 'Account locked',
                networkError: 'Network error during login',
                serverError: 'Server error during login'
            },
            // New ticket
            newTicketTitle: 'Create new ticket',
            newTicketLabels: {
                subject: 'Subject',
                subjectPlaceholder: 'A short summary of your request',
                body: 'Message',
                bodyPlaceholder: 'Describe your request...',
                attachment: 'File attachment (optional)',
                attachmentText: '📎 Drag files here or click to select',
                submitButton: 'Submit ticket',
                cancelButton: 'Cancel'
            }
        },
    },
    
    // ===============================
    // UI SETTINGS (User interface)
    // ===============================
    ui: {
        statusMessageDuration: 4000,  // Display duration for status messages in milliseconds (4 seconds)
        searchMinLength: 2,           // Minimum length for search terms (search starts at 2 characters)
        maxSearchResults: 10,         // Maximum number of displayed search results
        debounceTimeout: 300,         // Delay for search input in milliseconds (300ms = 0.3 seconds)
                                      // Prevents excessive API calls during typing
        // ===============================
        // LOGIN SECURITY AND ATTEMPTS
        // ===============================
        login: {
            maxAttempts: 3,               // Maximum number of login attempts
            lockoutMessage: 'Account locked. Please contact support.', // Message on lockout
            credentialsHint: 'Use your Windows credentials to log in', // Credentials hint
            attemptsWarning: 'Error! Is the username/password correct?' // Warning message template
        },
        // Mapping of Zammad status IDs to English labels
        // Go to https://helpdesk.yourdomain.com/api/v1/ticket_states
        // to view the available ticket states and their IDs
        // Change this accordingly to match your Zammad configuration
        // This mapping is used to display ticket states in the UI
        // and to filter tickets by status
        ticketStates: {
            1: 'New',
            2: 'Open',
            3: 'Pending reminder',
            4: 'Closed',
            5: 'Merged',
            7: 'Pending close',
            8: 'Waiting for customer',
            9: 'In progress',
            10: 'Waiting for external'
        },
        
        // Cache settings for performance optimization
        cache: {
            ticketListTTL: 5 * 60 * 1000,     // Ticket list cache: 5 minutes
            ticketDetailTTL: 10 * 60 * 1000,  // Ticket details cache: 10 minutes (changes less frequently)
            searchResultsTTL: 2 * 60 * 1000,  // Search results cache: 2 minutes
            closedTicketsTTL: 15 * 60 * 1000, // Closed tickets cache: 15 minutes
            archivedTicketsTTL: 30 * 24 * 60 * 60 * 1000 // Archived tickets cache: 30 days
        },
        // Go to https://helpdesk.yourdomain.com/api/v1/groups
        // to view the available groups and their IDs. Update accordingly.
        defaultGroup: 2,  // Default group ID for newly created tickets in Zammad
        // Filter settings for ticket list
        filters: {
            // Go to https://helpdesk.yourdomain.com/api/v1/ticket_states
            // to view the available ticket states and their IDs.
            // Update this accordingly to match your Zammad configuration
            // NON-LISTED ID's ARE IGNORED!
            statusCategories: {
                active: [1, 3, 8, 9, 10],    // Active tickets: new, pending reminder, waiting for customer, in progress, waiting for external
                closed: [4],              // Closed tickets: closed
                inactive: [2, 7]             // Inactive tickets: open (disabled), pending close (disabled)
            },
            // Default filter when loading the ticket list
            defaultStatusFilter: 'active',    // By default, show only active tickets
            defaultSortOrder: 'date_desc',    // Sort: newest first
            defaultYear: new Date().getFullYear(), // Current year for archive filter
            // Available years for archive filter (current year + 2 years back)
            availableYears: [
                new Date().getFullYear(),
                new Date().getFullYear() - 1,
                new Date().getFullYear() - 2
            ]
        }
    },
    // ===============================
    // SECURITY SETTINGS (File upload and session management)
    // ===============================
    security: {
        // Maximum file size for attachments in bytes (10 MB = 10 * 1024 * 1024 bytes)
        maxFileSize: 10 * 1024 * 1024, 
        // List of allowed MIME types for file uploads
        // Prevents upload of potentially dangerous file formats
        allowedFileTypes: [
            // Image formats for screenshots and documentation
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            // Document formats for attachments and reports
            'application/pdf',         // PDF documents
            'text/plain',             // Plain text files
            'application/msword',     // Old Word documents (.doc)
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // New Word documents (.docx)
        ],
        // Recognized image formats for gallery display
        imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
        // Session timeout in milliseconds (30 minutes = 30 * 60 * 1000)
        // After this time without activity, the user is automatically logged out
        sessionTimeout: 30 * 60 * 1000
    },
    
    // ===============================
    // DEBUG SETTINGS (Development and troubleshooting)
    // ===============================
    debug: {
        enabled: true,           // Debug mode on/off - should be set to false in production
        logLevel: 'debug'        // Minimum log level: 'debug', 'info', 'warn', 'error'
    },
    // ===============================
    // UTILITY/GENERAL MESSAGES (for nf-utils.js and helpers)
    // ===============================
    utilsMessages: {
        localStorageWriteFailed: 'LocalStorage write failed',
        localStorageReadFailed: 'LocalStorage read failed',
        localStorageRemoveFailed: 'LocalStorage remove failed',
        fileTooLarge: 'File too large. Maximum: {max}MB',
        fileTypeNotAllowed: 'File type not allowed',
        retryAttemptFailed: 'Attempt {attempt} failed',
        performanceMarkNotFound: 'Performance mark not found: {mark}',
        ticketListLoadError: 'Error loading tickets: ',
        ticketListFilterError: 'Error filtering tickets: ',
        ticketListStatusSpanMissing: 'statusSpan not found in ticket row template'
    }
};

// ===============================
// GLOBAL AVAILABILITY
// ===============================
// Make the configuration globally available via window.NF_CONFIG,
// so all other JavaScript modules can access it
window.NF_CONFIG = NF_CONFIG;
