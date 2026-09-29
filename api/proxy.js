/**
 * Vercel Serverless Function: Proxy Relay
 * Endpoint: POST /api/proxy
 */

export default async function handler(req, res) {
  // CORS configuration for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }
    payload = payload || {};

    const targetUrl = payload.targetUrl || 'http://192.168.1.27/home';
    const method = payload.method || 'GET';
    const customHeaders = payload.headers || {};
    const requestBody = payload.body;
    const timeoutMs = Number(payload.timeoutMs) || 5000;

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fetchHeaders = {
      'User-Agent': 'ProxySwitcherPro-Vercel/1.0',
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

      const respHeaders = {};
      response.headers.forEach((val, key) => {
        respHeaders[key] = val;
      });

      const isPrivate = /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/i.test(
        targetUrl
      );

      res.status(200).json({
        success: true,
        targetUrl,
        status: response.status,
        statusText: response.statusText,
        latencyMs: latency,
        contentType,
        headers: respHeaders,
        body: resText.slice(0, 50000), // Max 50KB payload
        isPrivateNetwork: isPrivate,
        provider: 'Vercel Serverless Edge/Node Function'
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      const latency = Date.now() - startTime;
      const isAbort = fetchErr.name === 'AbortError';
      const isPrivate = /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/i.test(
        targetUrl
      );

      res.status(200).json({
        success: false,
        targetUrl,
        latencyMs: latency,
        error: isAbort
          ? `Hết thời gian chờ (${timeoutMs}ms) khi kết nối tới ${targetUrl}`
          : fetchErr.message || 'Không thể kết nối',
        isPrivateNetwork: isPrivate,
        networkNotice: isPrivate
          ? 'Địa chỉ IP 192.168.1.27 là mạng nội bộ gia đình / LAN (RFC 1918). Máy chủ đám mây Vercel không thể quét trực tiếp vào LAN nhà bạn nếu không qua Tunnel (Cloudflare/Ngrok) hoặc Local Agent.'
          : 'Không nhận được phản hồi từ máy chủ mục tiêu.',
        provider: 'Vercel Serverless Edge/Node Function'
      });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
