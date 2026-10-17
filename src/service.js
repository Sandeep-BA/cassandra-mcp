import { identifier } from './config.js';

export class SafeError extends Error {}
const quote = name => `"${name.replaceAll('"', '""')}"`;
export class CassandraService {
  constructor(client, tables) { this.client = client; this.tables = new Set(tables); }
  authorize(keyspace, table) {
    if (!identifier.test(keyspace) || !identifier.test(table) || !this.tables.has(`${keyspace}.${table}`)) throw new SafeError('Table is not authorized');
  }
  async schema(keyspace, table) {
    this.authorize(keyspace, table);
    const result = await this.client.execute('SELECT column_name, kind, position, type FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?', [keyspace, table], { prepare: true, fetchSize: 257, readTimeout: 5000, isIdempotent: true });
    if (!result.rows.length) throw new SafeError('Configured table does not exist or schema is unavailable');
    if (result.rows.length > 256 || result.pageState) throw new SafeError('Schema exceeds the supported 256-column limit');
    return result.rows.map(r => ({ name: r.column_name, kind: r.kind, position: r.position, type: r.type }));
  }
  async read({ keyspace, table, partition, columns, limit }) {
    const schema = await this.schema(keyspace, table);
    const keys = schema.filter(c => c.kind === 'partition_key').sort((a, b) => a.position - b.position);
    if (!keys.length || keys.length !== Object.keys(partition).length || keys.some(k => !Object.hasOwn(partition, k.name))) throw new SafeError('Provide exactly every partition-key column');
    const allowed = new Set(schema.map(c => c.name));
    if (new Set(columns).size !== columns.length || columns.some(c => !allowed.has(c))) throw new SafeError('Select distinct columns from the table schema');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new SafeError('Limit must be 1-100');
    const query = `SELECT ${columns.map(quote).join(', ')} FROM ${quote(keyspace)}.${quote(table)} WHERE ${keys.map(k => `${quote(k.name)} = ?`).join(' AND ')} LIMIT ${limit}`;
    const result = await this.client.execute(query, keys.map(k => partition[k.name]), { prepare: true, fetchSize: limit, readTimeout: 5000, isIdempotent: true, autoPage: false });
    return { rows: result.rows.map(r => Object.fromEntries(columns.map(c => [c, r[c]]))), limit, possiblyMore: result.rows.length === limit || !!result.pageState };
  }
}
