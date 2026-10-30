import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReadingTime, extractHeadings, highlightMatches, searchScore } from './textUtils.ts';

test('textUtils: calculateReadingTime counts words and estimates reading minutes', () => {
  assert.deepEqual(calculateReadingTime(''), { words: 0, minutes: 1 });
  const html = '<p>Hello world from our collaborative workspace!</p><p>Another paragraph here.</p>';
  const res = calculateReadingTime(html);
  assert.equal(res.words, 9);
  assert.equal(res.minutes, 1);
});

test('textUtils: extractHeadings extracts h1, h2, h3 tags properly', () => {
  const html = `
    <h1>Product Vision</h1>
    <p>Some intro</p>
    <h2>Architecture Overview</h2>
    <h3>Data Store</h3>
  `;
  const headings = extractHeadings(html);
  assert.equal(headings.length, 3);
  assert.equal(headings[0].level, 1);
  assert.equal(headings[0].text, 'Product Vision');
  assert.equal(headings[1].level, 2);
  assert.equal(headings[1].text, 'Architecture Overview');
  assert.equal(headings[2].level, 3);
  assert.equal(headings[2].text, 'Data Store');
});

test('textUtils: searchScore ranks exact match higher than partial content match', () => {
  const itemExact = { title: 'Roadmap' };
  const itemPrefix = { title: 'Roadmap 2026' };
  const itemContent = { title: 'Engineering Notes', content: 'See the roadmap section' };
  const itemNone = { title: 'Meeting Sync' };

  assert.ok(searchScore(itemExact, 'roadmap') > searchScore(itemPrefix, 'roadmap'));
  assert.ok(searchScore(itemPrefix, 'roadmap') > searchScore(itemContent, 'roadmap'));
  assert.ok(searchScore(itemContent, 'roadmap') > searchScore(itemNone, 'roadmap'));
  assert.equal(searchScore(itemNone, 'roadmap'), 0);
});

test('textUtils: highlightMatches segments text correctly', () => {
  const parts = highlightMatches('Kortex is collaborative', 'kortex');
  assert.equal(parts.length, 2);
  assert.equal(parts[0].text, 'Kortex');
  assert.equal(parts[0].isMatch, true);
  assert.equal(parts[1].text, ' is collaborative');
  assert.equal(parts[1].isMatch, false);
});
