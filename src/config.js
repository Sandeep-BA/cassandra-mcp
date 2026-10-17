// Author: Sandeep Belgavi
export const identifier = /^[a-z][a-z0-9_]{0,47}$/;
export function config(env = process.env) {
  const tables = (env.CASSANDRA_TABLES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!tables.length || tables.length > 50 || tables.some(t => t.split('.').length !== 2 || !t.split('.').every(p => identifier.test(p))))
    throw new Error('CASSANDRA_TABLES must contain 1-50 lowercase keyspace.table names');
  if (tables.some(t => /^(system|system_schema|system_auth|system_distributed|system_traces|system_views|system_virtual_schema)\./.test(t)))
    throw new Error('System tables cannot be exposed');
  if (!env.CASSANDRA_USERNAME || !env.CASSANDRA_PASSWORD) throw new Error('Cassandra credentials are required; use a SELECT-only role');
  const hosts = (env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(',').map(s => s.trim());
  if (hosts.some(h => !/^[a-zA-Z0-9.:-]+$/.test(h))) throw new Error('Invalid contact point');
  const tls = env.CASSANDRA_TLS || 'true';
  if (!['true', 'false'].includes(tls)) throw new Error('CASSANDRA_TLS must be true or false');
  if (tls === 'false' && hosts.some(h => !['localhost', '127.0.0.1', '::1'].includes(h))) throw new Error('TLS may only be disabled for loopback development');
  const port = Number(env.CASSANDRA_PORT || 9042);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid Cassandra port');
  return { tables: [...new Set(tables)], hosts, port, tls: tls === 'true', ca: env.CASSANDRA_CA_FILE, username: env.CASSANDRA_USERNAME, password: env.CASSANDRA_PASSWORD, datacenter: env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1' };
}
