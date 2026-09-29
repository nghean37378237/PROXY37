/**
 * Vercel Serverless Function: Download PAC Script
 * Endpoint: GET /api/download-pac
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const proxyHost = urlObj.searchParams.get('proxy') || 'PROXY 127.0.0.1:8080; DIRECT';
  const targetHost = urlObj.searchParams.get('target') || '192.168.1.27';

  const pacContent = `function FindProxyForURL(url, host) {
  // PAC Script for ${targetHost} generated via ProxySwitcher Pro on Vercel
  if (shExpMatch(host, "${targetHost}") || shExpMatch(url, "*${targetHost}*")) {
    return "${proxyHost}";
  }
  return "DIRECT";
}
`;

  res.setHeader('Content-Type', 'application/x-ns-proxy-autoconfig');
  res.setHeader('Content-Disposition', `attachment; filename="proxy_${targetHost.replace(/\./g, '_')}.pac"`);
  res.status(200).send(pacContent);
}
