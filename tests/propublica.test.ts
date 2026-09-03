/**
 * Tests for IRS organization matching.
 *
 * The failure this guards against is silent and expensive: attaching the wrong
 * EIN to a donor imports another organization's finances into its profile,
 * where they look exactly as sourced as correct ones. Every case below is a
 * real result the live API returned for a seed donor.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreCandidate } from '../src/research/propublica';

const FREDERICK = { city: 'Frederick', state: 'MD' };

test('an exact match in the right city is high confidence', () => {
  const result = scoreCandidate(
    'Ausherman Family Foundation',
    { name: 'Ausherman Family Foundation Inc', city: 'Frederick', state: 'MD' },
    FREDERICK,
  );
  assert.equal(result.confidence, 'high');
});

test('legal suffixes and filler words do not weaken a match', () => {
  // "Inc", "Foundation" and "Family" carry no identifying information.
  const result = scoreCandidate(
    'The Delaplaine Foundation',
    { name: 'Delaplaine Foundation Inc', city: 'Frederick', state: 'MD' },
    FREDERICK,
  );
  assert.equal(result.confidence, 'high');
});

test('REGRESSION: a same-name org in another city is not high confidence', () => {
  // "Serini Foundation" matched a Helen J Serini Foundation two counties away.
  const result = scoreCandidate(
    'Serini Foundation',
    { name: 'Helen J Serini Foundation Inc', city: 'Reisterstown', state: 'MD' },
    FREDERICK,
  );
  assert.notEqual(result.confidence, 'high');
});

test('REGRESSION: a generic parent org does not match a specific chapter', () => {
  // "Carroll Creek Rotary Club" matched plain "Rotary International", whose
  // finances are those of a global body, not a local club.
  const result = scoreCandidate(
    'Carroll Creek Rotary Club',
    { name: 'Rotary International', city: 'Frederick', state: 'MD' },
    FREDERICK,
  );
  assert.equal(result.confidence, 'low');
});

test('an unrelated organization scores low', () => {
  const result = scoreCandidate(
    'Serini Foundation',
    { name: 'Servin Irvin Foundation Inc', city: 'Bowie', state: 'MD' },
    FREDERICK,
  );
  assert.equal(result.confidence, 'low');
});

test('a name made entirely of filler still matches on its full tokens', () => {
  // Nothing in "The Community Foundation" is distinctive, so the fallback to
  // full-token comparison is what makes this work at all.
  const result = scoreCandidate(
    'The Community Foundation of Frederick County',
    { name: 'Community Foundation Of Frederick County Maryland Incorporated', city: 'Frederick', state: 'MD' },
    FREDERICK,
  );
  assert.notEqual(result.confidence, 'low');
});
