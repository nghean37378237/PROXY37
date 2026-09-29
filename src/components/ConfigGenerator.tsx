import React, { useState } from 'react';
import { ProxyProfile, Language } from '../types';
import {
  getPacScript,
  getNginxConfig,
  getCurlCommand,
  getPythonProxyScript,
  getNodeProxyScript,
  getSshTunnelCommand,
  getCloudflareCommand,
  getSystemProxyCommands,
} from '../utils/generators';
import { Copy, Check, Download, FileCode, Terminal, Server, Shield, Sparkles, Layers } from 'lucide-react';

interface ConfigGeneratorProps {
  activeProfile: ProxyProfile;
  lang: Language;
}

type GeneratorTab = 'pac' | 'nginx' | 'curl' | 'python' | 'node' | 'ssh' | 'cloudflare' | 'system';

export const ConfigGenerator: React.FC<ConfigGeneratorProps> = ({
  activeProfile,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [activeGenTab, setActiveGenTab] = useState<GeneratorTab>('pac');
  const [targetUrl, setTargetUrl] = useState(activeProfile.targetUrl || 'http://192.168.1.27/home');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPac = () => {
    const pacContent = getPacScript(activeProfile, targetUrl);
    const blob = new Blob([pacContent], { type: 'application/x-ns-proxy-autoconfig' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxy_192_168_1_27.pac`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pacCode = getPacScript(activeProfile, targetUrl);
  const nginxCode = getNginxConfig(activeProfile, targetUrl);
  const curlCode = getCurlCommand(activeProfile, targetUrl);
  const pythonCode = getPythonProxyScript(activeProfile, targetUrl);
  const nodeCode = getNodeProxyScript(targetUrl);
  const sshCode = getSshTunnelCommand('192.168.1.27');
  const cfCode = getCloudflareCommand(targetUrl);
  const systemCommands = getSystemProxyCommands(activeProfile);

  const tabs: { id: GeneratorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pac', label: 'PAC Script (.pac)', icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: 'nginx', label: 'Nginx Reverse Proxy', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'curl', label: 'Lệnh cURL', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'python', label: 'Python Helper (1 File)', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'node', label: 'Node.js Forwarder', icon: <FileCode className="w-3.5 h-3.5" /> },
    { id: 'ssh', label: 'SSH Port Forwarding', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'cloudflare', label: 'Cloudflare Tunnel', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'System CLI (Win/Mac)', icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Target and Settings Bar */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{isVi ? 'Bộ Sinh Cấu hình & Script Chuyển đổi Proxy' : 'Proxy Script & Config Generator'}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isVi
                ? 'Tự động tạo mã cấu hình PAC, Nginx, Python, cURL cho trang đích của bạn'
                : 'Instantly generate PAC, Nginx, Python, and cURL scripts tailored for your target'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-neutral-400">{isVi ? 'Proxy đang dùng:' : 'Based on:'}</span>
            <span className="font-semibold text-cyan-300 font-mono">
              {activeProfile.name} ({activeProfile.protocol.toUpperCase()})
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isVi ? 'Địa chỉ trang đích cần cấu hình proxy (Target URL)' : 'Target URL'}
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 text-cyan-300 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={() => setTargetUrl('http://192.168.1.27/home')}
            className="self-end px-3 py-2 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap"
          >
            {isVi ? 'Đặt lại 192.168.1.27/home' : 'Reset to 192.168.1.27'}
          </button>
        </div>
      </div>

      {/* Generator Tabs and Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
        {/* Sub-nav Tabs */}
        <div className="flex items-center gap-1 p-2 bg-neutral-950 border-b border-neutral-800 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeGenTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveGenTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-cyan-400 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: PAC Script */}
        {activeGenTab === 'pac' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'File Cấu hình Proxy Tự động (PAC - Proxy Auto-Configuration)' : 'PAC Script'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi
                    ? 'Chỉ chuyển hướng riêng dải 192.168.1.27 qua proxy, các website khác duyệt bình thường (DIRECT).'
                    : 'Selectively routes 192.168.1.27 traffic through proxy while keeping other traffic direct.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPac}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tải file .pac' : 'Download .pac'}</span>
                </button>
                <button
                  onClick={() => handleCopy('pac', pacCode)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-md transition-colors"
                >
                  {copiedKey === 'pac' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pac' ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép' : 'Copy')}</span>
                </button>
              </div>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {pacCode}
            </pre>

            <div className="text-xs text-neutral-400 bg-neutral-950/60 p-3 rounded-lg border border-neutral-850 space-y-1">
              <p className="font-semibold text-neutral-300">💡 Hướng dẫn áp dụng PAC file:</p>
              <p>• <strong>Windows:</strong> Mở Settings &gt; Network &amp; Internet &gt; Proxy &gt; Bật "Use setup script" và dán đường dẫn file hoặc URL file .pac.</p>
              <p>• <strong>macOS:</strong> Mở System Settings &gt; Network &gt; Wi-Fi &gt; Details &gt; Proxies &gt; Chọn "Automatic Proxy Configuration".</p>
              <p>• <strong>Chrome / Edge extension:</strong> Dùng SwitchyOmega &gt; Thêm PAC Profile &gt; Dán đoạn script trên.</p>
            </div>
          </div>
        )}

        {/* Tab 2: Nginx Reverse Proxy */}
        {activeGenTab === 'nginx' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Cấu hình Nginx Reverse Proxy' : 'Nginx Reverse Proxy Configuration'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi
                    ? 'Đặt trong file /etc/nginx/sites-available/default để biến Nginx thành cổng trung chuyển vào 192.168.1.27'
                    : 'Place inside /etc/nginx/sites-available/default to forward incoming traffic to 192.168.1.27'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('nginx', nginxCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm self-start sm:self-center"
              >
                {copiedKey === 'nginx' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'nginx' ? (isVi ? 'Đã chép cấu hình' : 'Copied') : (isVi ? 'Sao chép cấu hình' : 'Copy Config')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {nginxCode}
            </pre>
          </div>
        )}

        {/* Tab 3: cURL */}
        {activeGenTab === 'curl' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Lệnh kiểm tra qua cURL' : 'cURL Command'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi ? 'Chạy trong Terminal / Command Prompt để kiểm tra proxy' : 'Run in terminal to test proxy routing'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('curl', curlCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
              >
                {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'curl' ? (isVi ? 'Đã chép lệnh' : 'Copied') : (isVi ? 'Sao chép lệnh' : 'Copy Command')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {curlCode}
            </pre>
          </div>
        )}

        {/* Tab 4: Python Script */}
        {activeGenTab === 'python' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Script Python Cục Bộ (Không cần cài thêm thư viện)' : 'Standalone Python Proxy Script'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi
                    ? 'Chạy trực tiếp trên máy tính cá nhân để tạo cầu nối localhost:8080 -> 192.168.1.27'
                    : 'Run on your PC to forward localhost:8080 to 192.168.1.27 using native Python 3'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('python', pythonCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm self-start sm:self-center"
              >
                {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'python' ? (isVi ? 'Đã chép mã' : 'Copied') : (isVi ? 'Sao chép mã Python' : 'Copy Python')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {pythonCode}
            </pre>
          </div>
        )}

        {/* Tab 5: Node.js Forwarder */}
        {activeGenTab === 'node' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Máy chủ chuyển tiếp Node.js' : 'Node.js Forwarder'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi ? 'Tạo reverse proxy bằng Express & http-proxy-middleware' : 'Express proxy middleware'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('node', nodeCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
              >
                {copiedKey === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'node' ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép mã' : 'Copy Code')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {nodeCode}
            </pre>
          </div>
        )}

        {/* Tab 6: SSH Tunnel */}
        {activeGenTab === 'ssh' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Chuyển tiếp cổng qua SSH (SSH Tunnel)' : 'SSH Port Forwarding'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi ? 'Truy cập 192.168.1.27 thông qua Raspberry Pi hoặc máy chủ SSH trong nhà' : 'Access via internal SSH server'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('ssh', sshCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
              >
                {copiedKey === 'ssh' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ssh' ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép lệnh' : 'Copy Command')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {sshCode}
            </pre>
          </div>
        )}

        {/* Tab 7: Cloudflare Tunnel */}
        {activeGenTab === 'cloudflare' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-neutral-100">
                  {isVi ? 'Đường hầm Cloudflare Tunnel (Miễn phí & Ra Internet)' : 'Cloudflare Tunnel'}
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isVi ? 'Cho phép truy cập http://192.168.1.27/home từ 4G/Internet mà không cần mở port modem' : 'Expose local LAN without opening router ports'}
                </p>
              </div>

              <button
                onClick={() => handleCopy('cf', cfCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
              >
                {copiedKey === 'cf' ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cf' ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép lệnh' : 'Copy Command')}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
              {cfCode}
            </pre>
          </div>
        )}

        {/* Tab 8: System CLI */}
        {activeGenTab === 'system' && (
          <div className="p-5 space-y-4">
            <h4 className="text-sm font-semibold text-neutral-100">
              {isVi ? 'Lệnh Bật / Tắt Proxy Hệ Thống' : 'System Proxy CLI Commands'}
            </h4>

            {/* Windows */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-neutral-300 mb-1">
                <span>Windows (PowerShell Admin)</span>
                <button
                  onClick={() => handleCopy('win', systemCommands.windows)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                >
                  {copiedKey === 'win' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'win' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                {systemCommands.windows}
              </pre>
            </div>

            {/* macOS */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-neutral-300 mb-1">
                <span>macOS (Terminal)</span>
                <button
                  onClick={() => handleCopy('mac', systemCommands.mac)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                >
                  {copiedKey === 'mac' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'mac' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                {systemCommands.mac}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
