import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../src/lib/env';

test('env strips quotes pasted from a .env file', () => {
  process.env.__T = '"mistral"';
  assert.equal(env('__T'), 'mistral');
  process.env.__T = " 'abc' ";
  assert.equal(env('__T'), 'abc');
  process.env.__T = 'plain';
  assert.equal(env('__T'), 'plain');
  // Only matching outer quotes are removed.
  process.env.__T = '"half';
  assert.equal(env('__T'), '"half');
  process.env.__T = '""';
  assert.equal(env('__T'), undefined);
  delete process.env.__T;
  assert.equal(env('__T'), undefined);
});
