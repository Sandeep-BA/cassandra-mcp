// Author: Sandeep Belgavi. Shaping a large MCP tool result: server-side narrowing, a summary page with a
// continuation argument, a resource_link to the full export, and structuredContent with its text copy.
// Standard library only. Shapes follow the MCP specification revision 2026-07-28, server/tools.
import { createHash } from 'node:crypto';

const REASONS = ['damaged', 'wrong edition', 'late delivery', 'duplicate order', 'changed mind'];
const STATUSES = ['pending', 'approved', 'refunded'];

/** Seeded synthetic returns for Belgavi's Book Store. Deterministic for a given count. */
export function syntheticReturns(count = 4000) {
  let seed = 20261031;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      return_id: 'RT-' + String(i).padStart(5, '0'),
      case_id: 'CASE-' + String(1000 + (i % 9000)).padStart(4, '0'),
      reason: REASONS[Math.floor(rnd() * REASONS.length)],
      status: STATUSES[Math.floor(rnd() * STATUSES.length)],
      refund_amount_minor: 300 + Math.floor(rnd() * 5700),
      created_at: `2026-10-${String(1 + Math.floor(rnd() * 30)).padStart(2, '0')}T10:00:00Z`,
    });
  }
  return rows;
}

const bytes = (value) => Buffer.byteLength(JSON.stringify(value));
const encodeCursor = (offset, digest) => Buffer.from(JSON.stringify({ o: offset, d: digest })).toString('base64url');
const decodeCursor = (cursor) => JSON.parse(Buffer.from(cursor, 'base64url').toString());

/** The naive result: every row, as structuredContent and again as a text copy. */
export function naiveResult(rows) {
  const structured = { returns: rows };
  return { content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured };
}

/**
 * The shaped result. `limit` defaults to 20 and is capped; `after` is this tool's own continuation argument
 * (MCP pagination with nextCursor is defined for list operations, not for tool results). The cursor carries a
 * digest of the filtered set so a cursor from a different query or a changed data set is refused.
 */
export function searchReturns(rows, { status = null, minAmount = 0, limit = 20, after = null } = {}, maxBytes = 8000) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { isError: true, content: [{ type: 'text', text: 'limit must be a whole number from 1 to 100' }] };
  }
  const matched = rows
    .filter((r) => (status === null || r.status === status) && r.refund_amount_minor >= minAmount)
    .sort((a, b) => b.refund_amount_minor - a.refund_amount_minor || a.return_id.localeCompare(b.return_id));
  const digest = createHash('sha256').update(matched.map((r) => r.return_id).join(',')).digest('hex').slice(0, 12);
  let start = 0;
  if (after !== null) {
    const c = decodeCursor(after);
    if (c.d !== digest) return { isError: true, content: [{ type: 'text', text: 'cursor does not match this query or the data changed; start again without after' }] };
    start = c.o;
  }
  const byStatus = {};
  for (const r of matched) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const page = matched.slice(start, start + limit).map(({ return_id, case_id, status: s, refund_amount_minor }) => ({ return_id, case_id, status: s, refund_amount_minor }));
  const summary = { total: matched.length, by_status: byStatus, returns: page, next: start + limit < matched.length ? encodeCursor(start + limit, digest) : null };
  const result = {
    content: [
      { type: 'text', text: JSON.stringify(summary) },
      { type: 'resource_link', uri: `bookstore://exports/returns/${digest}.jsonl`, name: `returns-${digest}.jsonl`, mimeType: 'application/jsonl',
        description: `All ${matched.length} matching returns, one JSON object per line`, annotations: { audience: ['user'], priority: 0.3 } },
    ],
    structuredContent: summary,
  };
  if (bytes(result) > maxBytes) return { isError: true, content: [{ type: 'text', text: `result would be ${bytes(result)} bytes, over the ${maxBytes}-byte budget; lower limit` }] };
  return result;
}

export const outputSchema = {
  type: 'object',
  required: ['total', 'by_status', 'returns', 'next'],
  properties: {
    total: { type: 'integer' }, by_status: { type: 'object' }, next: { type: ['string', 'null'] },
    returns: { type: 'array', items: { type: 'object', required: ['return_id', 'case_id', 'status', 'refund_amount_minor'] } },
  },
};

export { bytes };

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file://${process.argv[1]}`) {
  const rows = syntheticReturns();
  const shaped = searchReturns(rows);
  console.log(JSON.stringify({ rows: rows.length, naive_bytes: bytes(naiveResult(rows)), shaped_bytes: bytes(shaped), total: shaped.structuredContent.total, page: shaped.structuredContent.returns.length }));
}
