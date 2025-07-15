import { nf } from './nf-dom.js';
import { NF_CONFIG } from './nf-config.js';

// nf-file-upload.js - File preview and drag-and-drop logic
// Author: Daniel Könning

export function nfUpdateFilePreview() {
    const files = nf.newTicketAttachment.files;
    const previewList = nf.filePreviewList;
    const previewContainer = nf.filePreviewContainer;
    previewList.innerHTML = '';
    if (!files || files.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    previewContainer.style.display = 'block';
    Array.from(files).forEach((file, index) => {
        const previewItem = nfCreateFilePreviewItem(file, index);
        if (previewItem) previewList.appendChild(previewItem);
    });
}

export function nfCreateFilePreviewItem(file, index) {
    // Only use existing HTML structure, do not create elements dynamically
    // If a template or container is missing, return null
    return null;
}

export function nfRemoveFileFromPreview(indexToRemove) {
    const dt = new DataTransfer();
    const files = nf.newTicketAttachment.files;
    Array.from(files).forEach((file, index) => {
        if (index !== indexToRemove) {
            dt.items.add(file);
        }
    });
    nf.newTicketAttachment.files = dt.files;
    nfUpdateFilePreview();
}

export function nfClearFilePreview() {
    if (nf.filePreviewList) nf.filePreviewList.innerHTML = '';
    if (nf.filePreviewContainer) nf.filePreviewContainer.style.display = 'none';
}

export function nfInitializeDragAndDrop() {
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = nf.newTicketAttachment;
    if (!fileUpload || !fileInput) return;
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const highlight = () => fileUpload.classList.add('drag-over');
    const unhighlight = () => fileUpload.classList.remove('drag-over');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUpload.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, unhighlight, false);
    });
    fileUpload.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        const newDataTransfer = new DataTransfer();
        [...fileInput.files, ...files].forEach(file => {
            newDataTransfer.items.add(file);
        });
        fileInput.files = newDataTransfer.files;
        nfUpdateFilePreview();
    }, false);
}
