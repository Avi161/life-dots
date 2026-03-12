/**
 * Pure utility functions for full-text journal search (F10).
 * No DOM dependencies — testable in Node.
 */

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Returns an HTML string with all occurrences of `query` wrapped in <mark>.
 * The text is HTML-escaped first, so it's safe to render via dangerouslySetInnerHTML
 * when the input is already plain text (e.g. from stripHtml).
 */
export function highlightText(text, query) {
    if (!text) return '';
    if (!query) return escapeHtml(text);

    const regex = new RegExp(escapeRegExp(query), 'gi');
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        result += escapeHtml(text.slice(lastIndex, match.index));
        result += '<mark>' + escapeHtml(match[0]) + '</mark>';
        lastIndex = regex.lastIndex;
    }

    result += escapeHtml(text.slice(lastIndex));
    return result;
}

export function matchesSearch(text, query) {
    const q = (query ?? '').trim();
    if (q === '') return true;
    if (!text) return false;
    return text.toLowerCase().includes(q.toLowerCase());
}
