import { ProxyProfile } from '../types';

export function getPacScript(profile: ProxyProfile, targetUrl: string): string {
  let targetHost = '192.168.1.27';
  try {
    const parsed = new URL(targetUrl);
    targetHost = parsed.hostname;
  } catch {
    targetHost = '192.168.1.27';
  }

  let proxyDirective = 'DIRECT';
  if (profile.protocol === 'http' || profile.protocol === 'https' || profile.protocol === 'reverse') {
    proxyDirective = `PROXY ${profile.host}:${profile.port}; DIRECT`;
  } else if (profile.protocol === 'socks5') {
    proxyDirective = `SOCKS5 ${profile.host}:${profile.port}; SOCKS ${profile.host}:${profile.port}; DIRECT`;
  } else if (profile.protocol === 'socks4') {
    proxyDirective = `SOCKS ${profile.host}:${profile.port}; DIRECT`;
  }

  return `// Proxy Auto-Configuration (PAC) Script
// Tự động định tuyến lưu lượng cho: ${targetHost}
function FindProxyForURL(url, host) {
  // Bỏ qua nếu là localhost
  if (isPlainHostName(host) || shExpMatch(host, "localhost") || shExpMatch(host, "127.0.0.1")) {
    return "DIRECT";
  }

  // Khớp địa chỉ mục tiêu ${targetHost}
  if (shExpMatch(host, "${targetHost}") || shExpMatch(url, "*://${targetHost}/*")) {
    return "${proxyDirective}";
  }

  // Mặc định kết nối thẳng cho các trang khác
  return "DIRECT";
}`;
}

export function getNginxConfig(profile: ProxyProfile, targetUrl: string): string {
  let targetOrigin = 'http://192.168.1.27';
  let pathPrefix = '/home';
  try {
    const parsed = new URL(targetUrl);
    targetOrigin = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
    pathPrefix = parsed.pathname || '/';
  } catch {
    targetOrigin = 'http://192.168.1.27';
  }

  return `# Cấu hình Reverse Proxy Nginx cho ${targetUrl}
server {
    listen 80;
    server_name proxy-home.local; # Hoặc IP máy chủ Nginx

    # Thiết lập bộ nhớ đệm và timeout
    proxy_connect_timeout 60s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    location ${pathPrefix} {
        proxy_pass ${targetOrigin}${pathPrefix};
        
        # Thiết lập header chuyển tiếp
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Hỗ trợ WebSocket nếu trang đích dùng socket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Tắt tự động giải nén để tránh lỗi hiển thị
        proxy_buffering off;
    }
}`;
}

export function getCurlCommand(profile: ProxyProfile, targetUrl: string): string {
  if (profile.protocol === 'direct') {
    return `curl -i -v "${targetUrl}"`;
  }

  let proxyArg = '';
  if (profile.protocol === 'socks5') {
    proxyArg = `--socks5-hostname ${profile.host}:${profile.port}`;
  } else if (profile.protocol === 'socks4') {
    proxyArg = `--socks4a ${profile.host}:${profile.port}`;
  } else {
    const authPart = profile.username ? `${profile.username}:${profile.password || ''}@` : '';
    proxyArg = `-x http://${authPart}${profile.host}:${profile.port}`;
  }

  return `curl -i -v ${proxyArg} "${targetUrl}"`;
}

export function getPythonProxyScript(profile: ProxyProfile, targetUrl: string): string {
  let host = '192.168.1.27';
  let port = 80;
  try {
    const parsed = new URL(targetUrl);
    host = parsed.hostname;
    port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  } catch {
    host = '192.168.1.27';
    port = 80;
  }

  return `# Python 3 Lightweight Reverse Proxy Forwarder
# Chạy trên máy tính cùng mạng: python proxy_relay.py
import http.server
import urllib.request

TARGET_HOST = "${host}"
TARGET_PORT = ${port}
LOCAL_PORT = 8080

class ProxyHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        target_url = f"http://{TARGET_HOST}:{TARGET_PORT}{self.path}"
        try:
            req = urllib.request.Request(target_url, headers={k: v for k, v in self.headers.items() if k.lower() != 'host'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                self.send_response(resp.status)
                for header, value in resp.getheaders():
                    self.send_header(header, value)
                self.end_headers()
                self.wfile.write(resp.read())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(f"Proxy Error: {e}".encode('utf-8'))

print(f"Đang lắng nghe tại http://localhost:{LOCAL_PORT} -> http://{TARGET_HOST}:{TARGET_PORT}")
http.server.HTTPServer(('0.0.0.0', LOCAL_PORT), ProxyHTTPRequestHandler).serve_forever()
`;
}

export function getNodeProxyScript(targetUrl: string): string {
  return `// Node.js Express Reverse Proxy Forwarder
// Cài đặt: npm install express http-proxy-middleware
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;
const TARGET = '${targetUrl.replace(/\/home.*$/, '') || 'http://192.168.1.27'}';

app.use('/', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  ws: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(\`[Proxy] \${req.method} \${req.url} -> \${TARGET}\`);
  }
}));

app.listen(PORT, () => {
  console.log(\`Proxy forwarder đang chạy tại http://localhost:\${PORT} -> \${TARGET}\`);
});
`;
}

export function getSshTunnelCommand(targetHost: string = '192.168.1.27'): string {
  return `# Chuyển tiếp cổng qua máy chủ SSH trong gia đình / VPS (Port Forwarding):
# Mở cổng 8888 trên máy của bạn kết nối đến cổng 80 của ${targetHost}
ssh -L 8888:${targetHost}:80 user@your-home-server.local -N

# Hoặc mở Dynamic SOCKS5 Proxy trên cổng 1080:
ssh -D 1080 user@your-home-server.local -N
`;
}

export function getCloudflareCommand(targetUrl: string = 'http://192.168.1.27/home'): string {
  return `# Cài đặt Cloudflare Tunnel (Miễn phí & Bảo mật)
# Tải cloudflared từ: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# Chạy tunnel tạm thời không cần đăng ký tên miền:
cloudflared tunnel --url http://192.168.1.27:80

# Sau khi chạy, bạn sẽ nhận được một địa chỉ công cộng https://xyz.trycloudflare.com/home
# để mở bất kỳ đâu trên điện thoại / 4G!
`;
}

export function getSystemProxyCommands(profile: ProxyProfile): { windows: string; mac: string; linux: string } {
  const host = profile.host || '127.0.0.1';
  const port = profile.port || 8080;

  return {
    windows: `# Bật Proxy trên Windows (PowerShell Administrator):
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 1
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyServer -Value "${host}:${port}"

# Tắt Proxy trên Windows:
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0
`,
    mac: `# Bật Web Proxy trên macOS (Terminal):
networksetup -setwebproxy "Wi-Fi" ${host} ${port}
networksetup -setsecurewebproxy "Wi-Fi" ${host} ${port}

# Tắt Web Proxy trên macOS:
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off
`,
    linux: `# Đặt biến môi trường Proxy trong Linux bash:
export http_proxy="http://${host}:${port}"
export https_proxy="http://${host}:${port}"
export no_proxy="localhost,127.0.0.1"

# Hủy proxy:
unset http_proxy https_proxy no_proxy
`,
  };
}
