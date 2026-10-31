// Author: Sandeep Belgavi. Expected-outcome tests for the large tool result example. Standard library only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticReturns, naiveResult, searchReturns, outputSchema, bytes } from './results.js';

const rows = syntheticReturns();

test('the naive result sends the data twice and the text copy is the larger half', () => {
  const naive = naiveResult(rows);
  const structured = bytes(naive.structuredContent);
  assert.ok(bytes(naive) > 2 * structured, 'escaping makes the text copy larger than the object');
});

test('the shaped result keeps both channels identical and fits the budget', () => {
  const r = searchReturns(rows);
  assert.equal(r.isError, undefined);
  assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
  assert.ok(bytes(r) <= 8000);
  assert.equal(r.structuredContent.total, 4000);
  assert.equal(r.structuredContent.returns.length, 20);
  assert.equal(r.content[1].type, 'resource_link');
  for (const key of outputSchema.required) assert.ok(key in r.structuredContent, key);
});

test('following next to the end returns every matching row exactly once', () => {
  const seen = new Set();
  let after = null, pages = 0;
  do {
    const r = searchReturns(rows, { status: 'pending', limit: 30, after });
    for (const x of r.structuredContent.returns) { assert.ok(!seen.has(x.return_id)); seen.add(x.return_id); }
    after = r.structuredContent.next; pages++;
  } while (after);
  assert.equal(seen.size, rows.filter((x) => x.status === 'pending').length);
  assert.ok(pages > 1);
});

test('a cursor from another query is refused, and so is an unbounded limit', () => {
  const first = searchReturns(rows, { status: 'pending' });
  const wrong = searchReturns(rows, { status: 'refunded', after: first.structuredContent.next });
  assert.equal(wrong.isError, true);
  assert.equal(searchReturns(rows, { limit: 5000 }).isError, true);
});

test('the byte budget is enforced', () => {
  const r = searchReturns(rows, { limit: 100 }, 2000);
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /over the 2000-byte budget/);
});
