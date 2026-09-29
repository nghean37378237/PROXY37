import React, { useState } from 'react';
import { ProxyProfile, Language } from '../types';
import { Globe, RefreshCw, ExternalLink, ShieldAlert, ArrowLeft, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface WebMirrorProps {
  activeProfile: ProxyProfile;
  lang: Language;
}

export const WebMirror: React.FC<WebMirrorProps> = ({
  activeProfile,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [iframeUrl, setIframeUrl] = useState(activeProfile.targetUrl || 'http://192.168.1.27/home');
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Browser Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleRefresh}
            title={isVi ? 'Tải lại' : 'Reload'}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-850 hover:bg-neutral-800 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative flex-1 flex items-center bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono">
          <span className="text-amber-400 mr-2 shrink-0">http://</span>
          <input
            type="text"
            value={iframeUrl.replace(/^https?:\/\//, '')}
            onChange={(e) => setIframeUrl(`http://${e.target.value}`)}
            className="w-full bg-transparent text-neutral-200 focus:outline-none"
          />
        </div>

        <a
          href={iframeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shrink-0 shadow-sm"
        >
          <span>{isVi ? 'Mở Tab Mới' : 'Open Tab'}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Security Advisory for Mixed-Content / LAN */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-400 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-200">
            {isVi ? 'Lưu ý hiển thị trang nội bộ (192.168.1.27):' : 'LAN Display Notice:'}
          </span>
          <span className="ml-1">
            {isVi
              ? 'Nếu khung xem trước bên dưới hiển thị trang trắng do chính sách bảo mật trình duyệt chặn Mixed-Content (HTTP nhúng trong HTTPS), vui lòng nhấn nút "Mở Tab Mới" ở góc trên hoặc dùng script Forwarder ở tab "Sinh mã Cấu hình".'
              : 'If preview is blocked by browser mixed-content policy, click "Open Tab" or use a local forwarder script.'}
          </span>
        </div>
      </div>

      {/* Frame Container */}
      <div className="bg-white rounded-xl border border-neutral-800 overflow-hidden shadow-2xl h-[560px] relative">
        <iframe
          key={key}
          src={iframeUrl}
          title="Web Mirror"
          sandbox="allow-same-origin allow-scripts allow-forms"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};
