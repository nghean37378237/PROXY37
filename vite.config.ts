import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function proxyRelayPlugin(): Plugin {
  return {
    name: 'proxy-relay-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/proxy') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const targetUrl = payload.targetUrl || 'http://192.168.1.27/home';
              const method = payload.method || 'GET';
              const customHeaders = payload.headers || {};
              const requestBody = payload.body;
              const timeoutMs = payload.timeoutMs || 4000;

              const startTime = Date.now();
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), timeoutMs);

              const fetchHeaders: Record<string, string> = {
                'User-Agent': 'ProxySwitcherPro/1.0',
                ...customHeaders,
              };

              try {
                const response = await fetch(targetUrl, {
                  method,
                  headers: fetchHeaders,
                  body: method !== 'GET' && method !== 'HEAD' ? requestBody : undefined,
                  signal: controller.signal,
                });
                clearTimeout(timer);
                const latency = Date.now() - startTime;
                const contentType = response.headers.get('content-type') || 'text/plain';
                const resText = await response.text();

                const respHeaders: Record<string, string> = {};
                response.headers.forEach((val, key) => {
                  respHeaders[key] = val;
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: true,
                    targetUrl,
                    status: response.status,
                    statusText: response.statusText,
                    latencyMs: latency,
                    contentType,
                    headers: respHeaders,
                    body: resText.slice(0, 50000), // cap preview at 50KB
                    isPrivateNetwork: /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/i.test(
                      targetUrl,
                    ),
                  }),
                );
              } catch (fetchErr: any) {
                clearTimeout(timer);
                const latency = Date.now() - startTime;
                const isAbort = fetchErr.name === 'AbortError';
                const isPrivate = /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/i.test(
                  targetUrl,
                );

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    targetUrl,
                    latencyMs: latency,
                    error: isAbort
                      ? `Hết thời gian chờ (${timeoutMs}ms) khi kết nối tới ${targetUrl}`
                      : fetchErr.message || 'Không thể kết nối',
                    isPrivateNetwork: isPrivate,
                    networkNotice: isPrivate
                      ? 'Địa chỉ IP 192.168.1.27 là mạng nội bộ gia đình / LAN (RFC 1918). Máy chủ đám mây không thể quét trực tiếp vào LAN nếu không qua Tunnel/VPN hoặc Local Proxy trên máy tính của bạn.'
                      : 'Không nhận được phản hồi từ máy chủ mục tiêu.',
                  }),
                );
              }
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({success: false, error: err.message}));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/download-pac')) {
          const urlObj = new URL(req.url, 'http://localhost');
          const proxyHost = urlObj.searchParams.get('proxy') || 'PROXY 127.0.0.1:8080; DIRECT';
          const targetHost = urlObj.searchParams.get('target') || '192.168.1.27';

          const pacContent = `function FindProxyForURL(url, host) {
  // PAC Script for ${targetHost}
  if (shExpMatch(host, "${targetHost}") || shExpMatch(url, "*${targetHost}*")) {
    return "${proxyHost}";
  }
  return "DIRECT";
}
`;
          res.setHeader('Content-Type', 'application/x-ns-proxy-autoconfig');
          res.setHeader('Content-Disposition', `attachment; filename="proxy_${targetHost.replace(/\./g, '_')}.pac"`);
          res.end(pacContent);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), proxyRelayPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

