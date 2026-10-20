// Author: Sandeep Belgavi.
// Host and Origin checks for an HTTP server that listens on loopback, such as a local agent dev UI
// or an MCP server using the Streamable HTTP transport. Run the check before routing, on every
// route. Companion to "DNS Rebinding Against Local Agent and MCP Servers" on aicassindra.com.

const LOOPBACK_NAMES = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Build a request checker.
 * @param {object} options
 * @param {number} options.port            the port the server listens on
 * @param {string[]} [options.allowedOrigins]  extra exact origins, e.g. 'http://localhost:5173'
 * @returns {(headers: Record<string, string|undefined>) => (null|string)} null to allow, or a reason
 */
export function createGuard({ port, allowedOrigins = [] }) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be 1-65535');
  for (const origin of allowedOrigins) {
    if (!/^https?:\/\/[^/\s]+$/.test(origin)) throw new Error('allowed origin must be scheme://host[:port]: ' + origin);
  }
  const extra = allowedOrigins.map((o) => o.toLowerCase());
  const hosts = new Set([...LOOPBACK_NAMES.map((n) => `${n}:${port}`), ...extra.map((o) => o.split('://')[1])]);
  const origins = new Set([...LOOPBACK_NAMES.map((n) => `http://${n}:${port}`), ...extra]);

  return function check(headers) {
    const host = String(headers.host ?? '').toLowerCase();
    if (!hosts.has(host)) return 'host not allowed: ' + (host || '(missing)');
    const origin = headers.origin;
    if (origin !== undefined) {
      if (origin === 'null') return 'opaque origin rejected';
      if (!origins.has(String(origin).toLowerCase())) return 'origin not allowed: ' + origin;
    }
    return null;
  };
}

/** Wrap a Node request handler so that a refused request gets 403 before any route runs. */
export function guarded(check, handler) {
  return (req, res) => {
    const reason = check(req.headers);
    if (reason) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Forbidden: ' + reason } }));
      return;
    }
    handler(req, res);
  };
}
