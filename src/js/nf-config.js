// Author: Daniel Könning
// ===============================
// nf-config.js - Central configuration file for the Zammad ticket system
// ===============================
// This file contains all configuration settings for the ticket frontend.
// API URLs, UI behavior, security policies and debug options are managed centrally here.

// ===============================
// MAIN CONFIGURATION OBJECT
// ===============================
const NF_CONFIG = {
    // ===============================
    // API CONFIGURATION
    // ===============================
    api: {
        baseUrl: 'https://helpdesk.yourdomain.de/api/v1',
        knowledgeBase: {
            id: "1",
            locale: "de-de",
            flavor: "public"
        },
        timeout: 10000,
        retryAttempts: 3
    },

    // ===============================
    // LANGUAGE CONFIGURATION
    // ===============================
    language: {
        default: 'en',
        current: 'en',
        basePath: '../lang',
        supported: {
            en: {
                locale: 'en-US',
                label: 'English'
            },
            de: {
                locale: 'de-DE', 
                label: 'Deutsch'
            }
        },
        paths: {
            ui: '{lang}/ui.json',
            aria: '{lang}/aria.json', 
            system: '{lang}/system.json',
            messages: '{lang}/messages.json',
            utils: '{lang}/utils.json'
        }
    },

    // ===============================
    // EXTERNAL LINKS
    // ===============================
    links: {
        knowledgePortal: 'https://helpdesk.yourdomain.de/help/de-de',
        helpdeskBase: 'https://helpdesk.yourdomain.de'
    },

    // ===============================
    // SYSTEM SETTINGS
    // ===============================
    system: {
        supportEmail: 'it-service@yourdomain.com',
        assets: {
            triggerButtonImage: '../../public/img/it-service_portal.png',
            triggerButtonAlt: 'IT-Service Portal',
            triggerButtonLabel: 'Open IT-Service Portal',
            systemEmailFilter: ['helpdesk@yourdomain.de']  // Hide system emails in ticket details
        }
    },

    // ===============================
    // UI CONFIGURATION
    // ===============================
    ui: {
        // Timing settings
        statusMessageDuration: 4000,
        searchMinLength: 2,
        maxSearchResults: 10,
        debounceTimeout: 300,

        // Login settings
        login: {
            maxAttempts: 3
        },

        // Default group - Get IDs from: https://helpdesk.yourdomain.com/api/v1/groups
        defaultGroup: 2,

        // Cache settings for performance
        cache: {
            searchResultsTTL: 2 * 60 * 1000,                    // 2 minutes
            currentYearActiveTicketListTTL: 15 * 60 * 1000,     // 15 minutes
            currentYearActiveTicketDetailTTL: 15 * 60 * 1000,   // 15 minutes
            currentYearClosedTicketListTTL: 4 * 60 * 60 * 1000, // 4 hours
            currentYearClosedTicketDetailTTL: 4 * 60 * 60 * 1000, // 4 hours
            archivedTicketListTTL: 30 * 24 * 60 * 60 * 1000,   // 30 days
            archivedTicketDetailTTL: 30 * 24 * 60 * 60 * 1000  // 30 days
        },

        // Filter settings - Get status IDs from: https://helpdesk.yourdomain.com/api/v1/ticket_states
        filters: {
            statusCategories: {
                active: [1, 3, 8, 9, 10],   // new, pending reminder, waiting for customer, in progress, waiting for external
                closed: [4],                 // closed
                inactive: [2, 7]             // open (disabled), pending close (disabled)
            },
            defaultStatusFilter: 'active',
            defaultSortOrder: 'date_desc',
            defaultYear: new Date().getFullYear(),
            availableYears: [
                new Date().getFullYear(),
                new Date().getFullYear() - 1,
                new Date().getFullYear() - 2
            ]
        }
    },

    // ===============================
    // SECURITY SETTINGS
    // ===============================
    security: {
        maxFileSize: 10 * 1024 * 1024,  // 10 MB
        allowedFileTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // Email attachments (enabled via emailAttachmentsAllowed)
            'message/rfc822',  // .eml files
            'application/vnd.ms-outlook'  // .msg files
        ],
        imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
        emailAttachmentsAllowed: true,  // Allow email attachments (eml files)
        sessionTimeout: 30 * 60 * 1000  // 30 minutes
    },

    // ===============================
    // DEBUG SETTINGS
    // ===============================
    debug: {
        enabled: true,      // Set to false in production
        logLevel: 'debug'   // 'debug', 'info', 'warn', 'error'
    },
    // ===============================
    // CONFIGURATION VALIDATION
    // ===============================
    validateConfig: function() {
        const errors = [];
        const warnings = [];
        
        // Required configurations
        if (!this.api?.baseUrl) errors.push('api.baseUrl is required');
        if (!this.api?.retryAttempts) errors.push('api.retryAttempts is required');
        if (!this.api?.timeout) errors.push('api.timeout is required');
        if (!this.system?.supportEmail) errors.push('system.supportEmail is required');
        if (!this.ui?.statusMessageDuration) errors.push('ui.statusMessageDuration is required');
        if (!this.ui?.defaultGroup) errors.push('ui.defaultGroup is required');
        if (!this.ui?.login?.maxAttempts) errors.push('ui.login.maxAttempts is required');
        if (!this.ui?.cache?.searchResultsTTL) errors.push('ui.cache.searchResultsTTL is required');
        if (!this.ui?.filters?.statusCategories?.active) errors.push('ui.filters.statusCategories.active is required');
        if (!this.ui?.filters?.statusCategories?.closed) errors.push('ui.filters.statusCategories.closed is required');
        
        // Language validation
        if (!this.language?.current) {
            errors.push('language.current is required');
        } else if (!this.language?.supported?.[this.language.current]) {
            warnings.push(`language.current '${this.language.current}' is not supported, falling back to '${this.language.default || 'en'}'`);
            this.language.current = this.language.default || 'en';
        }
        
        // Debug validation
        if (this.debug && typeof this.debug.enabled !== 'boolean') {
            warnings.push('debug.enabled should be boolean');
        }
        if (this.debug?.enabled && !this.debug.logLevel) {
            errors.push('debug.logLevel is required when debug is enabled');
        }
        
        const isValid = errors.length === 0;
        
        if (!isValid) {
            console.error('NF_CONFIG validation failed:', errors);
        }
        if (warnings.length > 0) {
            console.warn('NF_CONFIG validation warnings:', warnings);
        }
        if (isValid && warnings.length === 0) {
            console.log('NF_CONFIG validation passed');
        }
        
        return { isValid, errors, warnings };
    }
};

// ===============================
// INITIALIZATION
// ===============================
window.NF_CONFIG = NF_CONFIG;

// Validate configuration
const configValidation = NF_CONFIG.validateConfig();
if (!configValidation.isValid) {
    throw new Error('NF_CONFIG validation failed. Check console for details.');
}

// Initialize logger
if (typeof window.nfReinitializeLogger === 'function') {
    window.nfReinitializeLogger();
} else {
    setTimeout(() => {
        if (typeof window.nfReinitializeLogger === 'function') {
            window.nfReinitializeLogger();
        }
    }, 100);
}

// Initialize language manager
if (typeof window !== 'undefined') {
    import('./nf-lang.js').then(({ nfLang }) => {
        nfLang.setLanguage(NF_CONFIG.language.current).then(() => {
            console.log('Language system initialized');
            // Fire event for UI initialization
            window.dispatchEvent(new CustomEvent('nfLanguageReady'));
        }).catch(error => {
            console.error('Failed to initialize language system:', error);
        });
    });
}

export { NF_CONFIG };
