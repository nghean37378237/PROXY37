import React, { useState } from 'react';
import { ProxyProfile, Language } from '../types';
import { ArrowRight, CheckCircle2, ExternalLink, RefreshCw, Zap, Shield, Copy, Check, RotateCw } from 'lucide-react';
import { triggerResetUrl } from '../utils/proxyReset';

interface ActiveProxyCardProps {
  activeProfile: ProxyProfile;
  profiles: ProxyProfile[];
  onSelectProfile: (id: string) => void;
  onTest: (profile: ProxyProfile) => void;
  onUpdateProfile?: (updated: ProxyProfile) => void;
  isTesting: boolean;
  lang: Language;
}

export const ActiveProxyCard: React.FC<ActiveProxyCardProps> = ({
  activeProfile,
  profiles,
  onSelectProfile,
  onTest,
  onUpdateProfile,
  isTesting,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedReset, setCopiedReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const copyTarget = () => {
    navigator.clipboard.writeText(activeProfile.targetUrl);
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  };

  const copyResetUrl = () => {
    if (!activeProfile.resetUrl) return;
    navigator.clipboard.writeText(activeProfile.resetUrl);
    setCopiedReset(true);
    setTimeout(() => setCopiedReset(false), 2000);
  };

  const handleTriggerReset = async () => {
    if (!activeProfile.resetUrl || isResetting || cooldownSeconds > 0) return;
    setIsResetting(true);
    setResetMessage(null);

    const result = await triggerResetUrl(activeProfile.resetUrl);
    setIsResetting(false);
    setResetMessage(result.success ? (isVi ? 'Đã gửi lệnh đổi IP!' : 'Reset command sent!') : result.message);

    // Update profile with last reset time
    if (onUpdateProfile) {
      onUpdateProfile({
        ...activeProfile,
        lastResetTime: Date.now(),
        resetStatus: result.success ? 'success' : 'error',
      });
    }

    // Start 15-second cooldown
    setCooldownSeconds(15);
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => setResetMessage(null), 4000);
  };

  const protocolLabels: Record<string, string> = {
    direct: isVi ? 'Trực tiếp (Direct)' : 'Direct LAN',
    http: 'HTTP Proxy',
    https: 'HTTPS Proxy',
    socks4: 'SOCKS4',
    socks5: 'SOCKS5',
    reverse: 'Reverse Proxy',
    tunnel: 'Cloud Tunnel',
  };

  return (
    <div className="border border-slate-700/80 bg-slate-900/85 backdrop-blur-md rounded-2xl p-5 md:p-6 mb-6 shadow-xl relative overflow-hidden transition-all">
      {/* Top accent ambient bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0 shadow-inner">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeProfile.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {isVi ? 'Đang kích hoạt' : 'Active Proxy'}
              </span>
              <span className="text-slate-400 text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 font-semibold">
                {protocolLabels[activeProfile.protocol] || activeProfile.protocol.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
              {activeProfile.description}
            </p>
          </div>
        </div>

        {/* Quick Switch Dropdown */}
        <div className="flex items-center gap-2.5 self-start lg:self-center bg-slate-950/70 p-1.5 px-3 rounded-xl border border-slate-800 shrink-0">
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
            {isVi ? 'Chuyển nhanh cổng:' : 'Switch port:'}
          </span>
          <select
            value={activeProfile.id}
            onChange={(e) => onSelectProfile(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono cursor-pointer"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                {p.name} ({p.host}:{p.port})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target & Proxy Endpoint & Reset Link Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Destination Target */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {isVi ? 'Trang Đích Mục Tiêu' : 'Target Endpoint'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyTarget}
                  className="text-slate-400 hover:text-white text-xs flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 transition-colors"
                  title={isVi ? 'Sao chép URL' : 'Copy URL'}
                >
                  {copiedTarget ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedTarget ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Chép' : 'Copy')}</span>
                </button>
                <a
                  href={activeProfile.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-800/60 font-semibold"
                >
                  <span>{isVi ? 'Mở' : 'Open'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-cyan-300 truncate bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              {activeProfile.targetUrl}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isVi ? 'Subnet LAN nội bộ cổng 80 (RFC 1918)' : 'Local LAN Subnet'}</span>
          </div>
        </div>

        {/* Proxy IP & Port Column */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="text-blue-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {isVi ? 'Địa Chỉ Proxy & Cổng' : 'Proxy Address'}
              </span>
              <button
                onClick={() => onTest(activeProfile)}
                disabled={isTesting}
                className="text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTesting ? (isVi ? 'Đang đo...' : 'Testing...') : (isVi ? 'Đo Ping' : 'Test')}</span>
              </button>
            </div>
            <div className="text-base font-mono font-bold text-white bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span>{activeProfile.protocol === 'direct' ? 'DIRECT LAN' : `${activeProfile.host}:${activeProfile.port}`}</span>
              {activeProfile.latencyMs !== undefined && (
                <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  {activeProfile.latencyMs}ms
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span className="font-semibold text-slate-300">{activeProfile.protocol.toUpperCase()}</span>
            <span>·</span>
            <span>
              {activeProfile.username ? `${activeProfile.username}` : (isVi ? 'Không cần mật khẩu' : 'No Auth')}
            </span>
          </div>
        </div>

        {/* Corresponding Reset Link Column */}
        <div className="bg-slate-950/70 border border-amber-900/50 rounded-xl p-4 flex flex-col justify-between hover:border-amber-700 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="text-amber-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{isVi ? 'Link Reset Đổi IP' : 'Reset Link'}</span>
              </span>
              {activeProfile.resetUrl && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyResetUrl}
                    className="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 transition-colors"
                    title={isVi ? 'Chép link reset' : 'Copy reset link'}
                  >
                    {copiedReset ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedReset ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Chép' : 'Copy')}</span>
                  </button>
                  <a
                    href={activeProfile.resetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-800/60 font-semibold"
                    title={isVi ? 'Mở link reset trong tab mới' : 'Open in new tab'}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="text-xs font-mono font-medium text-amber-300/90 truncate bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              {activeProfile.resetUrl || (isVi ? '(Chưa gắn link reset cho cổng này)' : '(No reset link)')}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between gap-2 mt-auto">
            {activeProfile.resetUrl ? (
              <button
                onClick={handleTriggerReset}
                disabled={isResetting || cooldownSeconds > 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg transition-all shadow-md shadow-amber-950/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0
                    ? `${isVi ? 'Đợi' : 'Wait'} ${cooldownSeconds}s`
                    : isResetting
                    ? (isVi ? 'Đang reset IP...' : 'Resetting...')
                    : (isVi ? 'Đổi IP Ngay' : 'Reset IP Now')}
                </span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                {isVi ? 'Vào phần sửa cấu hình để thêm link reset' : 'Add reset link in edit'}
              </span>
            )}

            {resetMessage && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/60 animate-in fade-in">
                {resetMessage}
              </span>
            )}
            {activeProfile.lastResetTime && !resetMessage && (
              <span className="text-xs text-slate-400 tabular-nums font-mono">
                {isVi ? 'Đổi lúc:' : 'At:'} {new Date(activeProfile.lastResetTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
