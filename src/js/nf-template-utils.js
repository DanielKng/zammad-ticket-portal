// nf-template-utils.js - Safe template cloning
// Author: Daniel Könning

/**
 * Safely clones a template element by selector or reference.
 * Returns a deep clone or null if template is missing.
 * @param {string|HTMLElement} template - CSS selector or template element
 * @returns {HTMLElement|null} Cloned template or null
 */
export function nfCloneTemplate(template) {
    let tpl = template;
    if (typeof template === 'string') {
        tpl = document.querySelector(template);
    }
    if (tpl && tpl.content) {
        // HTMLTemplateElement
        return tpl.content.firstElementChild.cloneNode(true);
    } else if (tpl && tpl.cloneNode) {
        // Any other element
        return tpl.cloneNode(true);
    } else {
        // No fallback: return null
        return null;
    }
}
