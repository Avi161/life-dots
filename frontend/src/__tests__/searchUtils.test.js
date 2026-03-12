/**
 * Tests for search utility functions used by journal search (F10).
 *
 * Pure-logic tests — no DOM or React required.
 * Run: node src/__tests__/searchUtils.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp, highlightText, matchesSearch } from '../utils/searchUtils.js';

// ════════════════════════════════════════════════════════════════════
// escapeRegExp
// ════════════════════════════════════════════════════════════════════
describe('escapeRegExp', () => {
    it('escapes all regex metacharacters', () => {
        const input = '.*+?^${}()|[]\\';
        const result = escapeRegExp(input);
        assert.equal(result, '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('passes through normal strings unchanged', () => {
        assert.equal(escapeRegExp('hello world'), 'hello world');
    });

    it('handles empty string', () => {
        assert.equal(escapeRegExp(''), '');
    });

    it('escapes mixed normal and special characters', () => {
        assert.equal(escapeRegExp('price ($5)'), 'price \\(\\$5\\)');
    });
});

// ════════════════════════════════════════════════════════════════════
// highlightText
// ════════════════════════════════════════════════════════════════════
describe('highlightText', () => {
    it('wraps a basic match in <mark> tags', () => {
        assert.equal(
            highlightText('hello world', 'world'),
            'hello <mark>world</mark>'
        );
    });

    it('is case-insensitive', () => {
        assert.equal(
            highlightText('Hello World', 'hello'),
            '<mark>Hello</mark> World'
        );
    });

    it('highlights multiple occurrences', () => {
        assert.equal(
            highlightText('the cat sat on the mat', 'the'),
            '<mark>the</mark> cat sat on <mark>the</mark> mat'
        );
    });

    it('returns original text when no match', () => {
        assert.equal(
            highlightText('hello world', 'xyz'),
            'hello world'
        );
    });

    it('returns original text when query is empty', () => {
        assert.equal(highlightText('hello world', ''), 'hello world');
    });

    it('returns empty string when text is empty', () => {
        assert.equal(highlightText('', 'test'), '');
    });

    it('returns empty string when both are empty', () => {
        assert.equal(highlightText('', ''), '');
    });

    it('handles special regex characters in query without throwing', () => {
        assert.equal(
            highlightText('price is ($5)', '($5)'),
            'price is <mark>($5)</mark>'
        );
    });

    it('highlights match at start of text', () => {
        assert.equal(
            highlightText('start of text', 'start'),
            '<mark>start</mark> of text'
        );
    });

    it('highlights match at end of text', () => {
        assert.equal(
            highlightText('at the end', 'end'),
            'at the <mark>end</mark>'
        );
    });

    it('escapes HTML-unsafe characters in text', () => {
        assert.equal(
            highlightText('<script>alert("xss")</script>', 'alert'),
            '&lt;script&gt;<mark>alert</mark>(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('matches literal angle brackets in query', () => {
        assert.equal(
            highlightText('use <b> tags', '<b>'),
            'use <mark>&lt;b&gt;</mark> tags'
        );
    });

    it('handles consecutive adjacent matches', () => {
        assert.equal(
            highlightText('aaaa', 'aa'),
            '<mark>aa</mark><mark>aa</mark>'
        );
    });

    it('handles query that matches the entire text', () => {
        assert.equal(
            highlightText('hello', 'hello'),
            '<mark>hello</mark>'
        );
    });

    it('handles ampersands in text', () => {
        assert.equal(
            highlightText('Tom & Jerry', 'Tom'),
            '<mark>Tom</mark> &amp; Jerry'
        );
    });

    it('handles query with ampersand', () => {
        assert.equal(
            highlightText('Tom & Jerry', '& Jerry'),
            'Tom <mark>&amp; Jerry</mark>'
        );
    });
});

// ════════════════════════════════════════════════════════════════════
// matchesSearch
// ════════════════════════════════════════════════════════════════════
describe('matchesSearch', () => {
    it('returns true on exact match', () => {
        assert.equal(matchesSearch('hello world', 'hello'), true);
    });

    it('is case-insensitive', () => {
        assert.equal(matchesSearch('Hello World', 'hello world'), true);
    });

    it('returns true when query is empty (show all)', () => {
        assert.equal(matchesSearch('some text', ''), true);
    });

    it('returns false when no match', () => {
        assert.equal(matchesSearch('hello world', 'xyz'), false);
    });

    it('returns true when text is empty and query is empty', () => {
        assert.equal(matchesSearch('', ''), true);
    });

    it('returns false when text is empty and query is not', () => {
        assert.equal(matchesSearch('', 'test'), false);
    });

    it('treats whitespace-only query as empty (show all)', () => {
        assert.equal(matchesSearch('anything', '   '), true);
    });

    it('matches partial words', () => {
        assert.equal(matchesSearch('programming', 'gram'), true);
    });

    it('handles null/undefined text gracefully', () => {
        assert.equal(matchesSearch(null, 'test'), false);
        assert.equal(matchesSearch(undefined, 'test'), false);
    });

    it('handles null/undefined query as empty (show all)', () => {
        assert.equal(matchesSearch('text', null), true);
        assert.equal(matchesSearch('text', undefined), true);
    });
});
