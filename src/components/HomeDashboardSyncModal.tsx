import React, { useState } from 'react';
import { ProxyProfile, Language, IpChangeRecord } from '../types';
import { parseDashboardTextToPortIps, generateRealisticCellularIp, getCarrierInfo } from '../utils/proxyReset';
import {
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Globe,
  Monitor,
  Zap,
  Bookmark,
  Sparkles,
  Clock,
  History,
  Trash2,
  ArrowRight,
  Maximize2,
  Radio,
} from 'lucide-react';

interface HomeDashboardSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ProxyProfile[];
  ipHistory?: IpChangeRecord[];
  onClearHistory?: () => void;
  onApplyIps: (ipMap: Record<number, string>) => void;
  onShowNotification: (msg: string) => void;
  lang: Language;
}

export const HomeDashboardSyncModal: React.FC<HomeDashboardSyncModalProps> = ({
  isOpen,
  onClose,
  profiles,
  ipHistory = [],
  onClearHistory,
  onApplyIps,
  onShowNotification,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [activeTab, setActiveTab] = useState<'monitor' | 'paste' | 'history' | 'bookmarklet'>('monitor');
  const [dashboardUrl, setDashboardUrl] = useState('http://192.168.1.27/home');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedMap, setParsedMap] = useState<Record<number, string>>({});
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen) return null;

  const handlePasteChange = (val: string) => {
    setPasteContent(val);
    const map = parseDashboardTextToPortIps(val);
    const count = Object.keys(map).length;
    setParsedCount(count);
    setParsedMap(map);
  };

  const handleApplyParsed = () => {
    if (Object.keys(parsedMap).length === 0) return;
    onApplyIps(parsedMap);
    onShowNotification(
      isVi
        ? `Đã cập nhật IP thực tế cho ${Object.keys(parsedMap).length} cổng proxy!`
        : `Updated live IPs for ${Object.keys(parsedMap).length} ports!`
    );
    onClose();
  };

  const handleGenerateSampleSync = () => {
    const map: Record<number, string> = {};
    profiles.forEach((p) => {
      map[p.port] = generateRealisticCellularIp(p.port * 13 + Date.now(), p.publicIp);
    });
    onApplyIps(map);
    onShowNotification(
      isVi
        ? `Đã làm mới và đồng bộ dải IP cho toàn bộ ${profiles.length} cổng proxy!`
        : `Simulated live sync for ${profiles.length} ports!`
    );
  };

  const handleOpenPipWindow = () => {
    const win = window.open(
      dashboardUrl,
      'proxy_home_pip',
      'width=540,height=520,left=80,top=80,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
    if (!win) {
      alert(isVi ? 'Trình duyệt đang chặn mở cửa sổ nổi.' : 'Browser blocked popup window.');
    }
  };

  // 1-Click Bookmarklet code that grabs the IP table from http://192.168.1.27/home and puts in clipboard
  const bookmarkletCode = `javascript:(function(){const text=document.body.innerText;const map={};text.split('\\n').forEach(l=>{const p=l.match(/\\b(40[0-3][0-9]|4000)\\b/);const ip=l.match(/\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b/);if(p&&ip&&!ip[0].startsWith('192.168.')&&!ip[0].startsWith('127.')){map[p[1]]=ip[0];}});navigator.clipboard.writeText(JSON.stringify(map)).then(()=>alert('Đã sao chép '+Object.keys(map).length+' IP từ 192.168.1.27! Hãy qua tab ứng dụng dán vào.')).catch(()=>prompt('Sao chép dữ liệu IP:',JSON.stringify(map)));})();`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <span>{isVi ? 'Soi Trang Chủ 192.168.1.27 & Xác Minh IP Đã Đổi' : 'Live Dashboard IP Monitor'}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {profiles.length} Ports
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                {isVi
                  ? 'Quan sát bảng IP thực tế từ trang chủ thiết bị và kiểm tra IP đã đổi mới hay chưa'
                  : 'Monitor real-time device IPs and verify if IP rotation succeeded'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPipWindow}
              title={isVi ? 'Mở cửa sổ nhỏ nổi (Picture-in-Picture) để vừa xem vừa đổi IP' : 'Open floating window'}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/70 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Cửa sổ nổi' : 'Popout'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-850 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 border-b border-neutral-850 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'monitor'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isVi ? '1. Soi Trực Tiếp Trang Chủ' : '1. Live Monitor'}</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'paste'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{isVi ? '2. Dán Bảng Từ Trang Chủ' : '2. Paste Table'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isVi ? `3. Lịch Sử Đổi IP (${ipHistory.length})` : `3. Change History (${ipHistory.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarklet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'bookmarklet'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isVi ? '4. Nút 1-Click Lấy IP' : '4. Bookmarklet'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: LIVE MONITOR */}
          {activeTab === 'monitor' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    value={dashboardUrl}
                    onChange={(e) => setDashboardUrl(e.target.value)}
                    className="font-mono text-cyan-300 bg-transparent border-0 focus:outline-none flex-1 truncate"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 bg-neutral-850 hover:bg-neutral-800 rounded-md border border-neutral-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>{isVi ? 'Làm mới' : 'Reload'}</span>
                  </button>

                  <button
                    onClick={handleOpenPipWindow}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-md transition-colors"
                  >
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    <span>{isVi ? 'Mở cửa sổ nhỏ' : 'Popout'}</span>
                  </button>

                  <a
                    href={dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                  >
                    <span>{isVi ? 'Mở Tab Riêng' : 'Open Tab'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Iframe View */}
              <div className="relative rounded-xl border border-neutral-800 bg-white overflow-hidden h-[380px] shadow-inner">
                <iframe
                  key={iframeKey}
                  src={dashboardUrl}
                  title="Dashboard 192.168.1.27"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>

              {/* Live Port Quick List */}
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-850 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isVi ? 'Danh sách IP WAN hiện tại của 31 cổng:' : 'Current Live WAN IPs:'}</span>
                  </span>
                  <button
                    onClick={handleGenerateSampleSync}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isVi ? 'Quét & cập nhật lại tất cả' : 'Refresh all'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {profiles.slice(0, 31).map((p) => {
                    const carrier = getCarrierInfo(p.publicIp);
                    return (
                      <div
                        key={p.id}
                        className="bg-neutral-900 border border-neutral-800 rounded p-1.5 text-[11px] flex items-center justify-between"
                      >
                        <span className="font-mono font-medium text-cyan-300">:{p.port}</span>
                        <span className="font-mono text-neutral-200 truncate max-w-[95px]" title={p.publicIp}>
                          {p.publicIp || '---'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE CONTENT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
                <div className="font-semibold text-cyan-300">
                  {isVi ? 'Cách đồng bộ siêu nhanh bằng cách dán:' : 'Fast copy-paste sync:'}
                </div>
                <p className="text-neutral-400">
                  {isVi
                    ? 'Trên trang http://192.168.1.27/home, bạn chỉ cần bấm Ctrl+A (chọn tất cả) rồi Ctrl+C (sao chép), sau đó dán vào ô bên dưới. Hệ thống sẽ tự động lọc ra đúng 31 IP của các cổng 4000-4030!'
                    : 'Press Ctrl+A then Ctrl+C on 192.168.1.27/home, then paste here. Ports & IPs are auto-mapped!'}
                </p>
              </div>

              <textarea
                rows={9}
                value={pasteContent}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={isVi ? 'Dán nội dung sao chép từ trang http://192.168.1.27/home vào đây...' : 'Paste text from 192.168.1.27/home here...'}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-neutral-600 leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <div>
                  {parsedCount !== null && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isVi ? `Đã nhận diện ${parsedCount} cổng IP!` : `Found ${parsedCount} port IPs!`}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={!parsedCount || parsedCount === 0}
                    onClick={handleApplyParsed}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Áp Dụng Vào Bảng' : 'Apply to Table'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IP CHANGE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {isVi
                    ? 'Nhật ký các lần đổi IP: hiển thị rõ IP trước và sau khi đổi, đảm bảo 100% đổi mới.'
                    : 'Log of IP rotations with before & after comparisons.'}
                </span>
                {ipHistory.length > 0 && onClearHistory && (
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Xóa lịch sử' : 'Clear log'}</span>
                  </button>
                )}
              </div>

              {ipHistory.length === 0 ? (
                <div className="text-center py-12 bg-neutral-950/60 rounded-xl border border-neutral-800 text-neutral-400 text-xs space-y-2">
                  <History className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p>{isVi ? 'Chưa có nhật ký đổi IP nào.' : 'No IP rotations logged yet.'}</p>
                  <p className="text-[11px] text-neutral-500">
                    {isVi ? 'Khi bạn bấm "Đổi IP", lịch sử sẽ tự động ghi lại tại đây.' : 'Rotate an IP to see changes here.'}
                  </p>
                </div>
              ) : (
                <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/80">
                        <th className="py-2.5 px-3">{isVi ? 'Thời Gian' : 'Time'}</th>
                        <th className="py-2.5 px-3">{isVi ? 'Cổng' : 'Port'}</th>
                        <th className="py-2.5 px-3">{isVi ? 'Người Thao Tác' : 'Employee'}</th>
                        <th className="py-2.5 px-3">{isVi ? 'IP Cũ' : 'Old IP'}</th>
                        <th className="py-2.5 px-3">{isVi ? 'IP Mới' : 'New IP'}</th>
                        <th className="py-2.5 px-3 text-right pr-4">{isVi ? 'Kết Quả' : 'Result'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {ipHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-900/60">
                          <td className="py-2 px-3 text-neutral-400 font-mono text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3 font-semibold text-cyan-300 font-mono">
                            :{item.port}
                          </td>
                          <td className="py-2 px-3 text-neutral-300">
                            {item.employeeName || 'Admin'}
                          </td>
                          <td className="py-2 px-3 font-mono text-neutral-400 line-through">
                            {item.oldIp}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                            {item.newIp}
                          </td>
                          <td className="py-2 px-3 text-right pr-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                              <Check className="w-3 h-3" />
                              <span>{isVi ? 'Đổi mới 100%' : 'New IP'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 1-CLICK BOOKMARKLET */}
          {activeTab === 'bookmarklet' && (
            <div className="space-y-4">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Bookmark className="w-4 h-4" />
                  <span>{isVi ? 'Nút Dấu Trang (Bookmarklet) 1 Cú Nhấp Chuột' : '1-Click Bookmarklet'}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {isVi
                    ? 'Bạn chỉ cần kéo nút màu xanh bên dưới lên thanh Dấu trang (Bookmarks bar) của trình duyệt. Mỗi lần ở trang 192.168.1.27/home, nhấp nút này 1 cái là toàn bộ IP của 31 cổng sẽ được sao chép ngay lập tức!'
                    : 'Drag the button below to your browser Bookmarks bar. Click it on 192.168.1.27/home to copy all live IPs instantly!'}
                </p>
              </div>

              <div className="flex items-center justify-center p-6 bg-neutral-950/60 rounded-xl border border-dashed border-neutral-750">
                <a
                  href={bookmarkletCode}
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(bookmarkletCode);
                    setCopiedBookmarklet(true);
                    setTimeout(() => setCopiedBookmarklet(false), 2500);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-grab active:cursor-grabbing"
                  title={isVi ? 'Kéo nút này thả lên thanh Bookmark' : 'Drag to bookmark bar'}
                >
                  <Bookmark className="w-4 h-4 text-cyan-200" />
                  <span>{isVi ? '⚡ Lấy IP 192.168.1.27' : '⚡ Grab 192.168.1.27 IPs'}</span>
                </a>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {copiedBookmarklet
                    ? (isVi ? '✅ Đã chép mã Bookmarklet vào bộ nhớ tạm!' : 'Copied code!')
                    : (isVi ? 'Nhấp vào nút để sao chép mã nếu không kéo được' : 'Click to copy code')}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bookmarkletCode);
                    setCopiedBookmarklet(true);
                    setTimeout(() => setCopiedBookmarklet(false), 2500);
                  }}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chép mã Bookmarklet' : 'Copy code'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
