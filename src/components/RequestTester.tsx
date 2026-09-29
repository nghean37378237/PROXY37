import React, { useState } from 'react';
import { ProxyProfile, RequestLog, TestResult, Language } from '../types';
import { Play, Send, RefreshCw, AlertTriangle, CheckCircle2, Clock, Globe, Shield, Trash2, Eye, Code, FileText } from 'lucide-react';

interface RequestTesterProps {
  activeProfile: ProxyProfile;
  lang: Language;
  onLogAdd: (log: RequestLog) => void;
  logs: RequestLog[];
  onClearLogs: () => void;
}

export const RequestTester: React.FC<RequestTesterProps> = ({
  activeProfile,
  lang,
  onLogAdd,
  logs,
  onClearLogs,
}) => {
  const isVi = lang === 'vi';

  const [url, setUrl] = useState(activeProfile.targetUrl || 'http://192.168.1.27/home');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'>('GET');
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'headers' | 'body'>('headers');
  const [bodyContent, setBodyContent] = useState('{\n  "action": "status_check"\n}');
  const [customHost, setCustomHost] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [userAgent, setUserAgent] = useState('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  const [timeoutMs, setTimeoutMs] = useState(5000);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [responseViewMode, setResponseViewMode] = useState<'body' | 'preview' | 'headers'>('body');

  const executeRequest = async () => {
    setIsLoading(true);
    setResult(null);

    const headers: Record<string, string> = {
      'User-Agent': userAgent,
    };
    if (customHost.trim()) {
      headers['Host'] = customHost.trim();
    }
    if (authHeader.trim()) {
      headers['Authorization'] = authHeader.trim();
    }

    try {
      const resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: url,
          method,
          headers,
          body: method !== 'GET' && method !== 'HEAD' ? bodyContent : undefined,
          timeoutMs,
        }),
      });

      const data: TestResult = await resp.json();
      setResult(data);

      onLogAdd({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        targetUrl: url,
        method,
        proxyName: activeProfile.name,
        protocol: activeProfile.protocol,
        status: data.status || 'ERR',
        latencyMs: data.latencyMs,
        contentType: data.contentType,
        sizeBytes: data.body ? new Blob([data.body]).size : 0,
        headers: data.headers,
        preview: (data.body || data.error || '').slice(0, 300),
        error: data.error,
      });
    } catch (err: any) {
      const failResult: TestResult = {
        success: false,
        latencyMs: 0,
        error: err.message || 'Lỗi mạng khi kết nối proxy trung chuyển',
      };
      setResult(failResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>{isVi ? 'Trình Kiểm Tra & Gửi Request qua Proxy' : 'Proxy Request Inspector & Relay'}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isVi
                ? `Kiểm tra gửi request trực tiếp hoặc qua proxy tới: ${url}`
                : `Dispatch request directly or through proxy to: ${url}`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{isVi ? 'Đang gắn với:' : 'Bound to:'}</span>
            <span className="font-mono text-cyan-300 font-medium">{activeProfile.name}</span>
          </div>
        </div>

        {/* URL and Method Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-700 text-neutral-100 text-xs font-mono font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 shrink-0"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
          </select>

          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.27/home"
              className="w-full bg-neutral-950 border border-neutral-700 text-cyan-300 font-mono text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setUrl('http://192.168.1.27/home')}
            title="Đặt lại URL 192.168.1.27/home"
            className="px-3 py-2 text-xs font-mono text-neutral-400 hover:text-neutral-200 bg-neutral-850 border border-neutral-750 rounded-lg shrink-0 transition-colors"
          >
            Reset URL
          </button>

          <button
            onClick={executeRequest}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-md shadow-cyan-900/30 disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isLoading ? (isVi ? 'Đang gửi...' : 'Sending...') : (isVi ? 'Gửi Request' : 'Send Request')}</span>
          </button>
        </div>

        {/* Request Parameter Sub-Tabs */}
        <div className="border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActiveSubTab('headers')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'headers'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Headers ({customHost || authHeader ? 'Custom' : 'Default'})
            </button>
            {(method === 'POST' || method === 'PUT') && (
              <button
                onClick={() => setActiveSubTab('body')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeSubTab === 'body'
                    ? 'bg-neutral-800 text-neutral-100 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Payload Body
              </button>
            )}
            <button
              onClick={() => setActiveSubTab('params')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'params'
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Cài đặt Timeout ({timeoutMs / 1000}s)
            </button>
          </div>

          {activeSubTab === 'headers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-neutral-950/50 p-3 rounded-lg border border-neutral-850">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  Host Header (Spoof VirtualHost nếu cần)
                </label>
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="192.168.1.27 hoặc router.local"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  Authorization (Basic / Bearer token)
                </label>
                <input
                  type="text"
                  value={authHeader}
                  onChange={(e) => setAuthHeader(e.target.value)}
                  placeholder="Basic YWRtaW46cGFzc3dvcmQ= hoặc Bearer token"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  User-Agent
                </label>
                <input
                  type="text"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {activeSubTab === 'body' && (
            <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-850">
              <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                JSON / Form Payload Body
              </label>
              <textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                rows={4}
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-2.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {activeSubTab === 'params' && (
            <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-850 flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  Thời gian chờ tối đa (Timeout)
                </label>
                <select
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value={2000}>2 Giây (2000ms)</option>
                  <option value={4000}>4 Giây (4000ms)</option>
                  <option value={8000}>8 Giây (8000ms)</option>
                  <option value={15000}>15 Giây (15000ms)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
          {/* Result Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              {result.success ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    HTTP {result.status} {result.statusText}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold font-mono text-rose-400">
                    {isVi ? 'Không thể kết nối / Timeout' : 'Connection Failed'}
                  </span>
                </div>
              )}

              <span className="text-neutral-600">·</span>
              <span className="text-xs font-mono text-neutral-300 tabular-nums">
                {result.latencyMs} ms
              </span>

              {result.contentType && (
                <>
                  <span className="text-neutral-600">·</span>
                  <span className="text-xs font-mono text-neutral-400 truncate max-w-[180px]">
                    {result.contentType}
                  </span>
                </>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
              <button
                onClick={() => setResponseViewMode('body')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  responseViewMode === 'body'
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Body / Mã nguồn</span>
              </button>
              <button
                onClick={() => setResponseViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  responseViewMode === 'preview'
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Render Xem thử</span>
              </button>
              <button
                onClick={() => setResponseViewMode('headers')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                  responseViewMode === 'headers'
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Headers ({result.headers ? Object.keys(result.headers).length : 0})</span>
              </button>
            </div>
          </div>

          {/* Network Notice for LAN IP 192.168.1.27 */}
          {result.networkNotice && (
            <div className="p-4 bg-amber-950/30 border-b border-amber-900/40 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">{isVi ? 'Phát hiện địa chỉ mạng nội bộ (LAN Private IP):' : 'LAN Private IP Detected:'}</p>
                <p className="text-amber-200/80 mt-0.5">{result.networkNotice}</p>
                <div className="mt-2 flex items-center gap-3">
                  <a
                    href="#troubleshooter"
                    className="text-cyan-400 hover:underline font-medium"
                  >
                    {isVi ? '👉 Xem hướng dẫn kết nối LAN và cài Reverse Proxy' : '👉 View LAN Access & Reverse Proxy Guide'}
                  </a>
                  <span className="text-neutral-600">·</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline font-medium"
                  >
                    {isVi ? 'Mở trực tiếp trên tab mới của trình duyệt' : 'Open in new browser tab'}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error Message if failed */}
          {result.error && (
            <div className="p-4 bg-neutral-950 text-rose-400 font-mono text-xs border-b border-neutral-850">
              <span className="font-semibold text-rose-300">Chi tiết lỗi: </span>
              {result.error}
            </div>
          )}

          {/* Content Pane */}
          <div className="p-4 bg-neutral-950/90 min-h-[220px] max-h-[500px] overflow-auto">
            {responseViewMode === 'body' && (
              <pre className="text-xs font-mono text-neutral-300 whitespace-pre-wrap break-all select-all">
                {result.body || (result.success ? '(Phản hồi rỗng 0 bytes)' : 'Không có dữ liệu trả về')}
              </pre>
            )}

            {responseViewMode === 'preview' && (
              <div className="w-full h-[400px] bg-white rounded border border-neutral-300 overflow-hidden">
                {result.body ? (
                  <iframe
                    title="HTML Preview Sandbox"
                    srcDoc={result.body}
                    sandbox="allow-same-origin"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-500 text-xs font-sans">
                    Chưa có nội dung HTML để render xem trước
                  </div>
                )}
              </div>
            )}

            {responseViewMode === 'headers' && (
              <div className="space-y-1.5 font-mono text-xs">
                {result.headers && Object.keys(result.headers).length > 0 ? (
                  Object.entries(result.headers).map(([key, val]) => (
                    <div key={key} className="flex items-start gap-2 py-1 border-b border-neutral-850">
                      <span className="text-neutral-400 font-medium shrink-0 min-w-[140px]">{key}:</span>
                      <span className="text-cyan-300 break-all">{val}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500">Không có header phản hồi nào</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request History Log Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isVi ? 'Lịch sử kiểm tra kết nối' : 'Connection History Log'}</span>
            <span className="text-neutral-500 font-normal">({logs.length})</span>
          </h4>

          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-[11px] text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>{isVi ? 'Xóa lịch sử' : 'Clear Log'}</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-500">
            {isVi
              ? 'Chưa có lịch sử kiểm tra. Nhấn "Gửi Request" ở trên để kiểm tra kết nối tới 192.168.1.27/home.'
              : 'No requests sent yet. Click "Send Request" to test connection.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-2 px-2 font-medium">Thời gian</th>
                  <th className="py-2 px-2 font-medium">Phương thức</th>
                  <th className="py-2 px-2 font-medium">Trang đích</th>
                  <th className="py-2 px-2 font-medium">Proxy đã dùng</th>
                  <th className="py-2 px-2 font-medium">Trạng thái</th>
                  <th className="py-2 px-2 font-medium text-right">Độ trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-850/50 font-mono text-[11px]">
                    <td className="py-2 px-2 text-neutral-400 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-2 font-semibold text-neutral-200">
                      {log.method}
                    </td>
                    <td className="py-2 px-2 text-cyan-300 truncate max-w-xs">
                      {log.targetUrl}
                    </td>
                    <td className="py-2 px-2 text-neutral-300">
                      {log.proxyName}
                    </td>
                    <td className="py-2 px-2">
                      {log.status === 200 ? (
                        <span className="text-emerald-400 font-semibold">200 OK</span>
                      ) : log.status === 'ERR' ? (
                        <span className="text-rose-400">ERR / Timeout</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">{log.status}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-neutral-300">
                      {log.latencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
