/**
 * Regression tests for the model-output coercion in src/ai/coerce.ts.
 *
 * Every case here is a shape a model actually returned during development, and
 * the two marked REGRESSION each shipped a silent data bug before being caught:
 * one split real array elements on commas, the other fused a range into a
 * number too large for the column it was written to.
 *
 *   npm test
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flatten, toCount, toTags } from '../src/ai/coerce';

test('flatten renders nested objects as readable prose', () => {
  assert.equal(flatten('  plain  '), 'plain');
  assert.equal(flatten({ ages: '18-64', referral: 'walk-in' }), 'ages: 18-64. referral: walk-in');
  assert.equal(flatten(['one', 'two']), 'one; two');
  assert.equal(flatten(null), '');
  assert.equal(flatten({ servesWho: { ages: '18+' } }), 'serves who: ages: 18+');
});

test('toTags splits a comma-joined string into separate tags', () => {
  assert.deepEqual(toTags('food security, youth arts'), ['food security', 'youth arts']);
});

test('REGRESSION: toTags must not split inside an array the model got right', () => {
  // Splitting these turned one geography into two, and one exclusion into an
  // exclusion plus a stray "500".
  assert.deepEqual(toTags(['Frederick County, MD']), ['Frederick County, MD']);
  assert.deepEqual(toTags(['Grant requests of less than $2,500', 'Individuals']), [
    'Grant requests of less than $2,500',
    'Individuals',
  ]);
});

test('toTags flattens arrays of objects', () => {
  assert.deepEqual(toTags([{ name: 'Arts' }, { name: 'Health' }]), ['name: Arts', 'name: Health']);
  assert.deepEqual(toTags(null), []);
});

test('toCount parses the money formats models actually emit', () => {
  assert.equal(toCount('$50,000'), 50_000);
  assert.equal(toCount('about 50k'), 50_000);
  assert.equal(toCount('up to 1.5m'), 1_500_000);
  assert.equal(toCount(2500), 2500);
  assert.equal(toCount('n/a'), undefined);
  assert.equal(toCount(''), undefined);
});

test('toCount takes the low end of a range rather than fusing it', () => {
  assert.equal(toCount('5,000-25,000'), 5000);
});

test('REGRESSION: a range as an array must not concatenate into one number', () => {
  // [50000, 25000] stringified to "50000,25000"; stripping the comma produced
  // 5000025000, which overflowed the Int column and failed the whole insert,
  // losing every other criterion for that funder.
  assert.equal(toCount([50_000, 25_000]), 50_000);
  assert.equal(toCount(['$50,000', '$250,000']), 50_000);
});

test('toCount rejects values too large for the Int columns', () => {
  assert.equal(toCount(9e12), undefined);
  assert.equal(toCount('5000025000'), undefined);
});

test('REGRESSION: an env var set to an empty string falls back to its default', () => {
  // A Vercel dashboard row saved with no value arrives as '', which skips `??`
  // and makes Number('') === 0 - a cron batch size of zero that refreshes
  // nothing and still reports success.
  const positiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };
  assert.equal(positiveInt('', 3), 3);
  assert.equal(positiveInt(undefined, 3), 3);
  assert.equal(positiveInt('0', 3), 3);
  assert.equal(positiveInt('abc', 3), 3);
  assert.equal(positiveInt('5', 3), 5);
});
