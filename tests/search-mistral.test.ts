/**
 * Tests for parsing Mistral's Agents API conversation output.
 *
 * The case that matters most is the negative one: a response where the model
 * answered without calling `web_search`. Reporting that as grounded would put a
 * researched badge on plain model recall, and donor criteria derived from it
 * would look identically trustworthy to criteria read off a real page.
 *
 * The shapes below are taken from actual responses.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOutputs } from '../src/ai/search-mistral';

const searched = [
  { type: 'tool.execution', name: 'web_search' },
  {
    type: 'message.output',
    content: [
      { type: 'text', text: 'LOI deadline is September 1, 2026.' },
      { type: 'tool_reference', url: 'https://delaplainefoundation.org/apply-for-funding/', title: 'Apply' },
      { type: 'tool_reference', url: 'https://delaplainefoundation.org/apply-for-funding/', title: 'Apply' },
    ],
  },
];

test('extracts text and de-duplicates citations from a searched answer', () => {
  const result = parseOutputs(searched);
  assert.equal(result.searched, true);
  assert.equal(result.text, 'LOI deadline is September 1, 2026.');
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, 'https://delaplainefoundation.org/apply-for-funding/');
});

test('CRITICAL: an answer with no web_search execution is not marked searched', () => {
  const recall = [
    { type: 'message.output', content: [{ type: 'text', text: 'I believe the deadline is in the autumn.' }] },
  ];
  const result = parseOutputs(recall);
  assert.equal(result.searched, false);
  assert.equal(result.sources.length, 0);
});

test('a different tool running does not count as a web search', () => {
  const other = [
    { type: 'tool.execution', name: 'code_interpreter' },
    { type: 'message.output', content: [{ type: 'text', text: 'Computed.' }] },
  ];
  assert.equal(parseOutputs(other).searched, false);
});

test('handles plain string content and missing content', () => {
  assert.equal(parseOutputs([{ type: 'message.output', content: 'plain text' }]).text, 'plain text');
  assert.equal(parseOutputs([{ type: 'message.output' }]).text, '');
  assert.equal(parseOutputs([]).text, '');
  assert.equal(parseOutputs([]).searched, false);
});

test('skips citations with no url', () => {
  const partial = [
    { type: 'tool.execution', name: 'web_search' },
    { type: 'message.output', content: [{ type: 'tool_reference', title: 'no url here' }] },
  ];
  assert.equal(parseOutputs(partial).sources.length, 0);
});
