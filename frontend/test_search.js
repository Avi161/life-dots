import { matchesSearch } from './src/utils/searchUtils.js';
import { formatContextKey } from './src/utils/dateEngine.js';

function runTest(description, query, context_key, content, expectedMatch) {
    const strippedText = content;
    const formattedDate = formatContextKey(context_key);
    
    const isMatch = matchesSearch(strippedText, query) || matchesSearch(formattedDate, query);
    
    if (isMatch !== expectedMatch) {
        console.error(`❌ FAILED: ${description}`);
        console.error(`   Query: "${query}" | Date: "${formattedDate}" | Text: "${strippedText}"`);
        console.error(`   Expected: ${expectedMatch}, Got: ${isMatch}\n`);
        return false;
    } else {
        console.log(`✅ PASSED: ${description}`);
        return true;
    }
}

// Edge Cases and Normal Cases
let passed = 0;
let total = 0;

function test(description, query, context_key, content, expectedMatch) {
    total++;
    if (runTest(description, query, context_key, content, expectedMatch)) {
        passed++;
    }
}

// Normal match on text
test("Matches normal text", "coffee", "life", "drinking fresh coffee", true);

// Match on full date
// Match on full date
test("Matches life phrase", "Entire Life", "life", "Some text", true);


// Match on parts of date (year, month, day)
// yearIndex=0 -> 2005
test("Matches Year format", "2005", "year-0", "hello", true); 

// yearIndex=41 -> 2046
test("Matches Date format", "February 10, 2046", "year-41-month-1-day-10", "Just a quiet day indoors.", true);

// Partial match on date
test("Matches partial date (month name)", "February", "year-41-month-1-day-10", "Nothing about date here", true);
test("Matches partial date (year)", "2046", "year-41-month-11-day-1", "Only text", true);
test("Matches partial date case insensitive", "fEbRuArY", "year-41-month-1-day-10", "text", true);

// Negative match
test("Fails when both don't match", "coffee", "year-41-month-1-day-10", "tea time", false);

// Empty query match
test("Empty query matches all", "", "year-41-month-1-day-10", "tea time", true);

// Null/undefined text handling
test("Handles empty content smoothly", "2046", "year-41-month-1-day-10", "", true);

// The original user example:
test("User exact example matches", "February 10, 2046", "year-41-month-1-day-10", "Just a quiet day indoors. Watching the rain, drinking fresh coffee, and reading a good sci-fi book on the couch.", true);

console.log(`\nResults: ${passed}/${total} passed.`);
