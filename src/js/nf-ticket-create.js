// nf-ticket-create.js - Ticket creation business logic
// Author: Daniel Könning

import { nfCreateTicket } from './nf-api.js';
import { nfSetLoading } from './nf-helpers.js';
import { nfShowStatus } from './nf-status.js';
import { nfClearFilePreview, nfValidateFile } from './nf-file-upload.js';
import { nf } from './nf-dom.js';

/**
 * Handles submitting the new ticket form
 * Performs full validation, file upload, and API call
 *
 * @param {Event} e - Submit event from the form
 */
export async function handleNewTicketSubmit(e) {
    e.preventDefault();
    nfSetLoading(true);
    try {
        // ===============================
        // COLLECT FORM DATA
        // ===============================
        const subject = nf.newTicketSubject.value.trim();
        const body = nf.newTicketBody.value.trim();
        const files = nf.newTicketAttachment.files;
        // ===============================
        // REQUIRED FIELD VALIDATION
        // ===============================
        if (!subject || !body) {
            throw new window.NFError(window.nfGetMessage('missingFields'), 'MISSING_FIELDS');
        }
        // ===============================
        // FILE VALIDATION
        // ===============================
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    nfValidateFile(file);
                } catch (error) {
                    throw new window.NFError(window.nfGetMessage('fileValidationFailed', undefined, { file: file.name, error: error.message }), 'FILE_VALIDATION_FAILED');
                }
            }
        }
        window.nfLogger.info('Creating ticket', { subject, hasFiles: files.length > 0 });
        // ===============================
        // API CALL TO CREATE TICKET
        // ===============================
        await nfCreateTicket(subject, body, files);
        nfShowStatus(window.nfGetMessage('ticketCreated'), 'success', 'newticket');
        // ===============================
        // NO CACHE INVALIDATION NEEDED
        // ===============================
        // Ticket lists are not cached, so no invalidation needed
        // New tickets will appear immediately when the list is refreshed
        // ===============================
        // RESET FORM
        // ===============================
        nf.newTicketForm.reset();
        nfClearFilePreview();
        // ===============================
        // NAVIGATION AFTER SUCCESS
        // ===============================
        nfShowStart();
    } catch (error) {
        // ===============================
        // ERROR HANDLING
        // ===============================
        window.nfLogger.error('Failed to create ticket', { error: error.message });
        nfShowStatus(error.message || 'Error creating ticket', 'error', 'newticket');
    } finally {
        // ===============================
        // CLEANUP
        // ===============================
        nfSetLoading(false);
    }
}
