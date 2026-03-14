/**
 * Simple HTTP proxy server with Basic authentication for testing.
 *
 * Usage:
 *   node scripts/test-auth-proxy.js
 *
 * Then in X-Proxy extension:
 *   Type: HTTP
 *   Host: 127.0.0.1
 *   Port: 18888
 *   Username: testuser
 *   Password: testpass
 *
 * The proxy forwards requests through your existing system connection.
 * Press Ctrl+C to stop.
 */

import http from 'http';
import net from 'net';

const PORT = 18888;
const USERNAME = 'testuser';
const PASSWORD = 'testpass';

function checkAuth(req) {
  const authHeader = req.headers['proxy-authorization'];
  if (!authHeader) return false;

  const [scheme, encoded] = authHeader.split(' ');
  if (scheme !== 'Basic') return false;

  const decoded = Buffer.from(encoded, 'base64').toString();
  const [user, pass] = decoded.split(':');
  return user === USERNAME && pass === PASSWORD;
}

function send407(res) {
  res.writeHead(407, {
    'Proxy-Authenticate': 'Basic realm="Test Proxy"',
    'Content-Type': 'text/plain'
  });
  res.end('Proxy Authentication Required');
}

const server = http.createServer((req, res) => {
  // HTTP requests (non-CONNECT)
  if (!checkAuth(req)) {
    console.log(`[407] ${req.method} ${req.url} - auth required`);
    return send407(res);
  }

  console.log(`[FWD] ${req.method} ${req.url}`);

  const url = new URL(req.url);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers }
  };
  delete options.headers['proxy-authorization'];
  delete options.headers['proxy-connection'];

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error(`[ERR] ${err.message}`);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy);
});

// Handle CONNECT for HTTPS
server.on('connect', (req, clientSocket, head) => {
  if (!checkAuth(req)) {
    console.log(`[407] CONNECT ${req.url} - auth required`);
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\n' +
      'Proxy-Authenticate: Basic realm="Test Proxy"\r\n' +
      '\r\n'
    );
    clientSocket.end();
    return;
  }

  console.log(`[FWD] CONNECT ${req.url}`);

  const [host, port] = req.url.split(':');
  const serverSocket = net.connect(parseInt(port) || 443, host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[ERR] CONNECT ${req.url}: ${err.message}`);
    clientSocket.end();
  });

  clientSocket.on('error', () => serverSocket.end());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Auth Proxy running on 127.0.0.1:${PORT}`);
  console.log(`  Username: ${USERNAME}`);
  console.log(`  Password: ${PASSWORD}\n`);
  console.log('  X-Proxy config:');
  console.log('    Type: HTTP');
  console.log('    Host: 127.0.0.1');
  console.log('    Port: 18888');
  console.log(`    Username: ${USERNAME}`);
  console.log(`    Password: ${PASSWORD}\n`);
  console.log('  Waiting for connections...\n');
});
